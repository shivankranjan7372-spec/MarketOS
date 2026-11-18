import { AI_MODULES, CONTENT_TYPES, findCountryByCode } from "./catalog.js";
import { getSavedPreferences } from "./storage.js";

const MARKETING_SCHEMA = {
  type: "OBJECT",
  properties: {
    selectedModule: {
      type: "STRING",
      enum: Object.keys(AI_MODULES)
    },
    summary: { type: "STRING" },
    contentTitle: { type: "STRING" },
    contentType: {
      type: "STRING",
      enum: Object.keys(CONTENT_TYPES)
    },
    targetPlatform: { type: "STRING" },
    generatedBody: { type: "STRING" },
    hashtags: { type: "STRING" },
    strategicNotes: { type: "STRING" },
    suggestedBudgetAmount: { type: "NUMBER" },
    suggestedCampaignTitle: { type: "STRING" }
  },
  required: [
    "selectedModule",
    "summary",
    "contentTitle",
    "contentType",
    "targetPlatform",
    "generatedBody",
    "strategicNotes"
  ]
};

export async function orchestrateMarketOsAi({
  prompt,
  business,
  requestedModule = null,
  extraContext = "",
  imageAttachment = null // { mimeType, base64Data }
}) {
  const prefs = getSavedPreferences();
  const apiKey = prefs.geminiKey;
  if (!apiKey) {
    throw new Error(
      "AI_KEY_MISSING: Add your Gemini API Key in Settings (or click 'Connect Gemini AI') to run live AI orchestration on the web."
    );
  }

  const model = prefs.geminiModel || "gemini-2.5-flash";
  const country = findCountryByCode(business.countryCode);

  const systemPrompt = [
    "You are MarketOS Central AI Orchestrator — an international AI marketing department for small businesses.",
    "Active Business Profile:",
    `- Name: ${business.name}`,
    `- Industry: ${business.industry}`,
    `- Country: ${business.countryName} (${business.countryCode}) | City/Region: ${business.city || ""}, ${business.stateRegion || ""}`,
    `- Billing Currency: ${business.billingCurrency} | Display Currency: ${business.displayCurrency}`,
    `- Language: ${business.language} | Time Zone: ${business.timeZone}`,
    `- Website: ${business.websiteUrl || "Not provided"}`,
    `- Brand Voice: ${business.brandVoice || "Professional, clear, conversion-focused"}`,
    `- Target Audience: ${business.targetAudience || "Local & regional customers"}`,
    `- Brand Guidelines: ${business.brandGuidelines || "Consistent, trustworthy messaging"}`,
    `- Visual Direction: ${business.visualDirection || "Clean modern visuals"}`,
    requestedModule && requestedModule !== "GENERAL_ASSISTANT"
      ? `Preferred Module: ${requestedModule} (${AI_MODULES[requestedModule]?.displayName || requestedModule})`
      : "",
    extraContext ? `Additional Grounded Context:\n${extraContext}` : "",
    "Rules:",
    `1. Adapt festivals, holidays, idioms, pricing, and currency strictly to ${business.countryName} (${business.billingCurrency}).`,
    "2. Never fabricate SEO domain authority, traffic numbers, or analytics metrics not present in Additional Grounded Context.",
    "3. Never state that paid ads or posts are auto-launched; every deliverable enters human owner approval first.",
    `User Request: ${prompt}`
  ]
    .filter(Boolean)
    .join("\n");

  const parts = [{ text: systemPrompt }];
  if (imageAttachment && imageAttachment.base64Data) {
    parts.push({
      inlineData: {
        mimeType: imageAttachment.mimeType || "image/jpeg",
        data: imageAttachment.base64Data
      }
    });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const payload = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: MARKETING_SCHEMA,
      temperature: 0.7
    }
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55000);

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    let message = `Gemini API error (HTTP ${response.status})`;
    try {
      const errJson = JSON.parse(errText);
      if (errJson?.error?.message) message = errJson.error.message;
    } catch {}
    throw new Error(message);
  }

  const data = await response.json();
  const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawJson) {
    throw new Error("AI model returned an empty response.");
  }

  const parsed = JSON.parse(rawJson);
  const selectedModule = AI_MODULES[parsed.selectedModule]
    ? parsed.selectedModule
    : requestedModule || "GENERAL_ASSISTANT";
  const contentType = CONTENT_TYPES[parsed.contentType] ? parsed.contentType : "SOCIAL_POST";
  const estimatedTokens = Math.max(120, Math.round((systemPrompt.length + rawJson.length) / 4));

  return {
    selectedModule,
    summary: parsed.summary || "Generated marketing deliverable.",
    contentTitle: String(parsed.contentTitle || `${AI_MODULES[selectedModule].displayName} Draft`).slice(0, 160),
    contentType,
    targetPlatform: String(parsed.targetPlatform || (country.code === "IN" ? "Instagram" : "Multi-Channel")).slice(0, 40),
    generatedBody: String(parsed.generatedBody || parsed.summary || `Draft generated for ${business.name}.`).slice(0, 8000),
    hashtags: String(parsed.hashtags || "").slice(0, 500),
    strategicNotes: String(parsed.strategicNotes || ""),
    suggestedBudgetAmount:
      typeof parsed.suggestedBudgetAmount === "number" && parsed.suggestedBudgetAmount > 0
        ? parsed.suggestedBudgetAmount
        : 0,
    suggestedCampaignTitle: String(parsed.suggestedCampaignTitle || "").slice(0, 140),
    estimatedTokens
  };
}

export async function inspectWebsiteSeoMetadata(rawUrl) {
  let normalized = String(rawUrl || "").trim();
  if (!normalized) throw new Error("Enter a valid website URL first.");
  if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`;

  let html = "";
  let httpStatus = 200;

  // Attempt direct fetch first (succeeds for CORS-enabled origins), then public CORS-safe proxy fallback
  try {
    const res = await fetch(normalized, { method: "GET" });
    httpStatus = res.status;
    if (res.ok) {
      html = await res.text();
    }
  } catch {
    // Expected for CORS-restricted external websites in browser; try read-only AllOrigins fallback
    const proxyRes = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(normalized)}`);
    if (!proxyRes.ok) {
      throw new Error(`Unable to fetch ${normalized} from browser (HTTP ${proxyRes.status}).`);
    }
    const wrapper = await proxyRes.json();
    html = wrapper?.contents || "";
    httpStatus = wrapper?.status?.http_code || 200;
  }

  if (!html) {
    throw new Error(`Received empty HTML response from ${normalized}.`);
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  const title = (doc.querySelector("title")?.textContent || "").trim() || "(No <title> tag found)";
  const metaDescription =
    (
      doc.querySelector('meta[name="description"]')?.getAttribute("content") ||
      doc.querySelector('meta[property="og:description"]')?.getAttribute("content") ||
      ""
    ).trim() || "(No meta description found)";
  const primaryHeading = (doc.querySelector("h1")?.textContent || "").trim() || "(No <h1> found)";
  const plainText = (doc.body?.textContent || "").replace(/\s+/g, " ").trim();
  const wordCountEstimate = plainText ? plainText.split(" ").filter(Boolean).length : 0;

  return {
    url: normalized,
    httpStatus,
    title,
    metaDescription,
    primaryHeading,
    wordCountEstimate,
    fetchedAtMillis: Date.now()
  };
}
