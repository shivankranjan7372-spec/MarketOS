export function renderAnalyticsSceneHtml() {
  const trajectory = [22, 31, 38, 49, 63, 78, 92];
  const polyPoints = trajectory
    .map((val, idx) => `${(idx * 100) / (trajectory.length - 1)},${100 - val}`)
    .join(" ");

  return `
    <section class="mos-scene mos-scene-analytics" id="scene-analytics" data-scene-index="4">
      <div class="mos-container">
        <div class="mos-analytics-layout">
          <div class="mos-analytics-head" data-mos-reveal>
            <span class="mos-kicker">04 &bull; INTELLIGENCE &amp; ANALYTICS</span>
            <h2>Every campaign.<br /><span class="mos-accent-span">A smarter next move.</span></h2>
            <p class="mos-lead">
              Evaluate campaign efficiency, channel momentum, and cross-currency spend without guessing. Live workspaces always keep verified actual records isolated from baseline projections.
            </p>
            <div class="mos-demo-disclaimer" role="note">
              <strong>ILLUSTRATIVE PREVIEW DATA</strong> &mdash; Sample charts below illustrate the MarketOS intelligence layout. MarketOS does not fabricate real customer revenue or metrics.
            </div>
          </div>

          <div class="mos-analytics-grid" data-mos-reveal data-mos-reveal-delay="0.12">
            <article class="mos-data-card mos-data-wide">
              <div class="mos-data-top">
                <div>
                  <span class="mos-data-label">GROWTH TRAJECTORY &bull; ILLUSTRATIVE</span>
                  <h3>Cross-Channel Campaign Momentum</h3>
                </div>
                <span class="mos-pill-tag">Actual vs. Estimate</span>
              </div>
              <div class="mos-chart-svg-wrap" aria-hidden="true">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="mos-line-chart">
                  <defs>
                    <linearGradient id="mosChartFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#7C3AED" stop-opacity="0.32" />
                      <stop offset="100%" stop-color="#7C3AED" stop-opacity="0.0" />
                    </linearGradient>
                  </defs>
                  <polygon points="0,100 ${polyPoints} 100,100" fill="url(#mosChartFill)" />
                  <polyline
                    points="${polyPoints}"
                    fill="none"
                    stroke="#A855F7"
                    stroke-width="2"
                    vector-effect="non-scaling-stroke"
                  />
                </svg>
              </div>
              <div class="mos-chart-axis">
                <span>W1 Strategy</span>
                <span>W2 Drafts</span>
                <span>W3 Launch</span>
                <span>W4 Optimize</span>
                <span>W5 Expand</span>
              </div>
            </article>

            <article class="mos-data-card">
              <span class="mos-data-label">MULTI-CURRENCY ENGINE</span>
              <h3>Unified Spend Ledger</h3>
              <p class="mos-data-copy">
                Bill in your regional account currency (USD, EUR, INR, GBP, AED) while converting roll-up metrics live in your chosen display currency.
              </p>
              <div class="mos-ledger-rows">
                <div><span>Billing Trace</span><strong>Preserved 1:1</strong></div>
                <div><span>FX Refresh</span><strong>Open Exchange Rates</strong></div>
                <div><span>Variance View</span><strong>Actual &bull; Estimate</strong></div>
              </div>
            </article>

            <article class="mos-data-card">
              <span class="mos-data-label">AUDIENCE INSIGHTS</span>
              <h3>Segment Channel Fit</h3>
              <p class="mos-data-copy">
                Brand Studio profiles score each message draft against stored audience tone guidelines before entering the approval queue.
              </p>
              <div class="mos-bar-stack" aria-hidden="true">
                <div class="mos-bar-row"><span>Social &amp; Short Video</span><div class="mos-bar-track"><div style="width:84%"></div></div></div>
                <div class="mos-bar-row"><span>SEO &amp; Organic</span><div class="mos-bar-track"><div style="width:72%"></div></div></div>
                <div class="mos-bar-row"><span>Outreach Email</span><div class="mos-bar-track"><div style="width:64%"></div></div></div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  `;
}
