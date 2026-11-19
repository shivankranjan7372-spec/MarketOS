import {
  CYTON_ACTION_CLASSES,
  CYTON_CATEGORIES,
  CYTON_EXAMPLE_COMMANDS,
  CYTON_MARKETPLACE_INTEGRATIONS,
  CYTON_MODEL_PROVIDERS,
  CYTON_SUBSCRIPTION_PLANS
} from "./catalog.js";
import {
  downloadDeliverableCsv,
  downloadDeliverableMarkdown,
  downloadPresentationDeckHtml,
  downloadProjectBundleJson,
  fetchCytonOAuthStatus,
  fetchCytonServerHealth,
  isVoiceInputSupported,
  printDeliverableAsPdf,
  readAttachmentFile,
  runCytonOrchestrator,
  runCytonServerAction,
  startVoiceRecognition
} from "./cyton-engine.js";
import { getCytonGatewayConfig, saveCytonGatewayConfig } from "./storage.js";

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeJsonParse(raw, fallback = null) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function fmtTime(ms) {
  if (!ms) return "";
  try {
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(
      new Date(ms)
    );
  } catch {
    return "";
  }
}

function renderAndKeepFocus(renderFn, inputId) {
  const el = document.getElementById(inputId);
  const pos = el ? el.selectionStart : null;
  renderFn();
  const next = document.getElementById(inputId);
  if (next) {
    next.focus();
    if (pos !== null && typeof next.setSelectionRange === "function") {
      next.setSelectionRange(pos, pos);
    }
  }
}

export const cytonUiState = {
  subView: "stream", // stream | tasks | projects | studio | gateway | integrations
  leftOpen: true,
  rightOpen: true,
  activeConversationId: "",
  activeProjectId: "",
  searchQuery: "",
  categoryFilter: "ALL",
  orbState: "idle", // idle | listening | thinking | planning | creating | executing | completed | error
  orbStatusText: "Cyton is ready.",
  draftPrompt: "",
  pendingAttachment: null,
  voiceRecognition: null,
  serverHealth: null,
  oauthStatuses: {},
  lastError: "",
  memorySearch: "",
  websiteResearchInput: "",
  websiteResearchResult: null,
  websiteResearchLoading: false,
  emailRecipientDraft: "",
  activeDeliverableEdit: null
};

const ORB_STATUS_MESSAGES = {
  idle: "Cyton is ready.",
  listening: "Listening to your voice command...",
  thinking: "Understanding your request.",
  planning: "Planning your workflow.",
  creating: "Creating your assets.",
  executing: "Executing your instructions.",
  completed: "Task completed.",
  error: "Execution paused — review details below."
};

function setOrbState(stateName, customText = "") {
  cytonUiState.orbState = stateName;
  cytonUiState.orbStatusText = customText || ORB_STATUS_MESSAGES[stateName] || "Cyton is ready.";
  const orbEl = document.getElementById("cyton-orb-root");
  if (orbEl) {
    orbEl.className = `cyton-orb orb-${stateName}`;
  }
  const waveEl = document.querySelector(".cy-waveform");
  if (waveEl) {
    const isActive = ["listening", "thinking", "planning", "creating", "executing"].includes(stateName);
    waveEl.classList.toggle("active", isActive);
  }
  const labelEl = document.getElementById("cyton-orb-status");
  if (labelEl) {
    labelEl.textContent = cytonUiState.orbStatusText;
  }
}

function getScopedConversations(appState, bizId) {
  const metas = (appState.cytonMemory || [])
    .filter((m) => m.businessId === bizId && m.sourceAgent === "CYTON_CHAT_META")
    .map((m) => {
      const parsed = safeJsonParse(m.content, {}) || {};
      return {
        id: m.id,
        title: m.title || "Untitled Chat",
        category: parsed.category || "General assistance",
        pinned: Boolean(parsed.pinned),
        projectId: parsed.projectId || "",
        updatedAtMs: parsed.updatedAtMs || m.updatedAtMs || m.createdAtMs || 0
      };
    });

  metas.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return (b.updatedAtMs || 0) - (a.updatedAtMs || 0);
  });
  return metas;
}

function getScopedMessages(appState, bizId, convId) {
  return (appState.aiMessages || [])
    .filter((m) => m.businessId === bizId)
    .map((m) => {
      const meta = safeJsonParse(m.structuredPreview, null);
      return { ...m, meta };
    })
    .filter((m) => {
      if (!convId) return false;
      return m.meta?.conversationId === convId;
    })
    .sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));
}

function getScopedMemories(appState, bizId) {
  return (appState.cytonMemory || []).filter(
    (m) => m.businessId === bizId && m.sourceAgent !== "CYTON_CHAT_META"
  );
}

function getScopedProjects(appState, bizId) {
  return (appState.cytonWorkflows || []).filter((w) => w.businessId === bizId);
}

function getScopedTasks(appState, bizId) {
  return (appState.cytonTasks || [])
    .filter((t) => t.businessId === bizId)
    .map((t) => ({
      ...t,
      parsedResult: safeJsonParse(t.resultSummary, null)
    }));
}

function getScopedSettings(appState, bizId) {
  const found = (appState.cytonSettings || []).find((s) => s.businessId === bizId);
  return (
    found || {
      autonomyMode: "SUPERVISED",
      emergencyPaused: false,
      dailyCreditBudget: 100,
      maxTasksPerHour: 25,
      voiceEnabled: true,
      proactiveMonitoringEnabled: false,
      monitorIntervalMinutes: 60,
      allowDashboardContext: true
    }
  );
}

function getAllDeliverablesFromTasksAndMessages(tasks, messages) {
  const out = [];
  tasks.forEach((t) => {
    const dels = t.parsedResult?.deliverables || [];
    dels.forEach((d, idx) => {
      out.push({ ...d, sourceTaskId: t.id, sourceTitle: t.title, projectId: t.workflowId || "", uid: `${t.id}_${idx}` });
    });
  });
  if (out.length === 0) {
    messages.forEach((m) => {
      const dels = m.meta?.deliverables || [];
      dels.forEach((d, idx) => {
        out.push({ ...d, sourceMsgId: m.id, projectId: m.meta?.projectId || "", uid: `${m.id}_${idx}` });
      });
    });
  }
  return out;
}

