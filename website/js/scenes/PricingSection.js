import {
  CYTON_MODEL_PROVIDERS,
  MARKETPLACE_GENERATION_TYPES,
  SUBSCRIPTION_TIERS
} from "../catalog.js";
import {
  bindCurrencySelectorEvents,
  calculateEstimatedUsageCost,
  formatCanonicalUsd,
  formatIndicativeAmount,
  getCurrencyState,
  renderCurrencySelectorHtml,
  subscribeCurrency
} from "../currency.js";

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderPricingSectionHtml({ isAuthenticated = false, activeTierId = "", billingStatusText = "" }) {
  const { code, meta, sourceLabel } = getCurrencyState();
  const tiers = Object.values(SUBSCRIPTION_TIERS);
  const initialProvider = CYTON_MODEL_PROVIDERS[0];
  const initialGenType = MARKETPLACE_GENERATION_TYPES[0];
  const initialQty = 50;
  const initialCalc = calculateEstimatedUsageCost({
    provider: initialProvider,
    generationType: initialGenType,
    quantity: initialQty
  });

  return `
    <section class="mos-scene mos-scene-pricing" id="scene-pricing" data-scene-index="4">
      <div class="mos-container">
        <div class="mos-section-head mos-center-head" data-mos-reveal>
          <span class="mos-kicker">04 &bull; GLOBAL CURRENCY &amp; USAGE CALCULATOR</span>
          <h2>Transparent pricing in your local currency.</h2>
          <p class="mos-lead">
            Compare model usage costs, calculate monthly batch estimates, and inspect MarketOS workspace tiers. Display currency converts dynamically while canonical billing remains USD.
          </p>
        </div>

        <div class="mos-currency-wrap" id="mos-pricing-currency-wrap" data-mos-reveal data-mos-reveal-delay="0.06">
          ${renderCurrencySelectorHtml(code, "mos-pricing-curr")}
        </div>

        <!-- Interactive Pricing Calculator -->
        <div class="mos-glass-card mos-calculator-card" id="mos-pricing-calculator" data-mos-reveal data-mos-reveal-delay="0.1">
          <div class="mos-calc-grid">
            <div class="mos-calc-inputs">
              <span class="mos-data-label">INTERACTIVE PRICING CALCULATOR</span>
              <h3>Estimate Usage Across AI Providers</h3>

              <div class="mos-calc-fields">
                <div class="mos-field-block">
                  <label for="mos-calc-provider">AI Provider &amp; Model</label>
                  <select id="mos-calc-provider" class="mos-select">
                    ${CYTON_MODEL_PROVIDERS.map(
                      (p, i) => `<option value="${esc(p.id)}" ${i === 0 ? "selected" : ""}>${esc(p.name)} — ${esc(p.defaultModel)}</option>`
                    ).join("")}
                  </select>
                </div>

                <div class="mos-field-block">
                  <label for="mos-calc-gentype">Generation Type</label>
                  <select id="mos-calc-gentype" class="mos-select">
                    ${MARKETPLACE_GENERATION_TYPES.map(
                      (g, i) => `<option value="${esc(g.id)}" ${i === 0 ? "selected" : ""}>${esc(g.label)}</option>`
                    ).join("")}
                  </select>
                </div>

                <div class="mos-field-block">
                  <div class="mos-qty-head">
                    <label for="mos-calc-qty-input">Intended Usage Quantity (<span id="mos-calc-unit-label">${esc(initialGenType.unitLabel)}</span>)</label>
                    <input
                      type="number"
                      id="mos-calc-qty-input"
                      class="mos-qty-num"
                      min="1"
                      max="10000"
                      value="${initialQty}"
                      aria-label="Intended usage quantity"
                    />
                  </div>
                  <input
                    type="range"
                    id="mos-calc-qty-range"
                    class="mos-range"
                    min="1"
                    max="1000"
                    value="${initialQty}"
                    aria-label="Usage quantity slider"
                  />
                </div>
              </div>
            </div>

            <div class="mos-calc-output">
              <div class="mos-calc-total-box">
                <span class="mos-data-label">INDICATIVE ESTIMATE (${esc(meta.code)})</span>
                <div class="mos-calc-big-figure" id="mos-calc-total-display">${initialCalc.totalFormatted}</div>
                <div class="mos-calc-sub-row">
                  <span>Per unit: <strong id="mos-calc-unit-display">${initialCalc.unitFormatted}</strong></span>
                  <span>Canonical USD: <strong id="mos-calc-usd-display">${initialCalc.canonicalTotalUsd}</strong></span>
                </div>
              </div>

              <div class="mos-calc-compare-list" id="mos-calc-compare-list">
                ${renderModelComparisonRows(initialGenType, initialQty, code)}
              </div>
            </div>
          </div>

          <div class="mos-calc-disclaimer">
            Indicative converted prices use <strong>${esc(sourceLabel)}</strong> for display convenience only and never alter canonical USD billing or checkout amounts. Final usage charges depend on the selected model, token length, and active BYOK/provider rates.
          </div>
        </div>

        <!-- Subscription Workspace Tiers -->
        <div class="mos-pricing-head-sub" data-mos-reveal data-mos-reveal-delay="0.12">
          <h3>Workspace Quota Plans</h3>
          <div class="mos-billing-note" id="mos-billing-status-note">
            ${
              billingStatusText
                ? esc(billingStatusText)
                : `Display prices converted to ${meta.code} (${meta.symbol}). Canonical workspace billing currency is USD unless configured per workspace in Settings.`
            }
          </div>
        </div>

        <div class="mos-pricing-grid" id="mos-pricing-grid" data-mos-reveal data-mos-reveal-delay="0.15">
          ${renderTierCardsHtml(tiers, code, isAuthenticated, activeTierId)}
        </div>
      </div>
    </section>
  `;
}

