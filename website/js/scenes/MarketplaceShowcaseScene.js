import { CYTON_MODEL_PROVIDERS, MARKETPLACE_GENERATION_TYPES } from "../catalog.js";
import {
  formatCanonicalUsd,
  formatIndicativeAmount,
  getCurrencyState,
  subscribeCurrency
} from "../currency.js";

const DISCOVERY_FILTERS = [
  "All Providers",
  "Text Intelligence",
  "Coding",
  "Vision & Multimodal",
  "Self-Hosted / BYOK"
];

function providerMatchesFilter(provider, filterName) {
  if (filterName === "All Providers") return true;
  if (filterName === "Vision & Multimodal") return Boolean(provider.supportsVision);
  if (filterName === "Self-Hosted / BYOK") return provider.id === "custom" || provider.id === "openrouter";
  return Array.isArray(provider.capabilities) && provider.capabilities.includes(filterName);
}

export function renderMarketplaceShowcaseHtml(isAuthenticated = false) {
  const { code } = getCurrencyState();
  const baseGen = MARKETPLACE_GENERATION_TYPES[0];

  return `
    <section class="mos-scene mos-scene-marketplace" id="scene-marketplace" data-scene-index="1">
      <div class="mos-container">
        <div class="mos-section-head mos-center-head" data-mos-reveal>
          <span class="mos-kicker">01 &bull; AI MARKETPLACE &amp; MODEL DISCOVERY</span>
          <h2>Find the right AI for every idea.<br /><span class="mos-accent-span">Compare intelligence, capabilities and cost.</span></h2>
          <p class="mos-lead">
            Inspect configured MarketOS providers, compare multimodal support and indicative per-generation pricing, and launch models inside a single governed workspace.
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
                data-provider-filter="${f}"
              >
                ${f}
              </button>`
          ).join("")}
        </div>

        <div class="mos-model-grid" id="mos-model-grid" data-mos-reveal data-mos-reveal-delay="0.12">
          ${renderProviderCardsHtml(CYTON_MODEL_PROVIDERS, code, baseGen, isAuthenticated)}
        </div>

        <div class="mos-marketplace-footnote" data-mos-reveal data-mos-reveal-delay="0.16">
          <span>All provider listings reflect active gateways configured in <span class="mono">CYTON_MODEL_PROVIDERS</span>. Prices shown in <strong data-curr-code-label>${code}</strong> are indicative estimates converted from canonical USD.</span>
        </div>
      </div>
    </section>
  `;
}

function renderProviderCardsHtml(providers, currencyCode, baseGen, isAuthenticated) {
  return providers
    .map((prov) => {
      const estFormatted = formatIndicativeAmount(prov.indicativeUsdPerGen * baseGen.multiplier, currencyCode);
      const usdRef = formatCanonicalUsd(prov.indicativeUsdPerGen * baseGen.multiplier);
      return `
        <article class="mos-glass-card mos-model-card" data-provider-id="${prov.id}" data-depth-card>
          <div class="mos-model-card-top">
            <div>
              <span class="mos-data-label">${prov.latencyProfile}</span>
              <h3>${prov.name}</h3>
            </div>
            <span class="mos-pill-tag">${prov.supportsVision ? "Vision + Text" : "Text / Code"}</span>
          </div>

          <p class="mos-data-copy">${prov.note}</p>

          <div class="mos-model-chips">
            ${prov.models.map((m) => `<span class="mos-model-id">${m}</span>`).join("")}
          </div>

          <div class="mos-model-metrics">
            <div>
              <span>Est. per generation</span>
              <strong data-provider-price="${prov.id}">${estFormatted}</strong>
              <small class="mos-usd-trace">Ref: ${usdRef} USD</small>
            </div>
            <div>
              <span>Per 1K tokens est.</span>
              <strong data-provider-token-price="${prov.id}">${formatIndicativeAmount(prov.indicativeUsdPer1kTokens, currencyCode)}</strong>
              <small class="mos-usd-trace">${prov.defaultModel}</small>
            </div>
          </div>

          <div class="mos-model-card-foot">
            <button type="button" class="mos-btn mos-btn-outline mos-btn-sm" data-launch-provider="${prov.id}">
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

  const redraw = () => {
    if (!gridEl) return;
    const { code } = getCurrencyState();
    const filtered = CYTON_MODEL_PROVIDERS.filter((p) => providerMatchesFilter(p, activeFilter));
    gridEl.innerHTML = renderProviderCardsHtml(filtered, code, MARKETPLACE_GENERATION_TYPES[0], isAuthenticated);
    document.querySelectorAll("[data-curr-code-label]").forEach((el) => {
      el.textContent = code;
    });
    bindLaunchButtons();
  };

  const bindLaunchButtons = () => {
    gridEl?.querySelectorAll("[data-launch-provider]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (isAuthenticated) onOpenDashboard("cyton");
        else onOpenAuth("signup");
      });
    });
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
  const unsub = subscribeCurrency(redraw);

  return { cleanup: unsub };
}
