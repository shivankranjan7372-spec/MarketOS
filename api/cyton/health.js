// Vercel Serverless Function: GET /api/cyton/health
// Reports non-secret availability of server-side AI providers, OAuth apps, and billing status.

function buildCapabilities() {
  return {
    ok: true,
    service: "cyton-serverless-gateway",
    timestamp: new Date().toISOString(),
    providers: {
      gemini: {
        configuredOnServer: Boolean(process.env.GEMINI_API_KEY),
        defaultModel: process.env.CYTON_GEMINI_MODEL || "gemini-2.5-flash",
        supportsVision: true
      },
      openai: {
        configuredOnServer: Boolean(process.env.OPENAI_API_KEY),
        defaultModel: process.env.CYTON_OPENAI_MODEL || "gpt-4o-mini",
        supportsVision: true
      },
      anthropic: {
        configuredOnServer: Boolean(process.env.ANTHROPIC_API_KEY),
        defaultModel: process.env.CYTON_ANTHROPIC_MODEL || "claude-3-5-sonnet-latest",
        supportsVision: true
      },
      openrouter: {
        configuredOnServer: Boolean(process.env.OPENROUTER_API_KEY),
        defaultModel: process.env.CYTON_OPENROUTER_MODEL || "google/gemini-2.5-flash",
        supportsVision: true
      }
    },
    integrations: {
      gmail: { oauthConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET), emailDeliveryConfigured: Boolean(process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY) },
      google_drive: { oauthConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) },
      google_calendar: { oauthConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) },
      youtube: { oauthConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) },
      instagram: { oauthConfigured: Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET) },
      facebook: { oauthConfigured: Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET) },
      linkedin: { oauthConfigured: Boolean(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) },
      x: { oauthConfigured: Boolean(process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET) },
      canva: { oauthConfigured: Boolean(process.env.CANVA_CLIENT_ID && process.env.CANVA_CLIENT_SECRET) },
      slack: { oauthConfigured: Boolean(process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET) },
      notion: { oauthConfigured: Boolean(process.env.NOTION_CLIENT_ID && process.env.NOTION_CLIENT_SECRET) },
      discord: { oauthConfigured: Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) },
      email_esp: { emailDeliveryConfigured: Boolean(process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY) },
      website_research: { liveServerFetchAvailable: true }
    },
    billing: {
      configured: Boolean(process.env.STRIPE_SECRET_KEY),
      mode: process.env.STRIPE_SECRET_KEY ? "live_or_test_stripe" : "development_preview"
    }
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed. Use GET." });
  }
  return res.status(200).json(buildCapabilities());
};

module.exports.buildCapabilities = buildCapabilities;
