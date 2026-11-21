const CYTON_SEQUENCE_STEPS = [
  {
    step: 1,
    tag: "RECEIVE",
    title: "Command received & intent classified",
    detail: "CYTON parses product objective, loads MarketOS brand voice, target audience, and regional currency."
  },
  {
    step: 2,
    tag: "PLAN",
    title: "Campaign plan structured",
    detail: "Builds channel timeline, creative angles, and campaign budget breakdown inside your workspace."
  },
  {
    step: 3,
    tag: "ORGANIZE",
    title: "Content & assets drafted",
    detail: "Produces social captions, promotional email draft, and SEO launch checklist staged cleanly as internal drafts."
  },
  {
    step: 4,
    tag: "PREPARE",
    title: "Workflow pipeline staged",
    detail: "Logs internal CREATE actions as completed while flagging outbound PUBLISH and SEND operations."
  },
  {
    step: 5,
    tag: "APPROVAL GATE",
    title: "Owner reviews & approves execution",
    detail: "Nothing sends or publishes automatically. Explicit human owner confirmation unlocks external dispatch."
  }
];

export function renderCytonSceneHtml(isAuthenticated = false) {
  return `
    <section class="mos-scene mos-scene-cyton" id="scene-cyton" data-scene-index="2">
      <div class="mos-container">
        <div class="mos-cyton-grid">
          <div class="mos-cyton-copy" data-mos-reveal>
            <span class="mos-kicker">03 &bull; INTRODUCING CYTON</span>
            <h2>Meet CYTON.<br /><span>Your intelligent marketing operator.</span></h2>
            <p class="mos-lead">
              Tell CYTON what you want to achieve. It can help plan, coordinate, and execute your marketing workflows.
            </p>

            <div class="mos-cyton-fallback-core" id="mos-cyton-fallback-visual" aria-hidden="true">
              <div class="mos-core-ring mos-core-r1"></div>
              <div class="mos-core-ring mos-core-r2"></div>
              <div class="mos-core-nucleus">CYTON</div>
            </div>

            <div class="mos-cyton-actions">
              <button type="button" id="mos-cyton-launch" class="mos-btn mos-btn-primary">
                ${isAuthenticated ? "Open CYTON Command Centre" : "Try CYTON Inside MarketOS"}
              </button>
              <button type="button" id="mos-cyton-replay" class="mos-btn mos-btn-outline">
                Replay Sequence
              </button>
            </div>
          </div>

          <div class="mos-cyton-console" data-mos-reveal>
            <div class="mos-console-head">
              <div>
                <span class="mos-console-label">CYTON OPERATOR PREVIEW</span>
                <span class="mos-console-sub">Sub-agent of MarketOS</span>
              </div>
              <span class="mos-pill-tag" id="mos-cyton-state-pill">Step 1 / 5</span>
            </div>

            <div class="mos-prompt-bubble">
              <span class="mos-prompt-role">OWNER COMMAND</span>
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
    }, 900);
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

/**
 * 3D CYTON Energy Core (gyroscopic rings, icosahedron energy sphere, data nodes)
 */
export function buildCytonCore3DGroup(THREE) {
  const group = new THREE.Group();
  group.name = "CytonCoreGroup";

  const coreGeo = new THREE.IcosahedronGeometry(0.95, 2);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x7c3aed,
    roughness: 0.18,
    metalness: 0.65,
    emissive: 0x7c3aed,
    emissiveIntensity: 0.85,
    wireframe: true
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  group.add(coreMesh);

  const innerGeo = new THREE.SphereGeometry(0.62, 24, 24);
  const innerMat = new THREE.MeshStandardMaterial({
    color: 0x1e1138,
    emissive: 0xa855f7,
    emissiveIntensity: 0.65,
    roughness: 0.25,
    metalness: 0.4
  });
  const innerSphere = new THREE.Mesh(innerGeo, innerMat);
  group.add(innerSphere);

  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xa855f7,
    emissive: 0x7c3aed,
    emissiveIntensity: 0.6,
    roughness: 0.2,
    metalness: 0.8
  });

  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.024, 12, 84), ringMat);
  ring1.rotation.x = Math.PI * 0.34;
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.82, 0.018, 12, 92), ringMat);
  ring2.rotation.y = Math.PI * 0.42;
  const ring3 = new THREE.Mesh(
    new THREE.TorusGeometry(2.15, 0.014, 12, 96),
    new THREE.MeshBasicMaterial({ color: 0xf5f5f7, transparent: true, opacity: 0.35 })
  );
  ring3.rotation.x = -Math.PI * 0.25;
  group.add(ring1, ring2, ring3);

  // Orbiting satellite data nodes
  const nodeGeo = new THREE.OctahedronGeometry(0.11, 0);
  const nodeMat = new THREE.MeshStandardMaterial({
    color: 0xf5f5f7,
    emissive: 0xa855f7,
    emissiveIntensity: 0.9
  });
  const nodes = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(nodeGeo, nodeMat);
    const angle = (i / 6) * Math.PI * 2;
    m.userData = { angle, radius: 1.9 + (i % 2) * 0.35, speed: 0.35 + (i % 3) * 0.12 };
    m.position.set(Math.cos(angle) * m.userData.radius, Math.sin(angle * 2) * 0.45, Math.sin(angle) * m.userData.radius);
    nodes.push(m);
    group.add(m);
  }

  return { group, coreMesh, innerSphere, ring1, ring2, ring3, nodes };
}

export function updateCytonCore3D(rig, { localProgress, weight, elapsed, pointerX, pointerY }) {
  if (!rig) return;
  const { group, coreMesh, ring1, ring2, ring3, nodes } = rig;
  group.visible = weight > 0.015;
  if (!group.visible) return;

  group.position.set(-1.35 + pointerX * 0.25, Math.sin(elapsed * 0.9) * 0.08 - pointerY * 0.12, -0.4 + weight * 0.6);
  group.scale.setScalar(0.8 + weight * 0.24);

  coreMesh.rotation.y = elapsed * 0.22 + localProgress * 1.4;
  coreMesh.rotation.x = elapsed * 0.12;
  ring1.rotation.z = elapsed * 0.28 + localProgress * 0.9;
  ring2.rotation.z = -elapsed * 0.22;
  ring3.rotation.y = elapsed * 0.18;

  nodes.forEach((n, idx) => {
    const a = n.userData.angle + elapsed * n.userData.speed;
    n.position.x = Math.cos(a) * n.userData.radius;
    n.position.z = Math.sin(a) * n.userData.radius;
    n.position.y = Math.sin(a * 1.5 + idx) * 0.55;
  });
}
