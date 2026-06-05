import { buildVaultStatus, sendJson } from "../_lib/backend.js";

export default function handler(request, response) {
  return sendJson(response, 200, buildVaultStatus(request));
}
