export function renderMarketOSLogoSceneHtml(isAuthenticated = false) {
  return `
    <section class="mos-scene mos-scene-intro" id="scene-intro" data-scene-index="0">
      <div class="mos-intro-inner">
        <div class="mos-intro-badge" data-mos-reveal>
          <span class="mos-pulse-dot" aria-hidden="true"></span>
          <span>MARKETOS &bull; PLAN &bull; CREATE &bull; GROW</span>
        </div>

        <div class="mos-fallback-emblem" id="mos-intro-emblem-fallback" aria-hidden="true">
          <img
            src="./assets/brand-logo.png"
            alt="MarketOS architectural M and growth arrow emblem"
            class="mos-emblem-img"
            width="132"
            height="132"
          />
        </div>

        <h1 class="mos-hero-title" data-mos-reveal>
          Your entire marketing operation.<br />
          <span class="mos-accent-span">One intelligent system.</span>
        </h1>

        <p class="mos-hero-sub" data-mos-reveal>
          Plan smarter. Create faster. Grow without the chaos.
        </p>

        <div class="mos-hero-ctas" data-mos-reveal>
          <button type="button" id="mos-hero-explore" class="mos-btn mos-btn-primary">
            Explore MarketOS
          </button>
          <button type="button" id="mos-hero-start" class="mos-btn mos-btn-outline">
            ${isAuthenticated ? "Open Workspace" : "Start Building"}
          </button>
        </div>

        <div class="mos-scene-cue">
          <button type="button" id="mos-intro-scroll-btn" class="mos-scroll-cue" aria-label="Scroll to Command Center">
            <span>SCROLL TO ENTER 3D JOURNEY</span>
            <span class="mos-cue-arrow" aria-hidden="true">&darr;</span>
          </button>
        </div>
      </div>
    </section>
  `;
}

/**
 * Builds the 3D sculptural MarketOS Logo group matching brand-logo.png:
 * beveled white M-peaks, ascending #7C3AED -> #A855F7 curved growth arrow,
 * and two four-point sparkles rising toward upper right.
 */
