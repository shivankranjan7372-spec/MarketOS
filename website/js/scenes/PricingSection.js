import { SUBSCRIPTION_TIERS } from "../catalog.js";
import {
  bindCurrencySelectorEvents,
  calculateAnnualPlanSavings,
  formatSubscriptionTierPrice,
  getCurrencyState,
  renderCurrencySelectorHtml,
  subscribeCurrency
} from "../currency.js";

const BILLING_PERIOD_KEY = "marketos_landing_billing_period";

function readPersistedBillingPeriod() {
  try {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(BILLING_PERIOD_KEY) === "annual" ? "annual" : "monthly";
    }
  } catch {
    // Ignore storage errors
  }
  return "monthly";
}

function writePersistedBillingPeriod(period) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(BILLING_PERIOD_KEY, period === "annual" ? "annual" : "monthly");
    }
  } catch {
    // Ignore storage errors
  }
}

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
  const billingPeriod = readPersistedBillingPeriod();
  const sampleSavings = calculateAnnualPlanSavings(SUBSCRIPTION_TIERS.GROWTH || tiers[0]);

  return `
    <section class="mos-scene mos-scene-pricing" id="scene-pricing" data-scene-index="4">
      <div class="mos-container mos-pricing-container">
        <div class="mos-section-head mos-center-head" data-mos-reveal>
          <span class="mos-kicker">04 &bull; TRANSPARENT SUBSCRIPTION PRICING</span>
          <h2>Simple plans built to scale with you.</h2>
          <p class="mos-lead">
            Choose Monthly or Annual billing (pay for 10 months, save ~${sampleSavings.savingsPercent}% annually). Official canonical pricing is denominated in INR with instant display conversion.
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
              class="mos-billing-btn ${billingPeriod === "monthly" ? "active" : ""}"
              data-billing-period="monthly"
              aria-pressed="${billingPeriod === "monthly"}"
            >
              Monthly Billing
            </button>
            <button
              type="button"
              id="mos-billing-annual"
              class="mos-billing-btn ${billingPeriod === "annual" ? "active" : ""}"
              data-billing-period="annual"
              aria-pressed="${billingPeriod === "annual"}"
            >
              Annual Billing
              <span class="mos-save-badge">Save ~${sampleSavings.savingsPercent}%</span>
            </button>
          </div>
        </div>

        <div class="mos-pricing-head-sub" data-mos-reveal data-mos-reveal-delay="0.1">
          <div class="mos-billing-note" id="mos-billing-status-note">
            ${
              billingStatusText
                ? esc(billingStatusText)
                : `Canonical billing: INR (₹) &bull; Display: ${meta.code} (${meta.symbol}) &bull; ${billingPeriod === "annual" ? `Annual billing (~${sampleSavings.savingsPercent}% off monthly)` : "Monthly billing"}`
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

function renderTierCardsHtml(tiers, currencyCode, billingPeriod, isAuthenticated, activeTierId, animateSwap = false) {
  return tiers
    .map((tier) => {
      const isRecommended = Boolean(tier.recommended);
      const isCurrent = Boolean(isAuthenticated && activeTierId === tier.id);
      const pricing = formatSubscriptionTierPrice(tier, billingPeriod, currencyCode);
      const highlights = Array.isArray(tier.platformHighlights) ? tier.platformHighlights : [];
      const showCanonicalDiff = pricing.displayCurrency !== "INR";

      return `
        <article class="mos-glass-card mos-price-card ${isRecommended ? "featured" : ""}" data-tier-card="${esc(tier.id)}" data-depth-card>
          <div class="mos-price-head">
            <span class="mos-plan-name">${esc(tier.displayName)}</span>
            ${
              isCurrent
                ? `<span class="mos-pill-tag current">Active Plan</span>`
                : isRecommended
                  ? `<span class="mos-pill-tag mos-rec-tag">Recommended</span>`
                  : ""
            }
          </div>

          <div class="mos-price-figure ${animateSwap ? "mos-price-swap" : ""}">
            <strong data-tier-price="${esc(tier.id)}">${pricing.displayFormatted}</strong>
            <span>${pricing.periodSuffix}</span>
          </div>

          <div class="mos-tier-meta-row">
            <span class="mos-tier-freq">${pricing.billingFrequencyLabel}</span>
            ${
              billingPeriod === "annual"
                ? `<span class="mos-plan-savings" data-tier-savings="${esc(tier.id)}">Save ${pricing.annualSavingsFormatted} (${pricing.annualSavingsPercent}%)</span>`
                : ""
            }
          </div>

          ${
            showCanonicalDiff
              ? `<div class="mos-tier-canonical">Checkout in INR: ${pricing.canonicalFormatted} ${pricing.periodSuffix}</div>`
              : `<div class="mos-tier-canonical">${billingPeriod === "annual" ? `Equivalent to ${pricing.monthlyCanonicalFormatted}/mo (10 months)` : "Canonical INR plan rate"}</div>`
          }

          <p class="mos-price-desc">${esc(tier.featuresSummary)}</p>

          <ul class="mos-price-list">
            ${highlights.map((item) => `<li>${esc(item)}</li>`).join("")}
          </ul>

          <button
            type="button"
            class="mos-btn ${isRecommended ? "mos-btn-liquid" : "mos-btn-outline"} mos-plan-cta"
            data-mos-plan="${esc(tier.id)}"
            style="width:100%;"
          >
            ${
              isCurrent
                ? "Manage Plan"
                : isAuthenticated
                  ? `Subscribe to ${esc(tier.displayName)}`
                  : "Get Started"
            }
          </button>
        </article>`;
    })
    .join("");
}

export function bindPricingEvents(
  root,
  {
    isAuthenticated = false,
    activeTierId = "",
    billingStatusText = "",
    onOpenAuth,
    onExploreSection,
    onSelectPlanCheckout
  }
) {
  let billingPeriod = readPersistedBillingPeriod();

  const updateAllPricingDisplays = (animateSwap = true) => {
    const { code, meta } = getCurrencyState();
    const tiers = Object.values(SUBSCRIPTION_TIERS);
    const sampleSavings = calculateAnnualPlanSavings(SUBSCRIPTION_TIERS.GROWTH || tiers[0]);

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
        const { sourceLabel } = getCurrencyState();
        statusEl.innerHTML = `<span>Canonical pricing: INR (₹) &bull; Display: <strong>${meta.code} (${meta.symbol})</strong> &bull; ${esc(sourceLabel)}</span>`;
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
        tiers,
        code,
        billingPeriod,
        isAuthenticated,
        activeTierId,
        animateSwap
      );
      bindPlanClicks();
    }

    const noteEl = document.getElementById("mos-billing-status-note");
    if (noteEl && !billingStatusText) {
      const cycleLabel =
        billingPeriod === "annual"
          ? `Annual billing (~${sampleSavings.savingsPercent}% off monthly)`
          : "Monthly billing";
      noteEl.innerHTML = `Canonical billing: INR (₹) &bull; Display: ${meta.code} (${meta.symbol}) &bull; ${cycleLabel}`;
    }
  };

  const bindPlanClicks = () => {
    root.querySelectorAll("[data-mos-plan]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tierId = btn.getAttribute("data-mos-plan") || "STARTER";
        const tier = SUBSCRIPTION_TIERS[tierId] || SUBSCRIPTION_TIERS.STARTER;
        const { code } = getCurrencyState();
        const pricing = formatSubscriptionTierPrice(tier, billingPeriod, code);
        const payload = {
          tierId: tier.id,
          displayName: tier.displayName,
          billingPeriod,
          canonicalCurrency: "INR",
          canonicalAmountInr: pricing.canonicalAmountInr,
          canonicalFormatted: pricing.canonicalFormatted,
          displayCurrency: pricing.displayCurrency,
          displayFormatted: pricing.displayFormatted,
          annualSavingsPercent: pricing.annualSavingsPercent
        };

        if (typeof onSelectPlanCheckout === "function") {
          onSelectPlanCheckout(payload);
        } else if (isAuthenticated && typeof onExploreSection === "function") {
          onExploreSection("settings", payload);
        } else if (typeof onOpenAuth === "function") {
          onOpenAuth("signup", payload);
        }
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
        writePersistedBillingPeriod(billingPeriod);
        updateAllPricingDisplays(true);
      }
    });
  });

  const unsub = subscribeCurrency(() => updateAllPricingDisplays(true));
  return {
    refresh: () => updateAllPricingDisplays(false),
    cleanup: unsub
  };
}