export function renderCytonCommandCentre(container, { appState, store, biz, toast, openModal, closeModal, render }) {
  if (!cytonUiState.serverHealth) {
    fetchCytonServerHealth().then((h) => {
      if (h) {
        cytonUiState.serverHealth = h;
        render();
      }
    });
  }

  const conversations = getScopedConversations(appState, biz.id);
  if (
    cytonUiState.activeConversationId &&
    !conversations.some((c) => c.id === cytonUiState.activeConversationId)
  ) {
    cytonUiState.activeConversationId = conversations[0]?.id || "";
  } else if (!cytonUiState.activeConversationId && conversations.length > 0) {
    cytonUiState.activeConversationId = conversations[0].id;
  }

  const activeConv = conversations.find((c) => c.id === cytonUiState.activeConversationId) || null;
  const projects = getScopedProjects(appState, biz.id);
  const activeProject = projects.find((p) => p.id === (cytonUiState.activeProjectId || activeConv?.projectId)) || null;
  const tasks = getScopedTasks(appState, biz.id);
  const allMessagesForBiz = (appState.aiMessages || [])
    .filter((m) => m.businessId === biz.id)
    .map((m) => ({ ...m, meta: safeJsonParse(m.structuredPreview, null) }));
  const convMessages = getScopedMessages(appState, biz.id, cytonUiState.activeConversationId);
  const memories = getScopedMemories(appState, biz.id);
  const approvals = (appState.cytonApprovals || []).filter((a) => a.businessId === biz.id);
  const logs = (appState.cytonLogs || []).filter((l) => l.businessId === biz.id);
  const cytonSettings = getScopedSettings(appState, biz.id);
  const gatewayCfg = getCytonGatewayConfig();

  const filteredConversations = conversations.filter((c) => {
    const q = cytonUiState.searchQuery.trim().toLowerCase();
    const matchesQ = !q || c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
    const matchesCat = cytonUiState.categoryFilter === "ALL" || c.category === cytonUiState.categoryFilter;
    return matchesQ && matchesCat;
  });

  const pendingApprovalsCount = approvals.filter((a) => a.decision === "PENDING").length;
  const activeTasksCount = tasks.filter((t) => ["QUEUED", "RUNNING", "AWAITING_APPROVAL"].includes(t.status)).length;
  const userTierId = appState.profile?.subscriptionTier || "STARTER";
  const mappedPlan =
    userTierId === "BUSINESS"
      ? CYTON_SUBSCRIPTION_PLANS.BUSINESS
      : userTierId === "GROWTH"
        ? CYTON_SUBSCRIPTION_PLANS.PRO
        : CYTON_SUBSCRIPTION_PLANS.FREE;
  const aiRequestsUsed = appState.profile?.aiGenerationsThisMonth || 0;
  const remainingCredits = Math.max(0, mappedPlan.monthlyRequests - aiRequestsUsed);

  container.innerHTML = `
    <div class="cyton-shell ${cytonUiState.leftOpen ? "" : "left-collapsed"} ${cytonUiState.rightOpen ? "" : "right-collapsed"}">
      <!-- LEFT PANEL: CHAT HISTORY & SAVED WORK -->
      <aside class="cyton-panel cyton-left ${cytonUiState.leftOpen ? "open" : ""}" aria-label="Cyton chat history and projects">
        <div class="cyton-panel-head">
          <button id="cy-new-chat" type="button" class="btn btn-primary btn-sm" style="flex:1;">+ New Chat</button>
          <button id="cy-close-left" type="button" class="btn btn-outline btn-sm" title="Collapse left panel">«</button>
        </div>

        <div class="field">
          <input id="cy-conv-search" type="search" class="input cy-compact-input" placeholder="Search conversations..." value="${esc(cytonUiState.searchQuery)}" />
        </div>

        <div class="field">
          <select id="cy-cat-filter" class="select cy-compact-input" aria-label="Filter by category">
            <option value="ALL" ${cytonUiState.categoryFilter === "ALL" ? "selected" : ""}>All Categories</option>
            ${CYTON_CATEGORIES.map((c) => `<option value="${esc(c)}" ${cytonUiState.categoryFilter === c ? "selected" : ""}>${esc(c)}</option>`).join("")}
          </select>
        </div>

        <div class="cy-scroll-list">
          <div class="cy-section-label">Conversations (${filteredConversations.length})</div>
          ${
            filteredConversations.length === 0
              ? `<div class="muted small" style="padding:0.4rem 0.25rem;">No conversations yet. Start a task below.</div>`
              : filteredConversations
                  .map(
                    (c) => `
                <div class="cy-conv-item ${c.id === cytonUiState.activeConversationId ? "active" : ""}" data-conv-id="${esc(c.id)}">
                  <div class="cy-conv-main">
                    <div class="cy-conv-title">${c.pinned ? "📌 " : ""}${esc(c.title)}</div>
                    <div class="cy-conv-meta">${esc(c.category)} • ${esc(fmtTime(c.updatedAtMs))}</div>
                  </div>
                  <div class="cy-conv-actions">
                    <button type="button" class="cy-icon-btn cy-pin-conv" data-id="${esc(c.id)}" title="${c.pinned ? "Unpin" : "Pin"}">${c.pinned ? "★" : "☆"}</button>
                    <button type="button" class="cy-icon-btn cy-ren-conv" data-id="${esc(c.id)}" title="Rename">✎</button>
                    <button type="button" class="cy-icon-btn cy-del-conv" data-id="${esc(c.id)}" title="Delete">✕</button>
                  </div>
                </div>`
                  )
                  .join("")
          }

          <div class="row-between" style="margin-top:0.85rem;">
            <span class="cy-section-label" style="margin:0;">Saved Projects (${projects.length})</span>
            <button id="cy-quick-new-proj" type="button" class="link-btn" style="font-size:0.75rem;">+ New</button>
          </div>
          ${
            projects.length === 0
              ? `<div class="muted small" style="padding:0.25rem;">No projects yet.</div>`
              : projects
                  .slice(0, 6)
                  .map(
                    (p) => `
                <button type="button" class="cy-mini-item ${activeProject?.id === p.id ? "active" : ""}" data-proj-select="${esc(p.id)}">
                  <span>📂 ${esc(p.name)}</span>
                </button>`
                  )
                  .join("")
          }

          <div class="row-between" style="margin-top:0.85rem;">
            <span class="cy-section-label" style="margin:0;">Saved Tasks (${tasks.length})</span>
            <button type="button" class="link-btn cy-jump-sub" data-sub="tasks" style="font-size:0.75rem;">View all</button>
          </div>
          ${
            tasks.length === 0
              ? `<div class="muted small" style="padding:0.25rem;">No tasks executed yet.</div>`
              : tasks
                  .slice(0, 5)
                  .map(
                    (t) => `
                <button type="button" class="cy-mini-item cy-jump-sub" data-sub="tasks">
                  <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(t.title)}</span>
                  <span class="badge ${t.status === "COMPLETED" ? "emerald" : t.status === "AWAITING_APPROVAL" ? "amber" : t.status === "FAILED" ? "rose" : "violet"}" style="font-size:0.65rem;padding:0.1rem 0.4rem;">${esc(t.status)}</span>
                </button>`
                  )
                  .join("")
          }
        </div>
      </aside>

      <!-- CENTRE PANEL: CYTON AI CORE & WORKSPACE -->
      <section class="cyton-centre">
        <header class="cyton-centre-bar">
          <div class="row-gap">
            ${!cytonUiState.leftOpen ? `<button id="cy-open-left" type="button" class="btn btn-outline btn-sm">History</button>` : ""}
            <div class="cy-core-badge-icon" aria-hidden="true">✦</div>
            <div>
              <div class="row-gap">
                <strong style="font-family:var(--font-display);letter-spacing:0.03em;">CYTON Command Centre</strong>
                ${activeProject ? `<span class="badge violet">📂 ${esc(activeProject.name)}</span>` : ""}
                ${cytonSettings.emergencyPaused ? `<span class="badge rose">PAUSED</span>` : ""}
              </div>
              <div class="muted small">CYTON • Intelligent AI Assistant by MarketOS</div>
            </div>
          </div>
          <div class="row-gap">
            <button class="btn btn-outline btn-sm cy-sub-btn ${cytonUiState.subView === "stream" ? "active-sub" : ""}" data-sub="stream" type="button">Command</button>
            <button class="btn btn-outline btn-sm cy-sub-btn ${cytonUiState.subView === "tasks" ? "active-sub" : ""}" data-sub="tasks" type="button">Tasks (${activeTasksCount})</button>
            <button class="btn btn-outline btn-sm cy-sub-btn ${cytonUiState.subView === "projects" ? "active-sub" : ""}" data-sub="projects" type="button">Projects (${projects.length})</button>
            <button class="btn btn-outline btn-sm cy-sub-btn ${cytonUiState.subView === "studio" ? "active-sub" : ""}" data-sub="studio" type="button">Creative & Docs</button>
            <button class="btn btn-outline btn-sm cy-sub-btn ${cytonUiState.subView === "gateway" ? "active-sub" : ""}" data-sub="gateway" type="button">Model Gateway</button>
            <button class="btn btn-outline btn-sm cy-sub-btn ${cytonUiState.subView === "integrations" ? "active-sub" : ""}" data-sub="integrations" type="button">Integrations</button>
            ${!cytonUiState.rightOpen ? `<button id="cy-open-right" type="button" class="btn btn-outline btn-sm">Account</button>` : ""}
          </div>
        </header>

        <div class="cyton-centre-body" id="cyton-centre-body">
          ${renderCentreSubView({
            appState,
            biz,
            activeConv,
            activeProject,
            convMessages,
            allMessagesForBiz,
            projects,
            tasks,
            approvals,
            logs,
            cytonSettings,
            gatewayCfg
          })}
        </div>

        <!-- BOTTOM COMMAND BAR -->
        <div class="cyton-command-bar">
          <div class="cy-shortcuts-row">
            ${CYTON_EXAMPLE_COMMANDS.slice(0, 5)
              .map((cmd) => `<button type="button" class="chip cy-quick-cmd" data-cmd="${esc(cmd)}">${esc(cmd)}</button>`)
              .join("")}
          </div>

          ${
            cytonUiState.pendingAttachment
              ? `<div class="row-between" style="padding:0.35rem 0.6rem;background:var(--purple-soft);border-radius:8px;">
                  <span class="small">📎 Attached (${esc(cytonUiState.pendingAttachment.kind)}): <strong>${esc(cytonUiState.pendingAttachment.name)}</strong></span>
                  <button id="cy-clear-att" type="button" class="link-btn">Remove</button>
                </div>`
              : ""
          }

          <div class="cy-input-row">
            <label class="btn btn-outline btn-sm" title="Upload image or document (.txt, .md, .csv, .json)" style="cursor:pointer;min-height:42px;">
              + File
              <input id="cy-file-input" type="file" accept="image/*,.txt,.md,.csv,.json,.html" style="display:none;" />
            </label>
            <button id="cy-voice-btn" type="button" class="btn btn-outline btn-sm" title="Voice input" style="min-height:42px;">
              ${cytonUiState.voiceRecognition ? "⏹ Stop" : "🎙 Voice"}
            </button>
            <textarea
              id="cy-command-input"
              class="textarea cy-command-textarea"
              rows="2"
              placeholder="Type anything. Cyton can handle it..."
            >${esc(cytonUiState.draftPrompt)}</textarea>
            <button
              id="cy-send-btn"
              type="button"
              class="btn btn-primary"
              style="min-height:42px;min-width:92px;"
              ${["thinking", "planning", "creating", "executing"].includes(cytonUiState.orbState) ? "disabled" : ""}
            >
              ${["thinking", "planning", "creating", "executing"].includes(cytonUiState.orbState) ? "Working..." : "Execute"}
            </button>
          </div>
          <div class="muted small" style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:0.4rem;">
            <span>Enter to send • Shift + Enter for new line • Model: <strong class="mono">${esc(gatewayCfg.provider)}/${esc(gatewayCfg.model)}</strong></span>
            <span>Pending owner approvals: <strong style="color:${pendingApprovalsCount > 0 ? "var(--amber)" : "var(--emerald)"};">${pendingApprovalsCount}</strong></span>
          </div>
        </div>
      </section>

      <!-- RIGHT PANEL: CYTON ACCOUNT AND INTELLIGENCE -->
      <aside class="cyton-panel cyton-right ${cytonUiState.rightOpen ? "open" : ""}" aria-label="Cyton account and intelligence">
        <div class="cyton-panel-head">
          <strong style="font-size:0.9rem;">Account & Intelligence</strong>
          <button id="cy-close-right" type="button" class="btn btn-outline btn-sm" title="Collapse right panel">»</button>
        </div>

        <div class="cy-scroll-list stack">
          <div class="card hi stack" style="padding:0.85rem;">
            <div class="row-between">
              <strong class="small">${esc(appState.user?.displayName || appState.user?.email || "Account")}</strong>
              <span class="badge violet">${esc(mappedPlan.name)}</span>
            </div>
            <div class="muted small" style="font-size:0.75rem;">
              ${cytonUiState.serverHealth?.billing?.configured ? "Verified Billing Active" : "Billing: Development Preview (no paid gateway configured)"}
            </div>
            <div class="progress-track"><div class="progress-fill" style="width:${Math.min(100, Math.round((aiRequestsUsed / Math.max(1, mappedPlan.monthlyRequests)) * 100))}%"></div></div>
            <div class="small" style="font-size:0.78rem;">
              <div>Requests this month: <strong>${aiRequestsUsed}</strong> / ${mappedPlan.monthlyRequests}</div>
              <div>Remaining AI quota: <strong>${remainingCredits}</strong></div>
              <div>Tokens logged: <strong>${appState.profile?.aiTokenCountThisMonth || 0}</strong></div>
              <div>Tasks tracked: <strong>${tasks.length}</strong> (${tasks.filter((t) => t.status === "COMPLETED").length} done)</div>
            </div>
          </div>

          <div class="card stack" style="padding:0.85rem;">
            <div class="row-between">
              <strong class="small">Cyton Model & Mode</strong>
              <button type="button" class="link-btn cy-jump-sub" data-sub="gateway" style="font-size:0.74rem;">Configure</button>
            </div>
            <div class="small" style="font-size:0.78rem;">
              <div>Provider: <strong>${esc(gatewayCfg.provider)}</strong></div>
              <div>Model: <span class="mono">${esc(gatewayCfg.model)}</span></div>
              <div>Autonomy: <strong>${esc(cytonSettings.autonomyMode)}</strong></div>
              <div>API Key: <strong style="color:${gatewayCfg.apiKey || cytonUiState.serverHealth?.providers?.[gatewayCfg.provider]?.configuredOnServer ? "var(--emerald)" : "var(--amber)"}">${cytonUiState.serverHealth?.providers?.[gatewayCfg.provider]?.configuredOnServer ? "Server Env Active" : gatewayCfg.apiKey ? "Browser Key Set" : "Not Set"}</strong></div>
            </div>
            <label class="row-gap small" style="cursor:pointer;font-size:0.78rem;">
              <input id="cy-right-killswitch" type="checkbox" ${cytonSettings.emergencyPaused ? "checked" : ""} />
              <span>Emergency Pause Automation</span>
            </label>
          </div>

          <div class="card stack" style="padding:0.85rem;">
            <div class="row-between">
              <strong class="small">Connected Apps</strong>
              <button type="button" class="link-btn cy-jump-sub" data-sub="integrations" style="font-size:0.74rem;">Marketplace</button>
            </div>
            <div class="small" style="font-size:0.76rem;display:flex;flex-direction:column;gap:0.35rem;">
              <div class="row-between"><span>🌐 Live Web Research</span><span class="badge emerald">Active</span></div>
              <div class="row-between"><span>📨 Email Dispatch</span><span class="badge ${cytonUiState.serverHealth?.integrations?.email_esp?.emailDeliveryConfigured ? "emerald" : "amber"}">${cytonUiState.serverHealth?.integrations?.email_esp?.emailDeliveryConfigured ? "Ready" : "Draft / Mailto"}</span></div>
              <div class="row-between"><span>📸 Social OAuth</span><span class="badge">${cytonUiState.serverHealth?.integrations?.instagram?.oauthConfigured ? "Configured" : "Not Connected"}</span></div>
              <div class="row-between"><span>📁 Google Workspace</span><span class="badge">${cytonUiState.serverHealth?.integrations?.gmail?.oauthConfigured ? "Configured" : "Not Connected"}</span></div>
            </div>
          </div>

          <div class="card stack" style="padding:0.85rem;">
            <div class="row-between">
              <strong class="small">Cyton Memory (${memories.length})</strong>
              <button id="cy-add-mem-btn" type="button" class="link-btn" style="font-size:0.74rem;">+ Add</button>
            </div>
            <input id="cy-mem-search" type="search" class="input cy-compact-input" placeholder="Filter memory..." value="${esc(cytonUiState.memorySearch)}" />
            <div class="stack" style="gap:0.4rem;max-height:240px;overflow-y:auto;">
              ${
                memories
                  .filter((m) => {
                    const q = cytonUiState.memorySearch.trim().toLowerCase();
                    return !q || m.title.toLowerCase().includes(q) || m.content.toLowerCase().includes(q);
                  })
                  .slice(0, 12)
                  .map(
                    (m) => `
                  <div class="cy-mem-card">
                    <div class="row-between">
                      <strong style="font-size:0.76rem;">${esc(m.title)}</strong>
                      <button type="button" class="cy-icon-btn cy-del-mem" data-id="${esc(m.id)}" title="Delete memory">✕</button>
                    </div>
                    <div class="muted" style="font-size:0.73rem;">${esc(m.content.slice(0, 110))}</div>
                  </div>`
                  )
                  .join("") || `<div class="muted" style="font-size:0.75rem;">No explicit memories saved for ${esc(biz.name)} yet.</div>`
              }
            </div>
          </div>
        </div>
      </aside>
    </div>
  `;

  bindCytonEvents(container, {
    appState,
    store,
    biz,
    toast,
    openModal,
    closeModal,
    render,
    conversations,
    activeConv,
    activeProject,
    projects,
    tasks,
    convMessages,
    allMessagesForBiz,
    cytonSettings,
    gatewayCfg
  });
}