export function buildMarketOSLogo3DGroup(THREE) {
  const group = new THREE.Group();
  group.name = "MarketOSLogoGroup";

  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf5f5f7,
    roughness: 0.24,
    metalness: 0.32,
    emissive: 0x161622,
    emissiveIntensity: 0.25
  });

  const purpleMat = new THREE.MeshStandardMaterial({
    color: 0x7c3aed,
    roughness: 0.2,
    metalness: 0.45,
    emissive: 0x6d28d9,
    emissiveIntensity: 0.72
  });

  const sparkleMat = new THREE.MeshStandardMaterial({
    color: 0xf5f5f7,
    roughness: 0.15,
    metalness: 0.2,
    emissive: 0xa855f7,
    emissiveIntensity: 0.55
  });

  // Left peak of M (sharp architectural chevron matching brand-logo.png)
  const leftShape = new THREE.Shape();
  leftShape.moveTo(-2.1, -1.25);
  leftShape.lineTo(-0.82, 1.38);
  leftShape.lineTo(0.45, 0.08);
  leftShape.lineTo(-0.08, -0.45);
  leftShape.lineTo(-0.74, 0.32);
  leftShape.lineTo(-1.32, -0.96);
  leftShape.closePath();

  const extrudeOpts = {
    depth: 0.34,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.04,
    bevelThickness: 0.04
  };
  const leftGeo = new THREE.ExtrudeGeometry(leftShape, extrudeOpts);
  leftGeo.translate(0, 0, -0.17);
  const leftMesh = new THREE.Mesh(leftGeo, whiteMat);
  group.add(leftMesh);

  // Right lower wedge triangle of M
  const rightShape = new THREE.Shape();
  rightShape.moveTo(0.68, -0.78);
  rightShape.lineTo(1.78, 0.22);
  rightShape.lineTo(1.78, -1.25);
  rightShape.lineTo(1.12, -1.25);
  rightShape.closePath();

  const rightGeo = new THREE.ExtrudeGeometry(rightShape, extrudeOpts);
  rightGeo.translate(0, 0, -0.17);
  const rightMesh = new THREE.Mesh(rightGeo, whiteMat);
  group.add(rightMesh);

  // Ascending electric-violet curved growth trajectory + sculpted arrowhead
  const arrowGroup = new THREE.Group();
  arrowGroup.name = "GrowthArrowGroup";

  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-2.18, -1.36, 0.26),
    new THREE.Vector3(0.05, -0.78, 0.36),
    new THREE.Vector3(1.92, 1.12, 0.44)
  );
  const shaftGeo = new THREE.TubeGeometry(curve, 36, 0.14, 14, false);
  const shaftMesh = new THREE.Mesh(shaftGeo, purpleMat);
  arrowGroup.add(shaftMesh);

  const headShape = new THREE.Shape();
  headShape.moveTo(0, 0.56);
  headShape.lineTo(-0.36, -0.22);
  headShape.lineTo(0.36, -0.22);
  headShape.closePath();
  const headGeo = new THREE.ExtrudeGeometry(headShape, {
    depth: 0.24,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.025,
    bevelThickness: 0.025
  });
  headGeo.translate(0, 0, -0.12);
  const headMesh = new THREE.Mesh(headGeo, purpleMat);
  headMesh.position.set(1.98, 1.18, 0.44);
  headMesh.rotation.z = -0.68;
  arrowGroup.add(headMesh);

  group.add(arrowGroup);

  // Two 4-point sparkles ascending near arrow tip
  const createSparkle = (scale) => {
    const s = new THREE.Shape();
    const rOuter = 0.28 * scale;
    const rInner = 0.075 * scale;
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI) / 4;
      const rad = i % 2 === 0 ? rOuter : rInner;
      const x = Math.cos(ang) * rad;
      const y = Math.sin(ang) * rad;
      if (i === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    }
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012 });
    g.translate(0, 0, -0.04);
    return new THREE.Mesh(g, sparkleMat);
  };

  const star1 = createSparkle(1.0);
  star1.position.set(2.58, 1.74, 0.45);
  star1.name = "SparklePrimary";
  group.add(star1);

  const star2 = createSparkle(0.72);
  star2.position.set(2.94, 1.28, 0.36);
  star2.name = "SparkleSecondary";
  group.add(star2);

  // Ascent particle trail points along trajectory
  const trailCount = 48;
  const trailPositions = new Float32Array(trailCount * 3);
  for (let i = 0; i < trailCount; i++) {
    const t = i / (trailCount - 1);
    const p = curve.getPoint(t);
    const spread = 0.25 + t * 0.45;
    trailPositions[i * 3] = p.x + Math.sin(i * 1.9) * spread * 0.55;
    trailPositions[i * 3 + 1] = p.y + Math.cos(i * 1.3) * spread * 0.45;
    trailPositions[i * 3 + 2] = p.z + Math.sin(i * 2.4) * 0.35;
  }
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
  const trailMat = new THREE.PointsMaterial({
    color: 0xa855f7,
    size: 0.075,
    transparent: true,
    opacity: 0.78
  });
  const trailPoints = new THREE.Points(trailGeo, trailMat);
  trailPoints.name = "ArrowTrailParticles";
  group.add(trailPoints);

  return { group, arrowGroup, star1, star2, trailPoints, whiteMat, purpleMat };
}

export function updateMarketOSLogo3D(rig, { localProgress, weight, elapsed, pointerX, pointerY }) {
  if (!rig) return;
  const { group, arrowGroup, star1, star2, trailPoints } = rig;
  group.visible = weight > 0.015;
  if (!group.visible) return;

  const scale = 0.94 + localProgress * 0.42;
  group.scale.setScalar(scale);
  group.position.set(pointerX * 0.22, -localProgress * 0.4 + Math.sin(elapsed * 1.2) * 0.06, localProgress * 2.4);
  group.rotation.y = pointerX * 0.22 + localProgress * 0.34;
  group.rotation.x = -pointerY * 0.14 - localProgress * 0.08;

  // Arrow extends smoothly upward on scroll
  const extend = Math.min(1, localProgress * 1.25);
  arrowGroup.position.set(extend * 0.32, extend * 0.32, extend * 0.24);
  star1.position.y = 1.74 + extend * 0.42 + Math.sin(elapsed * 2.2) * 0.05;
  star2.position.y = 1.28 + extend * 0.34 + Math.cos(elapsed * 2.0) * 0.05;
  star1.rotation.z = elapsed * 0.35;
  star2.rotation.z = -elapsed * 0.4;
  trailPoints.position.set(extend * 0.22, extend * 0.24, 0);
}
