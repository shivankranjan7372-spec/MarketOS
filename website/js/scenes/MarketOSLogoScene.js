export function renderMarketOSLogoSceneHtml(isAuthenticated = false) {
  return `
    <section class="mos-scene mos-scene-intro" id="scene-intro" data-scene-index="0">
      <div class="mos-intro-inner">
        <div class="mos-intro-lockup" data-mos-reveal data-mos-reveal-y="16">
          <img
            src="./assets/brand-logo.png"
            alt="MarketOS architectural emblem"
            class="mos-intro-emblem"
            width="64"
            height="64"
          />
          <span class="mos-intro-tagline">PLAN &bull; CREATE &bull; GROW</span>
        </div>

        <h1 class="mos-hero-title mos-mask-reveal" data-mos-reveal data-mos-reveal-delay="0.06">
          Your entire marketing operation.<br />
          <span class="mos-accent-span">One intelligent system.</span>
        </h1>

        <p class="mos-hero-sub" data-mos-reveal data-mos-reveal-delay="0.12">
          Plan smarter. Create faster. Grow without the chaos.
        </p>

        <div class="mos-hero-ctas" data-mos-reveal data-mos-reveal-delay="0.18">
          <button type="button" id="mos-hero-explore" class="mos-btn mos-btn-primary">
            Explore MarketOS
          </button>
          <button type="button" id="mos-hero-start" class="mos-btn mos-btn-outline">
            ${isAuthenticated ? "Open Workspace" : "Start Building"}
          </button>
        </div>

        <div class="mos-scene-cue">
          <button type="button" id="mos-intro-scroll-btn" class="mos-scroll-cue" aria-label="Scroll to Command Center">
            <span>SCROLL TO EXPLORE</span>
            <span class="mos-cue-arrow" aria-hidden="true">&darr;</span>
          </button>
        </div>
      </div>
    </section>
  `;
}
