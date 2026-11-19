// Vercel Serverless Function: POST /api/cyton/orchestrate
// Cyton Intelligence Engine & Multi-Provider Model Gateway

const CATEGORIES = [
  "Marketing",
  "Business strategy",
  "Social media",
  "Content creation",
  "Graphic design",
  "Research",
  "Email communication",
  "Productivity",
  "Document creation",
  "Data analysis",
  "Education",
  "Coding",
  "Website development",
  "Project management",
  "General assistance"
];

const ACTION_CLASSES = ["READ", "CREATE", "MODIFY", "PUBLISH", "SEND", "DELETE"];
const AGENT_ROLES = ["ANALYST", "MARKETING", "CREATIVE", "FINANCE", "GROWTH", "OPERATIONS"];
const DELIVERABLE_TYPES = [
  "STRATEGY",
  "SOCIAL_POST",
  "EMAIL",
  "DOCUMENT",
  "PRESENTATION",
  "AD_COPY",
  "RESEARCH",
  "CODE",
  "TASK_LIST",
  "IMAGE_PROMPT"
];

// Sliding-window in-memory rate limiter (30 requests per minute per user/IP key)
const rateBuckets = new Map();
function checkRateLimit(bucketKey, maxPerMin = 30) {
  const now = Date.now();
  const windowStart = now - 60000;
  const arr = (rateBuckets.get(bucketKey) || []).filter((ts) => ts > windowStart);
  if (arr.length >= maxPerMin) {
    rateBuckets.set(bucketKey, arr);
    return false;
  }
  arr.push(now);
  rateBuckets.set(bucketKey, arr);
  return true;
}

function classifyFallbackCategory(prompt) {
  const p = String(prompt || "").toLowerCase();
  if (/instagram|facebook|linkedin|youtube|tiktok|caption|reel|hashtag|tweet|social/.test(p)) return "Social media";
  if (/email|outreach|newsletter|follow[- ]?up|supplier|cold mail|subject line/.test(p)) return "Email communication";
  if (/competitor|research|market analysis|trend|scrape|audit url|website/.test(p)) return "Research";
  if (/presentation|deck|slides|pdf|proposal|report|brief|document|spreadsheet|csv/.test(p)) return "Document creation";
  if (/poster|banner|thumbnail|ad concept|creative|image prompt|logo|visual|design/.test(p)) return "Graphic design";
  if (/code|script|api|react|kotlin|python|javascript|html|css|bug|website dev/.test(p)) return /website|landing/.test(p) ? "Website development" : "Coding";
  if (/schedule|weekly plan|task list|to-?do|project|roadmap|milestone/.test(p)) return "Project management";
  if (/pricing|revenue|business plan|startup|acquisition|financial/.test(p)) return "Business strategy";
  if (/campaign|marketing|launch|ad copy|seo/.test(p)) return "Marketing";
  return "General assistance";
}