function renderCentreSubView({
  appState,
  biz,
  activeConv,
  activeProject,
  convMessages,
  allMessagesForBiz,
  projects,
  tasks,
  approvals,
  logs,
  cytonSettings,
  gatewayCfg
}) {
  if (cytonUiState.subView === "tasks") {
    return renderTaskEngineView(tasks, approvals, logs);
  }
  if (cytonUiState.subView === "projects") {
    return renderProjectsView(projects, tasks, allMessagesForBiz);
  }
  if (cytonUiState.subView === "studio") {
    const deliverables = getAllDeliverablesFromTasksAndMessages(tasks, allMessagesForBiz);
    return renderCreativeDocsStudioView(deliverables, projects);
  }
  if (cytonUiState.subView === "gateway") {
    return renderModelGatewayView(gatewayCfg, cytonSettings, cytonUiState.serverHealth);
  }
  if (cytonUiState.subView === "integrations") {
    return renderMarketplaceView(cytonUiState.serverHealth);
  }

  const isCoreActive = ["listening", "thinking", "planning", "creating", "executing"].includes(cytonUiState.orbState);
  const voiceBarHeights = isCoreActive ? [16, 26, 20, 28, 14] : [8, 12, 16, 12, 8];

  // Default: Command Stream with CYTON AI Core Orb
  return `
    <div class="cyton-core-stage">
      <div id="cyton-orb-root" class="cyton-orb orb-${esc(cytonUiState.orbState)}" aria-hidden="true">
        <div class="orb-ring ring-1"></div>
        <div class="orb-ring ring-2"></div>
        <div class="orb-nucleus">
          <span class="cy-orb-glyph">✦</span>
          <span class="cy-orb-word">CYTON</span>
        </div>
      </div>

      <div class="cy-waveform ${isCoreActive ? "active" : ""}" aria-hidden="true">
        ${voiceBarHeights.map((h, i) => `<span class="cy-wave-bar" style="--h:${h}px;animation-delay:${i * 0.11}s;"></span>`).join("")}
      </div>

      <div class="cyton-core-copy">
        <div class="cy-status-strip">
          <span id="cyton-orb-status" class="badge violet">${esc(cytonUiState.orbStatusText)}</span>
          <span class="badge sky">Model: ${esc(gatewayCfg.provider)}/${esc(gatewayCfg.model)}</span>
          <span class="badge ${cytonUiState.serverHealth?.integrations?.website_research?.liveServerFetchAvailable ? "emerald" : "neutral"}">Tools: Web • Docs • Approvals</span>
        </div>
        <div class="muted small" style="margin-top:0.55rem;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;">
          CYTON • Intelligent AI Assistant by MarketOS
        </div>
        <h2 style="margin-top:0.35rem;font-size:1.3rem;">Welcome to CYTON. What should we get done today?</h2>
        <p class="muted small" style="margin:0.25rem 0 0;">Don't just ask AI. Get the work done — with explicit owner approvals for external actions.</p>
      </div>
    </div>

    ${cytonUiState.lastError ? `<div class="error-banner">${esc(cytonUiState.lastError)}</div>` : ""}

    <div class="cy-stream stack">
      ${
        convMessages.length === 0
          ? `
        <div class="card hi stack">
          <div class="row-between">
            <strong>Ready for ${esc(biz.name)} (${esc(biz.countryName)} • ${esc(biz.billingCurrency)})</strong>
            <span class="badge">${esc(activeConv?.category || "General assistance")}</span>
          </div>
          <p class="muted small" style="margin:0;">
            Describe any task below — Cyton will classify your intent, assemble an execution plan, create ready-to-download deliverables, and enforce explicit owner confirmation before any external email or publish action.
          </p>
          <div class="chips">
            ${CYTON_EXAMPLE_COMMANDS.map((cmd) => `<button type="button" class="chip cy-quick-cmd" data-cmd="${esc(cmd)}">${esc(cmd)}</button>`).join("")}
          </div>
        </div>`
          : convMessages.map((m) => renderConversationMessageCard(m, biz, approvals)).join("")
      }
    </div>
  `;
}

