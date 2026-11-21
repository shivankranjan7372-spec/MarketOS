import { STORYBOARD_SCENES } from "./Navigation.js";

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

/**
 * Editorial Scroll Choreography & Selective Product Perspective Controller.
 * Zero decorative background 3D objects, spheres, or particles.
 * Uses GSAP ScrollTrigger exclusively to present the real MarketOS product UI
 * with controlled perspective depth and drive interactive workflow scrub states.
 */
export function mountEditorialScrollController({ pageEl, onSceneProgress } = {}) {
  if (typeof window === "undefined") {
    return () => {};
  }

  let disposed = false;
  const cleanupFns = [];
  const reduced = prefersReducedMotion();

  const applyUiState = (state) => {
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

  // Smooth passive scroll listener works immediately and serves as SSR/offline fallback
  const onScroll = () => applyUiState(computeSceneProgressState());
  window.addEventListener("scroll", onScroll, { passive: true });
  cleanupFns.push(() => window.removeEventListener("scroll", onScroll));
  applyUiState(computeSceneProgressState());

  if (reduced) {
    pageEl?.classList?.add?.("mos-motion-reduced");
    return () => {
      disposed = true;
      cleanupFns.forEach((fn) => fn());
    };
  }

  // Lazily coordinate purposeful GSAP ScrollTrigger product presentation
  (async () => {
    try {
      const [gsapMod, stMod] = await Promise.all([
        import("https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm"),
        import("https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger/+esm")
      ]);

      if (disposed) return;

      const gsap = gsapMod.gsap || gsapMod.default;
      const ScrollTrigger = stMod.ScrollTrigger || stMod.default;
      if (!gsap || !ScrollTrigger) return;

      gsap.registerPlugin(ScrollTrigger);

      const triggers = [];

      // Purposeful controlled 3D perspective transition ONLY on the real MarketOS SaaS Product UI
      const productStage = document.getElementById("mos-cmd-perspective-stage");
      const cmdSection = document.getElementById("scene-command");
      if (productStage && cmdSection) {
        const tween = gsap.fromTo(
          productStage,
          { rotateX: 8, y: 24, scale: 0.975, transformPerspective: 1400 },
          {
            rotateX: 0,
            y: 0,
            scale: 1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: cmdSection,
              start: "top 82%",
              end: "center 55%",
              scrub: 0.6
            }
          }
        );
        if (tween?.scrollTrigger) triggers.push(tween.scrollTrigger);
      }

      const mainTrigger = ScrollTrigger.create({
        trigger: pageEl || document.body,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: () => applyUiState(computeSceneProgressState())
      });
      triggers.push(mainTrigger);

      cleanupFns.push(() => {
        triggers.forEach((t) => t?.kill?.());
      });
    } catch {
      // Passive scroll choreography already active cleanly
    }
  })();

  return () => {
    disposed = true;
    cleanupFns.forEach((fn) => fn());
  };
}

// Preserved symbol alias for existing landing callers
export const mountThreeDHeroStage = mountEditorialScrollController;
