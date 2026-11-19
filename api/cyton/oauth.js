// Vercel Serverless Function: GET /api/cyton/oauth
// Returns genuine OAuth configuration status and authorization URLs when server client credentials exist.

const OAUTH_CATALOG = {
  gmail: {
    name: "Gmail",
    envVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    scopes: ["https://www.googleapis.com/auth/gmail.compose", "https://www.googleapis.com/auth/gmail.readonly"],
    clientIdEnv: "GOOGLE_CLIENT_ID",
    secretEnv: "GOOGLE_CLIENT_SECRET"
  },
  google_drive: {
    name: "Google Drive",
    envVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    scopes: ["https://www.googleapis.com/auth/drive.file"],
    clientIdEnv: "GOOGLE_CLIENT_ID",
    secretEnv: "GOOGLE_CLIENT_SECRET"
  },
  google_calendar: {
    name: "Google Calendar",
    envVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    scopes: ["https://www.googleapis.com/auth/calendar.events"],
    clientIdEnv: "GOOGLE_CLIENT_ID",
    secretEnv: "GOOGLE_CLIENT_SECRET"
  },
  youtube: {
    name: "YouTube",
    envVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    scopes: ["https://www.googleapis.com/auth/youtube.readonly", "https://www.googleapis.com/auth/youtube.upload"],
    clientIdEnv: "GOOGLE_CLIENT_ID",
    secretEnv: "GOOGLE_CLIENT_SECRET"
  },
  instagram: {
    name: "Instagram",
    envVars: ["META_APP_ID", "META_APP_SECRET"],
    authUrl: "https://www.facebook.com/v20.0/dialog/oauth",
    scopes: ["instagram_basic", "instagram_content_publish", "pages_show_list"],
    clientIdEnv: "META_APP_ID",
    secretEnv: "META_APP_SECRET"
  },
  facebook: {
    name: "Facebook",
    envVars: ["META_APP_ID", "META_APP_SECRET"],
    authUrl: "https://www.facebook.com/v20.0/dialog/oauth",
    scopes: ["pages_manage_posts", "pages_read_engagement"],
    clientIdEnv: "META_APP_ID",
    secretEnv: "META_APP_SECRET"
  },
  linkedin: {
    name: "LinkedIn",
    envVars: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    scopes: ["openid", "profile", "w_member_social"],
    clientIdEnv: "LINKEDIN_CLIENT_ID",
    secretEnv: "LINKEDIN_CLIENT_SECRET"
  },
  x: {
    name: "X (Twitter)",
    envVars: ["X_CLIENT_ID", "X_CLIENT_SECRET"],
    authUrl: "https://twitter.com/i/oauth2/authorize",
    scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
    clientIdEnv: "X_CLIENT_ID",
    secretEnv: "X_CLIENT_SECRET"
  },
  canva: {
    name: "Canva",
    envVars: ["CANVA_CLIENT_ID", "CANVA_CLIENT_SECRET"],
    authUrl: "https://www.canva.com/api/oauth/authorize",
    scopes: ["design:content:read", "design:content:write"],
    clientIdEnv: "CANVA_CLIENT_ID",
    secretEnv: "CANVA_CLIENT_SECRET"
  },
  slack: {
    name: "Slack",
    envVars: ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET"],
    authUrl: "https://slack.com/oauth/v2/authorize",
    scopes: ["chat:write", "channels:read"],
    clientIdEnv: "SLACK_CLIENT_ID",
    secretEnv: "SLACK_CLIENT_SECRET"
  },
  notion: {
    name: "Notion",
    envVars: ["NOTION_CLIENT_ID", "NOTION_CLIENT_SECRET"],
    authUrl: "https://api.notion.com/v1/oauth/authorize",
    scopes: ["read_content", "insert_content"],
    clientIdEnv: "NOTION_CLIENT_ID",
    secretEnv: "NOTION_CLIENT_SECRET"
  },
  discord: {
    name: "Discord",
    envVars: ["DISCORD_CLIENT_ID", "DISCORD_CLIENT_SECRET"],
    authUrl: "https://discord.com/oauth2/authorize",
    scopes: ["identify", "webhook.incoming"],
    clientIdEnv: "DISCORD_CLIENT_ID",
    secretEnv: "DISCORD_CLIENT_SECRET"
  }
};

function inspectOAuthProvider(providerKey, origin = "https://marketosai.vercel.app") {
  const key = String(providerKey || "").toLowerCase().trim();
  const cfg = OAUTH_CATALOG[key];
  if (!cfg) {
    return { ok: false, error: `Unknown OAuth provider '${key}'.`, statusCode: 400 };
  }

  const clientId = process.env[cfg.clientIdEnv] || "";
  const clientSecret = process.env[cfg.secretEnv] || "";
  const configured = Boolean(clientId && clientSecret);
  const redirectUri = `${origin.replace(/\/$/, "")}/api/cyton/oauth?provider=${encodeURIComponent(key)}&callback=1`;

  if (!configured) {
    return {
      ok: true,
      provider: key,
      name: cfg.name,
      configured: false,
      scopes: cfg.scopes,
      requiredEnvVars: cfg.envVars,
      redirectUri,
      message: `${cfg.name} OAuth requires ${cfg.envVars.join(" & ")} configured in Vercel Environment Variables.`
    };
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: cfg.scopes.join(" "),
    state: `cyton_${key}_${Date.now()}`
  });

  return {
    ok: true,
    provider: key,
    name: cfg.name,
    configured: true,
    scopes: cfg.scopes,
    authorizationUrl: `${cfg.authUrl}?${params.toString()}`,
    redirectUri
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed. Use GET." });
  }

  const provider = req.query?.provider || "";
  if (req.query?.callback === "1") {
    const code = req.query?.code;
    const err = req.query?.error;
    if (err) {
      return res.status(400).json({
        ok: false,
        provider,
        error: `OAuth authorization declined: ${err}`
      });
    }
    return res.status(200).json({
      ok: Boolean(code),
      provider,
      message: code
        ? "Authorization code received. Complete token exchange with your backend token store before marking connected."
        : "Missing authorization code."
    });
  }

  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "marketosai.vercel.app";
  const result = inspectOAuthProvider(provider, `${proto}://${host}`);
  return res.status(result.statusCode || 200).json(result);
};

module.exports.inspectOAuthProvider = inspectOAuthProvider;
module.exports.OAUTH_CATALOG = OAUTH_CATALOG;
