import { buildMarketOSLogo3DGroup, updateMarketOSLogo3D } from "./MarketOSLogoScene.js";
import { buildCommandCenter3DGroup, updateCommandCenter3D } from "./CommandCenterScene.js";
import { buildCytonCore3DGroup, updateCytonCore3D } from "./CytonScene.js";
import { buildAutomation3DGroup, updateAutomation3D } from "./AutomationScene.js";
import { buildAnalytics3DGroup, updateAnalytics3D } from "./AnalyticsScene.js";
import { STORYBOARD_SCENES } from "./Navigation.js";

function supportsWebGL() {
  if (typeof document === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return Boolean(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
}

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function computeSceneProgressState() {
  const scrollY = window.scrollY || window.pageYOffset || 0;
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const globalProgress = Math.max(0, Math.min(1, scrollY / maxScroll));

  const els = STORYBOARD_SCENES.map((s) => document.getElementById(s.id));
  const vh = window.innerHeight || 800;
  const probeY = scrollY + vh * 0.42;

  let activeIndex = 0;
  let localProgress = 0;

  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    if (!el) continue;
    const top = el.offsetTop;
    const height = Math.max(1, el.offsetHeight);
    if (probeY >= top) {
      activeIndex = i;
      localProgress = Math.max(0, Math.min(1, (probeY - top) / height));
    }
  }

  return { globalProgress, activeIndex, localProgress };
}

function startLightweight2DFallback(canvas, onSceneChange) {
  if (!canvas) return () => {};
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};

  const reduced = prefersReducedMotion();
  const isMobile = window.innerWidth < 768;
  const count = isMobile ? 28 : 56;
  const pts = Array.from({ length: count }, (_, i) => ({
    x: (i * 137.5) % 100,
    y: (i * 73.1) % 100,
    r: 0.9 + (i % 3) * 0.65,
    s: 0.08 + (i % 4) * 0.04
  }));

  let rafId = 0;
  let stopped = false;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener("resize", resize, { passive: true });

  const renderFrame = (time) => {
    if (stopped) return;
    const state = computeSceneProgressState();
    onSceneChange(state);

    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    // Subtle deep electric violet radial glow tied to scroll
    const grad = ctx.createRadialGradient(
      w * (0.52 + Math.sin(state.globalProgress * Math.PI) * 0.12),
      h * 0.42,
      20,
      w * 0.52,
      h * 0.42,
      Math.max(w, h) * 0.6
    );
    grad.addColorStop(0, "rgba(124, 58, 237, 0.16)");
    grad.addColorStop(0.45, "rgba(168, 85, 247, 0.05)");
    grad.addColorStop(1, "rgba(5, 5, 5, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "rgba(168, 85, 247, 0.42)";
    const drift = reduced ? 0 : time * 0.015;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const px = ((p.x / 100) * w + Math.sin(drift * p.s + i) * 14 + w) % w;
      const py = (((p.y / 100) * h - drift * p.s * 6) % h + h) % h;
      ctx.beginPath();
      ctx.arc(px, py, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!reduced && state.activeIndex <= 4 && !document.hidden) {
      rafId = requestAnimationFrame(renderFrame);
    }
  };

  const onScroll = () => {
    const state = computeSceneProgressState();
    onSceneChange(state);
    if (reduced || !rafId) {
      renderFrame(performance.now());
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  renderFrame(performance.now());

  return () => {
    stopped = true;
    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", resize);
    window.removeEventListener("scroll", onScroll);
  };
}

/**
 * Mounts the single coordinated 3D stage behind all landing scenes and binds GSAP ScrollTrigger.
 * Gracefully degrades to 2D canvas + CSS architecture when WebGL or reduced motion is active.
 */
export function mountThreeDHeroStage({
  pageEl,
  canvasHostEl,
  loaderBadgeEl,
  onSceneProgress
}) {
  if (!canvasHostEl || typeof window === "undefined") {
    return () => {};
  }

  let disposed = false;
  let cleanupFns = [];

  const updateProgressUi = (state) => {
    const bar = document.getElementById("mos-top-progress-bar");
    if (bar?.style) {
      bar.style.transform = `scaleX(${Math.max(0.02, state.globalProgress)})`;
    }
    const navEl = document.getElementById("mos-nav");
    if (navEl?.classList) {
      navEl.classList.toggle("scrolled", (window.scrollY || 0) > 28);
    }
    document.querySelectorAll("[data-scene-dot]").forEach((dot, idx) => {
      dot.classList.toggle("active", idx === state.activeIndex);
    });
    if (typeof onSceneProgress === "function") {
      onSceneProgress(state);
    }
  };

  // Fallback path immediately if reduced-motion or no WebGL
  const useReduced = prefersReducedMotion();
  const hasWebGL = supportsWebGL();

  if (useReduced || !hasWebGL) {
    pageEl?.classList?.add("mos-fallback-mode");
    if (loaderBadgeEl?.style) loaderBadgeEl.style.display = "none";
    const c2d = document.createElement("canvas");
    c2d.className = "mos-3d-canvas";
    canvasHostEl.appendChild?.(c2d);
    const stop2d = startLightweight2DFallback(c2d, updateProgressUi);
    cleanupFns.push(stop2d);
    return () => {
      disposed = true;
      cleanupFns.forEach((fn) => fn());
    };
  }

  // Load Three.js & GSAP ScrollTrigger lazily in parallel
  (async () => {
    try {
      const [threeMod, gsapMod, stMod] = await Promise.all([
        import("https://cdn.jsdelivr.net/npm/three@0.170.0/+esm"),
        import("https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm"),
        import("https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger/+esm")
      ]);

      if (disposed) return;

      const THREE = threeMod;
      const gsap = gsapMod.gsap || gsapMod.default;
      const ScrollTrigger = stMod.ScrollTrigger || stMod.default;
      if (gsap && ScrollTrigger) {
        gsap.registerPlugin(ScrollTrigger);
      }

      const isMobile = window.innerWidth < 820;
      const renderer = new THREE.WebGLRenderer({
        antialias: !isMobile,
        alpha: true,
        powerPreference: "high-performance"
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.4 : 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.domElement.className = "mos-3d-canvas";
      canvasHostEl.innerHTML = "";
      canvasHostEl.appendChild(renderer.domElement);

      if (loaderBadgeEl) loaderBadgeEl.style.display = "none";
      pageEl?.classList.add("mos-webgl-ready");

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x050505, 0.042);

      const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 80);
      camera.position.set(0, 0.25, isMobile ? 9.6 : 7.8);

      // Architectural black-and-violet lighting
      const ambientLight = new THREE.AmbientLight(0xd8d6ec, 0.9);
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
      keyLight.position.set(4, 6, 7);
      const violetRim = new THREE.PointLight(0x7c3aed, 4.5, 22);
      violetRim.position.set(-4.5, 2.2, 3.5);
      const brightRim = new THREE.PointLight(0xa855f7, 3.2, 18);
      brightRim.position.set(4.5, -2.0, 2.5);
      scene.add(ambientLight, keyLight, violetRim, brightRim);

      // Ambient sparse starfield (reduced on mobile for smooth frame rates)
      const pCount = isMobile ? 140 : 380;
      const pPos = new Float32Array(pCount * 3);
      for (let i = 0; i < pCount; i++) {
        pPos[i * 3] = (Math.random() - 0.5) * 26;
        pPos[i * 3 + 1] = (Math.random() - 0.5) * 18;
        pPos[i * 3 + 2] = (Math.random() - 0.5) * 22 - 4;
      }
      const particleGeo = new THREE.BufferGeometry();
      particleGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
      const particleMat = new THREE.PointsMaterial({
        color: 0xa855f7,
        size: isMobile ? 0.065 : 0.055,
        transparent: true,
        opacity: 0.48
      });
      const particles = new THREE.Points(particleGeo, particleMat);
      scene.add(particles);

      // Build scene 3D groups inside unified stage
      const logoRig = buildMarketOSLogo3DGroup(THREE);
      const cmdRig = buildCommandCenter3DGroup(THREE);
      const cytonRig = buildCytonCore3DGroup(THREE);
      const autoRig = buildAutomation3DGroup(THREE);
      const analyticsRig = buildAnalytics3DGroup(THREE);

      scene.add(logoRig.group, cmdRig.group, cytonRig.group, autoRig.group, analyticsRig.group);

      let pointerX = 0;
      let pointerY = 0;
      const onPointerMove = (e) => {
        if (isMobile) return;
        pointerX = (e.clientX / window.innerWidth - 0.5) * 2;
        pointerY = (e.clientY / window.innerHeight - 0.5) * 2;
      };
      window.addEventListener("pointermove", onPointerMove, { passive: true });

      const onResize = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener("resize", onResize, { passive: true });

      // GSAP ScrollTrigger triggers for reveals & section progress
      const triggers = [];
      if (ScrollTrigger) {
        const revealEls = pageEl.querySelectorAll("[data-mos-reveal]");
        revealEls.forEach((el) => {
          gsap.fromTo(
            el,
            { y: 26, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.72,
              ease: "power2.out",
              scrollTrigger: {
                trigger: el,
                start: "top 86%",
                once: true
              }
            }
          );
        });

        // Subtle scene parallax pinning note: keep scroll natural (no locking) while scrubbing camera
        const mainTrigger = ScrollTrigger.create({
          trigger: pageEl,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          onUpdate: () => {
            updateProgressUi(computeSceneProgressState());
          }
        });
        triggers.push(mainTrigger);
      }

      const onScrollFallback = () => updateProgressUi(computeSceneProgressState());
      window.addEventListener("scroll", onScrollFallback, { passive: true });
      updateProgressUi(computeSceneProgressState());

      const clock = new THREE.Clock();
      let rafId = 0;
      let renderActive = true;

      const onVisibility = () => {
        if (document.hidden) {
          renderActive = false;
          cancelAnimationFrame(rafId);
        } else if (!disposed) {
          renderActive = true;
          rafId = requestAnimationFrame(tick);
        }
      };
      document.addEventListener("visibilitychange", onVisibility);

      const tick = () => {
        if (disposed || !renderActive) return;
        const elapsed = clock.getElapsedTime();
        const st = computeSceneProgressState();

        // Pause WebGL render work when user reaches static pricing/footer scenes (indices 5 & 6)
        const stageVisible = st.activeIndex <= 4;
        renderer.domElement.style.opacity = st.activeIndex <= 4 ? "1" : st.activeIndex === 5 ? "0.28" : "0.14";

        if (stageVisible || st.globalProgress < 0.85) {
          // Camera gentle orbital interpolation across 5 3D scenes
          const targetCamX =
            st.activeIndex === 0
              ? 0
              : st.activeIndex === 1
                ? -0.65
                : st.activeIndex === 2
                  ? 0.45
                  : st.activeIndex === 3
                    ? 0
                    : -0.55;
          const targetCamZ = (isMobile ? 9.5 : 7.6) - st.localProgress * 0.45;

          camera.position.x += (targetCamX + pointerX * 0.28 - camera.position.x) * 0.05;
          camera.position.y += (0.15 - pointerY * 0.22 - camera.position.y) * 0.05;
          camera.position.z += (targetCamZ - camera.position.z) * 0.05;
          camera.lookAt(0, 0, 0);

          const weights = [0, 0, 0, 0, 0];
          if (st.activeIndex < 5) {
            weights[st.activeIndex] = 1 - Math.max(0, st.localProgress - 0.72) * 1.4;
            if (st.localProgress > 0.65 && st.activeIndex + 1 < 5) {
              weights[st.activeIndex + 1] = Math.min(1, (st.localProgress - 0.65) * 2.8);
            }
          }

          particles.rotation.y = elapsed * 0.025 + st.globalProgress * 0.6;
          violetRim.intensity = 4.0 + Math.sin(elapsed * 1.5) * 0.6;

          updateMarketOSLogo3D(logoRig, {
            localProgress: st.activeIndex === 0 ? st.localProgress : 1,
            weight: weights[0],
            elapsed,
            pointerX,
            pointerY
          });
          updateCommandCenter3D(cmdRig, {
            localProgress: st.activeIndex === 1 ? st.localProgress : 0,
            weight: weights[1],
            elapsed,
            pointerX,
            pointerY
          });
          updateCytonCore3D(cytonRig, {
            localProgress: st.activeIndex === 2 ? st.localProgress : 0,
            weight: weights[2],
            elapsed,
            pointerX,
            pointerY
          });
          updateAutomation3D(autoRig, {
            localProgress: st.activeIndex === 3 ? st.localProgress : 0,
            weight: weights[3],
            elapsed,
            pointerX,
            pointerY
          });
          updateAnalytics3D(analyticsRig, {
            localProgress: st.activeIndex === 4 ? st.localProgress : 0,
            weight: weights[4],
            elapsed,
            pointerX,
            pointerY
          });

          renderer.render(scene, camera);
        }

        rafId = requestAnimationFrame(tick);
      };

      rafId = requestAnimationFrame(tick);

      cleanupFns.push(() => {
        cancelAnimationFrame(rafId);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("scroll", onScrollFallback);
        document.removeEventListener("visibilitychange", onVisibility);

        if (ScrollTrigger) {
          ScrollTrigger.getAll().forEach((t) => t.kill());
        }
        triggers.forEach((t) => t?.kill?.());

        scene.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
            else obj.material.dispose();
          }
        });
        renderer.dispose();
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      });
    } catch {
      // Seamless automatic fallback if CDN or WebGL fails
      if (disposed) return;
      pageEl?.classList?.add("mos-fallback-mode");
      if (loaderBadgeEl?.style) loaderBadgeEl.style.display = "none";
      const c2d = document.createElement("canvas");
      c2d.className = "mos-3d-canvas";
      canvasHostEl.innerHTML = "";
      canvasHostEl.appendChild?.(c2d);
      const stop2d = startLightweight2DFallback(c2d, updateProgressUi);
      cleanupFns.push(stop2d);
    }
  })();

  return () => {
    disposed = true;
    cleanupFns.forEach((fn) => fn());
    cleanupFns = [];
  };
}
