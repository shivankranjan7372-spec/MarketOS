import { getCytonGatewayConfig } from "./storage.js";
import { CYTON_CATEGORIES } from "./catalog.js";

export async function fetchCytonServerHealth() {
  try {
    const res = await fetch("/api/cyton/health", { method: "GET" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchCytonOAuthStatus(providerKey) {
  try {
    const res = await fetch(`/api/cyton/oauth?provider=${encodeURIComponent(providerKey)}`);
    if (!res.ok) {
      return { ok: false, configured: false, error: `HTTP ${res.status}` };
    }
    return await res.json();
  } catch {
    return {
      ok: false,
      configured: false,
      error: "Serverless OAuth endpoint unavailable in pure static preview. Deploy on Vercel with OAuth env vars."
    };
  }
}

export async function runCytonServerAction({ actionType, actionClass, explicitApproval, payload }) {
  const res = await fetch("/api/cyton/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      actionType,
      actionClass,
      explicitApproval: Boolean(explicitApproval),
      payload
    })
  });
  const data = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
  if (!res.ok) {
    const err = new Error(data.error || `Execution failed (HTTP ${res.status})`);
    err.code = data.code || "EXECUTION_ERROR";
    err.mailtoUrl = data.mailtoUrl || "";
    throw err;
  }
  return data;
}

export async function runCytonOrchestrator({
  prompt,
  userId,
  business,
  project,
  memoryItems,
  integrations,
  history,
  attachment
}) {
  const cfg = getCytonGatewayConfig();
  const headers = { "Content-Type": "application/json" };
  if (cfg.apiKey) headers["x-cyton-api-key"] = cfg.apiKey;
  if (cfg.fallbackApiKey) headers["x-cyton-fallback-key"] = cfg.fallbackApiKey;

  try {
    const res = await fetch("/api/cyton/orchestrate", {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt,
        userId,
        provider: cfg.provider || "gemini",
        model: cfg.model || "",
        endpointUrl: cfg.endpointUrl || "",
        fallbackProvider: cfg.fallbackProvider || "",
        fallbackModel: cfg.fallbackModel || "",
        customInstructions: cfg.customInstructions || "",
        business,
        project,
        memoryItems,
        integrations,
        history,
        attachment
      })
    });

    if (res.status === 404 && (cfg.provider || "gemini") === "gemini" && cfg.apiKey) {
      return await runDirectBrowserGeminiFallback({
        prompt,
        business,
        project,
        memoryItems,
        customInstructions: cfg.customInstructions,
        apiKey: cfg.apiKey,
        model: cfg.model || "gemini-2.5-flash",
        attachment
      });
    }

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      const err = new Error(data?.error || `Cyton gateway returned HTTP ${res.status}`);
      err.code = data?.code || "GATEWAY_ERROR";
      throw err;
    }
    return data;
  } catch (err) {
    if (err.code) throw err;
    if ((cfg.provider || "gemini") === "gemini" && cfg.apiKey) {
      return await runDirectBrowserGeminiFallback({
        prompt,
        business,
        project,
        memoryItems,
        customInstructions: cfg.customInstructions,
        apiKey: cfg.apiKey,
        model: cfg.model || "gemini-2.5-flash",
        attachment
      });
    }
    throw err;
  }
}

