import { SUBSCRIPTION_TIERS } from "../catalog.js";

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderPricingSectionHtml({ isAuthenticated = false, activeTierId = "", billingStatusText = "" }) {
  const tiers = Object.values(SUBSCRIPTION_TIERS);

  return `
    <section class="mos-scene mos-scene-pricing" id="scene-pricing" data-scene-index="5">
      <div class="mos-container">
        <div class="mos-section-head mos-center-head" data-mos-reveal>
          <span class="mos-kicker">06 &bull; PRICING &amp; CONVERSION</span>
          <h2>Clear plans aligned with your MarketOS workspace.</h2>
          <p class="mos-lead">
            Every workspace starts with multi-currency adaptation and full owner governance. Select a tier below to begin or upgrade directly inside Settings.
          </p>
          ${
            billingStatusText
              ? `<div class="mos-billing-note">${esc(billingStatusText)}</div>`
              : `<div class="mos-billing-note">Pricing displayed in USD estimates. Automatic display currency conversion activates inside your business workspace.</div>`
          }
        </div>

        <div class="mos-pricing-grid" data-mos-reveal>
          ${tiers
            .map((tier) => {
              const isGrowth = tier.id === "GROWTH";
              const isCurrent = Boolean(isAuthenticated && activeTierId === tier.id);
              return `
                <article class="mos-price-card ${isGrowth ? "featured" : ""}">
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
                    <strong>$${esc(tier.usdMonthlyEstimate)}</strong>
                    <span>USD / month est.</span>
                  </div>

                  <p class="mos-price-desc">${esc(tier.featuresSummary)}</p>

                  <ul class="mos-price-list">
                    <li>${tier.monthlyAiLimit} AI generations per month</li>
                    <li>Up to ${tier.maxBusinesses} international business workspace${tier.maxBusinesses > 1 ? "s" : ""}</li>
                    <li>CYTON Command Centre &amp; Approval Gate</li>
                    <li>Multi-currency FX &amp; Cloud Sync ready</li>
                  </ul>

                  <button
                    type="button"
                    class="mos-btn ${isGrowth ? "mos-btn-primary" : "mos-btn-outline"} mos-plan-cta"
                    data-mos-plan="${esc(tier.id)}"
                    style="width:100%;"
                  >
                    ${isCurrent ? "Manage in Settings" : isAuthenticated ? `Select ${esc(tier.displayName)}` : `Start ${esc(tier.displayName)}`}
                  </button>
                </article>`;
            })
            .join("")}
        </div>
      </div>
    </section>
  `;
}

export function bindPricingEvents(root, { isAuthenticated, onOpenAuth, onExploreSection }) {
  root.querySelectorAll("[data-mos-plan]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (isAuthenticated) onExploreSection("settings");
      else onOpenAuth("signup");
    });
  });
}
