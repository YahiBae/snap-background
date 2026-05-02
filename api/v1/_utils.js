export const applyCors = (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,x-api-key,X-File-Name,x-owner-email,x-plan-limit");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return true;
  }

  return false;
};

export const sendJson = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
};

export const readRawBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

export const requireApiKeyIfConfigured = (req, res) => {
  const configured = String(process.env.REMOVE_BG_API_KEY || "").trim();
  if (!configured) {
    return true;
  }

  const provided = String(req.headers["x-api-key"] || "").trim();
  if (provided !== configured) {
    sendJson(res, 401, { error: "Unauthorized" });
    return false;
  }

  return true;
};
