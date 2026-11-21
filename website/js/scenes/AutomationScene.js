export const WORKFLOW_NODES = [
  { id: "idea", step: "01", title: "Idea", subtitle: "Natural-language brief or brand upload" },
  { id: "strategy", step: "02", title: "Strategy", subtitle: "Regional positioning & channel mix" },
  { id: "content", step: "03", title: "Content", subtitle: "Social, email & SEO deliverables drafted" },
  { id: "campaign", step: "04", title: "Campaign", subtitle: "Unified timelines & currency budgets" },
  { id: "approval", step: "05", title: "Approval", subtitle: "Owner review gate before dispatch" },
  { id: "publishing", step: "06", title: "Publishing", subtitle: "Authorized OAuth & calendar scheduling" },
  { id: "analytics", step: "07", title: "Analytics", subtitle: "Verified Actual vs. Estimate tracking" }
];

export function renderAutomationSceneHtml() {
  return `
    <section class="mos-scene mos-scene-automation" id="scene-automation" data-scene-index="3">
      <div class="mos-container">
        <div class="mos-section-head mos-center-head" data-mos-reveal>
          <span class="mos-kicker">04 &bull; FROM IDEA TO EXECUTION</span>
          <h2>Stop managing tools.<br /><span class="mos-accent-span">Start managing growth.</span></h2>
          <p class="mos-lead">
            Follow a single connected operating chain from raw objective to verified results—with human authority preserved at every irreversible handoff.
          </p>
        </div>

        <div class="mos-pipeline-track" id="mos-pipeline-track" data-mos-reveal data-mos-reveal-delay="0.08">
          ${WORKFLOW_NODES.map(
            (node, idx) => `
              <button
                type="button"
                class="mos-pipe-node ${idx === 0 ? "active" : ""}"
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

        <div class="mos-pipe-detail-bar" id="mos-pipe-detail" data-mos-reveal data-mos-reveal-delay="0.16">
          <div>
            <span class="mos-kicker" style="margin:0;">STAGE 01 &bull; IDEA</span>
            <h3 id="mos-pipe-title">Idea &rarr; Natural-language brief or brand upload</h3>
          </div>
          <p id="mos-pipe-copy">
            Start with a plain-language goal, URL, or creative asset inside MarketOS. Workspace brand voice and currency context attach automatically.
          </p>
        </div>
      </div>
    </section>
  `;
}

const NODE_DESCRIPTIONS = [
  "Start with a plain-language goal, URL, or creative asset inside MarketOS. Workspace brand voice and currency context attach automatically.",
  "MarketOS maps objectives to channels, target audiences, and regional calendars adapted to your country and time zone.",
  "Specialized agents craft social captions, outreach emails, creative briefs, and SEO metadata as structured editable drafts.",
  "Drafts coalesce inside a cohesive campaign plan with multi-currency budget splits and timeline milestones.",
  "Owner Approval Gate pauses every external PUBLISH or SEND request until an authorized human explicitly clicks Approve.",
  "Approved assets move into timezone-synced calendars and official OAuth integrations—never automated insecure logins.",
  "Real campaign performance logs cleanly against campaign targets with strict separation between verified Actuals and Estimates."
];

export function bindAutomationSceneEvents(root) {
  let manualLock = false;

  const setNode = (idx) => {
    const safeIdx = Math.max(0, Math.min(WORKFLOW_NODES.length - 1, idx));
    const node = WORKFLOW_NODES[safeIdx];
    const titleEl = document.getElementById("mos-pipe-title");
    const copyEl = document.getElementById("mos-pipe-copy");
    const kickerEl = document.querySelector("#mos-pipe-detail .mos-kicker");

    root.querySelectorAll("[data-pipe-idx]").forEach((btn) => {
      const i = Number(btn.getAttribute("data-pipe-idx"));
      btn.classList.toggle("active", i === safeIdx);
      btn.classList.toggle("lit", i <= safeIdx);
    });

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

/**
 * 3D Connected Spatial Node Pipeline in Three.js
 */
export function buildAutomation3DGroup(THREE) {
  const group = new THREE.Group();
  group.name = "AutomationWorkflowGroup";

  const count = WORKFLOW_NODES.length;
  const pts = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const x = -3.9 + t * 7.8;
    const y = Math.sin(t * Math.PI * 1.4) * 0.72;
    const z = Math.cos(t * Math.PI) * 0.8 - 0.5;
    pts.push(new THREE.Vector3(x, y, z));
  }

  const curve = new THREE.CatmullRomCurve3(pts);
  const tubeGeo = new THREE.TubeGeometry(curve, 72, 0.025, 8, false);
  const tubeMat = new THREE.MeshBasicMaterial({
    color: 0x7c3aed,
    transparent: true,
    opacity: 0.7
  });
  const pathTube = new THREE.Mesh(tubeGeo, tubeMat);
  group.add(pathTube);

  const nodeGeo = new THREE.OctahedronGeometry(0.24, 1);
  const nodeMeshes = pts.map((pt, idx) => {
    const mat = new THREE.MeshStandardMaterial({
      color: idx === 4 ? 0xa855f7 : 0x0a0a0f,
      emissive: 0x7c3aed,
      emissiveIntensity: idx === 4 ? 0.9 : 0.45,
      roughness: 0.22,
      metalness: 0.75
    });
    const m = new THREE.Mesh(nodeGeo, mat);
    m.position.copy(pt);
    const wire = new THREE.LineSegments(
      new THREE.EdgesGeometry(nodeGeo),
      new THREE.LineBasicMaterial({ color: 0xf5f5f7, transparent: true, opacity: 0.55 })
    );
    m.add(wire);
    group.add(m);
    return m;
  });

  // Traveling signal packet along spline
  const packet = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 14, 14),
    new THREE.MeshBasicMaterial({ color: 0xf5f5f7 })
  );
  group.add(packet);

  return { group, curve, nodeMeshes, packet };
}

export function updateAutomation3D(rig, { localProgress, weight, elapsed, pointerX, pointerY }) {
  if (!rig) return;
  const { group, curve, nodeMeshes, packet } = rig;
  group.visible = weight > 0.015;
  if (!group.visible) return;

  group.position.set(1.35 - localProgress * 2.7 + pointerX * 0.25, -0.35 - pointerY * 0.12, -0.4);
  group.rotation.y = (localProgress - 0.5) * 0.42;

  const activeThreshold = localProgress * nodeMeshes.length;
  nodeMeshes.forEach((m, idx) => {
    const lit = idx <= activeThreshold;
    const s = lit ? 1.05 + Math.sin(elapsed * 2 + idx) * 0.06 : 0.65;
    m.scale.setScalar(s);
    m.rotation.y = elapsed * 0.45 + idx * 0.3;
    m.material.emissiveIntensity = lit ? 0.92 : 0.18;
  });

  const tPacket = Math.max(0, Math.min(1, (localProgress + (elapsed * 0.12) % 1) * 0.5));
  packet.position.copy(curve.getPointAt(tPacket % 1));
}