function renderConversationMessageCard(m, biz, approvals) {
  if (m.role === "USER") {
    return `
      <div class="cy-msg cy-msg-user">
        <div class="row-between">
          <strong class="small">You</strong>
          <span class="muted" style="font-size:0.72rem;">${esc(fmtTime(m.createdAtMs))}</span>
        </div>
        ${m.attachmentLabel ? `<div class="badge violet" style="margin-top:0.3rem;">📎 ${esc(m.attachmentLabel)}</div>` : ""}
        <p class="small pre-wrap" style="margin:0.35rem 0 0;">${esc(m.messageText)}</p>
      </div>`;
  }

  const meta = m.meta || {};
  const plan = Array.isArray(meta.executionPlan) ? meta.executionPlan : [];
  const deliverables = Array.isArray(meta.deliverables) ? meta.deliverables : [];
  const questions = Array.isArray(meta.missingInfoQuestions) ? meta.missingInfoQuestions : [];
  const nextActions = Array.isArray(meta.suggestedNextActions) ? meta.suggestedNextActions : [];
  const memCandidate = meta.memoryCandidate;

  return `
    <div class="cy-msg cy-msg-ai stack">
      <div class="row-between">
        <div class="row-gap">
          <strong class="small" style="color:var(--purple-bright);">CYTON</strong>
          <span class="badge violet">${esc(meta.category || m.moduleUsed || "Assistant")}</span>
          ${meta.modelUsed ? `<span class="badge">${esc(meta.providerUsed || "")}/${esc(meta.modelUsed)}</span>` : ""}
        </div>
        <span class="muted" style="font-size:0.72rem;">${esc(fmtTime(m.createdAtMs))}</span>
      </div>

      <p class="small pre-wrap" style="margin:0;">${esc(m.messageText)}</p>

      ${
        questions.length
          ? `<div class="card" style="padding:0.75rem;border-color:rgba(245,158,11,0.35);">
              <div class="small" style="color:var(--amber);font-weight:600;">Information that would sharpen execution:</div>
              <ul class="small" style="margin:0.35rem 0 0;padding-left:1.1rem;">
                ${questions.map((q) => `<li>${esc(q)}</li>`).join("")}
              </ul>
            </div>`
          : ""
      }

      ${
        plan.length
          ? `<div class="card" style="padding:0.8rem;">
              <div class="row-between" style="margin-bottom:0.45rem;">
                <strong class="small">Execution Plan (${plan.length} steps)</strong>
                <button type="button" class="link-btn cy-jump-sub" data-sub="tasks" style="font-size:0.75rem;">Open Task Engine →</button>
              </div>
              <div class="stack" style="gap:0.35rem;">
                ${plan
                  .map(
                    (s) => `
                  <div class="cy-plan-step">
                    <div>
                      <strong style="font-size:0.8rem;">${esc(s.stepTitle)}</strong>
                      <div class="muted" style="font-size:0.73rem;">${esc(s.assignedAgent)} • Action: ${esc(s.actionClass)} ${s.outputDetail ? `— ${esc(s.outputDetail)}` : ""}</div>
                    </div>
                    <span class="badge ${s.status === "COMPLETED" ? "emerald" : s.status === "WAITING_APPROVAL" ? "amber" : "violet"}" style="font-size:0.68rem;">
                      ${esc(s.status)}
                    </span>
                  </div>`
                  )
                  .join("")}
              </div>
            </div>`
          : ""
      }

      ${
        deliverables.length
          ? deliverables
              .map(
                (d, idx) => `
            <div class="card hi stack" style="padding:0.85rem;">
              <div class="row-between">
                <div>
                  <span class="badge sky">${esc(d.type)} • ${esc(d.platform)}</span>
                  <strong style="display:block;margin-top:0.3rem;">${esc(d.title)}</strong>
                </div>
              </div>
              <p class="small pre-wrap" style="margin:0;max-height:280px;overflow-y:auto;">${esc(d.content)}</p>
              ${d.hashtags ? `<div class="mono small" style="color:var(--purple-bright);">${esc(d.hashtags)}</div>` : ""}
              <div class="row-gap">
                <button type="button" class="btn btn-outline btn-sm cy-dl-md" data-msg="${esc(m.id)}" data-idx="${idx}">Download .md</button>
                <button type="button" class="btn btn-outline btn-sm cy-dl-deck" data-msg="${esc(m.id)}" data-idx="${idx}">Slide Deck .html</button>
                <button type="button" class="btn btn-outline btn-sm cy-dl-csv" data-msg="${esc(m.id)}" data-idx="${idx}">Sheet .csv</button>
                <button type="button" class="btn btn-outline btn-sm cy-dl-pdf" data-msg="${esc(m.id)}" data-idx="${idx}">Print / PDF</button>
                <button type="button" class="btn btn-outline btn-sm cy-save-draft" data-msg="${esc(m.id)}" data-idx="${idx}">Save to MarketOS Approvals</button>
                ${
                  d.type === "EMAIL"
                    ? `<button type="button" class="btn btn-primary btn-sm cy-confirm-send-email" data-msg="${esc(m.id)}" data-idx="${idx}">Send Email (Confirm)</button>`
                    : ["SOCIAL_POST", "AD_COPY"].includes(d.type)
                      ? `<button type="button" class="btn btn-primary btn-sm cy-confirm-publish" data-msg="${esc(m.id)}" data-idx="${idx}">Publish (Confirm)</button>`
                      : ""
                }
              </div>
            </div>`
              )
              .join("")
          : ""
      }

      ${
        memCandidate
          ? `<div class="row-between" style="padding:0.45rem 0.65rem;background:var(--bg-subtle);border-radius:8px;">
              <span class="small">Save to Cyton Memory? <strong>${esc(memCandidate.title)}</strong></span>
              <button type="button" class="btn btn-outline btn-sm cy-save-mem-cand" data-title="${esc(memCandidate.title)}" data-content="${esc(memCandidate.content)}" data-type="${esc(memCandidate.memoryType || "PREFERENCE")}">Save Context</button>
            </div>`
          : ""
      }

      ${
        nextActions.length
          ? `<div class="chips">${nextActions.map((a) => `<button type="button" class="chip cy-quick-cmd" data-cmd="${esc(a)}">${esc(a)}</button>`).join("")}</div>`
          : ""
      }
    </div>`;
}

function renderTaskEngineView(tasks, approvals, logs) {
  const pendingAppr = approvals.filter((a) => a.decision === "PENDING");
  return `
    <div class="stack">
      <div class="row-between">
        <div>
          <h3>Autonomous Task Execution Engine</h3>
          <div class="muted small">Track multi-step execution states, pause/resume/cancel tasks, retry failed steps, and enforce owner approvals.</div>
        </div>
      </div>

      ${
        pendingAppr.length
          ? `<div class="card stack" style="border-color:rgba(245,158,11,0.45);">
              <strong style="color:var(--amber);">Pending Security Approvals (${pendingAppr.length})</strong>
              ${pendingAppr
                .map(
                  (a) => `
                <div class="row-between" style="padding:0.45rem 0;border-bottom:1px solid var(--border);">
                  <div>
                    <div class="small"><strong>${esc(a.actionType)}</strong> • ${esc(a.summary)}</div>
                    <div class="muted" style="font-size:0.75rem;">Requested by ${esc(a.requestedByAgent)}</div>
                  </div>
                  <div class="row-gap">
                    <button type="button" class="btn btn-emerald btn-sm cy-appr-yes" data-id="${esc(a.id)}">Approve</button>
                    <button type="button" class="btn btn-danger btn-sm cy-appr-no" data-id="${esc(a.id)}">Reject</button>
                  </div>
                </div>`
                )
                .join("")}
            </div>`
          : ""
      }

      ${
        tasks.length === 0
          ? `<div class="card muted">No autonomous tasks queued yet. Send an instruction in the Command Stream to launch your first multi-step workflow.</div>`
          : tasks
              .map((t) => {
                const steps = t.parsedResult?.executionPlan || [];
                const completedCount = steps.filter((s) => s.status === "COMPLETED").length;
                const pct = steps.length ? Math.round((completedCount / steps.length) * 100) : t.status === "COMPLETED" ? 100 : 25;
                const badgeClass =
                  t.status === "COMPLETED" ? "emerald" : t.status === "AWAITING_APPROVAL" ? "amber" : t.status === "FAILED" || t.status === "CANCELLED" ? "rose" : "violet";
                return `
                  <div class="card stack">
                    <div class="row-between">
                      <div>
                        <strong>${esc(t.title)}</strong>
                        <div class="muted small">Agent: ${esc(t.assignedAgent)} • Retries: ${t.retryCount}/${t.maxRetries}</div>
                      </div>
                      <span class="badge ${badgeClass}">${esc(t.status)}</span>
                    </div>
                    <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
                    <div class="muted small">${esc(t.inputSummary.slice(0, 180))}</div>
                    ${t.errorMessage ? `<div class="small" style="color:var(--rose);">${esc(t.errorMessage)}</div>` : ""}
                    ${
                      steps.length
                        ? `<div class="stack" style="gap:0.3rem;">
                            ${steps
                              .map(
                                (s) => `
                              <div class="cy-plan-step">
                                <span class="small">${esc(s.stepTitle)} <span class="muted">(${esc(s.actionClass)})</span></span>
                                <span class="badge ${s.status === "COMPLETED" ? "emerald" : s.status === "WAITING_APPROVAL" ? "amber" : "violet"}" style="font-size:0.68rem;">${esc(s.status)}</span>
                              </div>`
                              )
                              .join("")}
                          </div>`
                        : ""
                    }
                    <div class="row-gap">
                      ${
                        ["QUEUED", "RUNNING", "AWAITING_APPROVAL"].includes(t.status)
                          ? `<button type="button" class="btn btn-outline btn-sm cy-task-pause" data-id="${esc(t.id)}">Pause</button>
                             <button type="button" class="btn btn-danger btn-sm cy-task-cancel" data-id="${esc(t.id)}">Cancel</button>`
                          : ""
                      }
                      ${
                        t.status === "CANCELLED" || t.status === "FAILED"
                          ? `<button type="button" class="btn btn-outline btn-sm cy-task-resume" data-id="${esc(t.id)}">Resume / Retry</button>`
                          : ""
                      }
                      ${
                        t.status === "AWAITING_APPROVAL"
                          ? `<button type="button" class="btn btn-emerald btn-sm cy-task-complete" data-id="${esc(t.id)}">Approve Next Step</button>`
                          : ""
                      }
                    </div>
                  </div>`;
              })
              .join("")
      }

      <div class="card stack">
        <strong>Audit & Execution Logs (${logs.length})</strong>
        <div class="stack" style="gap:0.35rem;max-height:220px;overflow-y:auto;">
          ${
            logs.slice(0, 20).map(
              (l) => `
              <div class="row-between small" style="border-bottom:1px solid var(--border);padding-bottom:0.25rem;">
                <span><strong>${esc(l.actor)}</strong> • ${esc(l.action)} — <span class="muted">${esc(l.details)}</span></span>
                <span class="badge ${l.outcome === "SUCCESS" ? "emerald" : l.outcome === "FAILED" || l.outcome === "BLOCKED" ? "rose" : "amber"}">${esc(l.outcome)}</span>
              </div>`
            ).join("") || `<div class="muted small">No audit entries yet.</div>`
          }
        </div>
      </div>
    </div>`;
}

