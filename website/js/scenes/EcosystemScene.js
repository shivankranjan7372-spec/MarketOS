const ECOSYSTEM_LAYERS = [
  {
    id: "routing",
    index: "01",
    label: "Intelligent Orchestration",
    headline: "Intent matched to the right capability automatically.",
    detail:
      "Describe what your business needs in natural language. MarketOS interprets your goal and dispatches it across specialized intelligence modules behind the scenes.",
    specA: "Goal-to-Module Routing",
    specB: "Zero Manual Tool Switching"
  },
  {
    id: "memory",
    index: "02",
    label: "Persistent Brand Context",
    headline: "Your voice, region, and audience built into every output.",
    detail:
      "Configure your workspace identity once—tone, market, language, and regional currency—so every generated campaign or brief stays aligned automatically.",
    specA: "Centralized Brand Memory",
    specB: "Multi-Workspace Isolation"
  },
  {
    id: "governance",
    index: "03",
    label: "Human-in-the-Loop Control",
    headline: "Automated drafting paired with explicit owner sign-off.",
    detail:
      "MarketOS accelerates creation while enforcing clear approval boundaries before external communications or scheduled campaigns go live.",
    specA: "Action-Class Boundaries",
    specB: "Owner Approval Queue"
  },
  {
    id: "access",
    index: "04",
    label: "Unified Account Access",
    headline: "One account. One workspace. Centralized AI governance.",
    detail:
      "Eliminate scattered tools and fragmented workflows. Manage teams, drafts, approvals, analytics, and workspace quotas from a single command surface.",
    specA: "Single Sign-In Ecosystem",
    specB: "Unified Activity Audit"
  }
];

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderEcosystemSceneHtml(isAuthenticated = false) {
  const initial = ECOSYSTEM_LAYERS[0];

  return `
    <section class="mos-scene mos-scene-ecosystem" id="scene-ecosystem" data-scene-index="2">
      <div class="mos-container">
        <div class="mos-section-head mos-center-head" data-mos-reveal>
          <span class="mos-kicker">02 &bull; FLEXIBLE ACCESS &amp; INTELLIGENT TECHNOLOGY</span>
          <h2>One intelligent ecosystem.<br /><span class="mos-accent-span">Centralized access, total control.</span></h2>
          <p class="mos-lead">
            MarketOS abstracts away technical complexity so you focus on strategy and growth—supported by neural workflow routing, brand memory, and built-in governance.
          </p>
        </div>

        <div class="mos-eco-layout" data-mos-reveal data-mos-reveal-delay="0.08">
          <div class="mos-glass-card mos-eco-visual" data-depth-card>
            <div class="mos-eco-svg-wrap" aria-hidden="true">
              <svg class="mos-eco-network" viewBox="0 0 420 320" fill="none">
                <defs>
                  <radialGradient id="mosEcoGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="#A855F7" stop-opacity="0.38" />
                    <stop offset="100%" stop-color="#7C3AED" stop-opacity="0" />
                  </radialGradient>
                </defs>
                <circle cx="210" cy="160" r="126" fill="url(#mosEcoGlow)" />
                <circle cx="210" cy="160" r="118" stroke="rgba(255,255,255,0.1)" stroke-dasharray="4 6" />
                <circle cx="210" cy="160" r="78" stroke="rgba(168,85,247,0.35)" />
                <line x1="210" y1="160" x2="92" y2="74" stroke="rgba(168,85,247,0.45)" stroke-width="1.3" />
                <line x1="210" y1="160" x2="328" y2="74" stroke="rgba(245,245,247,0.28)" stroke-width="1.3" />
                <line x1="210" y1="160" x2="92" y2="246" stroke="rgba(245,245,247,0.28)" stroke-width="1.3" />
                <line x1="210" y1="160" x2="328" y2="246" stroke="rgba(168,85,247,0.45)" stroke-width="1.3" />

                <circle cx="92" cy="74" r="18" fill="rgba(12,12,18,0.9)" stroke="#A855F7" stroke-width="1.5" />
                <circle cx="328" cy="74" r="18" fill="rgba(12,12,18,0.9)" stroke="rgba(245,245,247,0.4)" stroke-width="1.4" />
                <circle cx="92" cy="246" r="18" fill="rgba(12,12,18,0.9)" stroke="rgba(245,245,247,0.4)" stroke-width="1.4" />
                <circle cx="328" cy="246" r="18" fill="rgba(12,12,18,0.9)" stroke="#A855F7" stroke-width="1.5" />

                <polygon points="210,122 243,141 243,179 210,198 177,179 177,141" fill="rgba(124,58,237,0.26)" stroke="#A855F7" stroke-width="1.6" />
                <circle cx="210" cy="160" r="8" fill="#F5F5F7" />
              </svg>
            </div>

            <div class="mos-eco-active-card" id="mos-eco-active-card">
              <span class="mos-data-label" id="mos-eco-kicker">LAYER ${esc(initial.index)} &bull; ${esc(initial.label)}</span>
              <h3 id="mos-eco-title">${esc(initial.headline)}</h3>
              <p class="mos-data-copy" id="mos-eco-desc">${esc(initial.detail)}</p>
              <div class="mos-eco-specs">
                <span class="mos-pill-tag" id="mos-eco-spec-a">${esc(initial.specA)}</span>
                <span class="mos-pill-tag" id="mos-eco-spec-b">${esc(initial.specB)}</span>
              </div>
            </div>
          </div>

          <div class="mos-eco-pillars">
            ${ECOSYSTEM_LAYERS.map(
              (layer, idx) => `
                <button
                  type="button"
                  class="mos-glass-card mos-eco-step ${idx === 0 ? "active" : ""}"
                  data-eco-layer="${esc(layer.id)}"
                >
                  <span class="mos-eco-num">${esc(layer.index)}</span>
                  <div>
                    <strong>${esc(layer.label)}</strong>
                    <p>${esc(layer.headline)}</p>
                  </div>
                </button>`
            ).join("")}

            <div class="mos-eco-cta-row">
              <button type="button" id="mos-eco-launch-btn" class="mos-btn mos-btn-liquid">
                ${isAuthenticated ? "Open CYTON Command Centre" : "Enter MarketOS Ecosystem"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function bindEcosystemEvents(root, { isAuthenticated, onOpenAuth, onOpenDashboard }) {
  const kickerEl = document.getElementById("mos-eco-kicker");
  const titleEl = document.getElementById("mos-eco-title");
  const descEl = document.getElementById("mos-eco-desc");
  const specAEl = document.getElementById("mos-eco-spec-a");
  const specBEl = document.getElementById("mos-eco-spec-b");

  root.querySelectorAll("[data-eco-layer]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-eco-layer");
      const layer = ECOSYSTEM_LAYERS.find((l) => l.id === id);
      if (!layer) return;

      root.querySelectorAll("[data-eco-layer]").forEach((b) => {
        b.classList.toggle("active", b.getAttribute("data-eco-layer") === id);
      });

      if (kickerEl) kickerEl.textContent = `LAYER ${layer.index} • ${layer.label}`;
      if (titleEl) titleEl.textContent = layer.headline;
      if (descEl) descEl.textContent = layer.detail;
      if (specAEl) specAEl.textContent = layer.specA;
      if (specBEl) specBEl.textContent = layer.specB;
    });
  });

  document.getElementById("mos-eco-launch-btn")?.addEventListener("click", () => {
    if (isAuthenticated) onOpenDashboard("cyton");
    else onOpenAuth("signup");
  });

  return { cleanup: () => {} };
}