async function runDirectBrowserGeminiFallback({
  prompt,
  business,
  project,
  memoryItems,
  customInstructions,
  apiKey,
  model,
  attachment
}) {
  const memText = (memoryItems || [])
    .slice(0, 10)
    .map((m) => `- ${m.title}: ${String(m.content || "").slice(0, 200)}`)
    .join("\n");

  const instruction = [
    'You are CYTON ("Don\'t just ask AI. Get the work done.").',
    business ? `Business: ${business.name} (${business.industry}, ${business.countryName}, ${business.billingCurrency})` : "",
    project ? `Project: ${project.name} — ${project.objective}` : "",
    memText ? `Memory:\n${memText}` : "",
    customInstructions ? `Custom Instructions: ${customInstructions}` : "",
    "Categories: " + CYTON_CATEGORIES.join(", "),
    "Never claim external posts/emails were published/sent; mark PUBLISH/SEND/DELETE steps with requiresApproval=true and status='WAITING_APPROVAL'.",
    'Return strict JSON with keys: category, statusSummary, assistantReply, missingInfoQuestions (array), executionPlan (array of {stepTitle, assignedAgent, actionClass, status, requiresApproval, outputDetail}), deliverables (array of {title, type, platform, content, hashtags, filename}), suggestedNextActions (array).',
    `User Request: ${prompt}`
  ]
    .filter(Boolean)
    .join("\n");

  const parts = [{ text: instruction }];
  if (attachment?.kind === "image" && attachment.base64Data) {
    parts.push({ inlineData: { mimeType: attachment.mimeType || "image/jpeg", data: attachment.base64Data } });
  } else if (attachment?.kind === "text" && attachment.textContent) {
    parts.push({ text: `\nDocument (${attachment.name}):\n${String(attachment.textContent).slice(0, 12000)}` });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.65 }
    })
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini error (HTTP ${res.status}): ${errText.slice(0, 200)}`);
  }
  const json = await res.json();
  const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const parsed = JSON.parse(raw);
  return {
    ok: true,
    isLiveExecution: true,
    category: CYTON_CATEGORIES.includes(parsed.category) ? parsed.category : "General assistance",
    statusSummary: parsed.statusSummary || "Cyton planned and created deliverables.",
    assistantReply: parsed.assistantReply || parsed.statusSummary || "Completed.",
    missingInfoQuestions: Array.isArray(parsed.missingInfoQuestions) ? parsed.missingInfoQuestions : [],
    executionPlan: Array.isArray(parsed.executionPlan)
      ? parsed.executionPlan.map((s, idx) => ({
          id: `step_${idx + 1}`,
          stepTitle: s.stepTitle || `Step ${idx + 1}`,
          assignedAgent: s.assignedAgent || "OPERATIONS",
          actionClass: s.actionClass || "CREATE",
          status: s.requiresApproval ? "WAITING_APPROVAL" : s.status || "COMPLETED",
          requiresApproval: Boolean(s.requiresApproval),
          outputDetail: s.outputDetail || ""
        }))
      : [],
    deliverables: Array.isArray(parsed.deliverables)
      ? parsed.deliverables.map((d, idx) => ({
          id: `del_${idx + 1}`,
          title: d.title || `Deliverable ${idx + 1}`,
          type: d.type || "DOCUMENT",
          platform: d.platform || "Multi-Channel",
          content: d.content || "",
          hashtags: d.hashtags || "",
          filename: d.filename || `cyton-deliverable-${idx + 1}.md`
        }))
      : [],
    suggestedNextActions: Array.isArray(parsed.suggestedNextActions) ? parsed.suggestedNextActions : [],
    memoryCandidate: null,
    providerUsed: "gemini",
    modelUsed: model,
    estimatedTokens: Math.max(150, Math.round((instruction.length + raw.length) / 4))
  };
}

// ---------------- File & Attachment Reader ----------------
export function readAttachmentFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("No file selected."));
    if (file.size > 4.5 * 1024 * 1024) {
      return reject(new Error("File must be under 4.5 MB."));
    }
    const isImage = file.type.startsWith("image/");
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to read selected file."));
    if (isImage) {
      reader.onload = () => {
        const dataUrl = String(reader.result || "");
        const [meta, base64Data] = dataUrl.split(",");
        const mimeType = meta?.match(/data:(.*?);/)?.[1] || file.type || "image/jpeg";
        resolve({ kind: "image", name: file.name, mimeType, base64Data, sizeBytes: file.size });
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = () => {
        resolve({
          kind: "text",
          name: file.name,
          mimeType: file.type || "text/plain",
          textContent: String(reader.result || "").slice(0, 20000),
          sizeBytes: file.size
        });
      };
      reader.readAsText(file);
    }
  });
}

// ---------------- Document & Presentation Studio Exporters ----------------
function triggerBrowserDownload(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 500);
}

export function downloadDeliverableMarkdown(del) {
  const baseName = String(del.filename || del.title || "cyton-document")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-|-$/g, "");
  const md = [
    `# ${del.title}`,
    `> Generated by **CYTON AI** (${del.type} • ${del.platform})`,
    "",
    del.content || "",
    del.hashtags ? `\n**Tags / Keywords:** ${del.hashtags}` : ""
  ].join("\n");
  triggerBrowserDownload(`${baseName || "cyton-document"}.md`, md, "text/markdown;charset=utf-8");
}