function renderProjectsView(projects, tasks, allMessagesForBiz) {
  return `
    <div class="stack">
      <div class="row-between">
        <div>
          <h3>Cyton Project Workspaces</h3>
          <div class="muted small">Organize campaigns, launches, YouTube channels, and client strategies with persistent project context.</div>
        </div>
        <button id="cy-create-proj-btn" type="button" class="btn btn-primary btn-sm">+ New Project</button>
      </div>

      ${
        projects.length === 0
          ? `<div class="card muted">No projects created yet. Create a project like "Clothing Brand Launch" or "Business Development" to scope Cyton's memory and deliverables.</div>`
          : projects
              .map((p) => {
                const pTasks = tasks.filter((t) => t.workflowId === p.id);
                const pDelCount = pTasks.reduce((acc, t) => acc + (t.parsedResult?.deliverables?.length || 0), 0);
                const isActive = cytonUiState.activeProjectId === p.id;
                return `
                  <div class="card ${isActive ? "hi" : ""} stack">
                    <div class="row-between">
                      <div>
                        <strong>📂 ${esc(p.name)}</strong>
                        <div class="muted small">${pTasks.length} task(s) • ${pDelCount} deliverable(s)</div>
                      </div>
                      <span class="badge ${isActive ? "emerald" : "violet"}">${isActive ? "Active Context" : "Ready"}</span>
                    </div>
                    <p class="small" style="margin:0;">${esc(p.objective || "No custom instructions added.")}</p>
                    <div class="row-gap">
                      <button type="button" class="btn btn-primary btn-sm cy-use-proj" data-id="${esc(p.id)}">${isActive ? "Using in Chat" : "Use in Chat"}</button>
                      <button type="button" class="btn btn-outline btn-sm cy-export-proj" data-id="${esc(p.id)}">Export JSON</button>
                      <button type="button" class="btn btn-danger btn-sm cy-del-proj" data-id="${esc(p.id)}">Delete</button>
                    </div>
                  </div>`;
              })
              .join("")
      }
    </div>`;
}

function renderCreativeDocsStudioView(deliverables, projects) {
  return `
    <div class="stack">
      <div>
        <h3>Creative, Document & Presentation Studio</h3>
        <div class="muted small">Download generated strategies, presentations, spreadsheets, and creative briefs, or inspect live competitor URLs.</div>
      </div>

      <div class="card hi stack">
        <strong>Live Competitor & Website Research (Server-Verified)</strong>
        <div class="row-gap">
          <input id="cy-research-url" class="input" style="flex:1;" placeholder="https://competitor-or-client.com" value="${esc(cytonUiState.websiteResearchInput)}" />
          <button id="cy-run-research" type="button" class="btn btn-primary btn-sm" ${cytonUiState.websiteResearchLoading ? "disabled" : ""}>
            ${cytonUiState.websiteResearchLoading ? "Inspecting..." : "Fetch Live Site Data"}
          </button>
        </div>
        ${
          cytonUiState.websiteResearchResult
            ? `<div class="stack small" style="padding-top:0.4rem;">
                <div><span class="badge emerald">Verified HTTP ${cytonUiState.websiteResearchResult.httpStatus} • ${cytonUiState.websiteResearchResult.wordCount} words • ${cytonUiState.websiteResearchResult.linkCount} links</span></div>
                <div><strong>Title:</strong> ${esc(cytonUiState.websiteResearchResult.title)}</div>
                <div><strong>Meta Description:</strong> ${esc(cytonUiState.websiteResearchResult.metaDescription)}</div>
                <div><strong>H1:</strong> ${esc(cytonUiState.websiteResearchResult.primaryH1)}</div>
              </div>`
            : ""
        }
      </div>

      ${
        deliverables.length === 0
          ? `<div class="card muted">Generated documents, slide decks, ad concepts, emails, and briefs from your Cyton conversations appear here for download and export.</div>`
          : deliverables
              .map(
                (d, idx) => `
            <div class="card stack">
              <div class="row-between">
                <div>
                  <span class="badge sky">${esc(d.type)} • ${esc(d.platform)}</span>
                  <strong style="display:block;margin-top:0.25rem;">${esc(d.title)}</strong>
                </div>
              </div>
              <p class="small pre-wrap" style="margin:0;max-height:200px;overflow-y:auto;">${esc(d.content)}</p>
              <div class="row-gap">
                <button type="button" class="btn btn-outline btn-sm cy-st-md" data-idx="${idx}">Download .md</button>
                <button type="button" class="btn btn-outline btn-sm cy-st-deck" data-idx="${idx}">Presentation .html</button>
                <button type="button" class="btn btn-outline btn-sm cy-st-csv" data-idx="${idx}">Spreadsheet .csv</button>
                <button type="button" class="btn btn-outline btn-sm cy-st-pdf" data-idx="${idx}">Print / PDF</button>
                <button type="button" class="btn btn-outline btn-sm cy-st-var" data-idx="${idx}">Generate Variations</button>
              </div>
            </div>`
              )
              .join("")
      }
    </div>`;
}

function renderModelGatewayView(cfg, cytonSettings, serverHealth) {
  return `
    <div class="stack">
      <div>
        <h3>Cyton AI Model Gateway & Customisation</h3>
        <div class="muted small">Cyton orchestrates your workflows across configurable AI providers. Cyton never claims to have trained its own foundation model.</div>
      </div>

      <div class="card hi stack">
        <div class="grid-2">
          <div class="field">
            <label for="cy-gw-provider">Primary AI Provider</label>
            <select id="cy-gw-provider" class="select">
              ${CYTON_MODEL_PROVIDERS.map(
                (p) => `<option value="${p.id}" ${cfg.provider === p.id ? "selected" : ""}>${esc(p.name)} ${serverHealth?.providers?.[p.id]?.configuredOnServer ? "(Server Env Active)" : ""}</option>`
              ).join("")}
            </select>
          </div>
          <div class="field">
            <label for="cy-gw-model">Model ID</label>
            <input id="cy-gw-model" class="input" value="${esc(cfg.model)}" placeholder="gemini-2.5-flash" />
          </div>
        </div>

        <div class="field">
          <label for="cy-gw-key">Provider API Key (optional if already set in Vercel Environment Variables)</label>
          <input id="cy-gw-key" type="password" class="input" value="${esc(cfg.apiKey)}" placeholder="Leave blank if server environment variable is configured" />
        </div>

        ${
          cfg.provider === "custom"
            ? `<div class="field"><label for="cy-gw-endpoint">Custom OpenAI-Compatible Endpoint URL</label><input id="cy-gw-endpoint" class="input" value="${esc(cfg.endpointUrl)}" placeholder="https://your-gateway.example.com/v1/chat/completions" /></div>`
            : ""
        }

        <div class="grid-2">
          <div class="field">
            <label for="cy-gw-fb-prov">Fallback Provider (Optional)</label>
            <select id="cy-gw-fb-prov" class="select">
              <option value="">None</option>
              ${CYTON_MODEL_PROVIDERS.map((p) => `<option value="${p.id}" ${cfg.fallbackProvider === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label for="cy-gw-autonomy">Execution Autonomy Policy</label>
            <select id="cy-gw-autonomy" class="select">
              <option value="SUPERVISED" ${cytonSettings.autonomyMode === "SUPERVISED" ? "selected" : ""}>Supervised (Approve drafts & actions)</option>
              <option value="SEMI_AUTONOMOUS" ${cytonSettings.autonomyMode === "SEMI_AUTONOMOUS" ? "selected" : ""}>Semi-Autonomous (Auto-create drafts, approve publish/send)</option>
              <option value="AUTONOMOUS_DRAFTS" ${cytonSettings.autonomyMode === "AUTONOMOUS_DRAFTS" ? "selected" : ""}>Autonomous Drafts (Always gate external publish/send)</option>
            </select>
          </div>
        </div>

        <div class="field">
          <label for="cy-gw-custom">Cyton Custom System Instructions</label>
          <textarea id="cy-gw-custom" class="textarea" rows="3" placeholder="e.g. Always keep tone crisp and executive, format budgets cleanly, prioritize direct ROI.">${esc(cfg.customInstructions)}</textarea>
        </div>

        <button id="cy-gw-save" type="button" class="btn btn-primary">Save Model Gateway Settings</button>
      </div>
    </div>`;
}

function renderMarketplaceView(serverHealth) {
  return `
    <div class="stack">
      <div>
        <h3>Cyton Integration Marketplace</h3>
        <div class="muted small">Apps only show as connected after verified OAuth authorization or server credentials. External tokens are never exposed in client code.</div>
      </div>

      <div class="grid-2">
        ${CYTON_MARKETPLACE_INTEGRATIONS.map((intg) => {
          const srv = serverHealth?.integrations?.[intg.id];
          const isConfigured = intg.builtIn
            ? intg.id === "website_research" || Boolean(srv?.emailDeliveryConfigured)
            : Boolean(srv?.oauthConfigured);
          const oauthCheck = cytonUiState.oauthStatuses[intg.id];
          return `
            <div class="card stack">
              <div class="row-between">
                <div class="row-gap">
                  <span style="font-size:1.3rem;">${intg.icon}</span>
                  <div>
                    <strong>${esc(intg.name)}</strong>
                    <div class="muted" style="font-size:0.74rem;">${esc(intg.category)}</div>
                  </div>
                </div>
                <span class="badge ${isConfigured ? "emerald" : "neutral"}">${isConfigured ? "Ready / Configured" : "Not Connected"}</span>
              </div>
              <p class="muted small" style="margin:0;">${esc(intg.description)}</p>
              <div class="small" style="font-size:0.74rem;">Permissions: <span class="mono">${esc(intg.permissions)}</span></div>
              ${oauthCheck?.message ? `<div class="small" style="color:var(--amber);font-size:0.76rem;">${esc(oauthCheck.message)}</div>` : ""}
              ${
                intg.oauthKey
                  ? `<button type="button" class="btn btn-outline btn-sm cy-check-oauth" data-id="${esc(intg.id)}" data-oauth="${esc(intg.oauthKey)}">
                      ${oauthCheck?.authorizationUrl ? "Open OAuth Consent" : "Check & Connect OAuth"}
                    </button>`
                  : `<span class="badge violet">Built-in Engine Tool</span>`
              }
            </div>`;
        }).join("")}
      </div>
    </div>`;
}

function bindCytonEvents(container, ctx) {
  const { appState, store, biz, toast, openModal, closeModal, render, conversations, activeConv, activeProject, projects, tasks, allMessagesForBiz, cytonSettings } = ctx;

  document.getElementById("cy-close-left")?.addEventListener("click", () => {
    cytonUiState.leftOpen = false;
    render();
  });
  document.getElementById("cy-open-left")?.addEventListener("click", () => {
    cytonUiState.leftOpen = true;
    render();
  });
  document.getElementById("cy-close-right")?.addEventListener("click", () => {
    cytonUiState.rightOpen = false;
    render();
  });
  document.getElementById("cy-open-right")?.addEventListener("click", () => {
    cytonUiState.rightOpen = true;
    render();
  });

  document.querySelectorAll(".cy-sub-btn, .cy-jump-sub").forEach((b) => {
    b.addEventListener("click", () => {
      cytonUiState.subView = b.dataset.sub;
      render();
    });
  });

  document.getElementById("cy-new-chat")?.addEventListener("click", async () => {
    const id = await store.saveCytonConversationMeta(appState.user.uid, {
      businessId: biz.id,
      title: "New Chat",
      category: "General assistance",
      pinned: false,
      projectId: cytonUiState.activeProjectId || ""
    });
    cytonUiState.activeConversationId = id;
    cytonUiState.subView = "stream";
    cytonUiState.lastError = "";
    setOrbState("idle");
    render();
  });

  document.getElementById("cy-conv-search")?.addEventListener("input", (e) => {
    cytonUiState.searchQuery = e.target.value;
    renderAndKeepFocus(render, "cy-conv-search");
  });
  document.getElementById("cy-cat-filter")?.addEventListener("change", (e) => {
    cytonUiState.categoryFilter = e.target.value;
    render();
  });

  document.querySelectorAll("[data-conv-id]").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      cytonUiState.activeConversationId = el.dataset.convId;
      cytonUiState.subView = "stream";
      render();
    });
  });

  document.querySelectorAll(".cy-pin-conv").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const target = conversations.find((c) => c.id === btn.dataset.id);
      if (!target) return;
      await store.saveCytonConversationMeta(appState.user.uid, {
        ...target,
        businessId: biz.id,
        pinned: !target.pinned
      });
    });
  });

  document.querySelectorAll(".cy-ren-conv").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const target = conversations.find((c) => c.id === btn.dataset.id);
      if (!target) return;
      openModal(
        `<div class="modal-card">
          <h3>Rename Conversation</h3>
          <div class="field"><label>Title</label><input id="cy-ren-input" class="input" value="${esc(target.title)}" /></div>
          <div class="row-between">
            <button id="modal-cancel" class="btn btn-outline" type="button">Cancel</button>
            <button id="modal-save" class="btn btn-primary" type="button">Save</button>
          </div>
        </div>`,
        () => {
          document.getElementById("modal-cancel")?.addEventListener("click", closeModal);
          document.getElementById("modal-save")?.addEventListener("click", async () => {
            const newTitle = document.getElementById("cy-ren-input").value.trim();
            if (!newTitle) return;
            await store.saveCytonConversationMeta(appState.user.uid, {
              ...target,
              businessId: biz.id,
              title: newTitle
            });
            closeModal();
          });
        }
      );
    });
  });

  document.querySelectorAll(".cy-del-conv").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const convId = btn.dataset.id;
      const msgIds = allMessagesForBiz.filter((m) => m.meta?.conversationId === convId).map((m) => m.id);
      await store.deleteCytonConversation(appState.user.uid, convId, msgIds);
      if (cytonUiState.activeConversationId === convId) {
        cytonUiState.activeConversationId = "";
      }
      toast("Conversation deleted");
    });
  });

  document.querySelectorAll("[data-proj-select]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pid = btn.dataset.projSelect;
      cytonUiState.activeProjectId = cytonUiState.activeProjectId === pid ? "" : pid;
      render();
    });
  });

  const openProjectCreateModal = () => {
    openModal(
      `<div class="modal-card">
        <h3>Create Cyton Project</h3>
        <div class="field"><label>Project Name *</label><input id="cy-prj-name" class="input" placeholder="e.g. Clothing Brand Launch" /></div>
        <div class="field"><label>Instructions & Context</label><textarea id="cy-prj-obj" class="textarea" rows="3" placeholder="Goals, target audience, deliverables, tone..."></textarea></div>
        <div class="row-between">
          <button id="modal-cancel" class="btn btn-outline" type="button">Cancel</button>
          <button id="modal-save" class="btn btn-primary" type="button">Create Project</button>
        </div>
      </div>`,
      () => {
        document.getElementById("modal-cancel")?.addEventListener("click", closeModal);
        document.getElementById("modal-save")?.addEventListener("click", async () => {
          const name = document.getElementById("cy-prj-name").value.trim();
          if (!name) return toast("Enter a project name.");
          const pid = await store.saveCytonProject(appState.user.uid, {
            businessId: biz.id,
            name,
            objective: document.getElementById("cy-prj-obj").value.trim()
          });
          cytonUiState.activeProjectId = pid;
          closeModal();
          toast(`Project '${name}' created`);
        });
      }
    );
  };

  document.getElementById("cy-quick-new-proj")?.addEventListener("click", openProjectCreateModal);
  document.getElementById("cy-create-proj-btn")?.addEventListener("click", openProjectCreateModal);

  document.querySelectorAll(".cy-use-proj").forEach((b) => {
    b.addEventListener("click", () => {
      cytonUiState.activeProjectId = b.dataset.id;
      cytonUiState.subView = "stream";
      render();
    });
  });

  document.querySelectorAll(".cy-del-proj").forEach((b) => {
    b.addEventListener("click", async () => {
      await store.deleteCytonProject(appState.user.uid, b.dataset.id);
      if (cytonUiState.activeProjectId === b.dataset.id) cytonUiState.activeProjectId = "";
      toast("Project deleted");
    });
  });

  document.querySelectorAll(".cy-export-proj").forEach((b) => {
    b.addEventListener("click", () => {
      const p = projects.find((x) => x.id === b.dataset.id);
      if (!p) return;
      const pTasks = tasks.filter((t) => t.workflowId === p.id);
      const pDels = pTasks.flatMap((t) => t.parsedResult?.deliverables || []);
      downloadProjectBundleJson(p, pTasks, pDels);
      toast("Project bundle downloaded");
    });
  });

  // Memory panel
  document.getElementById("cy-mem-search")?.addEventListener("input", (e) => {
    cytonUiState.memorySearch = e.target.value;
    renderAndKeepFocus(render, "cy-mem-search");
  });
  document.getElementById("cy-add-mem-btn")?.addEventListener("click", () => {
    openModal(
      `<div class="modal-card">
        <h3>Save Cyton Memory</h3>
        <div class="field"><label>Title *</label><input id="cy-mem-t" class="input" placeholder="e.g. Brand Tone & Pricing Rule" /></div>
        <div class="field"><label>Context / Rule *</label><textarea id="cy-mem-c" class="textarea" rows="3" placeholder="Information Cyton should remember for this business..."></textarea></div>
        <div class="row-between">
          <button id="modal-cancel" class="btn btn-outline" type="button">Cancel</button>
          <button id="modal-save" class="btn btn-primary" type="button">Save Memory</button>
        </div>
      </div>`,
      () => {
        document.getElementById("modal-cancel")?.addEventListener("click", closeModal);
        document.getElementById("modal-save")?.addEventListener("click", async () => {
          const title = document.getElementById("cy-mem-t").value.trim();
          const content = document.getElementById("cy-mem-c").value.trim();
          if (!title || !content) return toast("Title and content required.");
          await store.saveCytonMemory(appState.user.uid, { businessId: biz.id, title, content, memoryType: "PREFERENCE" });
          closeModal();
          toast("Saved to Cyton Memory");
        });
      }
    );
  });
  document.querySelectorAll(".cy-del-mem").forEach((b) => {
    b.addEventListener("click", async () => {
      await store.deleteCytonMemory(appState.user.uid, b.dataset.id);
      toast("Memory deleted");
    });
  });
  document.querySelectorAll(".cy-save-mem-cand").forEach((b) => {
    b.addEventListener("click", async () => {
      await store.saveCytonMemory(appState.user.uid, {
        businessId: biz.id,
        title: b.dataset.title,
        content: b.dataset.content,
        memoryType: b.dataset.type || "PREFERENCE"
      });
      toast("Saved preference to Cyton Memory");
    });
  });

  // Right panel kill switch
  document.getElementById("cy-right-killswitch")?.addEventListener("change", async (e) => {
    await store.saveCytonSettings(appState.user.uid, biz.id, {
      ...cytonSettings,
      emergencyPaused: e.target.checked
    });
    toast(e.target.checked ? "Cyton automation paused" : "Cyton automation resumed");
  });

  // Command input + Voice + File upload
  const cmdBox = document.getElementById("cy-command-input");
  cmdBox?.addEventListener("input", (e) => {
    cytonUiState.draftPrompt = e.target.value;
  });
  cmdBox?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      executeCommand();
    }
  });

  document.querySelectorAll(".cy-quick-cmd").forEach((btn) => {
    btn.addEventListener("click", () => {
      cytonUiState.draftPrompt = btn.dataset.cmd;
      if (cmdBox) {
        cmdBox.value = cytonUiState.draftPrompt;
        cmdBox.focus();
      }
    });
  });

  document.getElementById("cy-file-input")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      cytonUiState.pendingAttachment = await readAttachmentFile(file);
      toast(`Attached ${file.name}`);
      render();
    } catch (err) {
      toast(err.message);
    }
  });
  document.getElementById("cy-clear-att")?.addEventListener("click", () => {
    cytonUiState.pendingAttachment = null;
    render();
  });

  document.getElementById("cy-voice-btn")?.addEventListener("click", () => {
    if (cytonUiState.voiceRecognition) {
      cytonUiState.voiceRecognition.stop();
      cytonUiState.voiceRecognition = null;
      setOrbState("idle");
      render();
      return;
    }
    if (!isVoiceInputSupported()) {
      toast("Voice input is not supported in this browser.");
      return;
    }
    setOrbState("listening");
    cytonUiState.voiceRecognition = startVoiceRecognition({
      onTranscript: (txt) => {
        cytonUiState.draftPrompt = txt;
        if (cmdBox) cmdBox.value = txt;
      },
      onError: (msg) => {
        toast("Voice input error: " + msg);
        cytonUiState.voiceRecognition = null;
        setOrbState("idle");
        render();
      },
      onEnd: () => {
        cytonUiState.voiceRecognition = null;
        setOrbState("idle");
        render();
      }
    });
  });

  async function executeCommand() {
    const prompt = String(cytonUiState.draftPrompt || "").trim();
    if (!prompt) return;
    if (cytonSettings.emergencyPaused) {
      toast("Cyton Emergency Pause is enabled. Uncheck pause in the right panel to run tasks.");
      return;
    }

    const attachment = cytonUiState.pendingAttachment;
    cytonUiState.draftPrompt = "";
    cytonUiState.pendingAttachment = null;
    cytonUiState.lastError = "";
    cytonUiState.subView = "stream";

    let convId = cytonUiState.activeConversationId;
    if (!convId) {
      convId = await store.saveCytonConversationMeta(appState.user.uid, {
        businessId: biz.id,
        title: prompt.slice(0, 60),
        category: "General assistance",
        pinned: false,
        projectId: cytonUiState.activeProjectId || ""
      });
      cytonUiState.activeConversationId = convId;
    }

    const history = getScopedMessages(appState, biz.id, convId).map((m) => ({
      role: m.role,
      text: m.messageText
    }));

    await store.saveAiMessage(appState.user.uid, {
      businessId: biz.id,
      role: "USER",
      moduleUsed: "CYTON",
      messageText: prompt,
      structuredPreview: JSON.stringify({ conversationId: convId, projectId: cytonUiState.activeProjectId || "" }),
      attachmentLabel: attachment ? attachment.name : "",
      tokensEstimated: 0
    });

    setOrbState("thinking");
    setTimeout(() => {
      if (cytonUiState.orbState === "thinking") setOrbState("planning");
    }, 900);
    setTimeout(() => {
      if (cytonUiState.orbState === "planning") setOrbState("creating");
    }, 2200);

    try {
      const result = await runCytonOrchestrator({
        prompt,
        userId: appState.user.uid,
        business: biz,
        project: activeProject,
        memoryItems: getScopedMemories(appState, biz.id),
        integrations: appState.integrations.filter((i) => i.businessId === biz.id),
        history,
        attachment
      });

      setOrbState("executing");

      // Update conversation title/category
      const curMeta = conversations.find((c) => c.id === convId);
      await store.saveCytonConversationMeta(appState.user.uid, {
        id: convId,
        businessId: biz.id,
        title: !curMeta || curMeta.title === "New Chat" ? prompt.slice(0, 64) : curMeta.title,
        category: result.category,
        pinned: Boolean(curMeta?.pinned),
        projectId: cytonUiState.activeProjectId || curMeta?.projectId || ""
      });

      // Persist Task Object in cyton_tasks (strictly matching create rule QUEUED -> update COMPLETED/AWAITING_APPROVAL)
      const needsApproval = result.executionPlan.some((s) => s.requiresApproval);
      const taskId = await store.createCytonTask(appState.user.uid, {
        businessId: biz.id,
        workflowId: cytonUiState.activeProjectId || "",
        assignedAgent: result.executionPlan[0]?.assignedAgent || "OPERATIONS",
        requestedTool: "cyton_orchestrator",
        title: (result.deliverables[0]?.title || prompt).slice(0, 150),
        inputSummary: prompt.slice(0, 3900),
        status: "QUEUED",
        requiresApproval
      });

      await store.updateCytonTask(appState.user.uid, taskId, {
        status: needsApproval ? "AWAITING_APPROVAL" : "COMPLETED",
        actualCredits: 1,
        requiresApproval,
        resultSummary: JSON.stringify({
          executionPlan: result.executionPlan,
          deliverables: result.deliverables
        }).slice(0, 7900)
      });

      if (needsApproval) {
        const aprStep = result.executionPlan.find((s) => s.requiresApproval);
        await store.createCytonApproval(appState.user.uid, {
          businessId: biz.id,
          taskId,
          requestedByAgent: aprStep?.assignedAgent || "OPERATIONS",
          actionType: aprStep?.actionClass === "PUBLISH" ? "PUBLISH_CONTENT" : "IRREVERSIBLE_EXTERNAL_ACTION",
          summary: `${aprStep?.stepTitle || "External action"} (${aprStep?.actionClass || "CONFIRM"})`,
          targetCollection: "cyton_tasks",
          targetId: taskId,
          currencyCode: biz.billingCurrency
        });
      }

      await store.appendCytonLog(appState.user.uid, {
        businessId: biz.id,
        actor: "CYTON_CORE",
        action: `ORCHESTRATE:${result.category}`,
        outcome: needsApproval ? "PENDING_APPROVAL" : "SUCCESS",
        details: `${result.providerUsed}/${result.modelUsed} • ${result.deliverables.length} deliverables • ${result.executionPlan.length} steps`
      });

      await store.incrementAiUsage(
        appState.user.uid,
        appState.profile?.aiGenerationsThisMonth || 0,
        appState.profile?.aiTokenCountThisMonth || 0,
        result.estimatedTokens || 200
      );

      const previewPayload = JSON.stringify({
        conversationId: convId,
        projectId: cytonUiState.activeProjectId || "",
        category: result.category,
        providerUsed: result.providerUsed,
        modelUsed: result.modelUsed,
        missingInfoQuestions: result.missingInfoQuestions,
        executionPlan: result.executionPlan,
        deliverables: result.deliverables,
        suggestedNextActions: result.suggestedNextActions,
        memoryCandidate: result.memoryCandidate
      }).slice(0, 3950);

      await store.saveAiMessage(appState.user.uid, {
        businessId: biz.id,
        role: "ASSISTANT",
        moduleUsed: result.category.slice(0, 60),
        messageText: result.assistantReply,
        structuredPreview: previewPayload,
        attachmentLabel: "",
        tokensEstimated: result.estimatedTokens || 200
      });

      setOrbState("completed");
      render();
    } catch (err) {
      cytonUiState.lastError = err?.message || "Cyton execution failed.";
      setOrbState("error");
      if (err?.code === "PROVIDER_KEY_MISSING") {
        toast("Add an AI provider API key in Model Gateway to run live execution.");
      }
      render();
    }
  }

  document.getElementById("cy-send-btn")?.addEventListener("click", executeCommand);

  // Deliverable export & confirmation actions in Command Stream
  const findMsgDeliverable = (msgId, idx) => {
    const msg = allMessagesForBiz.find((m) => m.id === msgId);
    return msg?.meta?.deliverables?.[Number(idx)] || null;
  };

  document.querySelectorAll(".cy-dl-md").forEach((b) =>
    b.addEventListener("click", () => {
      const d = findMsgDeliverable(b.dataset.msg, b.dataset.idx);
      if (d) downloadDeliverableMarkdown(d);
    })
  );
  document.querySelectorAll(".cy-dl-deck").forEach((b) =>
    b.addEventListener("click", () => {
      const d = findMsgDeliverable(b.dataset.msg, b.dataset.idx);
      if (d) downloadPresentationDeckHtml(d);
    })
  );
  document.querySelectorAll(".cy-dl-csv").forEach((b) =>
    b.addEventListener("click", () => {
      const d = findMsgDeliverable(b.dataset.msg, b.dataset.idx);
      if (d) downloadDeliverableCsv(d);
    })
  );
  document.querySelectorAll(".cy-dl-pdf").forEach((b) =>
    b.addEventListener("click", () => {
      const d = findMsgDeliverable(b.dataset.msg, b.dataset.idx);
      if (d) {
        try {
          printDeliverableAsPdf(d);
        } catch (err) {
          toast(err.message);
        }
      }
    })
  );

  document.querySelectorAll(".cy-save-draft").forEach((b) => {
    b.addEventListener("click", async () => {
      const d = findMsgDeliverable(b.dataset.msg, b.dataset.idx);
      if (!d) return;
      await store.createContentItem(appState.user.uid, {
        businessId: biz.id,
        contentType: d.type === "EMAIL" ? "EMAIL_DRAFT" : d.type === "AD_COPY" ? "AD_COPY" : "SOCIAL_POST",
        platform: d.platform || "Multi-Channel",
        title: d.title,
        body: d.content,
        hashtags: d.hashtags || "",
        approvalStatus: "PENDING_APPROVAL",
        scheduledTimeZone: biz.timeZone,
        aiModule: "CYTON"
      });
      toast("Sent deliverable to MarketOS Approvals Hub");
    });
  });

  document.querySelectorAll(".cy-confirm-send-email").forEach((b) => {
    b.addEventListener("click", () => {
      const d = findMsgDeliverable(b.dataset.msg, b.dataset.idx);
      if (!d) return;
      openModal(
        `<div class="modal-card">
          <h3>Confirm Email Dispatch</h3>
          <p class="muted small" style="margin:0;">Cyton requires explicit confirmation before sending external emails.</p>
          <div class="field"><label>Recipient Email *</label><input id="cy-em-to" type="email" class="input" placeholder="recipient@company.com" /></div>
          <div class="field"><label>Subject *</label><input id="cy-em-sub" class="input" value="${esc(d.title)}" /></div>
          <div class="field"><label>Body *</label><textarea id="cy-em-body" class="textarea" rows="6">${esc(d.content)}</textarea></div>
          <div class="row-between">
            <button id="modal-cancel" class="btn btn-outline" type="button">Cancel</button>
            <button id="modal-send" class="btn btn-primary" type="button">Confirm & Send</button>
          </div>
        </div>`,
        () => {
          document.getElementById("modal-cancel")?.addEventListener("click", closeModal);
          document.getElementById("modal-send")?.addEventListener("click", async () => {
            const to = document.getElementById("cy-em-to").value.trim();
            const subject = document.getElementById("cy-em-sub").value.trim();
            const body = document.getElementById("cy-em-body").value.trim();
            try {
              const res = await runCytonServerAction({
                actionType: "SEND_EMAIL",
                actionClass: "SEND",
                explicitApproval: true,
                payload: { to, subject, body, fromName: biz.name }
              });
              await store.appendCytonLog(appState.user.uid, {
                businessId: biz.id,
                actor: "CYTON_EMAIL",
                action: "SEND_EMAIL",
                outcome: "SUCCESS",
                details: `Sent via ${res.provider} to ${to}`
              });
              closeModal();
              toast(`Email sent via ${res.provider}`);
            } catch (err) {
              await store.appendCytonLog(appState.user.uid, {
                businessId: biz.id,
                actor: "CYTON_EMAIL",
                action: "SEND_EMAIL",
                outcome: "FAILED",
                details: err.message
              });
              if (err.mailtoUrl) {
                window.open(err.mailtoUrl, "_blank");
                toast("Server email transport not configured — opened in your default email app.");
                closeModal();
              } else {
                toast(err.message);
              }
            }
          });
        }
      );
    });
  });

  document.querySelectorAll(".cy-confirm-publish").forEach((b) => {
    b.addEventListener("click", async () => {
      const d = findMsgDeliverable(b.dataset.msg, b.dataset.idx);
      if (!d) return;
      openModal(
        `<div class="modal-card">
          <h3>Confirm External Publish</h3>
          <p class="small" style="margin:0;">You are authorizing Cyton to attempt publishing <strong>${esc(d.title)}</strong> to <strong>${esc(d.platform)}</strong>.</p>
          <div class="row-between">
            <button id="modal-cancel" class="btn btn-outline" type="button">Cancel</button>
            <button id="modal-pub" class="btn btn-primary" type="button">Confirm Publish</button>
          </div>
        </div>`,
        () => {
          document.getElementById("modal-cancel")?.addEventListener("click", closeModal);
          document.getElementById("modal-pub")?.addEventListener("click", async () => {
            try {
              await runCytonServerAction({
                actionType: "PUBLISH_SOCIAL",
                actionClass: "PUBLISH",
                explicitApproval: true,
                payload: { platform: d.platform, title: d.title, content: d.content }
              });
            } catch (err) {
              await store.appendCytonLog(appState.user.uid, {
                businessId: biz.id,
                actor: "CYTON_SOCIAL",
                action: `PUBLISH:${d.platform}`,
                outcome: "BLOCKED",
                details: err.message
              });
              toast(err.message);
              closeModal();
            }
          });
        }
      );
    });
  });

  // Task Engine controls
  document.querySelectorAll(".cy-task-pause").forEach((b) =>
    b.addEventListener("click", async () => {
      await store.updateCytonTask(appState.user.uid, b.dataset.id, { status: "CANCELLED", errorMessage: "Paused by user" });
      toast("Task paused");
    })
  );
  document.querySelectorAll(".cy-task-cancel").forEach((b) =>
    b.addEventListener("click", async () => {
      await store.updateCytonTask(appState.user.uid, b.dataset.id, { status: "CANCELLED", errorMessage: "Cancelled by user" });
      toast("Task cancelled");
    })
  );
  document.querySelectorAll(".cy-task-resume").forEach((b) =>
    b.addEventListener("click", async () => {
      const target = tasks.find((t) => t.id === b.dataset.id);
      await store.updateCytonTask(appState.user.uid, b.dataset.id, {
        status: "COMPLETED",
        retryCount: (target?.retryCount || 0) + 1,
        errorMessage: ""
      });
      toast("Task resumed & completed");
    })
  );
  document.querySelectorAll(".cy-task-complete").forEach((b) =>
    b.addEventListener("click", async () => {
      await store.updateCytonTask(appState.user.uid, b.dataset.id, { status: "COMPLETED", requiresApproval: false });
      toast("Approved task step");
    })
  );

  document.querySelectorAll(".cy-appr-yes").forEach((b) =>
    b.addEventListener("click", async () => {
      await store.decideCytonApproval(appState.user.uid, b.dataset.id, true, "Approved by owner");
      toast("Approval granted");
    })
  );
  document.querySelectorAll(".cy-appr-no").forEach((b) =>
    b.addEventListener("click", async () => {
      await store.decideCytonApproval(appState.user.uid, b.dataset.id, false, "Rejected by owner");
      toast("Approval rejected");
    })
  );

  // Studio view downloads & research
  const studioDeliverables = getAllDeliverablesFromTasksAndMessages(tasks, allMessagesForBiz);
  document.querySelectorAll(".cy-st-md").forEach((b) =>
    b.addEventListener("click", () => downloadDeliverableMarkdown(studioDeliverables[Number(b.dataset.idx)]))
  );
  document.querySelectorAll(".cy-st-deck").forEach((b) =>
    b.addEventListener("click", () => downloadPresentationDeckHtml(studioDeliverables[Number(b.dataset.idx)]))
  );
  document.querySelectorAll(".cy-st-csv").forEach((b) =>
    b.addEventListener("click", () => downloadDeliverableCsv(studioDeliverables[Number(b.dataset.idx)]))
  );
  document.querySelectorAll(".cy-st-pdf").forEach((b) =>
    b.addEventListener("click", () => {
      try {
        printDeliverableAsPdf(studioDeliverables[Number(b.dataset.idx)]);
      } catch (err) {
        toast(err.message);
      }
    })
  );
  document.querySelectorAll(".cy-st-var").forEach((b) => {
    b.addEventListener("click", () => {
      const d = studioDeliverables[Number(b.dataset.idx)];
      if (!d) return;
      cytonUiState.draftPrompt = `Create 3 fresh creative variations of '${d.title}' for ${d.platform}.`;
      cytonUiState.subView = "stream";
      render();
    });
  });

  document.getElementById("cy-run-research")?.addEventListener("click", async () => {
    const url = document.getElementById("cy-research-url")?.value.trim();
    if (!url) return toast("Enter a website URL to inspect.");
    cytonUiState.websiteResearchInput = url;
    cytonUiState.websiteResearchLoading = true;
    render();
    try {
      const res = await runCytonServerAction({
        actionType: "WEBSITE_RESEARCH",
        actionClass: "READ",
        explicitApproval: true,
        payload: { url }
      });
      cytonUiState.websiteResearchResult = res;
    } catch (err) {
      toast(err.message);
    } finally {
      cytonUiState.websiteResearchLoading = false;
      render();
    }
  });

  // Model Gateway save
  document.getElementById("cy-gw-provider")?.addEventListener("change", (e) => {
    const prov = CYTON_MODEL_PROVIDERS.find((p) => p.id === e.target.value);
    saveCytonGatewayConfig({ provider: e.target.value, model: prov?.defaultModel || "" });
    render();
  });
  document.getElementById("cy-gw-save")?.addEventListener("click", async () => {
    const provider = document.getElementById("cy-gw-provider").value;
    const model = document.getElementById("cy-gw-model").value.trim();
    const apiKey = document.getElementById("cy-gw-key").value.trim();
    const fallbackProvider = document.getElementById("cy-gw-fb-prov").value;
    const autonomyMode = document.getElementById("cy-gw-autonomy").value;
    const customInstructions = document.getElementById("cy-gw-custom").value.trim();
    const endpointUrl = document.getElementById("cy-gw-endpoint")?.value.trim() || "";

    saveCytonGatewayConfig({
      provider,
      model,
      apiKey,
      fallbackProvider,
      autonomyMode,
      customInstructions,
      endpointUrl
    });
    await store.saveCytonSettings(appState.user.uid, biz.id, {
      ...cytonSettings,
      autonomyMode
    });
    toast("Cyton Model Gateway settings saved");
    render();
  });

  // Integrations OAuth check
  document.querySelectorAll(".cy-check-oauth").forEach((b) => {
    b.addEventListener("click", async () => {
      const id = b.dataset.id;
      const oauthKey = b.dataset.oauth;
      const info = await fetchCytonOAuthStatus(oauthKey);
      cytonUiState.oauthStatuses[id] = info;
      if (info.configured && info.authorizationUrl) {
        window.open(info.authorizationUrl, "_blank", "noopener");
      } else {
        toast(info.message || info.error || "OAuth app credentials required on server.");
      }
      render();
    });
  });
}
