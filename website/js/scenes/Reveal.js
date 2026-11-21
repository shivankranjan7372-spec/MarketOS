/**
 * Reveal.js — Framer Motion viewport-triggered opacity & transform Reveal component
 * Matches MarketOS's cinematic storytelling choreography ([0.22, 1, 0.36, 1] easing).
 */

export const REVEAL_DEFAULTS = {
  duration: 0.78,
  y: 28,
  scale: 0.985,
  ease: [0.22, 1, 0.36, 1],
  viewportAmount: 0.14,
  once: true
};

/**
 * Factory creating the declarative React <Reveal> component backed by Framer Motion's
 * `motion.div` with `whileInView` viewport triggers and reduced-motion awareness.
 */
export function createRevealComponent(ReactLib, framerMotionLib) {
  const { motion, useReducedMotion } = framerMotionLib;

  return function Reveal({
    children,
    delay = 0,
    duration = REVEAL_DEFAULTS.duration,
    y = REVEAL_DEFAULTS.y,
    scale = REVEAL_DEFAULTS.scale,
    once = REVEAL_DEFAULTS.once,
    amount = REVEAL_DEFAULTS.viewportAmount,
    className = ""
  }) {
    const shouldReduceMotion = typeof useReducedMotion === "function" ? useReducedMotion() : false;

    const initial = shouldReduceMotion
      ? { opacity: 1, y: 0, scale: 1 }
      : { opacity: 0, y, scale };

    const whileInView = { opacity: 1, y: 0, scale: 1 };

    const transition = shouldReduceMotion
      ? { duration: 0 }
      : {
          duration,
          delay,
          ease: REVEAL_DEFAULTS.ease
        };

    return ReactLib.createElement(
      motion.div,
      {
        className: className ? `mos-reveal-node ${className}` : "mos-reveal-node",
        initial,
        whileInView,
        viewport: { once, amount },
        transition
      },
      children
    );
  };
}

/**
 * Lazy-loads Framer Motion ESM modules for browser execution while keeping zero-build Vercel deploys fast.
 */
export async function loadFramerMotionDom() {
  const mod = await import("https://cdn.jsdelivr.net/npm/framer-motion@11.15.0/+esm");
  return {
    animate: mod.animate,
    inView: mod.inView,
    motion: mod.motion,
    useReducedMotion: mod.useReducedMotion
  };
}

/**
 * Lazily constructs a ready-to-render React + Framer Motion <Reveal> component.
 */
export async function loadReactRevealComponent() {
  const [reactMod, framerMod] = await Promise.all([
    import("https://cdn.jsdelivr.net/npm/react@18.3.1/+esm"),
    loadFramerMotionDom()
  ]);
  const ReactLib = reactMod.default || reactMod;
  return createRevealComponent(ReactLib, framerMod);
}

/**
 * Mounts Framer Motion viewport-triggered opacity & transform reveals onto all
 * `[data-mos-reveal]` elements inside `root`, with IntersectionObserver fallback.
 */
export function mountRevealAnimations(root, { pageEl } = {}) {
  if (!root || typeof window === "undefined") {
    return () => {};
  }

  const revealEls = Array.from(root.querySelectorAll("[data-mos-reveal]"));
  if (revealEls.length === 0) {
    return () => {};
  }

  const reduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduced) {
    revealEls.forEach((el) => {
      el.classList.add("is-visible");
    });
    return () => {};
  }

  let disposed = false;
  const stopHandles = [];
  let fallbackObserver = null;

  const activateFallbackObserver = () => {
    if (disposed) return;
    if (typeof IntersectionObserver === "undefined") {
      revealEls.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    fallbackObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const delayAttr = Number(entry.target.getAttribute("data-mos-reveal-delay") || 0);
            if (entry.target.style) {
              entry.target.style.transitionDelay = delayAttr > 0 ? `${delayAttr}s` : "";
            }
            entry.target.classList.add("is-visible");
            fallbackObserver?.unobserve(entry.target);
          }
        });
      },
      { threshold: REVEAL_DEFAULTS.viewportAmount }
    );
    revealEls.forEach((el) => fallbackObserver.observe(el));
  };

  (async () => {
    try {
      const { animate, inView } = await loadFramerMotionDom();
      if (disposed || typeof inView !== "function" || typeof animate !== "function") {
        activateFallbackObserver();
        return;
      }

      pageEl?.classList?.add("mos-motion-ready");

      revealEls.forEach((el) => {
        const yOffset = Number(el.getAttribute("data-mos-reveal-y") ?? REVEAL_DEFAULTS.y);
        const startScale = Number(el.getAttribute("data-mos-reveal-scale") ?? REVEAL_DEFAULTS.scale);
        const delay = Number(el.getAttribute("data-mos-reveal-delay") ?? 0);
        const duration = Number(el.getAttribute("data-mos-reveal-duration") ?? REVEAL_DEFAULTS.duration);

        // Set deterministic pre-reveal initial state immediately before viewport entry
        if (el.style) {
          el.style.opacity = "0";
          el.style.transform = `translateY(${yOffset}px) scale(${startScale})`;
          el.style.willChange = "opacity, transform";
        }

        const stopInView = inView(
          el,
          () => {
            if (disposed) return;
            const controls = animate(
              el,
              {
                opacity: [0, 1],
                y: [yOffset, 0],
                scale: [startScale, 1]
              },
              {
                duration,
                delay,
                ease: REVEAL_DEFAULTS.ease
              }
            );
            el.classList.add("is-visible");
            if (controls?.then) {
              controls.then(() => {
                if (el.style) el.style.willChange = "auto";
              });
            }
          },
          { amount: REVEAL_DEFAULTS.viewportAmount }
        );

        if (typeof stopInView === "function") {
          stopHandles.push(stopInView);
        }
      });
    } catch {
      activateFallbackObserver();
    }
  })();

  return () => {
    disposed = true;
    stopHandles.forEach((stop) => {
      try {
        stop();
      } catch {
        // Ignore already-stopped observer
      }
    });
    stopHandles.length = 0;
    fallbackObserver?.disconnect();
  };
}
