import { buildPublicConfig, isVaultUnlocked, sendJson } from "./_lib/backend.js";

export default function handler(request, response) {
  if (!isVaultUnlocked(request)) {
    return sendJson(response, 403, {
      error: "vault_locked",
      message: "Vault is still locked.",
    });
  }

  return sendJson(response, 200, buildPublicConfig());
}
