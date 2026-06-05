import { createHmac, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();

loadEnvFile(path.join(workspaceRoot, ".env"));
loadEnvFile(path.join(workspaceRoot, ".env.local"), true);

const VAULT_COOKIE_NAME = "vault_access";

export function buildVaultStatus(request) {
  return {
    configured: isVaultConfigured(),
    unlocked: isVaultUnlocked(request),
    videoPath: "/assets/vault-intro.mp4",
  };
}

export function buildPublicConfig() {
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
    },
  };
}

export function isVaultConfigured() {
  return Boolean(getVaultPassword());
}

export function isVaultUnlocked(request) {
  if (!isVaultConfigured()) {
    return false;
  }

  const cookies = parseCookies(request.headers.cookie || "");
  return safeEqualString(cookies[VAULT_COOKIE_NAME] || "", getVaultCookieValue());
}

export async function handleVaultVerify(request, response) {
  if (!isVaultConfigured()) {
    return sendJson(response, 503, {
      error: "vault_not_configured",
      message: "Set VAULT_PASSWORD before using the vault.",
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

  if (!safeEqualString(submittedPassword, getVaultPassword())) {
    return sendJson(
      response,
      401,
      {
        error: "invalid_password",
        message: "Incorrect vault password.",
      },
      {
        "Set-Cookie": buildExpiredVaultCookie(),
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
      "Set-Cookie": buildVaultCookieHeader(),
    }
  );
}

export function sendJson(response, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders,
  });
  response.end(body);
}

export function sendText(response, statusCode, text, extraHeaders = {}) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    ...extraHeaders,
  });
  response.end(text);
}

function getVaultPassword() {
  return process.env.VAULT_PASSWORD || "";
}

function getVaultCookieValue() {
  const vaultPassword = getVaultPassword();
  return vaultPassword ? buildVaultCookieValue(vaultPassword) : "";
}

function buildVaultCookieValue(password) {
  return `${VAULT_COOKIE_NAME}.${createHmac(
    "sha256",
    process.env.VAULT_SESSION_SECRET || password
  )
    .update("100gigz-vault")
    .digest("hex")}`;
}

function buildVaultCookieHeader() {
  return `${VAULT_COOKIE_NAME}=${getVaultCookieValue()}; Path=/; HttpOnly; SameSite=Lax`;
}

function buildExpiredVaultCookie() {
  return `${VAULT_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
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

function parseCsv(value) {
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function loadEnvFile(filePath, override = false) {
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

    if (override || !(key in process.env)) {
      process.env[key] = value;
    }
  });
}