function renderModelComparisonRows(genType, qty, currencyCode) {
  return CYTON_MODEL_PROVIDERS.map((prov) => {
    const est = calculateEstimatedUsageCost({ provider: prov, generationType: genType, quantity: qty });
    return `
      <div class="mos-calc-comp-row" data-comp-provider="${esc(prov.id)}">
        <div>
          <strong>${esc(prov.name)}</strong>
          <span>${esc(prov.defaultModel)}</span>
        </div>
        <div class="mos-comp-right">
          <strong>${formatIndicativeAmount(est.totalUsd, currencyCode)}</strong>
          <small>${est.canonicalTotalUsd} USD</small>
        </div>
      </div>`;
  }).join("");
}

function renderTierCardsHtml(tiers, currencyCode, isAuthenticated, activeTierId) {
  return tiers
    .map((tier) => {
      const isGrowth = tier.id === "GROWTH";
      const isCurrent = Boolean(isAuthenticated && activeTierId === tier.id);
      const convertedPrice = formatIndicativeAmount(tier.usdMonthlyEstimate, currencyCode);
      const canonicalPrice = formatCanonicalUsd(tier.usdMonthlyEstimate);
      const perCreditUsd = tier.usdMonthlyEstimate / tier.monthlyAiLimit;
      const convertedPerCredit = formatIndicativeAmount(perCreditUsd, currencyCode);

      return `
        <article class="mos-glass-card mos-price-card ${isGrowth ? "featured" : ""}" data-depth-card>
          <div class="mos-price-head">
            <span class="mos-plan-name">${esc(tier.displayName)}</span>
            ${
              isCurrent
                ? `<span class="mos-pill-tag current">Active Plan</span>`
                : isGrowth
                  ? `<span class="mos-pill-tag">Popular</span>`
                  : ""
            }
          </div>

          <div class="mos-price-figure">
            <strong data-tier-price="${esc(tier.id)}">${convertedPrice}</strong>
            <span>/ month est.</span>
          </div>
          <div class="mos-tier-canonical">
            Canonical: ${canonicalPrice} USD/mo &bull; ~${convertedPerCredit} per generation
          </div>

          <p class="mos-price-desc">${esc(tier.featuresSummary)}</p>

          <ul class="mos-price-list">
            <li>${tier.monthlyAiLimit} AI generations per month</li>
            <li>Up to ${tier.maxBusinesses} business workspace${tier.maxBusinesses > 1 ? "s" : ""}</li>
            <li>CYTON Command Centre &amp; Approval Gate</li>
            <li>Multi-provider BYOK &amp; Cloud Sync ready</li>
          </ul>

          <button
            type="button"
            class="mos-btn ${isGrowth ? "mos-btn-liquid" : "mos-btn-outline"} mos-plan-cta"
            data-mos-plan="${esc(tier.id)}"
            style="width:100%;"
          >
            ${isCurrent ? "Manage in Settings" : isAuthenticated ? `Select ${esc(tier.displayName)}` : `Start ${esc(tier.displayName)}`}
          </button>
        </article>`;
    })
    .join("");
}

