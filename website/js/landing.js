import { hydrateLandingExchangeRates } from "./currency.js";
import { renderNavigation, renderScrollProgress, bindNavigationEvents } from "./scenes/Navigation.js";
import { renderMarketOSLogoSceneHtml } from "./scenes/MarketOSLogoScene.js";
import { renderMarketplaceShowcaseHtml, bindMarketplaceShowcaseEvents } from "./scenes/MarketplaceShowcaseScene.js";
import { renderPayAsYouGoSceneHtml, bindPayAsYouGoEvents } from "./scenes/PayAsYouGoScene.js";
import { renderCommandCenterSceneHtml, bindCommandCenterEvents } from "./scenes/CommandCenterScene.js";
import { renderPricingSectionHtml, bindPricingEvents } from "./scenes/PricingSection.js";
import { renderTrustSectionHtml } from "./scenes/TrustSection.js";
import { renderFooterSectionHtml, bindFooterEvents } from "./scenes/Footer.js";
import { mountRevealAnimations } from "./scenes/Reveal.js";
import { mountThreeDHeroStage } from "./scenes/ThreeDHero.js";

let activeLandingCleanup = null;

export function cleanupLandingExperience() {
  if (typeof activeLandingCleanup === "function") {
    try {
      activeLandingCleanup();
    } catch {
      // Ignore cleanup errors on removed DOM nodes
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
      <div class="mos-3d-stage" id="mos-3d-stage" aria-hidden="true"></div>

      ${renderNavigation({ isAuthenticated })}
      ${renderScrollProgress()}

      <main class="mos-story-main">
        ${renderMarketOSLogoSceneHtml(isAuthenticated)}
        ${renderMarketplaceShowcaseHtml(isAuthenticated)}
        ${renderPayAsYouGoSceneHtml()}
        ${renderCommandCenterSceneHtml(isAuthenticated)}
        ${renderPricingSectionHtml({ isAuthenticated, activeTierId, billingStatusText })}
        ${renderTrustSectionHtml()}
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
  const marketCtrl = bindMarketplaceShowcaseEvents(root, { isAuthenticated, onOpenAuth, onOpenDashboard });
  const paygCtrl = bindPayAsYouGoEvents(root);
  bindCommandCenterEvents(root, { isAuthenticated, onOpenAuth, onOpenDashboard });
  const pricingCtrl = bindPricingEvents(root, {
    isAuthenticated,
    activeTierId,
    billingStatusText,
    onOpenAuth,
    onExploreSection
  });
  bindFooterEvents(root, { isAuthenticated, onOpenAuth, onOpenDashboard, scrollToSection });

  document.getElementById("mos-hero-explore")?.addEventListener("click", () => scrollToSection("scene-marketplace"));
  document.getElementById("mos-intro-scroll-btn")?.addEventListener("click", () => scrollToSection("scene-marketplace"));
  document.getElementById("mos-hero-start")?.addEventListener("click", () => {
    if (isAuthenticated) onOpenDashboard("overview");
    else onOpenAuth("signup");
  });

  const pageEl = document.getElementById("mos-page");
  const stageEl = document.getElementById("mos-3d-stage");

  const unmountReveals = mountRevealAnimations(root, { pageEl });
  const unmount3d = mountThreeDHeroStage({
    pageEl,
    canvasHostEl: stageEl,
    onSceneProgress: (st) => {
      if (st.activeIndex === 2) {
        paygCtrl.setStepByScroll(st.localProgress);
      }
    }
  });

  // Hydrate live Open Exchange Rates without blocking initial paint
  hydrateLandingExchangeRates();

  activeLandingCleanup = () => {
    unmountReveals();
    unmount3d();
    marketCtrl.cleanup();
    paygCtrl.cleanup();
    pricingCtrl.cleanup();
  };

  return activeLandingCleanup;
}

export const renderLuxuryLandingPage = renderLandingPage;
