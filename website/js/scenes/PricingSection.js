import { SUBSCRIPTION_TIERS } from "../catalog.js";
import {
  bindCurrencySelectorEvents,
  formatSubscriptionTierPrice,
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
  const { code, meta } = getCurrencyState();
  const tiers = Object.values(SUBSCRIPTION_TIERS);
  const billingPeriod = "monthly";

  return `
    <section class="mos-scene mos-scene-pricing" id="scene-pricing" data-scene-index="4">
      <div class="mos-container">
        <div class="mos-section-head mos-center-head" data-mos-reveal>
          <span class="mos-kicker">04 &bull; TRANSPARENT SUBSCRIPTION PRICING</span>
          <h2>Simple workspace plans in your currency.</h2>
          <p class="mos-lead">
            Choose monthly or annual workspace billing and view subscription pricing in USD, INR, EUR, GBP, or AED. Display currency converts dynamically while canonical billing remains USD.
          </p>
        </div>

        <div class="mos-pricing-controls" data-mos-reveal data-mos-reveal-delay="0.06">
          <div class="mos-currency-wrap" id="mos-pricing-currency-wrap">
            ${renderCurrencySelectorHtml(code, "mos-pricing-curr")}
          </div>

          <div class="mos-billing-toggle" role="group" aria-label="Subscription billing cycle">
            <button
              type="button"
              id="mos-billing-monthly"
              class="mos-billing-btn active"
              data-billing-period="monthly"
              aria-pressed="true"
            >
              Monthly Billing
            </button>
            <button
              type="button"
              id="mos-billing-annual"
              class="mos-billing-btn"
              data-billing-period="annual"
              aria-pressed="false"
            >
              Annual Billing
            </button>
          </div>
        </div>

        <div class="mos-pricing-head-sub" data-mos-reveal data-mos-reveal-delay="0.1">
          <div class="mos-billing-note" id="mos-billing-status-note">
            ${
              billingStatusText
                ? esc(billingStatusText)
                : `Subscription plans shown in ${meta.code} (${meta.symbol}) • Monthly billing. Canonical workspace billing currency is USD unless configured per workspace in Settings.`
            }
          </div>
        </div>

        <div class="mos-pricing-grid" id="mos-pricing-grid" data-mos-reveal data-mos-reveal-delay="0.14">
          ${renderTierCardsHtml(tiers, code, billingPeriod, isAuthenticated, activeTierId)}
        </div>
      </div>
    </section>
  `;
}

function renderTierCardsHtml(tiers, currencyCode, billingPeriod, isAuthenticated, activeTierId) {
  return tiers
    .map((tier) => {
      const isGrowth = tier.id === "GROWTH";
      const isCurrent = Boolean(isAuthenticated && activeTierId === tier.id);
      const pricing = formatSubscriptionTierPrice(tier, billingPeriod, currencyCode);

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
            <strong data-tier-price="${esc(tier.id)}">${pricing.displayFormatted}</strong>
            <span>${pricing.periodSuffix}</span>
          </div>
          <div class="mos-tier-canonical">
            ${
              billingPeriod === "annual"
                ? `Canonical: ${pricing.canonicalFormatted} USD/yr (${pricing.monthlyCanonicalFormatted}/mo)`
                : `Canonical: ${pricing.canonicalFormatted} USD/mo`
            }
          </div>

          <p class="mos-price-desc">${esc(tier.featuresSummary)}</p>

          <ul class="mos-price-list">
            <li>${tier.monthlyAiLimit} AI generations per month</li>
            <li>Up to ${tier.maxBusinesses} business workspace${tier.maxBusinesses > 1 ? "s" : ""}</li>
            <li>CYTON Command Centre &amp; Approval Gate</li>
            <li>Unified AI Workspace &amp; Cloud Sync ready</li>
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
  let billingPeriod = "monthly";

  const updateAllPricingDisplays = () => {
    const { code, meta, sourceLabel } = getCurrencyState();

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

    // Update billing cycle toggle buttons
    root.querySelectorAll("[data-billing-period]").forEach((btn) => {
      const isOn = btn.getAttribute("data-billing-period") === billingPeriod;
      btn.classList.toggle("active", isOn);
      btn.setAttribute("aria-pressed", String(isOn));
    });

    // Update Tier Cards & Note
    const gridEl = document.getElementById("mos-pricing-grid");
    if (gridEl) {
      gridEl.innerHTML = renderTierCardsHtml(
        Object.values(SUBSCRIPTION_TIERS),
        code,
        billingPeriod,
        isAuthenticated,
        activeTierId
      );
      bindPlanClicks();
    }

    const noteEl = document.getElementById("mos-billing-status-note");
    if (noteEl && !billingStatusText) {
      const cycleLabel = billingPeriod === "annual" ? "Annual billing" : "Monthly billing";
      noteEl.textContent = `Subscription plans shown in ${meta.code} (${meta.symbol}) • ${cycleLabel}. Canonical workspace billing currency is USD unless configured per workspace in Settings.`;
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

  root.querySelectorAll("[data-billing-period]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nextPeriod = btn.getAttribute("data-billing-period") === "annual" ? "annual" : "monthly";
      if (nextPeriod !== billingPeriod) {
        billingPeriod = nextPeriod;
        updateAllPricingDisplays();
      }
    });
  });

  const unsub = subscribeCurrency(updateAllPricingDisplays);
  return {
    refresh: updateAllPricingDisplays,
    cleanup: unsub
  };
}