export function bindPricingEvents(root, { isAuthenticated, activeTierId = "", billingStatusText = "", onOpenAuth, onExploreSection }) {
  let providerId = CYTON_MODEL_PROVIDERS[0].id;
  let genTypeId = MARKETPLACE_GENERATION_TYPES[0].id;
  let qty = 50;

  const updateAllPricingDisplays = () => {
    const { code, meta, sourceLabel } = getCurrencyState();
    const provider = CYTON_MODEL_PROVIDERS.find((p) => p.id === providerId) || CYTON_MODEL_PROVIDERS[0];
    const genType = MARKETPLACE_GENERATION_TYPES.find((g) => g.id === genTypeId) || MARKETPLACE_GENERATION_TYPES[0];
    const calc = calculateEstimatedUsageCost({ provider, generationType: genType, quantity: qty });

    // Update currency selector active states & label
    const currWrap = document.getElementById("mos-pricing-currency-wrap");
    if (currWrap) {
      currWrap.querySelectorAll("[data-currency-code]").forEach((btn) => {
        const isOn = btn.getAttribute("data-currency-code") === code;
        btn.classList.toggle("active", isOn);
        btn.setAttribute("aria-pressed", String(isOn));
      });
      const statusEl = currWrap.querySelector("[data-currency-status]");
      if (statusEl) {
        statusEl.innerHTML = `<span>Canonical billing: USD &bull; Display: <strong>${meta.code} (${meta.symbol})</strong> &bull; ${esc(sourceLabel)}</span>`;
      }
    }

    // Update Calculator readouts
    const unitLabelEl = document.getElementById("mos-calc-unit-label");
    const totalDisp = document.getElementById("mos-calc-total-display");
    const unitDisp = document.getElementById("mos-calc-unit-display");
    const usdDisp = document.getElementById("mos-calc-usd-display");
    const compList = document.getElementById("mos-calc-compare-list");

    if (unitLabelEl) unitLabelEl.textContent = genType.unitLabel;
    if (totalDisp) totalDisp.textContent = calc.totalFormatted;
    if (unitDisp) unitDisp.textContent = calc.unitFormatted;
    if (usdDisp) usdDisp.textContent = calc.canonicalTotalUsd;
    if (compList) compList.innerHTML = renderModelComparisonRows(genType, qty, code);

    const calcHeadingLabel = root.querySelector(".mos-calc-total-box .mos-data-label");
    if (calcHeadingLabel) calcHeadingLabel.textContent = `INDICATIVE ESTIMATE (${meta.code})`;

    // Update Tier Cards & Note
    const gridEl = document.getElementById("mos-pricing-grid");
    if (gridEl) {
      gridEl.innerHTML = renderTierCardsHtml(Object.values(SUBSCRIPTION_TIERS), code, isAuthenticated, activeTierId);
      bindPlanClicks();
    }
    const noteEl = document.getElementById("mos-billing-status-note");
    if (noteEl && !billingStatusText) {
      noteEl.textContent = `Display prices converted to ${meta.code} (${meta.symbol}). Canonical workspace billing currency is USD unless configured per workspace in Settings.`;
    }
  };

  const bindPlanClicks = () => {
    root.querySelectorAll("[data-mos-plan]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (isAuthenticated) onExploreSection("settings");
        else onOpenAuth("signup");
      });
    });
  };

  bindCurrencySelectorEvents(root);
  bindPlanClicks();

  document.getElementById("mos-calc-provider")?.addEventListener("change", (e) => {
    providerId = e.target.value;
    updateAllPricingDisplays();
  });

  document.getElementById("mos-calc-gentype")?.addEventListener("change", (e) => {
    genTypeId = e.target.value;
    updateAllPricingDisplays();
  });

  const qtyInput = document.getElementById("mos-calc-qty-input");
  const qtyRange = document.getElementById("mos-calc-qty-range");

  qtyRange?.addEventListener("input", (e) => {
    qty = Math.max(1, Number(e.target.value) || 1);
    if (qtyInput) qtyInput.value = String(qty);
    updateAllPricingDisplays();
  });

  qtyInput?.addEventListener("input", (e) => {
    qty = Math.max(1, Math.min(10000, Number(e.target.value) || 1));
    if (qtyRange) qtyRange.value = String(Math.min(1000, qty));
    updateAllPricingDisplays();
  });

  const unsub = subscribeCurrency(updateAllPricingDisplays);
  return {
    refresh: updateAllPricingDisplays,
    cleanup: unsub
  };
}
