import { renderNavigation, renderScrollProgress, bindNavigationEvents } from "./scenes/Navigation.js";
import { renderMarketOSLogoSceneHtml } from "./scenes/MarketOSLogoScene.js";
import { renderCommandCenterSceneHtml, bindCommandCenterEvents } from "./scenes/CommandCenterScene.js";
import { renderCytonSceneHtml, bindCytonSceneEvents } from "./scenes/CytonScene.js";
import { renderAutomationSceneHtml, bindAutomationSceneEvents } from "./scenes/AutomationScene.js";
import { renderAnalyticsSceneHtml } from "./scenes/AnalyticsScene.js";
import { renderPricingSectionHtml, bindPricingEvents } from "./scenes/PricingSection.js";
import { renderFooterSectionHtml, bindFooterEvents } from "./scenes/Footer.js";
import { mountRevealAnimations } from "./scenes/Reveal.js";
import { mountEditorialScrollController } from "./scenes/ThreeDHero.js";

let activeLandingCleanup = null;

export function cleanupLandingExperience() {
  if (typeof activeLandingCleanup === "function") {
    try {
      activeLandingCleanup();
    } catch {
      // Ignore cleanup errors on already-removed nodes
    }
    activeLandingCleanup = null;
  }
}

export function renderLandingPage(
  root,
  {
    isAuthenticated = false,
    activeTierId = "",
    billingStatusText = "",
    onOpenAuth,
    onOpenDashboard,
    onExploreSection
  }
) {
  cleanupLandingExperience();

  root.innerHTML = `
    <div class="mos-page" id="mos-page">
      ${renderNavigation({ isAuthenticated })}
      ${renderScrollProgress()}

      <main class="mos-story-main">
        ${renderMarketOSLogoSceneHtml(isAuthenticated)}
        ${renderCommandCenterSceneHtml(isAuthenticated)}
        ${renderCytonSceneHtml(isAuthenticated)}
        ${renderAutomationSceneHtml()}
        ${renderAnalyticsSceneHtml()}
        ${renderPricingSectionHtml({ isAuthenticated, activeTierId, billingStatusText })}
        ${renderFooterSectionHtml(isAuthenticated)}
      </main>
    </div>
  `;

  const scrollToSection = (id) => {
    const drawer = document.getElementById("mos-mobile-drawer");
    const menuBtn = document.getElementById("mos-mobile-toggle");
    if (drawer) drawer.classList.remove("open");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  bindNavigationEvents(root, { isAuthenticated, onOpenAuth, onOpenDashboard, scrollToSection });
  bindCommandCenterEvents(root, { isAuthenticated, onOpenAuth, onOpenDashboard });
  const cytonCtrl = bindCytonSceneEvents(root, { isAuthenticated, onOpenAuth, onOpenDashboard });
  const autoCtrl = bindAutomationSceneEvents(root);
  bindPricingEvents(root, { isAuthenticated, onOpenAuth, onExploreSection });
  bindFooterEvents(root, { isAuthenticated, onOpenAuth, onOpenDashboard, scrollToSection });

  document.getElementById("mos-hero-explore")?.addEventListener("click", () => scrollToSection("scene-command"));
  document.getElementById("mos-intro-scroll-btn")?.addEventListener("click", () => scrollToSection("scene-command"));
  document.getElementById("mos-hero-start")?.addEventListener("click", () => {
    if (isAuthenticated) onOpenDashboard("overview");
    else onOpenAuth("signup");
  });

  const pageEl = document.getElementById("mos-page");

  const unmountReveals = mountRevealAnimations(root, { pageEl });

  const unmountScroll = mountEditorialScrollController({
    pageEl,
    onSceneProgress: (st) => {
      if (st.activeIndex === 2) {
        cytonCtrl.setStepByScroll(st.localProgress);
      } else if (st.activeIndex === 3) {
        autoCtrl.setStageByScroll(st.localProgress);
      }
    }
  });

  activeLandingCleanup = () => {
    unmountReveals();
    unmountScroll();
    cytonCtrl.cleanup();
  };

  return activeLandingCleanup;
}

// Backwards-compatible alias for any callers importing renderLuxuryLandingPage
export const renderLuxuryLandingPage = renderLandingPage;
