const HERO_CAPABILITY_NODES = [
  { label: "Image Generation", tag: "Vision & Brand Studio", pos: "pos-1" },
  { label: "Video Generation", tag: "Scripts & Storyboards", pos: "pos-2" },
  { label: "Text Intelligence", tag: "Campaigns & Research", pos: "pos-3" },
  { label: "Audio", tag: "Voice & Podcasts", pos: "pos-4" },
  { label: "Coding", tag: "Workflows & Automation", pos: "pos-5" }
];

export function renderMarketOSLogoSceneHtml(isAuthenticated = false) {
  return `
    <section class="mos-scene mos-scene-intro" id="scene-intro" data-scene-index="0">
      <div class="mos-hero-orbit-labels" aria-hidden="true" id="mos-hero-orbit-labels">
        ${HERO_CAPABILITY_NODES.map(
          (node, idx) => `
            <div class="mos-float-node ${node.pos}" data-parallax-depth="${0.18 + idx * 0.06}">
              <span class="mos-float-dot"></span>
              <div>
                <strong>${node.label}</strong>
                <span>${node.tag}</span>
              </div>
            </div>`
        ).join("")}
      </div>

      <div class="mos-intro-inner">
        <div class="mos-intro-lockup" data-mos-reveal data-mos-reveal-y="16">
          <img
            src="./assets/brand-logo.png"
            alt="MarketOS emblem"
            class="mos-intro-emblem"
            width="44"
            height="44"
          />
          <span class="mos-intro-tagline">UNIFIED AI MARKETPLACE &bull; PLAN &bull; CREATE &bull; GROW</span>
        </div>

        <h1 class="mos-hero-title" data-mos-reveal data-mos-reveal-delay="0.06">
          Every AI.<br />
          <span class="mos-metal-text">One Marketplace.</span>
        </h1>

        <p class="mos-hero-sub" data-mos-reveal data-mos-reveal-delay="0.12">
          Discover, compare and access powerful AI models and tools through one intelligent platform. Built for speed, governance, and full workspace control.
        </p>

        <div class="mos-hero-ctas" data-mos-reveal data-mos-reveal-delay="0.18">
          <button type="button" id="mos-hero-explore" class="mos-btn mos-btn-liquid">
            Explore MarketOS
          </button>
          <button type="button" id="mos-hero-start" class="mos-btn mos-btn-metal">
            ${isAuthenticated ? "Open Workspace" : "Get Started"}
          </button>
        </div>

        <div class="mos-hero-cap-pills" data-mos-reveal data-mos-reveal-delay="0.24">
          ${HERO_CAPABILITY_NODES.map(
            (n) => `<span class="mos-cap-chip">${n.label}</span>`
          ).join("")}
        </div>

        <div class="mos-scene-cue">
          <button type="button" id="mos-intro-scroll-btn" class="mos-scroll-cue" aria-label="Scroll to AI Marketplace">
            <span>SCROLL TO EXPLORE ECOSYSTEM</span>
            <span class="mos-cue-arrow" aria-hidden="true">&darr;</span>
          </button>
        </div>
      </div>
    </section>
  `;
}

/**
 * 3D MarketOS Core + Orbiting AI Model Nodes in Three.js
 */
export function buildMarketOSHero3DGroup(THREE) {
  const group = new THREE.Group();
  group.name = "MarketOSMarketplaceCore";

  // Central luminous dark metallic crystal core
  const coreGeo = new THREE.OctahedronGeometry(1.18, 1);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x12121a,
    metalness: 0.9,
    roughness: 0.18,
    emissive: 0x3b1b7a,
    emissiveIntensity: 0.55
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  const coreWire = new THREE.LineSegments(
    new THREE.EdgesGeometry(coreGeo),
    new THREE.LineBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.65 })
  );
  group.add(coreMesh, coreWire);

  // Outer dual orbital rings
  const ringGeo1 = new THREE.TorusGeometry(2.35, 0.018, 16, 96);
  const ringMat1 = new THREE.MeshBasicMaterial({ color: 0x7c3aed, transparent: true, opacity: 0.52 });
  const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
  ring1.rotation.x = Math.PI / 2.6;
  ring1.rotation.y = 0.28;

  const ringGeo2 = new THREE.TorusGeometry(2.95, 0.014, 16, 110);
  const ringMat2 = new THREE.MeshBasicMaterial({ color: 0xf5f5f7, transparent: true, opacity: 0.22 });
  const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
  ring2.rotation.x = Math.PI / 1.9;
  ring2.rotation.z = -0.35;
  group.add(ring1, ring2);

  // Orbiting AI capability / provider nodes
  const nodeDefs = [
    { radius: 2.35, speed: 0.55, offset: 0.0, color: 0xa855f7, tilt: 0.35 },
    { radius: 2.35, speed: 0.55, offset: (Math.PI * 2) / 3, color: 0xf5f5f7, tilt: 0.35 },
    { radius: 2.35, speed: 0.55, offset: (Math.PI * 4) / 3, color: 0x7c3aed, tilt: 0.35 },
    { radius: 2.95, speed: -0.38, offset: 0.9, color: 0xc084fc, tilt: -0.45 },
    { radius: 2.95, speed: -0.38, offset: 0.9 + Math.PI, color: 0x94a3b8, tilt: -0.45 }
  ];

  const nodes = nodeDefs.map((d) => {
    const nGroup = new THREE.Group();
    const orb = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.19, 1),
      new THREE.MeshStandardMaterial({
        color: d.color,
        emissive: d.color,
        emissiveIntensity: 0.45,
        metalness: 0.7,
        roughness: 0.2
      })
    );
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.27, 0.3, 32),
      new THREE.MeshBasicMaterial({ color: d.color, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
    );
    nGroup.add(orb, halo);
    nGroup.userData = d;
    group.add(nGroup);
    return nGroup;
  });

  return { group, coreMesh, coreWire, ring1, ring2, nodes };
}

export function updateMarketOSHero3D(rig, { scrollProgress, localProgress, weight, elapsed, pointerX, pointerY }) {
  if (!rig) return;
  const { group, coreMesh, coreWire, ring1, ring2, nodes } = rig;
  group.visible = weight > 0.01;
  if (!group.visible) return;

  const spread = 1 + localProgress * 0.48;
  group.position.set(pointerX * 0.32, 0.12 - pointerY * 0.22 - localProgress * 0.65, -localProgress * 1.4);
  group.rotation.y = elapsed * 0.18 + scrollProgress * 3.2 + pointerX * 0.25;
  group.scale.setScalar(Math.max(0.55, (0.94 + weight * 0.14) * (1 - localProgress * 0.15)));

  coreMesh.rotation.x = elapsed * 0.28 + localProgress * 1.1;
  coreWire.rotation.copy(coreMesh.rotation);
  ring1.rotation.z = elapsed * 0.22;
  ring2.rotation.y = -elapsed * 0.17;

  nodes.forEach((n, idx) => {
    const { radius, speed, offset, tilt } = n.userData;
    const angle = elapsed * speed + offset + scrollProgress * 2.4;
    const r = radius * spread;
    n.position.set(
      Math.cos(angle) * r,
      Math.sin(angle * 0.8 + idx) * 0.62 + tilt * Math.sin(angle),
      Math.sin(angle) * r
    );
    n.rotation.y = -angle;
  });
}
