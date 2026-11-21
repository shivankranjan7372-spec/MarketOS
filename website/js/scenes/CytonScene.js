const CYTON_SEQUENCE_STEPS = [
  {
    step: 1,
    tag: "RECEIVE",
    title: "Command received & intent classified",
    detail: "CYTON parses product objective, loads MarketOS brand voice, target audience, and workspace currency."
  },
  {
    step: 2,
    tag: "PLAN",
    title: "Campaign plan structured",
    detail: "Builds channel rollout timeline, creative direction, and budget allocation inside your MarketOS workspace."
  },
  {
    step: 3,
    tag: "ORGANIZE",
    title: "Content & assets drafted",
    detail: "Prepares social captions, promotional email copy, and SEO recommendations saved cleanly as editable drafts."
  },
  {
    step: 4,
    tag: "PREPARE",
    title: "Workflow pipeline staged",
    detail: "Marks internal CREATE operations complete while flagging external PUBLISH and SEND actions for inspection."
  },
  {
    step: 5,
    tag: "APPROVAL GATE",
    title: "Owner reviews & approves execution",
    detail: "External messages and posts never run automatically—explicit human owner confirmation unlocks dispatch."
  }
];

export function renderCytonSceneHtml(isAuthenticated = false) {
  return `
    <section class="mos-scene mos-scene-cyton" id="scene-cyton" data-scene-index="2">
      <div class="mos-container">
        <div class="mos-cyton-grid">
          <div class="mos-cyton-copy" data-mos-reveal>
            <span class="mos-kicker">02 &bull; CYTON ASSISTANT BY MARKETOS</span>
            <h2>Meet CYTON.<br /><span class="mos-accent-span">Your intelligent marketing operator.</span></h2>
            <p class="mos-lead">
              Tell CYTON what you want to achieve. It can help plan, coordinate, and execute your marketing workflows.
            </p>

            <div class="mos-cyton-principles">
              <div class="mos-principle-row">
                <strong>Intentional execution</strong>
                <span>Classifies objectives across 15 operational workflows inside MarketOS.</span>
              </div>
              <div class="mos-principle-row">
                <strong>Approval-first governance</strong>
                <span>Sensitive outbound publishing and emails always wait for owner authorization.</span>
              </div>
            </div>

            <div class="mos-cyton-actions">
              <button type="button" id="mos-cyton-launch" class="mos-btn mos-btn-primary">
                ${isAuthenticated ? "Open CYTON Command Centre" : "Launch CYTON Inside MarketOS"}
              </button>
              <button type="button" id="mos-cyton-replay" class="mos-btn mos-btn-outline">
                Step Through Sequence
              </button>
            </div>
          </div>

          <div class="mos-cyton-console" data-mos-reveal data-mos-reveal-delay="0.12">
            <div class="mos-console-head">
              <div>
                <span class="mos-console-label">CYTON WORKFLOW CONSOLE</span>
                <span class="mos-console-sub">Feature inside MarketOS</span>
              </div>
              <span class="mos-pill-tag" id="mos-cyton-state-pill">Step 1 / 5</span>
            </div>

            <div class="mos-prompt-bubble">
              <span class="mos-prompt-role">OWNER INSTRUCTION</span>
              <p class="mos-prompt-text">"CYTON, prepare a campaign for our new product."</p>
            </div>

            <div class="mos-sequence-list" id="mos-cyton-seq-list">
              ${CYTON_SEQUENCE_STEPS.map(
                (st, idx) => `
                  <button
                    type="button"
                    class="mos-seq-item ${idx === 0 ? "active" : ""}"
                    data-cyton-step="${idx}"
                  >
                    <div class="mos-seq-marker">0${st.step}</div>
                    <div class="mos-seq-body">
                      <div class="mos-seq-top">
                        <strong>${st.title}</strong>
                        <span class="mos-seq-tag ${st.step === 5 ? "gate" : ""}">${st.tag}</span>
                      </div>
                      <p>${st.detail}</p>
                    </div>
                  </button>`
              ).join("")}
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function bindCytonSceneEvents(root, { isAuthenticated, onOpenAuth, onOpenDashboard }) {
  let activeStep = 0;
  let timerId = null;

  const setStep = (idx) => {
    activeStep = Math.max(0, Math.min(CYTON_SEQUENCE_STEPS.length - 1, idx));
    const pill = document.getElementById("mos-cyton-state-pill");
    if (pill) pill.textContent = `Step ${activeStep + 1} / ${CYTON_SEQUENCE_STEPS.length}`;
    root.querySelectorAll("[data-cyton-step]").forEach((el) => {
      const i = Number(el.getAttribute("data-cyton-step"));
      el.classList.toggle("active", i === activeStep);
      el.classList.toggle("done", i < activeStep);
    });
  };

  root.querySelectorAll("[data-cyton-step]").forEach((el) => {
    el.addEventListener("click", () => {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
      setStep(Number(el.getAttribute("data-cyton-step")));
    });
  });

  document.getElementById("mos-cyton-replay")?.addEventListener("click", () => {
    if (timerId) clearInterval(timerId);
    setStep(0);
    timerId = setInterval(() => {
      if (activeStep >= CYTON_SEQUENCE_STEPS.length - 1) {
        clearInterval(timerId);
        timerId = null;
        return;
      }
      setStep(activeStep + 1);
    }, 850);
  });

  document.getElementById("mos-cyton-launch")?.addEventListener("click", () => {
    if (isAuthenticated) onOpenDashboard("cyton");
    else onOpenAuth("signup");
  });

  return {
    setStepByScroll: (localProgress) => {
      if (timerId) return;
      const idx = Math.min(CYTON_SEQUENCE_STEPS.length - 1, Math.floor(localProgress * CYTON_SEQUENCE_STEPS.length));
      setStep(idx);
    },
    cleanup: () => {
      if (timerId) clearInterval(timerId);
    }
  };
}
