import { AI_MODULES, CYTON_CATEGORIES, SUBSCRIPTION_TIERS } from "./catalog.js";

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const STUDIO_SHOWCASE = [
  {
    id: "CAMPAIGN_PLANNER",
    tag: "Strategy",
    title: AI_MODULES.CAMPAIGN_PLANNER.displayName,
    desc: "Architect launch timelines, budget allocations across your workspace currency, and channel mixes without generic templates."
  },
  {
    id: "SOCIAL_MEDIA",
    tag: "Distribution",
    title: AI_MODULES.SOCIAL_MEDIA.displayName,
    desc: "Craft platform-tailored captions, hashtags, and reel briefs across Instagram, LinkedIn, X, Facebook, and YouTube."
  },
  {
    id: "SEO_STUDIO",
    tag: "Search",
    title: AI_MODULES.SEO_STUDIO.displayName,
    desc: "Inspect live website HTML titles, H1 tags, and meta descriptions alongside localized keyword recommendations."
  },
  {
    id: "EMAIL_STUDIO",
    tag: "Outreach",
    title: AI_MODULES.EMAIL_STUDIO.displayName,
    desc: "Compose client proposals, executive follow-ups, and multi-stage newsletters with explicit send confirmation."
  },
  {
    id: "BRAND_STUDIO",
    tag: "Identity",
    title: AI_MODULES.BRAND_STUDIO.displayName,
    desc: "Store persistent brand voice, audience profiles, and creative guidelines referenced automatically across every workflow."
  },
  {
    id: "ADS_STUDIO",
    tag: "Performance",
    title: AI_MODULES.ADS_STUDIO.displayName,
    desc: "Draft high-contrast ad angles and campaign concepts safeguarded inside human owner approval queues."
  }
];

