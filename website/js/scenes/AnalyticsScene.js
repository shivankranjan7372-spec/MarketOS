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
            <span class="mos-kicker">05 &bull; INTELLIGENCE &amp; ANALYTICS</span>
            <h2>Every campaign.<br /><span class="mos-accent-span">A smarter next move.</span></h2>
            <p class="mos-lead">
              Evaluate campaign efficiency, channel momentum, and cross-currency spend without guessing. Live workspaces always keep verified actual records isolated from baseline projections.
            </p>
            <div class="mos-demo-disclaimer" role="note">
              <strong>ILLUSTRATIVE PREVIEW DATA</strong> &mdash; Sample charts below illustrate the MarketOS intelligence layout. MarketOS does not fabricate real customer revenue or metrics.
            </div>
          </div>

          <div class="mos-analytics-grid" data-mos-reveal>
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
                      <stop offset="0%" stop-color="#7C3AED" stop-opacity="0.38" />
                      <stop offset="100%" stop-color="#7C3AED" stop-opacity="0.0" />
                    </linearGradient>
                  </defs>
                  <polygon points="0,100 ${polyPoints} 100,100" fill="url(#mosChartFill)" />
                  <polyline
                    points="${polyPoints}"
                    fill="none"
                    stroke="#A855F7"
                    stroke-width="2.2"
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

/**
 * 3D Illuminated Analytics Monolith Columns in Three.js
 */
export function buildAnalytics3DGroup(THREE) {
  const group = new THREE.Group();
  group.name = "Analytics3DGroup";

  const heights = [0.9, 1.35, 1.65, 2.05, 2.55, 2.95, 3.45];
  const bars = [];
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x11111a,
    roughness: 0.3,
    metalness: 0.72
  });
  const topMat = new THREE.MeshStandardMaterial({
    color: 0x7c3aed,
    emissive: 0xa855f7,
    emissiveIntensity: 0.72,
    roughness: 0.2
  });

  const curvePts = [];
  heights.forEach((h, i) => {
    const x = -2.4 + i * 0.8;
    const barGroup = new THREE.Group();
    const box = new THREE.BoxGeometry(0.42, h, 0.42);
    const mesh = new THREE.Mesh(box, i >= 4 ? topMat : baseMat);
    mesh.position.y = h / 2;
    const wire = new THREE.LineSegments(
      new THREE.EdgesGeometry(box),
      new THREE.LineBasicMaterial({ color: i >= 4 ? 0xf5f5f7 : 0x7c3aed, transparent: true, opacity: 0.5 })
    );
    wire.position.y = h / 2;
    barGroup.add(mesh, wire);
    barGroup.position.set(x, -1.6, 0);
    barGroup.userData = { targetScaleY: 1, index: i };
    bars.push(barGroup);
    group.add(barGroup);
    curvePts.push(new THREE.Vector3(x, h - 1.45, 0.28));
  });

  const trajCurve = new THREE.CatmullRomCurve3(curvePts);
  const trajLine = new THREE.Mesh(
    new THREE.TubeGeometry(trajCurve, 48, 0.035, 8, false),
    new THREE.MeshBasicMaterial({ color: 0xf5f5f7 })
  );
  group.add(trajLine);

  return { group, bars, trajLine };
}

export function updateAnalytics3D(rig, { localProgress, weight, elapsed, pointerX, pointerY }) {
  if (!rig) return;
  const { group, bars, trajLine } = rig;
  group.visible = weight > 0.015;
  if (!group.visible) return;

  group.position.set(1.65 + pointerX * 0.25, -0.35 - pointerY * 0.1, -0.6);
  group.rotation.y = -0.38 + localProgress * 0.28 + pointerX * 0.14;
  group.scale.setScalar(0.84 + weight * 0.16);

  const rise = Math.min(1, weight * 1.35);
  bars.forEach((b, i) => {
    const delayed = Math.max(0.08, Math.min(1, rise * 1.25 - i * 0.06));
    b.scale.y = delayed;
    b.position.y = -1.6 + Math.sin(elapsed * 1.1 + i * 0.4) * 0.03;
  });
  trajLine.scale.y = rise;
}
