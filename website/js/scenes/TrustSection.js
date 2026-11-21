const TRUST_PILLARS = [
  {
    code: "01",
    title: "Transparent Usage Pricing",
    detail:
      "Every tier limit, model rate estimate, and canonical USD vs. display-currency conversion is visible before you execute—zero hidden markups or fabricated savings."
  },
  {
    code: "02",
    title: "Multi-Provider Model Choice",
    detail:
      "Switch cleanly across Google Gemini, OpenAI, Anthropic Claude, OpenRouter, or your own OpenAI-compatible self-hosted endpoints with BYOK support."
  },
  {
    code: "03",
    title: "Unified Access & Governance",
    detail:
      "Route content generation, campaign planning, SEO inspection, and approvals from one workspace while external PUBLISH and SEND actions await owner sign-off."
  },
  {
    code: "04",
    title: "Honest Usage Visibility",
    detail:
      "Strict separation between verified Actual Data and illustrative estimates—MarketOS never invents traffic metrics, customer counts, or revenue numbers."
  },
  {
    code: "05",
    title: "Secure Account & OAuth Control",
    detail:
      "Firebase Authentication, scoped Firestore workspace isolation, official OAuth provider connections, and SSRF-protected live URL research."
  }
];

export function renderTrustSectionHtml() {
  return `
    <section class="mos-scene mos-scene-trust" id="scene-trust" data-scene-index="5">
      <div class="mos-container">
        <div class="mos-section-head mos-center-head" data-mos-reveal>
          <span class="mos-kicker">05 &bull; TRUST &amp; ARCHITECTURAL TRANSPARENCY</span>
          <h2>Built for clarity, governance, and control.</h2>
          <p class="mos-lead">
            Designed around verifiable engineering standards—real providers, explicit human approvals, and honest multi-currency accounting.
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