function buildCytonSystemInstruction({ business, project, memoryItems, integrations, customInstructions, userPrompt }) {
  const memText = Array.isArray(memoryItems) && memoryItems.length
    ? memoryItems
        .slice(0, 12)
        .map((m) => `- [${m.memoryType || "CONTEXT"}] ${m.title}: ${String(m.content || "").slice(0, 240)}`)
        .join("\n")
    : "None saved yet.";

  const connectedList = Array.isArray(integrations)
    ? integrations
        .filter((i) => i.status === "CONNECTED")
        .map((i) => i.name || i.provider)
        .join(", ")
    : "";

  return [
    "You are CYTON — an AI Productivity and Autonomous Execution Operations Manager.",
    'Philosophy: "Don\'t just ask AI. Get the work done."',
    "Note: Cyton is the orchestration layer powered by configurable underlying AI models; never claim to be a custom-trained foundation model.",
    "",
    "ACTIVE BUSINESS / WORKSPACE CONTEXT:",
    business
      ? `- Business: ${business.name} (${business.industry}) | Country: ${business.countryName} (${business.countryCode}) | Billing Currency: ${business.billingCurrency} | Display Currency: ${business.displayCurrency} | Language: ${business.language} | Timezone: ${business.timeZone}`
      : "- No business profile provided.",
    business?.brandVoice ? `- Brand Voice: ${business.brandVoice}` : "",
    business?.targetAudience ? `- Target Audience: ${business.targetAudience}` : "",
    business?.websiteUrl ? `- Website: ${business.websiteUrl}` : "",
    project ? `\nACTIVE PROJECT: ${project.name}\n- Description/Instructions: ${project.objective || ""}` : "",
    `\nSCOPED MEMORY CONTEXT:\n${memText}`,
    `\nCONNECTED EXTERNAL INTEGRATIONS: ${connectedList || "None currently authorized via OAuth (external publish/send actions must remain drafts or ask approval + configuration)."}`,
    customInstructions ? `\nUSER CUSTOMISATION INSTRUCTIONS:\n${customInstructions}` : "",
    "",
    "STRICT EXECUTION & HONESTY RULES:",
    "1. Classify the request into one of the exact 15 categories: " + CATEGORIES.join(", "),
    "2. Break complex requests into an actionable multi-step executionPlan with clear actionClass (READ, CREATE, MODIFY, PUBLISH, SEND, DELETE) and assignedAgent (ANALYST, MARKETING, CREATIVE, FINANCE, GROWTH, OPERATIONS).",
    "3. Mark planning/drafting steps that you produce right now as COMPLETED. Mark any external action (publishing social posts, sending emails, running paid ads, modifying live sites, deleting files) as WAITING_APPROVAL with requiresApproval: true. NEVER pretend an external action has been published or sent.",
    "4. Produce concrete, ready-to-use deliverables in the deliverables array (strategies, email drafts with Subject + Body, social captions + hashtags, slide-by-slide presentation outlines separated by '---', CSV-ready data if tabular, image generation prompts, code, or project task lists).",
    "5. If critical info is missing (e.g., product price, target city, recipient email), still provide a strong structured starter plan AND list concise questions in missingInfoQuestions.",
    "6. Clearly distinguish verified workspace data from estimates or AI recommendations.",
    "7. Return STRICT valid JSON only (no markdown code fences outside the JSON) matching this exact shape:",
    JSON.stringify({
      category: "One of the 15 categories",
      statusSummary: "Short summary of what Cyton understood, planned, and created.",
      assistantReply: "Clear, executive natural-language response summarizing deliverables and next steps.",
      missingInfoQuestions: ["Optional concise clarifying question if needed"],
      executionPlan: [
        {
          stepTitle: "Step title",
          assignedAgent: "MARKETING",
          actionClass: "CREATE",
          status: "COMPLETED | RUNNING | PENDING | WAITING_APPROVAL",
          requiresApproval: false,
          outputDetail: "What this step produced or requires before execution"
        }
      ],
      deliverables: [
        {
          title: "Deliverable title",
          type: "STRATEGY | SOCIAL_POST | EMAIL | DOCUMENT | PRESENTATION | AD_COPY | RESEARCH | CODE | TASK_LIST | IMAGE_PROMPT",
          platform: "Instagram | Email | Document | Presentation | Web | Multi-Channel",
          content: "Full ready-to-use deliverable content",
          hashtags: "#optional #tags",
          filename: "suggested-filename.md"
        }
      ],
      suggestedNextActions: ["Concise follow-up action 1", "Concise follow-up action 2"],
      memoryCandidate: {
        title: "Optional non-sensitive preference or decision title (or empty string)",
        content: "Optional summary to save if user confirms",
        memoryType: "PREFERENCE"
      }
    }),
    "",
    `USER REQUEST:\n${userPrompt}`
  ]
    .filter(Boolean)
    .join("\n");
}

function extractJsonObject(rawText) {
  const txt = String(rawText || "").trim();
  if (!txt) throw new Error("Provider returned empty response.");
  try {
    return JSON.parse(txt);
  } catch {
    const fenced = txt.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced && fenced[1]) {
      return JSON.parse(fenced[1].trim());
    }
    const start = txt.indexOf("{");
    const end = txt.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(txt.slice(start, end + 1));
    }
    throw new Error("AI provider did not return valid JSON structure.");
  }
}