export function renderLuxuryLandingPage(root, { isAuthenticated = false, onOpenAuth, onOpenDashboard, onExploreSection }) {
  const tiers = Object.values(SUBSCRIPTION_TIERS);

  root.innerHTML = `
    <div class="lux-page">
      <!-- Sticky Cinematic Luxury Navigation -->
      <header class="lux-nav" id="lux-nav">
        <div class="lux-nav-inner">
          <a href="#top" class="lux-brand" aria-label="MarketOS Home">
            <img src="./assets/marketos-wordmark.png" alt="MarketOS — Plan. Create. Grow." class="lux-brand-img" />
          </a>

          <nav class="lux-links" aria-label="Primary landing navigation">
            <a href="#platform" class="lux-nav-link" data-scroll-target="platform">Platform</a>
            <a href="#solutions" class="lux-nav-link" data-scroll-target="solutions">Solutions</a>
            <a href="#pricing" class="lux-nav-link" data-scroll-target="pricing">Pricing</a>
            <a href="#about" class="lux-nav-link" data-scroll-target="about">About</a>
          </nav>

          <div class="lux-nav-actions">
            ${
              isAuthenticated
                ? `<button type="button" id="lux-dash-btn" class="lux-btn lux-btn-primary lux-btn-sm">Open Workspace</button>`
                : `
                  <button type="button" id="lux-signin-btn" class="lux-btn lux-btn-ghost lux-btn-sm">Sign In</button>
                  <button type="button" id="lux-getstarted-nav" class="lux-btn lux-btn-primary lux-btn-sm">Get Started</button>
                `
            }
            <button type="button" id="lux-mobile-menu-btn" class="lux-mobile-toggle" aria-label="Open menu" aria-expanded="false">☰</button>
          </div>
        </div>

        <div class="lux-mobile-drawer" id="lux-mobile-drawer">
          <a href="#platform" class="lux-drawer-link" data-scroll-target="platform">Platform</a>
          <a href="#solutions" class="lux-drawer-link" data-scroll-target="solutions">Solutions</a>
          <a href="#pricing" class="lux-drawer-link" data-scroll-target="pricing">Pricing</a>
          <a href="#about" class="lux-drawer-link" data-scroll-target="about">About</a>
          <div class="lux-drawer-actions">
            ${
              isAuthenticated
                ? `<button type="button" id="lux-dash-btn-mob" class="lux-btn lux-btn-primary" style="width:100%;">Open Workspace</button>`
                : `
                  <button type="button" id="lux-signin-btn-mob" class="lux-btn lux-btn-outline" style="width:100%;">Sign In</button>
                  <button type="button" id="lux-getstarted-mob" class="lux-btn lux-btn-primary" style="width:100%;">Get Started</button>
                `
            }
          </div>
        </div>
      </header>

      <!-- HERO SECTION WITH YACHT PHOTOGRAPH -->
      <section class="lux-hero" id="top">
        <div class="lux-hero-media" id="lux-hero-media" aria-hidden="true">
          <img
            src="./assets/hero-yacht.jpg"
            alt="Luxury superyacht moored at sunlit marina representing MarketOS precision and ambition"
            class="lux-hero-img"
            fetchpriority="high"
            decoding="async"
          />
          <div class="lux-hero-overlay"></div>
          <div class="lux-hero-vignette"></div>
        </div>

        <div class="lux-hero-content">
          <span class="lux-eyebrow">THE FUTURE OF BUSINESS</span>
          <h1 class="lux-hero-title">
            Think Beyond Limits.<br />
            <span>Build Beyond Expectations.</span>
          </h1>
          <p class="lux-hero-desc">One intelligent ecosystem. Endless possibilities.</p>

          <div class="lux-hero-ctas">
            <button type="button" id="lux-explore-btn" class="lux-btn lux-btn-primary">Explore MarketOS</button>
            <button type="button" id="lux-getstarted-hero" class="lux-btn lux-btn-glass">
              ${isAuthenticated ? "Enter Command Centre" : "Get Started"}
            </button>
          </div>
        </div>

        <button type="button" id="lux-scroll-cue" class="lux-scroll-cue" aria-label="Scroll to explore">
          <span>SCROLL TO EXPLORE ↓</span>
        </button>
      </section>

      <!-- 1. THE MARKETOS ECOSYSTEM -->
      <section class="lux-section lux-reveal" id="platform">
        <div class="lux-container">
          <div class="lux-section-head">
            <span class="lux-kicker">01 • THE MARKETOS ECOSYSTEM</span>
            <h2>Precision infrastructure for global operators.</h2>
            <p class="lux-lead">
              MarketOS unifies brand strategy, regional market adaptation, creative execution, approval governance, and multi-currency tracking inside a single disciplined operating system.
            </p>
          </div>

          <div class="lux-bento-grid">
            <article class="lux-glass-card lux-bento-wide">
              <span class="lux-pill">Multi-Region Core</span>
              <h3>Built for international commerce</h3>
              <p>Separate billing and display currencies with dynamic FX conversion, timezone-aware scheduling, and regional formatting across global markets.</p>
            </article>
            <article class="lux-glass-card">
              <span class="lux-pill">Approval Gates</span>
              <h3>Owner control by design</h3>
              <p>Drafts, emails, and campaigns never dispatch automatically—every external publish or send action requires explicit owner authorization.</p>
            </article>
            <article class="lux-glass-card">
              <span class="lux-pill">Unified Memory</span>
              <h3>Persistent workspace context</h3>
              <p>Brand voice, audience profiles, projects, and operating instructions stay synchronized between web and Android via Cloud Firestore.</p>
            </article>
          </div>
        </div>
      </section>

      <!-- 2. CYTON — MARKETOS'S INTELLIGENT AI ASSISTANT -->
      <section class="lux-section lux-section-tinted lux-reveal" id="cyton">
        <div class="lux-container">
          <div class="lux-cyton-split">
            <div class="lux-cyton-visual">
              <div class="lux-orb-frame">
                <div class="cyton-orb orb-idle" aria-hidden="true">
                  <div class="orb-ring ring-1"></div>
                  <div class="orb-ring ring-2"></div>
                  <div class="orb-nucleus">
                    <span class="cy-orb-glyph">✦</span>
                    <span class="cy-orb-word">CYTON</span>
                  </div>
                </div>
                <div class="cy-waveform active" aria-hidden="true">
                  <span class="cy-wave-bar" style="--h:14px;animation-delay:0s;"></span>
                  <span class="cy-wave-bar" style="--h:24px;animation-delay:0.12s;"></span>
                  <span class="cy-wave-bar" style="--h:18px;animation-delay:0.24s;"></span>
                  <span class="cy-wave-bar" style="--h:26px;animation-delay:0.36s;"></span>
                  <span class="cy-wave-bar" style="--h:12px;animation-delay:0.48s;"></span>
                </div>
                <div class="lux-cyton-badge-caption">CYTON • Intelligent AI Assistant by MarketOS</div>
              </div>
            </div>

            <div class="lux-cyton-copy">
              <span class="lux-kicker">02 • MEET CYTON</span>
              <h2>CYTON — MarketOS's intelligent AI assistant.</h2>
              <p class="lux-lead">
                Go beyond prompts. Inside the CYTON Command Centre, describe objectives in plain language and watch structured execution unfold across ${CYTON_CATEGORIES.length} operational disciplines.
              </p>
              <ul class="lux-feature-list">
                <li><strong>Intent & Multi-Step Planning:</strong> Classifies tasks, builds reviewable execution plans, and tracks task state in real time.</li>
                <li><strong>Exportable Deliverables:</strong> Generate Markdown briefs, HTML presentation decks, CSV sheets, and print-ready documents.</li>
                <li><strong>Voice & Multimodal Input:</strong> Dictate instructions via Web Speech where supported or upload product images and documents.</li>
              </ul>
              <div class="lux-inline-actions">
                <button type="button" class="lux-btn lux-btn-primary lux-cta-cyton">
                  ${isAuthenticated ? "Open CYTON Command Centre" : "Launch CYTON Inside MarketOS"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 3. AI STUDIO -->
      <section class="lux-section lux-reveal" id="solutions">
        <div class="lux-container">
          <div class="lux-section-head">
            <span class="lux-kicker">03 • AI STUDIO</span>
            <h2>Specialized production studios under one roof.</h2>
            <p class="lux-lead">
              Every department inside MarketOS shares your workspace brand memory—producing cohesive assets from strategy to final sign-off.
            </p>
          </div>

          <div class="lux-studio-grid">
            ${STUDIO_SHOWCASE.map(
              (st) => `
              <article class="lux-glass-card lux-studio-card">
                <span class="lux-pill">${esc(st.tag)}</span>
                <h3>${esc(st.title)}</h3>
                <p>${esc(st.desc)}</p>
              </article>`
            ).join("")}
          </div>
        </div>
      </section>

      <!-- 4. MARKET INTELLIGENCE & 5. BUSINESS AUTOMATION -->
      <section class="lux-section lux-section-tinted lux-reveal" id="intelligence">
        <div class="lux-container">
          <div class="lux-dual-grid">
            <article class="lux-glass-card lux-pillar-card">
              <span class="lux-kicker">04 • MARKET INTELLIGENCE</span>
              <h3>Verified research, zero guesswork.</h3>
              <p>
                Inspect live competitor and brand URLs through MarketOS's SSRF-protected server analyzer, compare actual campaign spend against baseline estimates, and track performance metrics cleanly labeled between verified data and forecasts.
              </p>
              <div class="lux-spec-list">
                <div><span>HTML & SEO Inspection</span><strong>Live Server Fetch</strong></div>
                <div><span>Currency Engine</span><strong>Multi-Currency FX</strong></div>
                <div><span>Metrics Integrity</span><strong>Actual vs Estimate</strong></div>
              </div>
            </article>

            <article class="lux-glass-card lux-pillar-card" id="automation">
              <span class="lux-kicker">05 • BUSINESS AUTOMATION</span>
              <h3>Disciplined orchestration with human authority.</h3>
              <p>
                Queue multi-step workflows, enforce explicit confirmation before outbound emails or social posts, monitor full execution audit logs, and pause automated pipelines instantaneously whenever required.
              </p>
              <div class="lux-spec-list">
                <div><span>Integrations</span><strong>Official OAuth Ready</strong></div>
                <div><span>Safety Policy</span><strong>Owner Approval Gates</strong></div>
                <div><span>Model Gateway</span><strong>Gemini • OpenAI • Claude</strong></div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <!-- 6. PRICING AND SUBSCRIPTION PLANS -->
      <section class="lux-section lux-reveal" id="pricing">
        <div class="lux-container">
          <div class="lux-section-head">
            <span class="lux-kicker">06 • PRICING & PLANS</span>
            <h2>Transparent tiers built to scale with your business.</h2>
            <p class="lux-lead">
              Start building immediately and adapt display currency inside your workspace. Billing checkout runs in preview mode until merchant gateways are enabled.
            </p>
          </div>

          <div class="lux-pricing-grid">
            ${tiers
              .map((tier, idx) => {
                const isFeatured = tier.id === "GROWTH";
                return `
                  <article class="lux-glass-card lux-price-card ${isFeatured ? "featured" : ""}">
                    <div class="lux-price-top">
                      <span class="lux-pill ${isFeatured ? "accent" : ""}">${esc(tier.displayName)}</span>
                      ${isFeatured ? `<span class="lux-recommended">Recommended</span>` : ""}
                    </div>
                    <div class="lux-price-amount">
                      <strong>$${esc(tier.usdMonthlyEstimate)}</strong>
                      <span>USD / month est.</span>
                    </div>
                    <p class="lux-price-summary">${esc(tier.featuresSummary)}</p>
                    <ul class="lux-price-bullets">
                      <li>${tier.monthlyAiLimit} AI generations per month</li>
                      <li>Up to ${tier.maxBusinesses} international workspace${tier.maxBusinesses > 1 ? "s" : ""}</li>
                      <li>CYTON Command Centre & Approval Hub</li>
                    </ul>
                    <button type="button" class="lux-btn ${isFeatured ? "lux-btn-primary" : "lux-btn-outline"} lux-plan-btn" data-plan="${esc(tier.id)}" style="width:100%;">
                      ${isAuthenticated ? `Select ${esc(tier.displayName)}` : `Start with ${esc(tier.displayName)}`}
                    </button>
                  </article>`;
              })
              .join("")}
          </div>
        </div>
      </section>

      <!-- 7. FINAL GET STARTED CTA & ABOUT -->
      <section class="lux-section lux-final-cta lux-reveal" id="about">
        <div class="lux-container lux-final-box">
          <img src="./assets/marketos-wordmark.png" alt="MarketOS" class="lux-final-logo" />
          <span class="lux-kicker">ABOUT MARKETOS</span>
          <h2>Command your business from one intelligent horizon.</h2>
          <p class="lux-lead" style="margin-inline:auto;">
            Engineered as an end-to-end AI Business Operating System for modern founders and operators—combining structured workflows, live market intelligence, and CYTON's guided execution.
          </p>
          <div class="lux-hero-ctas" style="justify-content:center;">
            <button type="button" id="lux-final-start" class="lux-btn lux-btn-primary">
              ${isAuthenticated ? "Return to Dashboard" : "Get Started"}
            </button>
            <button type="button" id="lux-final-signin" class="lux-btn lux-btn-outline">
              ${isAuthenticated ? "Open CYTON" : "Sign In"}
            </button>
          </div>
        </div>
      </section>

      <footer class="lux-footer">
        <div class="lux-container lux-footer-inner">
          <span class="lux-footer-copy">MarketOS — The AI Business Operating System • Plan. Create. Grow.</span>
          <div class="lux-footer-links">
            <a href="#platform" data-scroll-target="platform">Platform</a>
            <a href="#solutions" data-scroll-target="solutions">Solutions</a>
            <a href="#pricing" data-scroll-target="pricing">Pricing</a>
            <a href="#top" data-scroll-target="top">Back to top</a>
          </div>
        </div>
      </footer>
    </div>
  `;

  // Smooth scrolling for navigation and hero cues
  const scrollToSection = (id) => {
    const drawer = document.getElementById("lux-mobile-drawer");
    const menuBtn = document.getElementById("lux-mobile-menu-btn");
    if (drawer) drawer.classList.remove("open");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  root.querySelectorAll("[data-scroll-target]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      scrollToSection(el.getAttribute("data-scroll-target"));
    });
  });

  document.getElementById("lux-explore-btn")?.addEventListener("click", () => scrollToSection("platform"));
  document.getElementById("lux-scroll-cue")?.addEventListener("click", () => scrollToSection("platform"));

  // Mobile drawer toggle
  const menuBtn = document.getElementById("lux-mobile-menu-btn");
  const drawer = document.getElementById("lux-mobile-drawer");
  menuBtn?.addEventListener("click", () => {
    const next = !drawer?.classList.contains("open");
    drawer?.classList.toggle("open", next);
    menuBtn.setAttribute("aria-expanded", String(next));
  });

  // Sticky navbar elevation on scroll
  const navEl = document.getElementById("lux-nav");
  if (window._luxScrollHandler) {
    window.removeEventListener("scroll", window._luxScrollHandler);
  }
  const onScroll = () => {
    const activeNav = document.getElementById("lux-nav") || navEl;
    if (!activeNav) return;
    activeNav.classList.toggle("scrolled", window.scrollY > 36);
  };
  window._luxScrollHandler = onScroll;
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Reveal on scroll via IntersectionObserver
  const revealEls = root.querySelectorAll(".lux-reveal");
  if (typeof IntersectionObserver !== "undefined") {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    revealEls.forEach((el) => obs.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  // CTA routing into Auth / Dashboard / CYTON
  const handleSignin = () => {
    if (isAuthenticated) onOpenDashboard("overview");
    else onOpenAuth("signin");
  };
  const handleSignup = () => {
    if (isAuthenticated) onOpenDashboard("overview");
    else onOpenAuth("signup");
  };

  document.getElementById("lux-signin-btn")?.addEventListener("click", handleSignin);
  document.getElementById("lux-signin-btn-mob")?.addEventListener("click", handleSignin);
  document.getElementById("lux-getstarted-nav")?.addEventListener("click", handleSignup);
  document.getElementById("lux-getstarted-mob")?.addEventListener("click", handleSignup);
  document.getElementById("lux-getstarted-hero")?.addEventListener("click", () => {
    if (isAuthenticated) onOpenDashboard("cyton");
    else onOpenAuth("signup");
  });
  document.getElementById("lux-dash-btn")?.addEventListener("click", () => onOpenDashboard("overview"));
  document.getElementById("lux-dash-btn-mob")?.addEventListener("click", () => onOpenDashboard("overview"));
  document.getElementById("lux-final-start")?.addEventListener("click", handleSignup);
  document.getElementById("lux-final-signin")?.addEventListener("click", () => {
    if (isAuthenticated) onOpenDashboard("cyton");
    else onOpenAuth("signin");
  });
  root.querySelectorAll(".lux-cta-cyton").forEach((b) => {
    b.addEventListener("click", () => {
      if (isAuthenticated) onOpenDashboard("cyton");
      else onOpenAuth("signup");
    });
  });
  root.querySelectorAll(".lux-plan-btn").forEach((b) => {
    b.addEventListener("click", () => {
      if (isAuthenticated) onExploreSection("settings");
      else onOpenAuth("signup");
    });
  });
}
