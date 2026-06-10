import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const workspaceRoot = process.cwd();
const publicRoot = path.join(workspaceRoot, "public");
const staticRoot = existsSync(path.join(publicRoot, "index.html")) ? publicRoot : workspaceRoot;
const envPath = path.join(workspaceRoot, ".env");

loadEnvFile(envPath);
loadEnvFile(path.join(workspaceRoot, ".env.local"));

const port = Number.parseInt(process.env.PORT || "3000", 10);
const vaultPassword = process.env.VAULT_PASSWORD || "";
const vaultCookieName = "vault_access";
const vaultCookieMaxAgeSeconds = 7 * 24 * 60 * 60;
const vaultCookieValue = vaultPassword
  ? buildVaultCookieValue(vaultPassword)
  : "";

export default async function handler(request, response) {
  try {
    const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    const pathname = decodeURIComponent(requestUrl.pathname);

    if (pathname === "/api/vault/status") {
      return sendJson(response, 200, buildVaultStatus(request));
    }

    if (pathname === "/api/vault/verify") {
      if (request.method !== "POST") {
        return sendText(response, 405, "Method Not Allowed", {
          Allow: "POST",
        });
      }

      return handleVaultVerify(request, response);
    }

    if (pathname === "/api/vault/logout") {
      if (request.method !== "POST") {
        return sendText(response, 405, "Method Not Allowed", {
          Allow: "POST",
        });
      }

      return sendJson(
        response,
        200,
        {
          ok: true,
          unlocked: false,
        },
        {
          "Set-Cookie": buildExpiredVaultCookie(request),
        }
      );
    }

    if (pathname === "/api/config") {
      if (!isVaultUnlocked(request)) {
        return sendJson(response, 403, {
          error: "vault_locked",
          message: "Vault is still locked.",
        });
      }

      return sendJson(response, 200, buildPublicConfig());
    }

    if (pathname === "/api/health" || pathname === "/health") {
      const config = buildPublicConfig();
      return sendJson(response, 200, {
        ok: true,
        date: new Date().toISOString(),
        vaultConfigured: isVaultConfigured(),
        firebaseConfigured: Boolean(
          config.firebaseConfig.apiKey &&
            config.firebaseConfig.authDomain &&
            config.firebaseConfig.projectId &&
            config.firebaseConfig.appId
        ),
      });
    }

    await serveStaticFile(request, pathname, response);
  } catch (error) {
    sendJson(response, 500, {
      error: "server_error",
      message: error instanceof Error ? error.message : "Unknown server error",
    });
  }
}

function buildVaultStatus(request) {
  const configured = isVaultConfigured();

  return {
    configured,
    unlocked: isVaultUnlocked(request),
    videoPath: "/assets/vault-intro.mp4",
    message: configured
      ? ""
      : "VAULT_PASSWORD is not available to this deployment.",
  };
}

function buildPublicConfig() {
  return {
    adminEmails: parseCsv(process.env.ADMIN_EMAILS || "erictatch@gmail.com"),
    firebaseConfig: {
      apiKey: process.env.FIREBASE_API_KEY || "",
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || "",
      projectId: process.env.FIREBASE_PROJECT_ID || "",
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "",
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
      appId: process.env.FIREBASE_APP_ID || "",
      measurementId: process.env.FIREBASE_MEASUREMENT_ID || "",
    },
    collections: {
      users: process.env.FIREBASE_USERS_COLLECTION || "users",
      trips: process.env.FIREBASE_TRIPS_COLLECTION || "trips",
      settings: process.env.FIREBASE_SETTINGS_COLLECTION || "settings",
    },
  };
}

async function handleVaultVerify(request, response) {
  if (!isVaultConfigured()) {
    return sendJson(response, 503, {
      error: "vault_not_configured",
      message: "Set VAULT_PASSWORD in .env before using the vault.",
    });
  }

  let payload = null;

  try {
    const rawBody = await readRequestBody(request);
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return sendJson(response, 400, {
      error: "invalid_request",
      message: "Vault password payload must be valid JSON.",
    });
  }

  const submittedPassword =
    payload && typeof payload.password === "string" ? payload.password : "";

  if (!safeEqualString(submittedPassword, vaultPassword)) {
    return sendJson(
      response,
      401,
      {
        error: "invalid_password",
        message: "Incorrect vault password.",
      },
      {
        "Set-Cookie": buildExpiredVaultCookie(request),
      }
    );
  }

  return sendJson(
    response,
    200,
    {
      ok: true,
      unlocked: true,
    },
    {
      "Set-Cookie": buildVaultCookieHeader(request),
    }
  );
}

async function serveStaticFile(request, pathname, response) {
  let targetPath =
    pathname === "/404" ? resolveStaticPath("/404.html") : resolveStaticPath(pathname);

  if (!targetPath) {
    return sendText(response, 403, "Forbidden");
  }

  if (!existsSync(targetPath)) {
    if (shouldServeSpaShell(pathname)) {
      targetPath = resolveStaticPath("/index.html");
    } else {
      return sendText(response, 404, "Not Found");
    }
  }

  const fileStats = statSync(targetPath);

  if (!fileStats.isFile()) {
    return sendText(response, 404, "Not Found");
  }

  const extension = path.extname(targetPath).toLowerCase();
  const contentType = getContentType(extension);
  const cacheControl =
    extension === ".html" || extension === ".js"
      ? "no-cache"
      : "public, max-age=300";

  if (request.headers.range) {
    return streamRangeResponse(
      request,
      response,
      targetPath,
      fileStats.size,
      contentType,
      cacheControl
    );
  }

  response.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": cacheControl,
    "Content-Length": fileStats.size,
    "Accept-Ranges": "bytes",
  });

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  await pipeFileToResponse(createReadStream(targetPath), response);
}