async function callProvider({ provider, model, apiKey, endpointUrl, fullPrompt, history, attachment }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 50000);

  try {
    if (provider === "gemini") {
      const targetModel = model || process.env.CYTON_GEMINI_MODEL || "gemini-2.5-flash";
      const parts = [{ text: fullPrompt }];
      if (attachment?.kind === "image" && attachment.base64Data) {
        parts.push({
          inlineData: {
            mimeType: attachment.mimeType || "image/jpeg",
            data: attachment.base64Data
          }
        });
      } else if (attachment?.kind === "text" && attachment.textContent) {
        parts.push({
          text: `\nATTACHED DOCUMENT (${attachment.name}):\n${String(attachment.textContent).slice(0, 12000)}`
        });
      }

      const contents = [];
      if (Array.isArray(history)) {
        history.slice(-6).forEach((m) => {
          contents.push({
            role: m.role === "ASSISTANT" ? "model" : "user",
            parts: [{ text: String(m.text || "").slice(0, 2000) }]
          });
        });
      }
      contents.push({ role: "user", parts });

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        targetModel
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.65
          }
        }),
        signal: controller.signal
      });
      if (!res.ok) {
        const errTxt = await res.text().catch(() => "");
        let msg = `Gemini API error (HTTP ${res.status})`;
        try {
          const j = JSON.parse(errTxt);
          if (j?.error?.message) msg = j.error.message;
        } catch {}
        throw new Error(msg);
      }
      const data = await res.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return { raw, modelUsed: targetModel };
    }

    if (provider === "anthropic") {
      const targetModel = model || process.env.CYTON_ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";
      const contentBlocks = [{ type: "text", text: fullPrompt }];
      if (attachment?.kind === "image" && attachment.base64Data) {
        contentBlocks.push({
          type: "image",
          source: {
            type: "base64",
            media_type: attachment.mimeType || "image/jpeg",
            data: attachment.base64Data
          }
        });
      } else if (attachment?.kind === "text" && attachment.textContent) {
        contentBlocks.push({
          type: "text",
          text: `\nATTACHED DOCUMENT (${attachment.name}):\n${String(attachment.textContent).slice(0, 12000)}`
        });
      }

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: targetModel,
          max_tokens: 4096,
          messages: [{ role: "user", content: contentBlocks }]
        }),
        signal: controller.signal
      });
      if (!res.ok) {
        const errTxt = await res.text().catch(() => "");
        throw new Error(`Anthropic API error (HTTP ${res.status}): ${errTxt.slice(0, 240)}`);
      }
      const data = await res.json();
      const raw = data?.content?.[0]?.text || "";
      return { raw, modelUsed: targetModel };
    }

    // OpenAI, OpenRouter, or custom OpenAI-compatible gateway
    const isOpenRouter = provider === "openrouter";
    const baseUrl =
      provider === "custom" && endpointUrl
        ? endpointUrl.replace(/\/$/, "")
        : isOpenRouter
          ? "https://openrouter.ai/api/v1/chat/completions"
          : "https://api.openai.com/v1/chat/completions";
    const targetModel =
      model ||
      (isOpenRouter
        ? process.env.CYTON_OPENROUTER_MODEL || "google/gemini-2.5-flash"
        : process.env.CYTON_OPENAI_MODEL || "gpt-4o-mini");

    const userContent = [{ type: "text", text: fullPrompt }];
    if (attachment?.kind === "image" && attachment.base64Data) {
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:${attachment.mimeType || "image/jpeg"};base64,${attachment.base64Data}`
        }
      });
    } else if (attachment?.kind === "text" && attachment.textContent) {
      userContent.push({
        type: "text",
        text: `\nATTACHED DOCUMENT (${attachment.name}):\n${String(attachment.textContent).slice(0, 12000)}`
      });
    }

    const messages = [];
    if (Array.isArray(history)) {
      history.slice(-6).forEach((m) => {
        messages.push({
          role: m.role === "ASSISTANT" ? "assistant" : "user",
          content: String(m.text || "").slice(0, 2000)
        });
      });
    }
    messages.push({ role: "user", content: userContent });

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    };
    if (isOpenRouter) {
      headers["HTTP-Referer"] = "https://marketosai.vercel.app";
      headers["X-Title"] = "CYTON by MarketOS";
    }

    const res = await fetch(baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: targetModel,
        messages,
        temperature: 0.65,
        response_format: { type: "json_object" }
      }),
      signal: controller.signal
    });
    if (!res.ok) {
      const errTxt = await res.text().catch(() => "");
      throw new Error(`${provider} API error (HTTP ${res.status}): ${errTxt.slice(0, 240)}`);
    }
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content || "";
    return { raw, modelUsed: targetModel };
  } finally {
    clearTimeout(timeoutId);
  }
}

function resolveApiKey(provider, headerKey) {
  if (headerKey && String(headerKey).trim()) return String(headerKey).trim();
  if (provider === "gemini") return process.env.GEMINI_API_KEY || "";
  if (provider === "openai") return process.env.OPENAI_API_KEY || "";
  if (provider === "anthropic") return process.env.ANTHROPIC_API_KEY || "";
  if (provider === "openrouter") return process.env.OPENROUTER_API_KEY || "";
  return "";
}

function normalizeOrchestrationResult(parsed, prompt, providerUsed, modelUsed, promptLen, rawLen) {
  const category = CATEGORIES.includes(parsed.category) ? parsed.category : classifyFallbackCategory(prompt);
  const executionPlan = Array.isArray(parsed.executionPlan)
    ? parsed.executionPlan.slice(0, 12).map((step, idx) => {
        const ac = ACTION_CLASSES.includes(step.actionClass) ? step.actionClass : "CREATE";
        const requiresApproval = Boolean(step.requiresApproval) || ["PUBLISH", "SEND", "DELETE"].includes(ac);
        const st =
          requiresApproval && step.status === "COMPLETED"
            ? "WAITING_APPROVAL"
            : ["COMPLETED", "RUNNING", "PENDING", "WAITING_APPROVAL"].includes(step.status)
              ? step.status
              : idx === 0
                ? "COMPLETED"
                : "PENDING";
        return {
          id: `step_${idx + 1}`,
          stepTitle: String(step.stepTitle || `Step ${idx + 1}`).slice(0, 140),
          assignedAgent: AGENT_ROLES.includes(step.assignedAgent) ? step.assignedAgent : "OPERATIONS",
          actionClass: ac,
          status: st,
          requiresApproval,
          outputDetail: String(step.outputDetail || "").slice(0, 1000)
        };
      })
    : [];

  const deliverables = Array.isArray(parsed.deliverables)
    ? parsed.deliverables.slice(0, 10).map((del, idx) => ({
        id: `del_${idx + 1}`,
        title: String(del.title || `Deliverable ${idx + 1}`).slice(0, 160),
        type: DELIVERABLE_TYPES.includes(del.type) ? del.type : "DOCUMENT",
        platform: String(del.platform || "Multi-Channel").slice(0, 40),
        content: String(del.content || "").slice(0, 12000),
        hashtags: String(del.hashtags || "").slice(0, 400),
        filename: String(del.filename || `cyton-output-${idx + 1}.md`).replace(/[^a-zA-Z0-9._-]/g, "_")
      }))
    : [];

  const missingInfoQuestions = Array.isArray(parsed.missingInfoQuestions)
    ? parsed.missingInfoQuestions.map((q) => String(q).trim()).filter(Boolean).slice(0, 5)
    : [];

  const suggestedNextActions = Array.isArray(parsed.suggestedNextActions)
    ? parsed.suggestedNextActions.map((a) => String(a).trim()).filter(Boolean).slice(0, 5)
    : [];

  const mem = parsed.memoryCandidate && parsed.memoryCandidate.title && parsed.memoryCandidate.content
    ? {
        title: String(parsed.memoryCandidate.title).slice(0, 120),
        content: String(parsed.memoryCandidate.content).slice(0, 800),
        memoryType: String(parsed.memoryCandidate.memoryType || "PREFERENCE")
      }
    : null;

  return {
    ok: true,
    isLiveExecution: true,
    category,
    statusSummary: String(parsed.statusSummary || "Workflow planned and deliverables created.").slice(0, 500),
    assistantReply: String(parsed.assistantReply || parsed.statusSummary || "Cyton completed planning and drafting.").slice(0, 12000),
    missingInfoQuestions,
    executionPlan,
    deliverables,
    suggestedNextActions,
    memoryCandidate: mem,
    providerUsed,
    modelUsed,
    estimatedTokens: Math.max(150, Math.round((promptLen + rawLen) / 4))
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed. Use POST." });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const prompt = String(body.prompt || "").trim();
  const userId = String(body.userId || "anonymous").slice(0, 128);
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "local").split(",")[0].trim();

  if (!checkRateLimit(`${userId}:${ip}`, 30)) {
    return res.status(429).json({
      ok: false,
      code: "RATE_LIMITED",
      error: "Too many Cyton orchestration requests. Please wait a moment and try again."
    });
  }

  if (!prompt || prompt.length > 15000) {
    return res.status(400).json({
      ok: false,
      code: "INVALID_PROMPT",
      error: "Instruction must be between 1 and 15,000 characters."
    });
  }

  const attachment = body.attachment || null;
  if (attachment?.base64Data && String(attachment.base64Data).length > 7000000) {
    return res.status(400).json({
      ok: false,
      code: "ATTACHMENT_TOO_LARGE",
      error: "Uploaded file exceeds the 5 MB limit."
    });
  }

  const primaryProvider = String(body.provider || "gemini").toLowerCase();
  const fallbackProvider = body.fallbackProvider ? String(body.fallbackProvider).toLowerCase() : "";
  const headerPrimaryKey = req.headers["x-cyton-api-key"] || "";
  const headerFallbackKey = req.headers["x-cyton-fallback-key"] || "";

  const fullPrompt = buildCytonSystemInstruction({
    business: body.business || null,
    project: body.project || null,
    memoryItems: body.memoryItems || [],
    integrations: body.integrations || [],
    customInstructions: body.customInstructions || "",
    userPrompt: prompt
  });

  const primaryKey = resolveApiKey(primaryProvider, headerPrimaryKey);
  if (!primaryKey) {
    return res.status(422).json({
      ok: false,
      code: "PROVIDER_KEY_MISSING",
      provider: primaryProvider,
      error: `No API key configured for provider '${primaryProvider}'. Configure its server environment variable in Vercel or add your API key in Cyton Model Gateway.`
    });
  }

  try {
    const result = await callProvider({
      provider: primaryProvider,
      model: body.model || "",
      apiKey: primaryKey,
      endpointUrl: body.endpointUrl || "",
      fullPrompt,
      history: body.history || [],
      attachment
    });
    const parsed = extractJsonObject(result.raw);
    return res.status(200).json(
      normalizeOrchestrationResult(parsed, prompt, primaryProvider, result.modelUsed, fullPrompt.length, result.raw.length)
    );
  } catch (primaryErr) {
    if (fallbackProvider && fallbackProvider !== primaryProvider) {
      const fbKey = resolveApiKey(fallbackProvider, headerFallbackKey);
      if (fbKey) {
        try {
          const fbRes = await callProvider({
            provider: fallbackProvider,
            model: body.fallbackModel || "",
            apiKey: fbKey,
            endpointUrl: "",
            fullPrompt,
            history: body.history || [],
            attachment
          });
          const parsed = extractJsonObject(fbRes.raw);
          const normalized = normalizeOrchestrationResult(
            parsed,
            prompt,
            fallbackProvider,
            fbRes.modelUsed,
            fullPrompt.length,
            fbRes.raw.length
          );
          normalized.fallbackUsedFrom = primaryProvider;
          return res.status(200).json(normalized);
        } catch (fbErr) {
          return res.status(502).json({
            ok: false,
            code: "PROVIDER_ERROR",
            error: `Primary (${primaryProvider}) failed: ${primaryErr.message}. Fallback (${fallbackProvider}) failed: ${fbErr.message}`
          });
        }
      }
    }
    return res.status(502).json({
      ok: false,
      code: "PROVIDER_ERROR",
      error: primaryErr?.message || "Cyton AI provider request failed."
    });
  }
};

module.exports.CATEGORIES = CATEGORIES;
module.exports.classifyFallbackCategory = classifyFallbackCategory;
module.exports.normalizeOrchestrationResult = normalizeOrchestrationResult;
