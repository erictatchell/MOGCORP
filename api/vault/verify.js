import { handleVaultVerify, sendText } from "../_lib/backend.js";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return sendText(response, 405, "Method Not Allowed", {
      Allow: "POST",
    });
  }

  return handleVaultVerify(request, response);
}
