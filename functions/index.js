import { createHmac, timingSafeEqual } from "node:crypto";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

const vaultPasswordSecret = defineSecret("VAULT_PASSWORD");
const VAULT_COOKIE_NAME = "vault_access";
const VAULT_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const DEFAULT_PUBLIC_CONFIG = {
  adminEmails: ["erictatch@gmail.com"],
  firebaseConfig: {
    apiKey: "AIzaSyCuJNvQ7PmfC1j-IJ19u6VaYy1cPq4ipCk",
    authDomain: "mgc-1-9f15d.firebaseapp.com",
    projectId: "mgc-1-9f15d",
    storageBucket: "mgc-1-9f15d.firebasestorage.app",
    messagingSenderId: "513728179403",
    appId: "1:513728179403:web:cd5ec516cc321f2d5fbf4e",
    measurementId: "G-6LFTL9Z8Y7",
  },
  collections: {
    users: "users",
    trips: "trips",
    settings: "settings",
  },
};

export const api = onRequest(
  {
    region: "us-central1",
    secrets: [vaultPasswordSecret],
  },
  async (request, response) => {
    try {
      const requestUrl = new URL(
        request.url || "/",
        `https://${request.headers.host || "localhost"}`
      );
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

        return handleVaultLogout(request, response);
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

      if (pathname === "/api/health") {
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

      return sendJson(response, 404, {
        error: "not_found",
        message: "Unknown API route.",
      });
    } catch (error) {
      return sendJson(response, 500, {
        error: "server_error",
        message: error instanceof Error ? error.message : "Unknown server error",
      });
    }
  }
);

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
    adminEmails: parseCsv(
      process.env.ADMIN_EMAILS || DEFAULT_PUBLIC_CONFIG.adminEmails.join(",")
    ),
    firebaseConfig: {
      apiKey:
        process.env.FIREBASE_API_KEY ||
        DEFAULT_PUBLIC_CONFIG.firebaseConfig.apiKey,
      authDomain:
        process.env.FIREBASE_AUTH_DOMAIN ||
        DEFAULT_PUBLIC_CONFIG.firebaseConfig.authDomain,
      projectId:
        process.env.FIREBASE_PROJECT_ID ||
        DEFAULT_PUBLIC_CONFIG.firebaseConfig.projectId,
      storageBucket:
        process.env.FIREBASE_STORAGE_BUCKET ||
        DEFAULT_PUBLIC_CONFIG.firebaseConfig.storageBucket,
      messagingSenderId:
        process.env.FIREBASE_MESSAGING_SENDER_ID ||
        DEFAULT_PUBLIC_CONFIG.firebaseConfig.messagingSenderId,
      appId:
        process.env.FIREBASE_APP_ID ||
        DEFAULT_PUBLIC_CONFIG.firebaseConfig.appId,
      measurementId:
        process.env.FIREBASE_MEASUREMENT_ID ||
        DEFAULT_PUBLIC_CONFIG.firebaseConfig.measurementId,
    },
    collections: {
      users:
        process.env.FIREBASE_USERS_COLLECTION ||
        DEFAULT_PUBLIC_CONFIG.collections.users,
      trips:
        process.env.FIREBASE_TRIPS_COLLECTION ||
        DEFAULT_PUBLIC_CONFIG.collections.trips,
      settings:
        process.env.FIREBASE_SETTINGS_COLLECTION ||
        DEFAULT_PUBLIC_CONFIG.collections.settings,
    },
  };
}

async function handleVaultVerify(request, response) {
  if (!isVaultConfigured()) {
    return sendJson(response, 503, {
      error: "vault_not_configured",
      message: "Set VAULT_PASSWORD before using the vault.",
    });
  }

  let payload = null;

  try {
    payload = await readJsonPayload(request);
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

function handleVaultLogout(request, response) {
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

function sendJson(response, statusCode, payload, extraHeaders = {}) {
  response.status(statusCode);
  response.set({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders,
  });
  response.send(JSON.stringify(payload));
}

function sendText(response, statusCode, text, extraHeaders = {}) {
  response.status(statusCode);
  response.set({
    "Content-Type": "text/plain; charset=utf-8",
    ...extraHeaders,
  });
  response.send(text);
}

function isVaultConfigured() {
  return Boolean(getVaultPassword());
}

function isVaultUnlocked(request) {
  if (!isVaultConfigured()) {
    return false;
  }

  const cookies = parseCookies(request.headers.cookie || "");
  return safeEqualString(cookies[VAULT_COOKIE_NAME] || "", getVaultCookieValue());
}

function getVaultPassword() {
  return process.env.VAULT_PASSWORD || getSecretValue(vaultPasswordSecret);
}

function getSecretValue(secretParam) {
  try {
    return secretParam.value() || "";
  } catch {
    return "";
  }
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

function buildVaultCookieHeader(request) {
  const expiresAt = new Date(
    Date.now() + VAULT_COOKIE_MAX_AGE_SECONDS * 1000
  ).toUTCString();

  return [
    `${VAULT_COOKIE_NAME}=${getVaultCookieValue()}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${VAULT_COOKIE_MAX_AGE_SECONDS}`,
    `Expires=${expiresAt}`,
    isHttpsRequest(request) ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

function buildExpiredVaultCookie(request) {
  return [
    `${VAULT_COOKIE_NAME}=`,
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

  return forwardedProto === "https" || Boolean(request?.secure);
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

async function readJsonPayload(request) {
  if (
    request.body &&
    typeof request.body === "object" &&
    !Buffer.isBuffer(request.body)
  ) {
    return request.body;
  }

  if (Buffer.isBuffer(request.rawBody)) {
    const rawBody = request.rawBody.toString("utf8");
    return rawBody ? JSON.parse(rawBody) : {};
  }

  const rawBody = await readRequestBody(request);
  return rawBody ? JSON.parse(rawBody) : {};
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
