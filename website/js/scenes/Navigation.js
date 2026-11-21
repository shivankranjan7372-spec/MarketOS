export const STORYBOARD_SCENES = [
  { id: "scene-intro", label: "Explore", number: "01" },
  { id: "scene-marketplace", label: "Discovery", number: "02" },
  { id: "scene-ecosystem", label: "Ecosystem", number: "03" },
  { id: "scene-command", label: "Workspace", number: "04" },
  { id: "scene-pricing", label: "Pricing", number: "05" },
  { id: "scene-trust", label: "Trust", number: "06" },
  { id: "scene-final", label: "Launch", number: "07" }
];

export function renderNavigation({ isAuthenticated = false }) {
  return `
    <header class="mos-nav mos-glass-nav" id="mos-nav">
      <div class="mos-nav-inner">
        <a href="#scene-intro" class="mos-brand" data-mos-scroll="scene-intro" aria-label="MarketOS Home">
          <img
            src="./assets/marketos-wordmark.png"
            alt="MarketOS — Plan. Create. Grow."
            class="mos-brand-img"
            width="196"
            height="46"
          />
        </a>

        <nav class="mos-nav-links" aria-label="Primary site navigation">
          <a href="#scene-intro" class="mos-nav-link" data-mos-scroll="scene-intro">Explore</a>
          <a href="#scene-marketplace" class="mos-nav-link" data-mos-scroll="scene-marketplace">Discovery</a>
          <a href="#scene-ecosystem" class="mos-nav-link" data-mos-scroll="scene-ecosystem">Ecosystem</a>
          <a href="#scene-command" class="mos-nav-link" data-mos-scroll="scene-command">Workspace</a>
          <a href="#scene-pricing" class="mos-nav-link" data-mos-scroll="scene-pricing">Pricing</a>
        </nav>

        <div class="mos-nav-actions">
          ${
            isAuthenticated
              ? `<button type="button" id="mos-nav-dash" class="mos-btn mos-btn-primary mos-btn-sm">Open Workspace</button>`
              : `
                <button type="button" id="mos-nav-signin" class="mos-btn mos-btn-ghost mos-btn-sm">Sign In</button>
                <button type="button" id="mos-nav-start" class="mos-btn mos-btn-liquid mos-btn-sm">Get Started</button>
              `
          }
          <button
            type="button"
            id="mos-mobile-toggle"
            class="mos-mobile-toggle"
            aria-label="Toggle navigation menu"
            aria-expanded="false"
          >
            ☰
          </button>
        </div>
      </div>

      <div class="mos-mobile-drawer" id="mos-mobile-drawer">
        <a href="#scene-intro" class="mos-drawer-link" data-mos-scroll="scene-intro">Explore</a>
        <a href="#scene-marketplace" class="mos-drawer-link" data-mos-scroll="scene-marketplace">Discovery</a>
        <a href="#scene-ecosystem" class="mos-drawer-link" data-mos-scroll="scene-ecosystem">Ecosystem</a>
        <a href="#scene-command" class="mos-drawer-link" data-mos-scroll="scene-command">Workspace</a>
        <a href="#scene-pricing" class="mos-drawer-link" data-mos-scroll="scene-pricing">Pricing</a>
        <div class="mos-drawer-actions">
          ${
            isAuthenticated
              ? `<button type="button" id="mos-mob-dash" class="mos-btn mos-btn-primary" style="width:100%;">Open Workspace</button>`
              : `
                <button type="button" id="mos-mob-signin" class="mos-btn mos-btn-outline" style="width:100%;">Sign In</button>
                <button type="button" id="mos-mob-start" class="mos-btn mos-btn-liquid" style="width:100%;">Get Started</button>
              `
          }
        </div>
      </div>
    </header>
  `;
}

export function renderScrollProgress() {
  return `
    <div class="mos-progress-rail-top" aria-hidden="true">
      <div class="mos-progress-fill-top" id="mos-top-progress-bar"></div>
    </div>
    <aside class="mos-scene-rail" aria-label="Story scene progress">
      ${STORYBOARD_SCENES.map(
        (scene, idx) => `
          <button
            type="button"
            class="mos-rail-dot ${idx === 0 ? "active" : ""}"
            data-mos-scroll="${scene.id}"
            data-scene-dot="${scene.id}"
            aria-label="Jump to ${scene.label}"
            title="${scene.number} • ${scene.label}"
          >
            <span class="mos-rail-pip"></span>
            <span class="mos-rail-label">${scene.number} ${scene.label}</span>
          </button>`
      ).join("")}
    </aside>
  `;
}

export function bindNavigationEvents(root, { isAuthenticated, onOpenAuth, onOpenDashboard, scrollToSection }) {
  root.querySelectorAll("[data-mos-scroll]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = el.getAttribute("data-mos-scroll");
      scrollToSection(targetId);
    });
  });

  const menuBtn = document.getElementById("mos-mobile-toggle");
  const drawer = document.getElementById("mos-mobile-drawer");
  menuBtn?.addEventListener("click", () => {
    const next = !drawer?.classList.contains("open");
    drawer?.classList.toggle("open", next);
    menuBtn.setAttribute("aria-expanded", String(next));
  });

  const goSignin = () => (isAuthenticated ? onOpenDashboard("overview") : onOpenAuth("signin"));
  const goStart = () => (isAuthenticated ? onOpenDashboard("overview") : onOpenAuth("signup"));

  document.getElementById("mos-nav-signin")?.addEventListener("click", goSignin);
  document.getElementById("mos-mob-signin")?.addEventListener("click", goSignin);
  document.getElementById("mos-nav-start")?.addEventListener("click", goStart);
  document.getElementById("mos-mob-start")?.addEventListener("click", goStart);
  document.getElementById("mos-nav-dash")?.addEventListener("click", () => onOpenDashboard("overview"));
  document.getElementById("mos-mob-dash")?.addEventListener("click", () => onOpenDashboard("overview"));
}
