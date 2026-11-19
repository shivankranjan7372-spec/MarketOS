"use strict";

const {
  CYTON_AGENTS,
  CYTON_TOOLS,
  VERIFIED_MARKETOS_ENDPOINTS
} = require("../_lib/cytonPolicy");

module.exports = function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  res.status(200).json({
    ok: true,
    engine: "CYTON",
    subtitle: "MarketOS Intelligence Engine",
    phase: 1,
    serverGeminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    firebaseAuthConfigured: Boolean(process.env.FIREBASE_WEB_API_KEY),
    agents: Object.values(CYTON_AGENTS).map((a) => ({
      id: a.id,
      displayName: a.displayName,
      scope: a.scope,
      allowedTools: a.allowedTools
    })),
    toolsCount: Object.keys(CYTON_TOOLS).length,
    verifiedEndpoints: VERIFIED_MARKETOS_ENDPOINTS,
    timestamp: new Date().toISOString()
  });
};
