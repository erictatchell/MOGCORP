import { sendJson } from "./_lib/backend.js";

export default function handler(_request, response) {
  return sendJson(response, 200, {
    ok: true,
    date: new Date().toISOString(),
  });
}
