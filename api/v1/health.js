import { applyCors, sendJson } from "./_utils.js";

export default async function handler(req, res) {
  if (applyCors(req, res)) {
    return;
  }

  sendJson(res, 200, {
    success: true,
    service: "snapcut-api",
    timestamp: new Date().toISOString(),
  });
}
