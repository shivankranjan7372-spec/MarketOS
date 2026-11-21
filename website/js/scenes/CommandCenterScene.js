import { AI_MODULES } from "../catalog.js";

const COMMAND_MODULES = [
  {
    id: "content",
    badge: "Create Studio",
    title: "AI Content Generation",
    navTarget: "social_media",
    subtitle: `${AI_MODULES.SOCIAL_MEDIA.displayName} & ${AI_MODULES.EMAIL_STUDIO.displayName}`,
    summary: "Generate brand-aligned posts, reels scripts, captions, email sequences, and long-form briefs grounded in your stored workspace voice.",
    specs: [
      { label: "Brand Memory Sync", value: "Active per workspace" },
      { label: "Formats", value: "Social, Email, SEO Meta, Briefs" },
      { label: "Draft Governance", value: "Saved before any publish" }
    ]
  },
  {
    id: "planning",
    badge: "Strategy",
    title: "Marketing Campaign Planning",
    navTarget: "campaign_planner",
    subtitle: AI_MODULES.CAMPAIGN_PLANNER.displayName,
    summary: "Structure objectives, multi-channel rollout dates, and budgets automatically converted between billing and workspace display currencies.",
    specs: [
      { label: "Multi-Currency FX", value: "Live & Baseline FX Engine" },
      { label: "Lifecycle States", value: "Draft / Active / Paused" },
      { label: "Calendar Sync", value: "Timezone-aware slots" }
    ]
  },
  {
    id: "video",
    badge: "Motion & Script",
    title: "Video Generation",
    navTarget: "social_media",
    subtitle: "Reels, Shorts & YouTube Production Briefs",
    summary: "Assemble shot-by-shot vertical video scripts, hook variations, pacing cues, and YouTube metadata briefs ready for creative production.",
    specs: [
      { label: "Channels", value: "YouTube Studio & Reels" },
      { label: "Deliverable Exports", value: "Markdown & Slide Deck HTML" },
      { label: "Official Handoff", value: "Script -> Calendar -> Approval" }
    ]
  },
  {
    id: "image",
    badge: "Visual Direction",
    title: "Image Generation",
    navTarget: "brand_studio",
    subtitle: AI_MODULES.BRAND_STUDIO.displayName,
    summary: "Translate campaign positioning into art direction prompts, color system references, multimodal image inspections, and asset briefs.",
    specs: [
      { label: "Multimodal Input", value: "Upload product references" },
      { label: "Palette Context", value: "Workspace Brand Studio" },
      { label: "Handoff Integrations", value: "Canva & Google Drive OAuth" }
    ]
  },
  {
    id: "analytics",
    badge: "Verification",
    title: "Analytics",
    navTarget: "analytics",
    subtitle: AI_MODULES.GROWTH_ANALYST.displayName,
    summary: "Log verified campaign impressions, clicks, conversions, and spend cleanly separated between Actual Data and Estimates.",
    specs: [
      { label: "Integrity Standard", value: "Actual vs. Estimate badges" },
      { label: "Currency Conversion", value: "Display FX with original trace" },
      { label: "Auditability", value: "Zero fabricated metrics" }
    ]
  },
  {
    id: "automation",
    badge: "Execution",
    title: "Automation Workflows",
    navTarget: "approvals",
    subtitle: "CYTON & Owner Approval Hub",
    summary: "Chain research, drafting, scheduling, and asset packaging inside tracked workflows where outbound send/publish actions wait for your sign-off.",
    specs: [
      { label: "Action Classes", value: "READ / CREATE vs PUBLISH / SEND" },
      { label: "Human Gate", value: "Explicit owner approval required" },
      { label: "Activity Log", value: "Full execution audit trail" }
    ]
  },
  {
    id: "intelligence",
    badge: "Live Web Fetch",
    title: "Business Intelligence",
    navTarget: "seo_studio",
    subtitle: `${AI_MODULES.SEO_STUDIO.displayName} & Live Research`,
    summary: "Inspect public website URLs through MarketOS's SSRF-protected server analyzer to extract titles, H1 structure, and meta descriptions.",
    specs: [
      { label: "Endpoint", value: "POST /api/cyton/execute" },
      { label: "Security", value: "Private/SSRF IP range blocklist" },
      { label: "Output", value: "Verified SEO & positioning audit" }
    ]
  }
];

