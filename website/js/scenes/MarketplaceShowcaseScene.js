import { CYTON_MODEL_PROVIDERS } from "../catalog.js";

const DISCOVERY_FILTERS = [
  "All Providers",
  "Text Intelligence",
  "Coding",
  "Vision & Multimodal",
  "Self-Hosted / BYOK"
];

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function providerMatchesFilter(provider, filterName) {
  if (filterName === "All Providers") return true;
  if (filterName === "Vision & Multimodal") return Boolean(provider.supportsVision);
  if (filterName === "Self-Hosted / BYOK") return provider.id === "custom" || provider.id === "openrouter";
  return Array.isArray(provider.capabilities) && provider.capabilities.includes(filterName);
}

export function renderMarketplaceShowcaseHtml(isAuthenticated = false) {
  return `
    <section class="mos-scene mos-scene-marketplace" id="scene-marketplace" data-scene-index="1">
      <div class="mos-container">
        <div class="mos-section-head mos-center-head" data-mos-reveal>
          <span class="mos-kicker">01 &bull; AI MARKETPLACE &amp; MODEL DISCOVERY</span>
          <h2>Discover the right AI for every workflow.<br /><span class="mos-accent-span">Explore unified intelligence across top providers.</span></h2>
          <p class="mos-lead">
            Inspect configured MarketOS AI providers, filter by capability and multimodal support, and launch models directly inside a governed workspace.
          </p>
        </div>

        <div class="mos-filter-row" id="mos-provider-filters" role="tablist" aria-label="Filter AI providers by capability" data-mos-reveal data-mos-reveal-delay="0.06">
          ${DISCOVERY_FILTERS.map(
            (f, idx) => `
              <button
                type="button"
                role="tab"
                aria-selected="${idx === 0}"
                class="mos-filter-pill ${idx === 0 ? "active" : ""}"
                data-provider-filter="${esc(f)}"
              >
                ${esc(f)}
              </button>`
          ).join("")}
        </div>

        <div class="mos-model-grid" id="mos-model-grid" data-mos-reveal data-mos-reveal-delay="0.12">
          ${renderProviderCardsHtml(CYTON_MODEL_PROVIDERS, isAuthenticated)}
        </div>

        <div class="mos-marketplace-footnote" data-mos-reveal data-mos-reveal-delay="0.16">
          <span>All provider listings reflect active gateways configured in <span class="mono">CYTON_MODEL_PROVIDERS</span> inside MarketOS.</span>
        </div>
      </div>
    </section>
  `;
}

function renderProviderCardsHtml(providers, isAuthenticated) {
  return providers
    .map((prov) => {
      const capabilitiesText = (prov.capabilities || []).join(" • ");
      return `
        <article class="mos-glass-card mos-model-card" data-provider-id="${esc(prov.id)}" data-depth-card>
          <div class="mos-model-card-top">
            <div>
              <span class="mos-data-label">${esc(prov.latencyProfile)}</span>
              <h3>${esc(prov.name)}</h3>
            </div>
            <span class="mos-pill-tag">${prov.supportsVision ? "Vision + Text" : "Text / Code"}</span>
          </div>

          <p class="mos-data-copy">${esc(prov.note)}</p>

          <div class="mos-model-chips">
            ${prov.models.map((m) => `<span class="mos-model-id">${esc(m)}</span>`).join("")}
          </div>

          <div class="mos-model-metrics">
            <div>
              <span>Default Model</span>
              <strong>${esc(prov.defaultModel)}</strong>
            </div>
            <div>
              <span>Capabilities</span>
              <strong>${esc(capabilitiesText)}</strong>
            </div>
          </div>

          <div class="mos-model-card-foot">
            <button type="button" class="mos-btn mos-btn-outline mos-btn-sm" data-launch-provider="${esc(prov.id)}">
              ${isAuthenticated ? "Use in CYTON" : "Access Provider"}
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

export function bindMarketplaceShowcaseEvents(root, { isAuthenticated, onOpenAuth, onOpenDashboard }) {
  let activeFilter = DISCOVERY_FILTERS[0];
  const gridEl = document.getElementById("mos-model-grid");

  const bindLaunchButtons = () => {
    gridEl?.querySelectorAll("[data-launch-provider]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (isAuthenticated) onOpenDashboard("cyton");
        else onOpenAuth("signup");
      });
    });
  };

  const redraw = () => {
    if (!gridEl) return;
    const filtered = CYTON_MODEL_PROVIDERS.filter((p) => providerMatchesFilter(p, activeFilter));
    gridEl.innerHTML = renderProviderCardsHtml(filtered, isAuthenticated);
    bindLaunchButtons();
  };

  root.querySelectorAll("[data-provider-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeFilter = btn.getAttribute("data-provider-filter") || DISCOVERY_FILTERS[0];
      root.querySelectorAll("[data-provider-filter]").forEach((b) => {
        const isOn = b.getAttribute("data-provider-filter") === activeFilter;
        b.classList.toggle("active", isOn);
        b.setAttribute("aria-selected", String(isOn));
      });
      redraw();
    });
  });

  bindLaunchButtons();

  return { cleanup: () => {} };
}
