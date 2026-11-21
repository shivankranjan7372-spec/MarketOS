import { AI_MODULES, APP_SECTIONS } from "../catalog.js";

const WORKSPACE_CAPABILITIES = [
  {
    id: "workspace",
    kicker: "01 • UNIFIED AI WORKSPACE",
    navTarget: "cyton",
    badge: `${APP_SECTIONS.length} Workspaces`,
    tabLabel: "Unified Workspace",
    headline: "Different capabilities. One destination.",
    subtitle: "CYTON Command Centre + 13 MarketOS Studios",
    summary:
      "Route natural-language goals through CYTON across dedicated Campaign, Social, SEO, Email, Brand, Ads, Calendar, Approval, and Analytics modules without switching disconnected tools.",
    rows: [
      { label: "Active Studios", value: `${APP_SECTIONS.length} synchronized business studios` },
      { label: "Approval Governance", value: "Drafting automated; external actions owner-gated" },
      { label: "Brand Memory", value: "Voice, audience, country & currency auto-applied" }
    ]
  },
  {
    id: "platform_features",
    kicker: "02 • PLATFORM FEATURES & STUDIOS",
    navTarget: "campaign_planner",
    badge: "Multi-Studio",
    tabLabel: "Platform Features",
    headline: "Built for complete business execution.",
    subtitle: "Campaigns, Social, Email, Brand, Ads & Calendar",
    summary:
      "Plan multi-channel launches, draft social and email sequences, inspect brand guidelines, schedule content calendars, and track verified Actual vs. Estimate performance.",
    rows: [
      { label: "Creative Studios", value: "Campaigns, Social, Email, Brand & Ads Studios" },
      { label: "Content Calendar", value: "Timezone-aware scheduling & draft pipeline" },
      { label: "Data Separation", value: "Verified Actual Metrics isolated from projections" }
    ]
  },
  {
    id: "intelligence",
    kicker: "03 • MARKETOS INTELLIGENCE",
    navTarget: "seo_studio",
    badge: "Live Analysis",
    tabLabel: "MarketOS Intelligence",
    headline: "Real-time web & positioning analysis.",
    subtitle: AI_MODULES.SEO_STUDIO.displayName,
    summary:
      "Inspect public website titles, heading hierarchies, meta descriptions, and content structure through safeguarded analysis channels designed to keep your data accurate.",
    rows: [
      { label: "Live Page Audit", value: "Public metadata & heading structure extraction" },
      { label: "Network Safeguards", value: "Strict public-target validation enforced" },
      { label: "Honest Output", value: "Zero invented traffic or fabricated authority scores" }
    ]
  },
  {
    id: "user_control",
    kicker: "04 • CENTRALIZED USER CONTROL",
    navTarget: "settings",
    badge: "One Account",
    tabLabel: "User Control",
    headline: "One account. Centralized workspace governance.",
    subtitle: "International workspaces & localized display preferences",
    summary:
      "Manage multiple business brands from a single MarketOS account with separated regional settings, currency preferences, quota monitoring, and team-ready approval queues.",
    rows: [
      { label: "Workspace Isolation", value: "Brand assets & campaigns scoped per business" },
      { label: "Approval Control", value: "Explicit user review prior to publishing or dispatch" },
      { label: "Quota Clarity", value: "Monthly & annual plan usage tracked transparently" }
    ]
  }
];

export function renderCommandCenterSceneHtml(isAuthenticated = false) {
  const initial = WORKSPACE_CAPABILITIES[0];
  return `
    <section class="mos-scene mos-scene-command" id="scene-command" data-scene-index="3">
      <div class="mos-container">
        <div class="mos-section-head mos-center-head" data-mos-reveal>
          <span class="mos-kicker">03 &bull; UNIFIED AI WORKSPACE &amp; PLATFORM FEATURES</span>
          <h2>One disciplined workspace.<br /><span class="mos-accent-span">Real AI execution, under your control.</span></h2>
          <p class="mos-lead">
            Explore how MarketOS unifies creative studios, live intelligence, brand memory, and human approval governance inside a single liquid-glass interface.
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
      <span>Cloud-Synchronized Workspace Architecture</span>
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
