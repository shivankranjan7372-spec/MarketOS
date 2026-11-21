const TRUST_PILLARS = [
  {
    code: "01",
    title: "Transparent Subscription Pricing",
    detail:
      "Clear monthly and annual workspace quota plans with canonical INR billing and instant display currency conversion across INR, USD, EUR, GBP, and AED."
  },
  {
    code: "02",
    title: "Centralized AI Discovery",
    detail:
      "Access language, creative, analytical, and automation intelligence through one unified platform without managing separate tools or accounts."
  },
  {
    code: "03",
    title: "Unified Access & Governance",
    detail:
      "Route content generation, campaign planning, web intelligence, and approvals from one workspace while external publishing actions await owner sign-off."
  },
  {
    code: "04",
    title: "Honest Usage Visibility",
    detail:
      "Strict separation between verified Actual Data and illustrative estimates—MarketOS never invents traffic metrics, customer counts, or revenue numbers."
  },
  {
    code: "05",
    title: "Enterprise-Grade Account Security",
    detail:
      "Isolated workspace authentication, strict permission boundaries, and explicit user authorization before any external communication or campaign executes."
  }
];

export function renderTrustSectionHtml() {
  return `
    <section class="mos-scene mos-scene-trust" id="scene-trust" data-scene-index="5">
      <div class="mos-container">
        <div class="mos-section-head mos-center-head" data-mos-reveal>
          <span class="mos-kicker">05 &bull; SECURITY, TRUST &amp; GOVERNANCE</span>
          <h2>Built for clarity, governance, and control.</h2>
          <p class="mos-lead">
            Designed around verifiable engineering standards—unified workspace access, explicit human approvals, and honest multi-currency subscription billing.
          </p>
        </div>

        <div class="mos-trust-grid" data-mos-reveal data-mos-reveal-delay="0.1">
          ${TRUST_PILLARS.map(
            (item) => `
              <article class="mos-glass-card mos-trust-card" data-depth-card>
                <span class="mos-trust-num">${item.code}</span>
                <h3>${item.title}</h3>
                <p>${item.detail}</p>
              </article>`
          ).join("")}
        </div>
      </div>
    </section>
  `;
}
