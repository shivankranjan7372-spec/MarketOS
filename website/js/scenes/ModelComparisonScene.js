import { CYTON_MODEL_PROVIDERS } from "../catalog.js";

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resolveGatewayMode(provider) {
  if (provider.id === "custom") return "Self-Hosted BYOK";
  if (provider.id === "openrouter") return "Multi-Model Router / BYOK";
  return "Server / Client BYOK";
}

export function renderModelComparisonSceneHtml() {
  const left = CYTON_MODEL_PROVIDERS[0];
  const right = CYTON_MODEL_PROVIDERS[2] || CYTON_MODEL_PROVIDERS[1];

  return `
    <section class="mos-scene mos-scene-compare" id="scene-compare" data-scene-index="2">
      <div class="mos-container">
        <div class="mos-section-head mos-center-head" data-mos-reveal>
          <span class="mos-kicker">02 &bull; AI MODEL COMPARISON</span>
          <h2>Compare AI capabilities.<br /><span class="mos-accent-span">Choose the ideal model per task.</span></h2>
          <p class="mos-lead">
            Evaluate configured MarketOS providers side-by-side across latency profile, multimodal vision support, available model families, and gateway integration mode.
          </p>
        </div>

        <div class="mos-compare-duo-wrap" data-mos-reveal data-mos-reveal-delay="0.06">
          <div class="mos-compare-selectors">
            <div class="mos-compare-pick">
              <span class="mos-data-label">COMPARE SLOT A</span>
              <div class="mos-compare-pills" role="group" aria-label="Select first provider to compare">
                ${CYTON_MODEL_PROVIDERS.map(
                  (p) => `
                    <button
                      type="button"
                      class="mos-filter-pill ${p.id === left.id ? "active" : ""}"
                      data-compare-slot="left"
                      data-compare-provider="${esc(p.id)}"
                      aria-pressed="${p.id === left.id}"
                    >
                      ${esc(p.name)}
                    </button>`
                ).join("")}
              </div>
            </div>

            <div class="mos-compare-pick">
              <span class="mos-data-label">COMPARE SLOT B</span>
              <div class="mos-compare-pills" role="group" aria-label="Select second provider to compare">
                ${CYTON_MODEL_PROVIDERS.map(
                  (p) => `
                    <button
                      type="button"
                      class="mos-filter-pill ${p.id === right.id ? "active" : ""}"
                      data-compare-slot="right"
                      data-compare-provider="${esc(p.id)}"
                      aria-pressed="${p.id === right.id}"
                    >
                      ${esc(p.name)}
                    </button>`
                ).join("")}
              </div>
            </div>
          </div>

          <div class="mos-compare-duo-grid" id="mos-compare-duo-grid">
            ${renderSideBySideCardsHtml(left, right)}
          </div>
        </div>

        <div class="mos-glass-card mos-compare-matrix-card" data-mos-reveal data-mos-reveal-delay="0.12">
          <div class="mos-compare-matrix-head">
            <div>
              <span class="mos-data-label">PROVIDER CAPABILITY MATRIX</span>
              <h3>All Configured MarketOS Providers</h3>
            </div>
            <span class="mos-pill-tag">${CYTON_MODEL_PROVIDERS.length} Active Gateways</span>
          </div>

          <div class="mos-compare-table-wrap">
            <table class="mos-compare-table">
              <thead>
                <tr>
                  <th scope="col">Provider</th>
                  <th scope="col">Default Model</th>
                  <th scope="col">Latency</th>
                  <th scope="col">Vision</th>
                  <th scope="col">Capabilities</th>
                  <th scope="col">Gateway</th>
                </tr>
              </thead>
              <tbody>
                ${CYTON_MODEL_PROVIDERS.map(
                  (prov) => `
                    <tr>
                      <td>
                        <strong>${esc(prov.name)}</strong>
                        <span class="mos-table-sub">${esc(prov.models.join(", "))}</span>
                      </td>
                      <td><span class="mos-model-id">${esc(prov.defaultModel)}</span></td>
                      <td>${esc(prov.latencyProfile)}</td>
                      <td><span class="mos-pill-tag">${prov.supportsVision ? "Vision + Text" : "Text / Code"}</span></td>
                      <td>${esc((prov.capabilities || []).join(", "))}</td>
                      <td>${esc(resolveGatewayMode(prov))}</td>
                    </tr>`
                ).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderSideBySideCardsHtml(left, right) {
  return [left, right]
    .map(
      (prov, idx) => `
        <article class="mos-glass-card mos-compare-card" data-depth-card>
          <div class="mos-model-card-top">
            <div>
              <span class="mos-data-label">${idx === 0 ? "PROVIDER A" : "PROVIDER B"} &bull; ${esc(prov.latencyProfile)}</span>
              <h3>${esc(prov.name)}</h3>
            </div>
            <span class="mos-pill-tag">${prov.supportsVision ? "Vision + Text" : "Text / Code"}</span>
          </div>
          <p class="mos-data-copy">${esc(prov.note)}</p>
          <div class="mos-spec-table">
            <div class="mos-spec-row">
              <span>Default Model</span>
              <strong>${esc(prov.defaultModel)}</strong>
            </div>
            <div class="mos-spec-row">
              <span>Capabilities</span>
              <strong>${esc((prov.capabilities || []).join(" • "))}</strong>
            </div>
            <div class="mos-spec-row">
              <span>Gateway Mode</span>
              <strong>${esc(resolveGatewayMode(prov))}</strong>
            </div>
            <div class="mos-spec-row">
              <span>Available Models</span>
              <strong>${esc(prov.models.join(", "))}</strong>
            </div>
          </div>
        </article>`
    )
    .join("");
}

export function bindModelComparisonEvents(root) {
  let leftId = CYTON_MODEL_PROVIDERS[0].id;
  let rightId = (CYTON_MODEL_PROVIDERS[2] || CYTON_MODEL_PROVIDERS[1]).id;

  const update = () => {
    const left = CYTON_MODEL_PROVIDERS.find((p) => p.id === leftId) || CYTON_MODEL_PROVIDERS[0];
    const right = CYTON_MODEL_PROVIDERS.find((p) => p.id === rightId) || CYTON_MODEL_PROVIDERS[1];
    const grid = document.getElementById("mos-compare-duo-grid");
    if (grid) grid.innerHTML = renderSideBySideCardsHtml(left, right);

    root.querySelectorAll("[data-compare-slot]").forEach((btn) => {
      const slot = btn.getAttribute("data-compare-slot");
      const id = btn.getAttribute("data-compare-provider");
      const active = slot === "left" ? id === leftId : id === rightId;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
  };

  root.querySelectorAll("[data-compare-slot]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const slot = btn.getAttribute("data-compare-slot");
      const id = btn.getAttribute("data-compare-provider");
      if (!id) return;
      if (slot === "left") leftId = id;
      else rightId = id;
      update();
    });
  });

  return { cleanup: () => {} };
}
