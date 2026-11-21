export const WORKFLOW_NODES = [
  { id: "idea", step: "01", title: "Idea", subtitle: "Natural-language brief or brand asset" },
  { id: "strategy", step: "02", title: "Strategy", subtitle: "Regional positioning & channel mix" },
  { id: "content", step: "03", title: "Content", subtitle: "Social, email & SEO deliverables drafted" },
  { id: "campaign", step: "04", title: "Campaign", subtitle: "Unified timelines & currency budgets" },
  { id: "approval", step: "05", title: "Approval", subtitle: "Owner review gate before dispatch" },
  { id: "publishing", step: "06", title: "Publishing", subtitle: "Authorized OAuth & calendar scheduling" },
  { id: "analytics", step: "07", title: "Analytics", subtitle: "Verified Actual vs. Estimate tracking" }
];

const NODE_DESCRIPTIONS = [
  "Start with a plain-language goal, URL, or creative reference inside MarketOS. Workspace brand voice and regional settings attach automatically.",
  "MarketOS maps objectives to channels, target audiences, and launch calendars adapted to your country, language, and time zone.",
  "Dedicated studios draft social captions, outreach emails, creative briefs, and SEO metadata cleanly as reviewable workspace assets.",
  "Approved drafts roll into structured campaign plans with multi-currency budget splits and timeline milestones.",
  "Owner Approval Gate pauses every external PUBLISH or SEND request until an authorized human explicitly approves execution.",
  "Confirmed schedules publish via calendar timelines or official backend OAuth credentials—never automated insecure logins.",
  "Real campaign performance logs cleanly against targets with strict separation between verified Actual Data and Estimates."
];

export function renderAutomationSceneHtml() {
  return `
    <section class="mos-scene mos-scene-automation" id="scene-automation" data-scene-index="3">
      <div class="mos-container">
        <div class="mos-section-head mos-center-head" data-mos-reveal>
          <span class="mos-kicker">03 &bull; FROM IDEA TO EXECUTION</span>
          <h2>Stop managing tools.<br /><span class="mos-accent-span">Start managing growth.</span></h2>
          <p class="mos-lead">
            Follow a connected campaign lifecycle from initial brief to verified performance—with explicit owner authority preserved before external dispatch.
          </p>
        </div>

        <div class="mos-workflow-stage" data-mos-reveal data-mos-reveal-delay="0.08">
          <div class="mos-pipeline-progress" aria-hidden="true">
            <div class="mos-pipeline-progress-fill" id="mos-pipeline-progress-fill"></div>
          </div>

          <div class="mos-pipeline-track" id="mos-pipeline-track">
            ${WORKFLOW_NODES.map(
              (node, idx) => `
                <button
                  type="button"
                  class="mos-pipe-node ${idx === 0 ? "active lit" : ""}"
                  data-pipe-idx="${idx}"
                >
                  <div class="mos-pipe-head">
                    <span class="mos-pipe-num">${node.step}</span>
                    ${node.id === "approval" ? `<span class="mos-pipe-gate">GATE</span>` : ""}
                  </div>
                  <strong>${node.title}</strong>
                  <span>${node.subtitle}</span>
                </button>`
            ).join("")}
          </div>
        </div>

        <div class="mos-pipe-detail-bar" id="mos-pipe-detail" data-mos-reveal data-mos-reveal-delay="0.16">
          <div>
            <span class="mos-kicker" style="margin:0;">STAGE 01 &bull; IDEA</span>
            <h3 id="mos-pipe-title">Idea &mdash; Natural-language brief or brand asset</h3>
          </div>
          <p id="mos-pipe-copy">${NODE_DESCRIPTIONS[0]}</p>
        </div>
      </div>
    </section>
  `;
}

export function bindAutomationSceneEvents(root) {
  let manualLock = false;

  const setNode = (idx) => {
    const safeIdx = Math.max(0, Math.min(WORKFLOW_NODES.length - 1, idx));
    const node = WORKFLOW_NODES[safeIdx];
    const titleEl = document.getElementById("mos-pipe-title");
    const copyEl = document.getElementById("mos-pipe-copy");
    const kickerEl = document.querySelector("#mos-pipe-detail .mos-kicker");
    const fillEl = document.getElementById("mos-pipeline-progress-fill");

    root.querySelectorAll("[data-pipe-idx]").forEach((btn) => {
      const i = Number(btn.getAttribute("data-pipe-idx"));
      btn.classList.toggle("active", i === safeIdx);
      btn.classList.toggle("lit", i <= safeIdx);
    });

    if (fillEl?.style) {
      const pct = ((safeIdx + 1) / WORKFLOW_NODES.length) * 100;
      fillEl.style.width = `${pct}%`;
    }
    if (kickerEl) kickerEl.textContent = `STAGE ${node.step} • ${node.title.toUpperCase()}`;
    if (titleEl) titleEl.textContent = `${node.title} — ${node.subtitle}`;
    if (copyEl) copyEl.textContent = NODE_DESCRIPTIONS[safeIdx];
  };

  root.querySelectorAll("[data-pipe-idx]").forEach((btn) => {
    btn.addEventListener("click", () => {
      manualLock = true;
      setNode(Number(btn.getAttribute("data-pipe-idx")));
    });
  });

  return {
    setStageByScroll: (localProgress) => {
      if (manualLock) return;
      const idx = Math.min(WORKFLOW_NODES.length - 1, Math.floor(localProgress * WORKFLOW_NODES.length));
      setNode(idx);
    }
  };
}