export function downloadDeliverableCsv(del) {
  const lines = String(del.content || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const csvRows = [
    ["Section", "Platform", "Item"].map((v) => `"${v}"`).join(","),
    ...lines.map((line, i) => [i + 1, del.platform || "General", line.replace(/"/g, '""')].map((v) => `"${v}"`).join(","))
  ];
  const baseName = String(del.title || "cyton-sheet").toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  triggerBrowserDownload(`${baseName || "cyton-sheet"}.csv`, csvRows.join("\n"), "text/csv;charset=utf-8");
}

export function downloadPresentationDeckHtml(del) {
  const rawSlides = String(del.content || "")
    .split(/\n---+\n|\n#{1,2}\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const slides = rawSlides.length ? rawSlides : [String(del.content || "Cyton Presentation")];

  const escapeHtml = (s) =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(del.title)} — Cyton Presentation</title>
<style>
  body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #09090f; color: #f8fafc; }
  .deck { max-width: 960px; margin: 0 auto; padding: 2rem 1.25rem; display: flex; flex-direction: column; gap: 1.5rem; }
  .slide { background: linear-gradient(135deg, #151524, #10101a); border: 1px solid rgba(168,85,247,0.35); border-radius: 18px; padding: 2.25rem; min-height: 360px; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; }
  .meta { font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #a855f7; font-weight: 700; }
  .content { white-space: pre-wrap; line-height: 1.65; font-size: 1.05rem; margin-top: 1rem; color: #e2e8f0; }
  @media print { body { background: #fff; color: #0f172a; } .slide { border: 1px solid #cbd5e1; background: #fff; } .content { color: #0f172a; } }
</style>
</head>
<body>
  <div class="deck">
    <div class="slide">
      <div>
        <div class="meta">CYTON AI PRESENTATION DECK</div>
        <h1 style="font-size:2.2rem;margin:0.6rem 0;">${escapeHtml(del.title)}</h1>
        <p style="color:#94a3b8;">${escapeHtml(del.platform || "Executive Deck")} • ${slides.length} slides</p>
      </div>
      <div class="meta">Press Ctrl+P / Cmd+P to export as PDF</div>
    </div>
    ${slides
      .map(
        (s, idx) => `
      <div class="slide">
        <div>
          <div class="meta">Slide ${idx + 1} of ${slides.length}</div>
          <div class="content">${escapeHtml(s)}</div>
        </div>
        <div class="meta">CYTON — Don't just ask AI. Get the work done.</div>
      </div>`
      )
      .join("")}
  </div>
</body>
</html>`;
  const baseName = String(del.title || "cyton-deck").toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  triggerBrowserDownload(`${baseName || "cyton-deck"}.html`, html, "text/html;charset=utf-8");
}

export function printDeliverableAsPdf(del) {
  const win = window.open("", "_blank", "width=880,height=700");
  if (!win) {
    throw new Error("Pop-up blocked. Allow pop-ups to open the PDF print view.");
  }
  const escapeHtml = (s) =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  win.document.write(`<!DOCTYPE html>
<html><head><title>${escapeHtml(del.title)}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; padding: 2.5rem; color: #0f172a; max-width: 780px; margin: 0 auto; line-height: 1.6; }
  h1 { margin-bottom: 0.25rem; }
  .sub { color: #475569; font-size: 0.9rem; margin-bottom: 1.5rem; border-bottom: 1px solid #cbd5e1; padding-bottom: 0.75rem; }
  pre { white-space: pre-wrap; font-family: inherit; font-size: 1rem; }
</style></head>
<body>
  <h1>${escapeHtml(del.title)}</h1>
  <div class="sub">CYTON Deliverable • ${escapeHtml(del.type)} • ${escapeHtml(del.platform)}</div>
  <pre>${escapeHtml(del.content || "")}</pre>
  ${del.hashtags ? `<p><strong>Tags:</strong> ${escapeHtml(del.hashtags)}</p>` : ""}
  <script>window.onload = () => { window.print(); };</script>
</body></html>`);
  win.document.close();
}

export function downloadProjectBundleJson(project, tasks, deliverables) {
  const payload = {
    exportedAt: new Date().toISOString(),
    generator: "CYTON Autonomous AI Workspace",
    project,
    tasks,
    deliverables
  };
  const baseName = String(project?.name || "cyton-project").toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  triggerBrowserDownload(`${baseName || "cyton-project"}.json`, JSON.stringify(payload, null, 2), "application/json");
}

// ---------------- Voice Input (Web Speech API) ----------------
export function isVoiceInputSupported() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function startVoiceRecognition({ onTranscript, onError, onEnd }) {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Rec) {
    onError("Voice dictation is not supported in this browser. Use Chrome, Edge, or Safari.");
    return null;
  }
  const recognition = new Rec();
  recognition.lang = navigator.language || "en-US";
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => {
    let text = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      text += event.results[i][0].transcript;
    }
    onTranscript(text, event.results[event.results.length - 1]?.isFinal);
  };
  recognition.onerror = (e) => onError(e.error || "Voice recognition error.");
  recognition.onend = () => onEnd();
  recognition.start();
  return recognition;
}
