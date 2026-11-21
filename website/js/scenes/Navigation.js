export const STORYBOARD_SCENES = [
  { id: "scene-intro", label: "Intro", number: "01" },
  { id: "scene-command", label: "Command", number: "02" },
  { id: "scene-cyton", label: "CYTON", number: "03" },
  { id: "scene-automation", label: "Workflow", number: "04" },
  { id: "scene-analytics", label: "Analytics", number: "05" },
  { id: "scene-pricing", label: "Pricing", number: "06" },
  { id: "scene-final", label: "Launch", number: "07" }
];

export function renderNavigation({ isAuthenticated = false }) {
  return `
    <header class="mos-nav" id="mos-nav">
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
          <a href="#scene-command" class="mos-nav-link" data-mos-scroll="scene-command">Platform</a>
          <a href="#scene-cyton" class="mos-nav-link" data-mos-scroll="scene-cyton">CYTON</a>
          <a href="#scene-automation" class="mos-nav-link" data-mos-scroll="scene-automation">Workflow</a>
          <a href="#scene-analytics" class="mos-nav-link" data-mos-scroll="scene-analytics">Analytics</a>
          <a href="#scene-pricing" class="mos-nav-link" data-mos-scroll="scene-pricing">Pricing</a>
        </nav>

        <div class="mos-nav-actions">
          ${
            isAuthenticated
              ? `<button type="button" id="mos-nav-dash" class="mos-btn mos-btn-primary mos-btn-sm">Open Workspace</button>`
              : `
                <button type="button" id="mos-nav-signin" class="mos-btn mos-btn-ghost mos-btn-sm">Sign In</button>
                <button type="button" id="mos-nav-start" class="mos-btn mos-btn-primary mos-btn-sm">Start Building</button>
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
        <a href="#scene-command" class="mos-drawer-link" data-mos-scroll="scene-command">Platform</a>
        <a href="#scene-cyton" class="mos-drawer-link" data-mos-scroll="scene-cyton">CYTON Assistant</a>
        <a href="#scene-automation" class="mos-drawer-link" data-mos-scroll="scene-automation">Automation Workflow</a>
        <a href="#scene-analytics" class="mos-drawer-link" data-mos-scroll="scene-analytics">Intelligence & Analytics</a>
        <a href="#scene-pricing" class="mos-drawer-link" data-mos-scroll="scene-pricing">Pricing</a>
        <div class="mos-drawer-actions">
          ${
            isAuthenticated
              ? `<button type="button" id="mos-mob-dash" class="mos-btn mos-btn-primary" style="width:100%;">Open Workspace</button>`
              : `
                <button type="button" id="mos-mob-signin" class="mos-btn mos-btn-outline" style="width:100%;">Sign In</button>
                <button type="button" id="mos-mob-start" class="mos-btn mos-btn-primary" style="width:100%;">Start Building</button>
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
