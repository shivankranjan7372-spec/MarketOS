import { AI_MODULES } from "../catalog.js";

const COMMAND_MODULES = [
  {
    id: "planning",
    sidebarGroup: "CREATE",
    navTarget: "campaign_planner",
    badge: "Strategy",
    title: "Marketing Campaign Planning",
    subtitle: AI_MODULES.CAMPAIGN_PLANNER.displayName,
    summary: "Structure launch objectives, channel allocation, and campaign budgets converted seamlessly across workspace billing and display currencies.",
    previewRows: [
      { label: "Active Objective", value: "Q4 Product Launch & Brand Rollout" },
      { label: "Budget Governance", value: "Multi-currency FX trace preserved" },
      { label: "Lifecycle State", value: "DRAFT -> OWNER REVIEW -> ACTIVE" }
    ]
  },
  {
    id: "content",
    sidebarGroup: "CREATE",
    navTarget: "social_media",
    badge: "Distribution",
    title: "AI Content Generation",
    subtitle: `${AI_MODULES.SOCIAL_MEDIA.displayName} & ${AI_MODULES.EMAIL_STUDIO.displayName}`,
    summary: "Draft platform-native captions, newsletter sequences, and launch copy grounded automatically in your saved workspace brand voice.",
    previewRows: [
      { label: "Brand Memory", value: "Injected from Brand Studio profile" },
      { label: "Output Formats", value: "Social, Email Draft, SEO Meta, Markdown" },
      { label: "Publish Gate", value: "Staged in Drafts prior to sign-off" }
    ]
  },
  {
    id: "video",
    sidebarGroup: "CREATE",
    navTarget: "social_media",
    badge: "Video Briefs",
    title: "Video Generation & Scripts",
    subtitle: "Reels, Shorts & YouTube Storyboards",
    summary: "Compose hook options, timed scene beats, visual direction notes, and channel metadata formatted for editorial production.",
    previewRows: [
      { label: "Target Channels", value: "YouTube Studio & Vertical Reels" },
      { label: "Slide & Brief Export", value: "HTML Presentation & PDF Print" },
      { label: "Calendar Sync", value: "Timezone-aware launch slots" }
    ]
  },
  {
    id: "image",
    sidebarGroup: "CREATE",
    navTarget: "brand_studio",
    badge: "Identity",
    title: "Image & Brand Studio",
    subtitle: AI_MODULES.BRAND_STUDIO.displayName,
    summary: "Define persistent visual direction, inspect uploaded product references, and coordinate creative briefs across team workflows.",
    previewRows: [
      { label: "Multimodal Inspection", value: "Upload image or brief attachment" },
      { label: "Brand Guidelines", value: "Voice, audience & visual standards" },
      { label: "Design Handoff", value: "Canva & Google Drive OAuth ready" }
    ]
  },
  {
    id: "intelligence",
    sidebarGroup: "CREATE",
    navTarget: "seo_studio",
    badge: "Live Fetch",
    title: "Business Intelligence & SEO",
    subtitle: AI_MODULES.SEO_STUDIO.displayName,
    summary: "Run live server-side HTTP inspection on public URLs through SSRF-protected infrastructure to audit titles, H1 tags, and metadata.",
    previewRows: [
      { label: "Live Analyzer", value: "Real public URL HTML extraction" },
      { label: "Security Check", value: "Private & SSRF IP ranges blocked" },
      { label: "Keyword Strategy", value: "Region & language localized" }
    ]
  },
  {
    id: "automation",
    sidebarGroup: "PUBLISH & TRACK",
    navTarget: "approvals",
    badge: "Governance",
    title: "Automation Workflows & Approvals",
    subtitle: "CYTON Orchestration & Approval Gate",
    summary: "Queue multi-step marketing execution where internal creation runs automatically while outbound send and publish actions await explicit approval.",
    previewRows: [
      { label: "Action Separation", value: "READ/CREATE vs. PUBLISH/SEND" },
      { label: "Approval Audit", value: "Timestamped owner decision ledger" },
      { label: "Integrations", value: "Official OAuth flows only" }
    ]
  },
  {
    id: "analytics",
    sidebarGroup: "PUBLISH & TRACK",
    navTarget: "analytics",
    badge: "Metrics",
    title: "Analytics & Performance",
    subtitle: AI_MODULES.GROWTH_ANALYST.displayName,
    summary: "Track impressions, clicks, conversions, and campaign spend with strict visual separation between verified Actual Data and Estimates.",
    previewRows: [
      { label: "Data Policy", value: "Zero fabricated metrics" },
      { label: "Record Filtering", value: "All / Actual Only / Estimates" },
      { label: "Currency Engine", value: "Live FX with original currency" }
    ]
  }
];

