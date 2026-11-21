import { buildMarketOSHero3DGroup, updateMarketOSHero3D } from "./MarketOSLogoScene.js";
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

export function computeSceneProgressState() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { globalProgress: 0, activeIndex: 0, localProgress: 0 };
  }

  const scrollY = window.scrollY || window.pageYOffset || 0;
  const docEl = document.documentElement || { scrollHeight: 4000 };
  const vh = window.innerHeight || 800;
  const maxScroll = Math.max(1, (docEl.scrollHeight || 4000) - vh);
  const globalProgress = Math.max(0, Math.min(1, scrollY / maxScroll));

  const els = STORYBOARD_SCENES.map((s) => document.getElementById(s.id));
  const probeY = scrollY + vh * 0.42;

  let activeIndex = 0;
  let localProgress = 0;

  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    if (!el) continue;
    const top = el.offsetTop || 0;
    const height = Math.max(1, el.offsetHeight || 1);
    if (probeY >= top) {
      activeIndex = i;
      localProgress = Math.max(0, Math.min(1, (probeY - top) / height));
    }
  }

  return { globalProgress, activeIndex, localProgress };
}

function start2DOrbitalFallback(canvas, onSceneChange) {
  if (!canvas) return () => {};
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};

  const reduced = prefersReducedMotion();
  const isMobile = (window.innerWidth || 1200) < 768;
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

    if (state.activeIndex <= 3) {
      const cx = w * 0.5;
      const cy = h * 0.44;
      const rBase = Math.min(w, h) * (isMobile ? 0.28 : 0.25);
      const t = reduced ? 0 : time * 0.0005 + state.globalProgress * 3;

      ctx.strokeStyle = "rgba(168, 85, 247, 0.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rBase, rBase * 0.45, 0.25, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < 5; i++) {
        const a = t + (i * Math.PI * 2) / 5;
        const nx = cx + Math.cos(a) * rBase;
        const ny = cy + Math.sin(a) * rBase * 0.45;
        ctx.fillStyle = i % 2 === 0 ? "#A855F7" : "#F5F5F7";
        ctx.beginPath();
        ctx.arc(nx, ny, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (!reduced && state.activeIndex <= 3 && !document.hidden) {
      rafId = requestAnimationFrame(renderFrame);
    }
  };

  const onScroll = () => {
    const st = computeSceneProgressState();
    onSceneChange(st);
    if (reduced || !rafId) renderFrame(performance.now());
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
 * Mounts the synchronized Three.js 3D AI Marketplace Core + Orbiting Nodes,
 * GSAP ScrollTrigger transitions, and mouse-following depth parallax.
 */
export function mountThreeDHeroStage({
  pageEl,
  canvasHostEl,
  onSceneProgress
} = {}) {
  if (typeof window === "undefined") {
    return () => {};
  }

  let disposed = false;
  const cleanupFns = [];
  const reduced = prefersReducedMotion();

  const updateProgressUi = (state) => {
    const bar = document.getElementById("mos-top-progress-bar");
    if (bar?.style) {
      bar.style.transform = `scaleX(${Math.max(0.02, state.globalProgress)})`;
    }
    const navEl = document.getElementById("mos-nav");
    if (navEl?.classList) {
      navEl.classList.toggle("scrolled", (window.scrollY || 0) > 24);
    }
    document.querySelectorAll("[data-scene-dot]").forEach((dot, idx) => {
      dot.classList?.toggle?.("active", idx === state.activeIndex);
    });
    if (typeof onSceneProgress === "function") {
      onSceneProgress(state);
    }
  };

  // Immediate passive scroll binding
  const onScrollSync = () => updateProgressUi(computeSceneProgressState());
  window.addEventListener("scroll", onScrollSync, { passive: true });
  cleanupFns.push(() => window.removeEventListener("scroll", onScrollSync));
  updateProgressUi(computeSceneProgressState());

  // Mouse-following parallax for floating capability labels & subtle CSS 3D depth cards
  if (!reduced && (window.innerWidth || 0) >= 900) {
    const onFloatParallax = (e) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      document.querySelectorAll("[data-parallax-depth]").forEach((el) => {
        const depth = Number(el.getAttribute("data-parallax-depth") || 0.25);
        el.style.transform = `translate3d(${nx * 28 * depth}px, ${ny * 22 * depth}px, 0)`;
      });
    };
    window.addEventListener("pointermove", onFloatParallax, { passive: true });
    cleanupFns.push(() => window.removeEventListener("pointermove", onFloatParallax));
  }

  if (reduced || !supportsWebGL() || !canvasHostEl) {
    pageEl?.classList?.add?.("mos-fallback-mode");
    if (canvasHostEl) {
      const c2d = document.createElement("canvas");
      c2d.className = "mos-3d-canvas";
      canvasHostEl.appendChild?.(c2d);
      cleanupFns.push(start2DOrbitalFallback(c2d, updateProgressUi));
    }
    return () => {
      disposed = true;
      cleanupFns.forEach((fn) => fn());
    };
  }

  (async () => {
    try {
      const [THREE, gsapMod, stMod] = await Promise.all([
        import("https://cdn.jsdelivr.net/npm/three@0.170.0/+esm"),
        import("https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm"),
        import("https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger/+esm")
      ]);

      if (disposed) return;

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
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.35 : 1.85));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.domElement.className = "mos-3d-canvas";
      canvasHostEl.innerHTML = "";
      canvasHostEl.appendChild(renderer.domElement);
      pageEl?.classList.add("mos-webgl-ready");

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x050505, 0.045);

      const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 70);
      camera.position.set(0, 0.22, isMobile ? 9.4 : 7.6);

      const ambientLight = new THREE.AmbientLight(0xd8d6ec, 0.85);
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
      keyLight.position.set(4, 6, 6);
      const violetRim = new THREE.PointLight(0x7c3aed, 4.2, 22);
      violetRim.position.set(-4.5, 2.2, 3.2);
      const silverRim = new THREE.PointLight(0xf5f5f7, 2.2, 16);
      silverRim.position.set(4.5, -2.0, 2.5);
      scene.add(ambientLight, keyLight, violetRim, silverRim);

      // Subtle atmospheric depth particles scaled for mobile vs desktop
      const pCount = isMobile ? 45 : 120;
      const pPos = new Float32Array(pCount * 3);
      for (let i = 0; i < pCount; i++) {
        pPos[i * 3] = (Math.random() - 0.5) * 24;
        pPos[i * 3 + 1] = (Math.random() - 0.5) * 16;
        pPos[i * 3 + 2] = (Math.random() - 0.5) * 18 - 3;
      }
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
      const particles = new THREE.Points(
        pGeo,
        new THREE.PointsMaterial({ color: 0xa855f7, size: isMobile ? 0.055 : 0.045, transparent: true, opacity: 0.36 })
      );
      scene.add(particles);

      const heroRig = buildMarketOSHero3DGroup(THREE);
      scene.add(heroRig.group);

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

      const triggers = [];
      if (ScrollTrigger) {
        const productStage = document.getElementById("mos-cmd-perspective-stage");
        const cmdSection = document.getElementById("scene-command");
        if (productStage && cmdSection) {
          const t = gsap.fromTo(
            productStage,
            { rotateX: 8, y: 24, scale: 0.975, transformPerspective: 1400 },
            {
              rotateX: 0,
              y: 0,
              scale: 1,
              ease: "power2.out",
              scrollTrigger: { trigger: cmdSection, start: "top 82%", end: "center 55%", scrub: 0.6 }
            }
          );
          if (t?.scrollTrigger) triggers.push(t.scrollTrigger);
        }

        triggers.push(
          ScrollTrigger.create({
            trigger: pageEl || document.body,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
            onUpdate: () => updateProgressUi(computeSceneProgressState())
          })
        );
      }

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

        // Keep WebGL crisp behind hero/marketplace/PAYG, soften dramatically behind pricing tables
        const opacity = st.activeIndex === 0 ? 1 : st.activeIndex === 1 ? 0.52 : st.activeIndex <= 3 ? 0.24 : 0.1;
        renderer.domElement.style.opacity = String(opacity);

        if (st.activeIndex <= 4) {
          const camX = st.activeIndex === 1 ? -0.55 : st.activeIndex === 2 ? 0.45 : 0;
          const camZ = (isMobile ? 9.4 : 7.6) + st.globalProgress * 1.4;
          camera.position.x += (camX + pointerX * 0.25 - camera.position.x) * 0.05;
          camera.position.y += (0.2 - pointerY * 0.18 - camera.position.y) * 0.05;
          camera.position.z += (camZ - camera.position.z) * 0.05;
          camera.lookAt(0, 0, 0);

          const heroWeight = st.activeIndex === 0 ? 1 : st.activeIndex === 1 ? Math.max(0.2, 1 - st.localProgress) : 0.18;
          particles.rotation.y = elapsed * 0.02 + st.globalProgress * 0.45;
          updateMarketOSHero3D(heroRig, {
            scrollProgress: st.globalProgress,
            localProgress: st.activeIndex === 0 ? st.localProgress : 1,
            weight: heroWeight,
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
        document.removeEventListener("visibilitychange", onVisibility);
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
      if (disposed) return;
      pageEl?.classList?.add?.("mos-fallback-mode");
      const c2d = document.createElement("canvas");
      c2d.className = "mos-3d-canvas";
      canvasHostEl.innerHTML = "";
      canvasHostEl.appendChild?.(c2d);
      cleanupFns.push(start2DOrbitalFallback(c2d, updateProgressUi));
    }
  })();

  return () => {
    disposed = true;
    cleanupFns.forEach((fn) => fn());
  };
}

export const mountEditorialScrollController = mountThreeDHeroStage;