export function renderCommandCenterSceneHtml(isAuthenticated = false) {
  const initial = COMMAND_MODULES[0];
  return `
    <section class="mos-scene mos-scene-command" id="scene-command" data-scene-index="1">
      <div class="mos-container">
        <div class="mos-split-command">
          <div class="mos-command-copy" data-mos-reveal>
            <span class="mos-kicker">02 &bull; MARKETOS COMMAND CENTER</span>
            <h2>Every marketing discipline inside one living cockpit.</h2>
            <p class="mos-lead">
              Select a module below or scroll to inspect the MarketOS interface panels—architected for real business operations across strategy, creation, governance, and growth.
            </p>

            <div class="mos-module-tabs" role="tablist" aria-label="MarketOS Command Center modules">
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
          </div>

          <div class="mos-command-viewport" data-mos-reveal>
            <div class="mos-saas-frame" id="mos-cmd-frame">
              <div class="mos-saas-chrome">
                <div class="mos-chrome-left">
                  <span class="mos-chrome-dot"></span>
                  <span class="mos-chrome-dot"></span>
                  <span class="mos-chrome-dot"></span>
                  <span class="mos-chrome-path">marketos.workspace / <strong id="mos-cmd-path">${initial.navTarget}</strong></span>
                </div>
                <span class="mos-pill-tag" id="mos-cmd-badge">${initial.badge}</span>
              </div>

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
        <div class="mos-panel-sub">${mod.subtitle}</div>
        <h3 class="mos-panel-title">${mod.title}</h3>
      </div>
      <button type="button" class="mos-btn mos-btn-primary mos-btn-sm" data-cmd-open="${mod.navTarget}">
        ${isAuthenticated ? "Open Module" : "Launch in MarketOS"}
      </button>
    </div>

    <p class="mos-panel-desc">${mod.summary}</p>

    <div class="mos-spec-grid">
      ${mod.specs
        .map(
          (sp) => `
            <div class="mos-spec-box">
              <span class="mos-spec-label">${sp.label}</span>
              <strong class="mos-spec-val">${sp.value}</strong>
            </div>`
        )
        .join("")}
    </div>

    <div class="mos-panel-grid-preview">
      <div class="mos-mini-card">
        <span>Active Workspace Currency</span>
        <strong>USD / EUR / INR / GBP</strong>
      </div>
      <div class="mos-mini-card">
        <span>Model Gateway Support</span>
        <strong>Gemini &bull; OpenAI &bull; Claude</strong>
      </div>
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

/**
 * 3D Floating Command Center Panel Cluster in Three.js
 */
export function buildCommandCenter3DGroup(THREE) {
  const group = new THREE.Group();
  group.name = "CommandCenterGroup";

  const slateMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a0f,
    roughness: 0.35,
    metalness: 0.72,
    transparent: true,
    opacity: 0.9
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x7c3aed,
    roughness: 0.25,
    metalness: 0.5,
    emissive: 0x6d28d9,
    emissiveIntensity: 0.55
  });
  const borderMat = new THREE.LineBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.55 });
  const subtleBorderMat = new THREE.LineBasicMaterial({ color: 0x3b3b52, transparent: true, opacity: 0.6 });

  const createPanel = (w, h, d, isPrimary = false) => {
    const pGroup = new THREE.Group();
    const box = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(box, slateMat);
    pGroup.add(mesh);

    const edges = new THREE.EdgesGeometry(box);
    const wire = new THREE.LineSegments(edges, isPrimary ? borderMat : subtleBorderMat);
    pGroup.add(wire);

    const bar = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 0.06, d + 0.02), accentMat);
    bar.position.set(0, h * 0.34, 0);
    pGroup.add(bar);
    return pGroup;
  };

  const mainPanel = createPanel(3.4, 2.2, 0.09, true);
  const leftPanel = createPanel(1.55, 1.8, 0.07, false);
  leftPanel.position.set(-2.65, 0.12, -0.45);
  leftPanel.rotation.y = 0.32;

  const rightTop = createPanel(1.6, 0.95, 0.07, false);
  rightTop.position.set(2.65, 0.62, -0.35);
  rightTop.rotation.y = -0.34;

  const rightBot = createPanel(1.6, 0.95, 0.07, false);
  rightBot.position.set(2.65, -0.58, -0.35);
  rightBot.rotation.y = -0.34;

  group.add(mainPanel, leftPanel, rightTop, rightBot);
  return { group, mainPanel, leftPanel, rightTop, rightBot };
}

export function updateCommandCenter3D(rig, { localProgress, weight, elapsed, pointerX, pointerY }) {
  if (!rig) return;
  const { group, mainPanel, leftPanel, rightTop, rightBot } = rig;
  group.visible = weight > 0.015;
  if (!group.visible) return;

  const reveal = Math.min(1, weight * 1.3);
  group.position.set(pointerX * 0.3, -0.15 + Math.sin(elapsed * 0.9) * 0.07, -1.2 + reveal * 1.4);
  group.rotation.y = -0.22 + localProgress * 0.44 + pointerX * 0.16;
  group.rotation.x = 0.08 - pointerY * 0.12;
  group.scale.setScalar(0.84 + reveal * 0.16);

  const spread = 0.6 + localProgress * 0.5;
  leftPanel.position.x = -2.45 - spread * 0.35;
  rightTop.position.x = 2.45 + spread * 0.35;
  rightBot.position.x = 2.45 + spread * 0.35;
  mainPanel.position.z = Math.sin(localProgress * Math.PI) * 0.35;
}
