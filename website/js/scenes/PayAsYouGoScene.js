import { CYTON_MODEL_PROVIDERS, MARKETPLACE_GENERATION_TYPES } from "../catalog.js";
import {
  calculateEstimatedUsageCost,
  formatCanonicalUsd,
  formatIndicativeAmount,
  getCurrencyState,
  subscribeCurrency
} from "../currency.js";

const PAYG_FLOW_STEPS = [
  { num: "01", title: "Select AI Model", desc: "Choose from configured Gemini, OpenAI, Claude, OpenRouter, or self-hosted endpoints." },
  { num: "02", title: "Choose Generation", desc: "Pick your task format: campaign copy, SEO intelligence, code brief, creative brief, or script." },
  { num: "03", title: "Cost Calculated", desc: "MarketOS computes transparent usage cost before execution in your preferred display currency." },
  { num: "04", title: "Usage Metered", desc: "Only actual executed generations deduct from your monthly tier quota or credit allowance." },
  { num: "05", title: "Balance Updates", desc: "Remaining balance & canonical USD ledger update clearly with Actual vs. Estimate visibility." }
];

export function renderPayAsYouGoSceneHtml() {
  const state = {
    providerId: CYTON_MODEL_PROVIDERS[0].id,
    genTypeId: MARKETPLACE_GENERATION_TYPES[0].id,
    startingBalanceUsd: 25.0,
    spentPreviewUsd: 0,
    activeStep: 0
  };
  const provider = CYTON_MODEL_PROVIDERS[0];
  const genType = MARKETPLACE_GENERATION_TYPES[0];
  const calc = calculateEstimatedUsageCost({ provider, generationType: genType, quantity: 10 });
  const { code } = getCurrencyState();

  return `
    <section class="mos-scene mos-scene-payg" id="scene-payg" data-scene-index="2">
      <div class="mos-container">
        <div class="mos-payg-layout">
          <div class="mos-payg-head" data-mos-reveal>
            <span class="mos-kicker">02 &bull; TRANSPARENT USAGE &amp; METERING</span>
            <h2>Pay for Intelligence.<br /><span class="mos-accent-span">Not Idle Subscriptions.</span></h2>
            <p class="mos-lead">
              Know what you pay before you generate. Track every generation with canonical USD accounting and instant indicative conversion across USD, INR, EUR, GBP, and AED.
            </p>

            <div class="mos-payg-steps" id="mos-payg-steps">
              ${PAYG_FLOW_STEPS.map(
                (st, idx) => `
                  <button type="button" class="mos-payg-step ${idx === 0 ? "active" : ""}" data-payg-step="${idx}">
                    <span class="mos-payg-num">${st.num}</span>
                    <div>
                      <strong>${st.title}</strong>
                      <p>${st.desc}</p>
                    </div>
                  </button>`
              ).join("")}
            </div>
          </div>

          <div class="mos-glass-card mos-payg-simulator" data-mos-reveal data-mos-reveal-delay="0.1" data-depth-card>
            <div class="mos-console-head">
              <div>
                <span class="mos-console-label">INTERACTIVE USAGE METER PREVIEW</span>
                <span class="mos-console-sub">Preview calculation using real provider rates (no real charge)</span>
              </div>
              <span class="mos-pill-tag" id="mos-payg-currency-badge">${code}</span>
            </div>

            <div class="mos-payg-controls">
              <div class="mos-field-block">
                <label for="mos-payg-provider">1. Select AI Provider / Model</label>
                <select id="mos-payg-provider" class="mos-select">
                  ${CYTON_MODEL_PROVIDERS.map(
                    (p) => `<option value="${p.id}" ${p.id === state.providerId ? "selected" : ""}>${p.name} (${p.defaultModel})</option>`
                  ).join("")}
                </select>
              </div>

              <div class="mos-field-block">
                <label for="mos-payg-gentype">2. Choose Generation Type (10x batch preview)</label>
                <select id="mos-payg-gentype" class="mos-select">
                  ${MARKETPLACE_GENERATION_TYPES.map(
                    (g) => `<option value="${g.id}" ${g.id === state.genTypeId ? "selected" : ""}>${g.label}</option>`
                  ).join("")}
                </select>
              </div>
            </div>

            <div class="mos-payg-ledger">
              <div class="mos-ledger-metric">
                <span>Est. Batch Cost (10 runs)</span>
                <strong id="mos-payg-est-cost">${calc.totalFormatted}</strong>
                <small id="mos-payg-usd-cost">Canonical: ${calc.canonicalTotalUsd}</small>
              </div>
              <div class="mos-ledger-metric">
                <span>Sample Credit Pool</span>
                <strong id="mos-payg-balance">${formatIndicativeAmount(state.startingBalanceUsd, code)}</strong>
                <small id="mos-payg-balance-usd">Canonical: ${formatCanonicalUsd(state.startingBalanceUsd)} USD</small>
              </div>
            </div>

            <div class="mos-payg-actions">
              <button type="button" id="mos-payg-run-preview" class="mos-btn mos-btn-liquid" style="flex:1;">
                Preview Cost Deduction
              </button>
              <button type="button" id="mos-payg-reset-preview" class="mos-btn mos-btn-outline mos-btn-sm">
                Reset Preview
              </button>
            </div>
            <p class="mos-preview-disclaimer">
              Interactive estimator only—no real payment transaction or live API billing deduction occurs here.
            </p>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function bindPayAsYouGoEvents(root) {
  let providerId = CYTON_MODEL_PROVIDERS[0].id;
  let genTypeId = MARKETPLACE_GENERATION_TYPES[0].id;
  const startingBalanceUsd = 25.0;
  let remainingUsd = startingBalanceUsd;
  let activeStep = 0;

  const updateView = () => {
    const provider = CYTON_MODEL_PROVIDERS.find((p) => p.id === providerId) || CYTON_MODEL_PROVIDERS[0];
    const genType = MARKETPLACE_GENERATION_TYPES.find((g) => g.id === genTypeId) || MARKETPLACE_GENERATION_TYPES[0];
    const calc = calculateEstimatedUsageCost({ provider, generationType: genType, quantity: 10 });
    const { code } = getCurrencyState();

    const badge = document.getElementById("mos-payg-currency-badge");
    const estEl = document.getElementById("mos-payg-est-cost");
    const estUsdEl = document.getElementById("mos-payg-usd-cost");
    const balEl = document.getElementById("mos-payg-balance");
    const balUsdEl = document.getElementById("mos-payg-balance-usd");

    if (badge) badge.textContent = code;
    if (estEl) estEl.textContent = calc.totalFormatted;
    if (estUsdEl) estUsdEl.textContent = `Canonical: ${calc.canonicalTotalUsd}`;
    if (balEl) balEl.textContent = formatIndicativeAmount(remainingUsd, code);
    if (balUsdEl) balUsdEl.textContent = `Canonical: ${formatCanonicalUsd(remainingUsd)} USD`;

    root.querySelectorAll("[data-payg-step]").forEach((btn) => {
      const i = Number(btn.getAttribute("data-payg-step"));
      btn.classList.toggle("active", i === activeStep);
      btn.classList.toggle("done", i < activeStep);
    });
  };

  document.getElementById("mos-payg-provider")?.addEventListener("change", (e) => {
    providerId = e.target.value;
    activeStep = 0;
    updateView();
  });

  document.getElementById("mos-payg-gentype")?.addEventListener("change", (e) => {
    genTypeId = e.target.value;
    activeStep = 1;
    updateView();
  });

  document.getElementById("mos-payg-run-preview")?.addEventListener("click", () => {
    const provider = CYTON_MODEL_PROVIDERS.find((p) => p.id === providerId) || CYTON_MODEL_PROVIDERS[0];
    const genType = MARKETPLACE_GENERATION_TYPES.find((g) => g.id === genTypeId) || MARKETPLACE_GENERATION_TYPES[0];
    const calc = calculateEstimatedUsageCost({ provider, generationType: genType, quantity: 10 });
    remainingUsd = Math.max(0, Number((remainingUsd - calc.totalUsd).toFixed(4)));
    activeStep = 4;
    updateView();
  });

  document.getElementById("mos-payg-reset-preview")?.addEventListener("click", () => {
    remainingUsd = startingBalanceUsd;
    activeStep = 0;
    updateView();
  });

  root.querySelectorAll("[data-payg-step]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeStep = Number(btn.getAttribute("data-payg-step")) || 0;
      updateView();
    });
  });

  const unsub = subscribeCurrency(updateView);

  return {
    setStepByScroll: (localProgress) => {
      const idx = Math.min(PAYG_FLOW_STEPS.length - 1, Math.floor(localProgress * PAYG_FLOW_STEPS.length));
      if (idx !== activeStep) {
        activeStep = idx;
        updateView();
      }
    },
    cleanup: unsub
  };
}
