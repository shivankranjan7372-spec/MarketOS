import {
  AI_MODULES,
  APP_SECTIONS,
  CYTON_MARKETPLACE_INTEGRATIONS
} from "../catalog.js";

const WORKSPACE_CAPABILITIES = [
  {
    id: "workspace",
    kicker: "C • UNIFIED AI WORKSPACE",
    navTarget: "cyton",
    badge: "14 Workspaces",
    tabLabel: "Unified Workspace",
    headline: "Different models. One destination.",
    subtitle: "CYTON Command Centre + 13 MarketOS Studios",
    summary:
      "Route natural-language goals through CYTON across dedicated Campaign, Social, SEO, Email, Brand, Ads, Calendar, Approval, and Analytics modules without switching disconnected tools.",
    rows: [
      { label: "Active Studios", value: `${APP_SECTIONS.length} integrated sections synced to Firestore` },
      { label: "Approval Governance", value: "READ / CREATE automated; PUBLISH / SEND owner-gated" },
      { label: "Brand Memory", value: "Voice, audience, country & currency auto-injected" }
    ]
  },
  {
    id: "platform_features",
    kicker: "D • PLATFORM FEATURES & STUDIOS",
    navTarget: "campaign_planner",
    badge: "Multi-Studio",
    tabLabel: "Platform Features",
    headline: "Built for complete marketing execution.",
    subtitle: "Campaigns, Social, Email, Brand, Ads & Calendar",
    summary:
      "Plan multi-channel launches, draft social and email sequences, inspect brand guidelines, schedule content calendars, and track verified Actual vs. Estimate campaign performance.",
    rows: [
      { label: "Creative Studios", value: "Campaigns, Social, Email, Brand & Ads Studios" },
      { label: "Content Calendar", value: "Timezone-aware scheduling & draft pipeline" },
      { label: "Data Separation", value: "Verified Actual Metrics isolated from projections" }
    ]
  },
  {
    id: "intelligence",
    kicker: "E • MARKETOS INTELLIGENCE",
    navTarget: "seo_studio",
    badge: "Live HTTP + SSRF Safe",
    tabLabel: "MarketOS Intelligence",
    headline: "Real live URL & metadata analysis.",
    subtitle: AI_MODULES.SEO_STUDIO.displayName,
    summary:
      "Inspect public website titles, H1 tags, meta descriptions, and word counts through SSRF-protected server endpoints (/api/cyton/execute) that block localhost and private IP ranges.",
    rows: [
      { label: "Live HTML Audit", value: "Public HTTP/HTTPS metadata & heading extraction" },
      { label: "Network Security", value: "Private & cloud-metadata IP blocks enforced server-side" },
      { label: "Honest Output", value: "Never invents domain authority or fabricated traffic" }
    ]
  },
  {
    id: "ecosystem",
    kicker: "F • YOUR AI ECOSYSTEM",
    navTarget: "integrations",
    badge: `${CYTON_MARKETPLACE_INTEGRATIONS.length} Connectors`,
    tabLabel: "AI Ecosystem",
    headline: "One platform. Countless possibilities.",
    subtitle: "OAuth-first gateways & built-in tools",
    summary:
      "Connect Gmail, Google Drive, Calendar, Instagram, Facebook, LinkedIn, YouTube, X, Canva, Slack, Notion, Discord, and built-in Web Research or ESP delivery through official OAuth flows.",
    rows: [
      { label: "OAuth Architecture", value: "Official provider OAuth flows — zero stored passwords" },
      { label: "Built-In Actions", value: "Live Web Research & Mailto / ESP draft launch active" },
      { label: "Multi-Provider Gate", value: "Gemini, OpenAI, Claude, OpenRouter & Self-Hosted BYOK" }
    ]
  }
];

export function renderCommandCenterSceneHtml(isAuthenticated = false) {
  const initial = WORKSPACE_CAPABILITIES[0];
  return `
    <section class="mos-scene mos-scene-command" id="scene-command" data-scene-index="3">
      <div class="mos-container">
        <div class="mos-section-head mos-center-head" data-mos-reveal>
          <span class="mos-kicker">03 &bull; PLATFORM ARCHITECTURE &amp; CAPABILITIES</span>
          <h2>One disciplined workspace.<br /><span class="mos-accent-span">Real AI execution, under your control.</span></h2>
          <p class="mos-lead">
            Explore how MarketOS unifies model routing, live website intelligence, OAuth ecosystems, and multi-currency governance inside a single interface.
          </p>
        </div>

        <div class="mos-product-stage" id="mos-cmd-perspective-stage" data-mos-reveal data-mos-reveal-delay="0.08">
          <div class="mos-glass-card mos-saas-shell">
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
              <aside class="mos-saas-sidebar" aria-label="MarketOS capabilities">
                <div class="mos-saas-brand">
                  <img src="./assets/brand-logo.png" alt="MarketOS" width="24" height="24" />
                  <span>MarketOS</span>
                </div>
                <div class="mos-saas-tab-list" role="tablist" aria-label="Capability views">
                  ${WORKSPACE_CAPABILITIES.map(
                    (cap, idx) => `
                      <button
                        type="button"
                        role="tab"
                        aria-selected="${idx === 0}"
                        class="mos-mod-tab ${idx === 0 ? "active" : ""}"
                        data-cmd-tab="${cap.id}"
                      >
                        <span class="mos-mod-idx">0${idx + 1}</span>
                        <span>${cap.tabLabel}</span>
                      </button>`
                  ).join("")}
                </div>
              </aside>

              <div class="mos-saas-body" id="mos-cmd-detail">
                ${buildCapabilityPanelBody(initial, isAuthenticated)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function buildCapabilityPanelBody(cap, isAuthenticated) {
  return `
    <div class="mos-panel-header">
      <div>
        <div class="mos-panel-sub">${cap.kicker} &bull; ${cap.subtitle}</div>
        <h3 class="mos-panel-title">${cap.headline}</h3>
      </div>
      <button type="button" class="mos-btn mos-btn-liquid mos-btn-sm" data-cmd-open="${cap.navTarget}">
        ${isAuthenticated ? "Open Module" : "Launch Workspace"}
      </button>
    </div>

    <p class="mos-panel-desc">${cap.summary}</p>

    <div class="mos-spec-table">
      ${cap.rows
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
      <span>Cloud &amp; Local Repository Sync Ready</span>
      <span>Human Approval Enforced for External Dispatch</span>
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
      const cap = WORKSPACE_CAPABILITIES.find((c) => c.id === id);
      if (!cap || !detailEl) return;

      root.querySelectorAll("[data-cmd-tab]").forEach((b) => {
        const active = b.getAttribute("data-cmd-tab") === id;
        b.classList.toggle("active", active);
        b.setAttribute("aria-selected", String(active));
      });

      if (pathEl) pathEl.textContent = cap.navTarget;
      if (badgeEl) badgeEl.textContent = cap.badge;
      detailEl.innerHTML = buildCapabilityPanelBody(cap, isAuthenticated);
      bindAction();
    });
  });
}