function shouldServeSpaShell(pathname) {
  if (!pathname || pathname.startsWith("/api/")) {
    return false;
  }

  if (pathname === "/health") {
    return false;
  }

  return path.extname(pathname) === "";
}

function resolveStaticPath(pathname) {
  const relativePath = pathname === "/" ? "/index.html" : pathname;
  const absolutePath = path.resolve(staticRoot, `.${relativePath}`);

  if (
    absolutePath !== staticRoot &&
    !absolutePath.startsWith(`${staticRoot}${path.sep}`)
  ) {
    return null;
  }

  return absolutePath;
}

function getContentType(extension) {
  switch (extension) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".svg":
      return "image/svg+xml";
    case ".ico":
      return "image/x-icon";
    case ".mp4":
      return "video/mp4";
    default:
      return "application/octet-stream";
  }
}

function sendJson(response, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders,
  });
  response.end(body);
}

function sendText(response, statusCode, text, extraHeaders = {}) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    ...extraHeaders,
  });
  response.end(text);
}

function isVaultConfigured() {
  return Boolean(vaultPassword);
}

function isVaultUnlocked(request) {
  if (!isVaultConfigured()) {
    return false;
  }

  const cookies = parseCookies(request.headers.cookie || "");
  return safeEqualString(cookies[vaultCookieName] || "", vaultCookieValue);
}

function buildVaultCookieValue(password) {
  return `${vaultCookieName}.${createHmac(
    "sha256",
    process.env.VAULT_SESSION_SECRET || password
  )
    .update("100gigz-vault")
    .digest("hex")}`;
}

function buildVaultCookieHeader(request) {
  const expiresAt = new Date(Date.now() + vaultCookieMaxAgeSeconds * 1000).toUTCString();
  return [
    `${vaultCookieName}=${vaultCookieValue}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${vaultCookieMaxAgeSeconds}`,
    `Expires=${expiresAt}`,
    isHttpsRequest(request) ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

function buildExpiredVaultCookie(request) {
  return [
    `${vaultCookieName}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    isHttpsRequest(request) ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

function isHttpsRequest(request) {
  const forwardedProto = String(request?.headers?.["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim()
    .toLowerCase();

  return forwardedProto === "https" || Boolean(request?.socket?.encrypted);
}

function parseCookies(cookieHeader) {
  return String(cookieHeader || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf("=");

      if (separatorIndex === -1) {
        return cookies;
      }

      const key = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();

      cookies[key] = value;
      return cookies;
    }, {});
}

function safeEqualString(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

async function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;

    request.on("data", (chunk) => {
      totalBytes += chunk.length;

      if (totalBytes > 16 * 1024) {
        reject(new Error("Request body too large."));
        request.destroy();
        return;
      }

      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

async function streamRangeResponse(
  request,
  response,
  targetPath,
  totalSize,
  contentType,
  cacheControl
) {
  const rangeHeader = String(request.headers.range || "");
  const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);

  if (!match) {
    return sendText(response, 416, "Requested Range Not Satisfiable", {
      "Content-Range": `bytes */${totalSize}`,
    });
  }

  let start = match[1] ? Number.parseInt(match[1], 10) : 0;
  let end = match[2] ? Number.parseInt(match[2], 10) : totalSize - 1;

  if (!match[1] && match[2]) {
    const suffixLength = Number.parseInt(match[2], 10);
    start = Math.max(totalSize - suffixLength, 0);
    end = totalSize - 1;
  }

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end < start ||
    end >= totalSize
  ) {
    return sendText(response, 416, "Requested Range Not Satisfiable", {
      "Content-Range": `bytes */${totalSize}`,
    });
  }

  response.writeHead(206, {
    "Content-Type": contentType,
    "Cache-Control": cacheControl,
    "Content-Length": end - start + 1,
    "Content-Range": `bytes ${start}-${end}/${totalSize}`,
    "Accept-Ranges": "bytes",
  });

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  await pipeFileToResponse(createReadStream(targetPath, { start, end }), response);
}

async function pipeFileToResponse(stream, response) {
  await new Promise((resolve, reject) => {
    const finish = () => {
      stream.removeListener("error", reject);
      response.removeListener("error", reject);
      response.removeListener("finish", finish);
      response.removeListener("close", finish);
      resolve();
    };

    stream.on("error", reject);
    response.on("error", reject);
    response.on("finish", finish);
    response.on("close", finish);
    stream.pipe(response);
  });
}

function parseCsv(value) {
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const content = statSync(filePath).isFile()
    ? readFileSync(filePath, "utf8")
    : "";

  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createServer(handler);
  server.listen(port, () => {
    console.log(`100GIGZ server listening on http://localhost:${port}`);
  });
}
