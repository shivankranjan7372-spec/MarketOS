// Vercel Serverless Function: POST /api/cyton/execute
// Enforces human approval gates, SSRF protection, and real external execution checks.

const APPROVAL_REQUIRED_CLASSES = new Set(["PUBLISH", "SEND", "DELETE", "SPEND"]);

function isBlockedPrivateHost(hostname) {
  const host = String(hostname || "").toLowerCase().trim();
  if (!host) return true;
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "::1" ||
    host === "[::1]"
  ) {
    return true;
  }
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true;
  }
  return false;
}

function decodeHtmlText(str) {
  return String(str || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function runSafeWebsiteResearch(rawUrl) {
  let normalized = String(rawUrl || "").trim();
  if (!normalized) throw new Error("Provide a website URL to research.");
  if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`;
  const parsed = new URL(normalized);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http and https URLs are permitted.");
  }
  if (isBlockedPrivateHost(parsed.hostname)) {
    throw new Error("Private, loopback, and link-local network addresses are blocked for security.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(parsed.toString(), {
      method: "GET",
      headers: { "User-Agent": "CytonResearchBot/1.0 (+https://marketosai.vercel.app)" },
      signal: controller.signal
    });
    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const metaDescMatch =
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const linkMatches = html.match(/<a\s+[^>]*href=/gi) || [];
    const plain = decodeHtmlText(html);
    const wordCount = plain ? plain.split(" ").filter(Boolean).length : 0;

    return {
      ok: true,
      verifiedLiveFetch: true,
      url: parsed.toString(),
      httpStatus: res.status,
      title: decodeHtmlText(titleMatch?.[1] || "") || "(No <title> found)",
      metaDescription: decodeHtmlText(metaDescMatch?.[1] || "") || "(No meta description found)",
      primaryH1: decodeHtmlText(h1Match?.[1] || "") || "(No <h1> found)",
      linkCount: linkMatches.length,
      wordCount,
      excerpt: plain.slice(0, 700),
      fetchedAt: new Date().toISOString()
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function executeEmailSend({ to, subject, body, fromName }) {
  const cleanTo = String(to || "").trim();
  const cleanSubject = String(subject || "").trim();
  const cleanBody = String(body || "").trim();
  if (!cleanTo || !cleanTo.includes("@")) {
    throw new Error("Valid recipient email address is required.");
  }
  if (!cleanSubject || !cleanBody) {
    throw new Error("Email subject and body are required.");
  }

  if (process.env.RESEND_API_KEY) {
    const fromAddr = process.env.CYTON_FROM_EMAIL || "Cyton AI <onboarding@resend.dev>";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: fromName ? `${fromName} <${fromAddr.replace(/^.*<|>$/g, "")}>` : fromAddr,
        to: [cleanTo],
        subject: cleanSubject,
        text: cleanBody
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.message || `Email provider returned HTTP ${res.status}`);
    }
    return {
      ok: true,
      executed: true,
      provider: "resend",
      messageId: data.id || "",
      to: cleanTo,
      subject: cleanSubject
    };
  }

  if (process.env.SENDGRID_API_KEY && process.env.CYTON_FROM_EMAIL) {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: cleanTo }] }],
        from: { email: process.env.CYTON_FROM_EMAIL, name: fromName || "Cyton AI" },
        subject: cleanSubject,
        content: [{ type: "text/plain", value: cleanBody }]
      })
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`SendGrid returned HTTP ${res.status}: ${txt.slice(0, 180)}`);
    }
    return {
      ok: true,
      executed: true,
      provider: "sendgrid",
      to: cleanTo,
      subject: cleanSubject
    };
  }

  return {
    ok: false,
    executed: false,
    statusCode: 501,
    code: "INTEGRATION_NOT_CONFIGURED",
    error: "No server email transport configured. Set RESEND_API_KEY (or SENDGRID_API_KEY + CYTON_FROM_EMAIL) in Vercel Environment Variables, or open the draft in your email client.",
    mailtoUrl: `mailto:${encodeURIComponent(cleanTo)}?subject=${encodeURIComponent(cleanSubject)}&body=${encodeURIComponent(cleanBody)}`
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed. Use POST." });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const actionType = String(body.actionType || "").toUpperCase().trim();
  const actionClass = String(body.actionClass || "CREATE").toUpperCase().trim();
  const explicitApproval = body.explicitApproval === true;
  const payload = body.payload && typeof body.payload === "object" ? body.payload : {};

  if (!actionType) {
    return res.status(400).json({ ok: false, error: "Missing actionType." });
  }

  if (APPROVAL_REQUIRED_CLASSES.has(actionClass) && !explicitApproval) {
    return res.status(403).json({
      ok: false,
      executed: false,
      code: "APPROVAL_REQUIRED",
      error: `Action '${actionType}' (${actionClass}) requires explicit owner confirmation before execution.`
    });
  }

  try {
    if (actionType === "WEBSITE_RESEARCH") {
      const result = await runSafeWebsiteResearch(payload.url);
      return res.status(200).json(result);
    }

    if (actionType === "SEND_EMAIL") {
      const result = await executeEmailSend(payload);
      return res.status(result.statusCode || 200).json(result);
    }

    if (actionType === "PUBLISH_SOCIAL") {
      const platform = String(payload.platform || "Social Platform");
      return res.status(501).json({
        ok: false,
        executed: false,
        code: "INTEGRATION_NOT_CONNECTED",
        platform,
        error: `${platform} direct API publishing is not authorized with an active OAuth access token on this backend. Draft preserved for manual export or OAuth setup.`
      });
    }

    return res.status(400).json({
      ok: false,
      executed: false,
      error: `Unsupported execution actionType '${actionType}'.`
    });
  } catch (err) {
    return res.status(400).json({
      ok: false,
      executed: false,
      error: err?.message || "Execution failed."
    });
  }
};

module.exports.isBlockedPrivateHost = isBlockedPrivateHost;
module.exports.runSafeWebsiteResearch = runSafeWebsiteResearch;
module.exports.executeEmailSend = executeEmailSend;