export function renderCommandCenterSceneHtml(isAuthenticated = false) {
  const initial = COMMAND_MODULES[0];
  return `
    <section class="mos-scene mos-scene-command" id="scene-command" data-scene-index="1">
      <div class="mos-container">
        <div class="mos-section-head mos-center-head" data-mos-reveal>
          <span class="mos-kicker">01 &bull; MARKETOS WORKSPACE</span>
          <h2>One disciplined operating system for your entire marketing team.</h2>
          <p class="mos-lead">
            Inspect the live MarketOS product architecture—unifying CYTON, campaign strategy, content studios, approval governance, and multi-currency analytics.
          </p>
        </div>

        <div class="mos-product-stage" id="mos-cmd-perspective-stage" data-mos-reveal data-mos-reveal-delay="0.08">
          <div class="mos-saas-shell">
            <div class="mos-saas-chrome">
              <div class="mos-chrome-left">
                <span class="mos-chrome-dot"></span>
                <span class="mos-chrome-dot"></span>
                <span class="mos-chrome-dot"></span>
                <span class="mos-chrome-path">marketosai.vercel.app / <strong id="mos-cmd-path">${initial.navTarget}</strong></span>
              </div>
              <span class="mos-pill-tag" id="mos-cmd-badge">${initial.badge}</span>
            </div>

            <div class="mos-saas-workspace">
              <aside class="mos-saas-sidebar" aria-label="MarketOS product modules">
                <div class="mos-saas-brand">
                  <img src="./assets/brand-logo.png" alt="MarketOS" width="24" height="24" />
                  <span>MarketOS</span>
                </div>
                <div class="mos-saas-tab-list" role="tablist" aria-label="Workspace modules">
                  ${COMMAND_MODULES.map(
                    (mod, idx) => `
                      <button
                        type="button"
                        role="tab"
                        aria-selected="${idx === 0}"
                        class="mos-mod-tab ${idx === 0 ? "active" : ""}"
                        data-cmd-tab="${mod.id}"
                      >
                        <span class="mos-mod-idx">0${idx + 1}</span>
                        <span>${mod.title}</span>
                      </button>`
                  ).join("")}
                </div>
              </aside>

              <div class="mos-saas-body" id="mos-cmd-detail">
                ${buildCommandPanelBody(initial, isAuthenticated)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function buildCommandPanelBody(mod, isAuthenticated) {
  return `
    <div class="mos-panel-header">
      <div>
        <div class="mos-panel-sub">${mod.sidebarGroup} &bull; ${mod.subtitle}</div>
        <h3 class="mos-panel-title">${mod.title}</h3>
      </div>
      <button type="button" class="mos-btn mos-btn-primary mos-btn-sm" data-cmd-open="${mod.navTarget}">
        ${isAuthenticated ? "Open in Workspace" : "Launch MarketOS"}
      </button>
    </div>

    <p class="mos-panel-desc">${mod.summary}</p>

    <div class="mos-spec-table">
      ${mod.previewRows
        .map(
          (row) => `
            <div class="mos-spec-row">
              <span>${row.label}</span>
              <strong>${row.value}</strong>
            </div>`
        )
        .join("")}
    </div>

    <div class="mos-panel-meta-bar">
      <span>Synced to Firebase &amp; Android Workspace</span>
      <span>Active Multi-Currency Support</span>
    </div>
  `;
}

export function bindCommandCenterEvents(root, { isAuthenticated, onOpenAuth, onOpenDashboard }) {
  const detailEl = document.getElementById("mos-cmd-detail");
  const pathEl = document.getElementById("mos-cmd-path");
  const badgeEl = document.getElementById("mos-cmd-badge");

  const bindAction = () => {
    detailEl?.querySelector("[data-cmd-open]")?.addEventListener("click", (e) => {
      const target = e.currentTarget.getAttribute("data-cmd-open") || "overview";
      if (isAuthenticated) onOpenDashboard(target);
      else onOpenAuth("signup");
    });
  };
  bindAction();

  root.querySelectorAll("[data-cmd-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-cmd-tab");
      const mod = COMMAND_MODULES.find((m) => m.id === id);
      if (!mod || !detailEl) return;

      root.querySelectorAll("[data-cmd-tab]").forEach((b) => {
        const active = b.getAttribute("data-cmd-tab") === id;
        b.classList.toggle("active", active);
        b.setAttribute("aria-selected", String(active));
      });

      if (pathEl) pathEl.textContent = mod.navTarget;
      if (badgeEl) badgeEl.textContent = mod.badge;
      detailEl.innerHTML = buildCommandPanelBody(mod, isAuthenticated);
      bindAction();
    });
  });
}
