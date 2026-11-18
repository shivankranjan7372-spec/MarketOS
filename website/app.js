(function () {
  const THEME_KEY = "marketos_web_theme";

  const modulePreviews = {
    campaign: {
      module: "ORCHESTRATOR -> CAMPAIGN_PLANNER",
      title: "Festive Lookbook Launch (14-Day Sprint)",
      body:
        "Objective: Drive 2.5x store visits and WhatsApp catalogue inquiries across Bengaluru & Mumbai. Sequence: Teaser Reels (Days 1-4) -> Style Drops (Days 5-10) -> Final Weekend Offer (Days 11-14).",
      channel: "Instagram • Email • Local Search",
      approved: false
    },
    social: {
      module: "ORCHESTRATOR -> SOCIAL_MEDIA",
      title: "Instagram Carousel: 3 Ways to Style Linen",
      body:
        "Hook: Breathable handloom cuts built for humid mornings and late-evening dinners. Slide 2-4 breakdown fabric weight, tailoring care, and store pickup timings.",
      channel: "Instagram • Facebook",
      approved: true
    },
    seo: {
      module: "ORCHESTRATOR -> SEO_STUDIO",
      title: "On-Page Meta & Local Schema Checklist",
      body:
        "Title tag (56 chars): Handcrafted Menswear & Linen Shirts in Indiranagar. Recommendation: Add LocalBusiness JSON-LD opening hours and compress hero assets under 120 KB.",
      channel: "Website SEO",
      approved: true
    },
    email: {
      module: "ORCHESTRATOR -> EMAIL_STUDIO",
      title: "VIP Early Access Drip (3 Emails)",
      body:
        "Subject: Your 24-hour early look at the Monsoon Linen Drop. Includes plain-text founder note, sizing quick-guide, and single primary store-booking CTA.",
      channel: "Email Marketing",
      approved: false
    },
    brand: {
      module: "ORCHESTRATOR -> BRAND_STUDIO",
      title: "Voice Profile: Confident, Warm, Zero Fluff",
      body:
        "Lexicon rules: Lead with craftsmanship and regional relevance. Avoid generic discount spam; highlight small-batch provenance and transparent pricing.",
      channel: "Shared Brand Memory",
      approved: true
    },
    ads: {
      module: "ORCHESTRATOR -> ADS_STUDIO",
      title: "Meta Local Reach Ad Draft (Approval Required)",
      body:
        "Audience: 8 km radius around flagship café & studio. Proposed daily cap: ₹600/day. Safeguard: Paused in Pending Approval until owner confirms budget and landing URL.",
      channel: "Paid Ads Draft",
      approved: false
    }
  };

  const countryPresets = {
    IN: {
      flag: "🇮🇳",
      name: "India",
      callingCode: "+91",
      currency: "INR",
      regionLabel: "State (e.g. Karnataka)",
      postalLabel: "PIN Code (560038)",
      timezone: "Asia/Kolkata (IST)",
      dateFormat: "DD/MM/YYYY"
    },
    US: {
      flag: "🇺🇸",
      name: "United States",
      callingCode: "+1",
      currency: "USD",
      regionLabel: "State (e.g. Texas)",
      postalLabel: "ZIP Code (78701)",
      timezone: "America/Chicago (CT)",
      dateFormat: "MM/DD/YYYY"
    },
    GB: {
      flag: "🇬🇧",
      name: "United Kingdom",
      callingCode: "+44",
      currency: "GBP",
      regionLabel: "County (e.g. Greater London)",
      postalLabel: "Postcode (SW1A 1AA)",
      timezone: "Europe/London (GMT)",
      dateFormat: "DD/MM/YYYY"
    },
    EU: {
      flag: "🇪🇺",
      name: "Eurozone",
      callingCode: "+49",
      currency: "EUR",
      regionLabel: "Province / State",
      postalLabel: "Postal Code (10115)",
      timezone: "Europe/Berlin (CET)",
      dateFormat: "DD.MM.YYYY"
    },
    AE: {
      flag: "🇦🇪",
      name: "United Arab Emirates",
      callingCode: "+971",
      currency: "AED",
      regionLabel: "Emirate (e.g. Dubai)",
      postalLabel: "Optional P.O. Box",
      timezone: "Asia/Dubai (GST)",
      dateFormat: "DD/MM/YYYY"
    },
    CA: {
      flag: "🇨🇦",
      name: "Canada",
      callingCode: "+1",
      currency: "CAD",
      regionLabel: "Province (e.g. Ontario)",
      postalLabel: "Postal Code (M5V 2T6)",
      timezone: "America/Toronto (ET)",
      dateFormat: "YYYY-MM-DD"
    },
    AU: {
      flag: "🇦🇺",
      name: "Australia",
      callingCode: "+61",
      currency: "AUD",
      regionLabel: "State (e.g. Victoria)",
      postalLabel: "Postcode (3000)",
      timezone: "Australia/Melbourne (AEST)",
      dateFormat: "DD/MM/YYYY"
    }
  };

  // Base monthly pricing anchored in USD, converted accurately with FX rates
  const usdPlans = {
    starter: 12,
    growth: 29,
    business: 69
  };

  let fxRates = {
    USD: 1,
    INR: 84.5,
    GBP: 0.79,
    EUR: 0.92,
    AED: 3.67,
    CAD: 1.39,
    AUD: 1.53
  };
  let fxSourceLabel = "Baseline fallback FX rates";
  let activeCurrency = "INR";
  let activeModuleKey = "campaign";
  let previewApprovedOverride = null;

  // Theme initialization
  const root = document.documentElement;
  const savedTheme = localStorage.getItem(THEME_KEY) || "dark";
  root.setAttribute("data-theme", savedTheme);

  const themeToggleBtn = document.getElementById("theme-toggle");
  const updateThemeButton = (theme) => {
    if (!themeToggleBtn) return;
    themeToggleBtn.setAttribute(
      "aria-label",
      theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
    );
    themeToggleBtn.textContent = theme === "dark" ? "☀" : "☾";
  };
  updateThemeButton(savedTheme);

  themeToggleBtn?.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem(THEME_KEY, next);
    updateThemeButton(next);
  });

  // Mobile nav toggle
  const menuBtn = document.getElementById("mobile-menu-btn");
  const mobileNav = document.getElementById("mobile-nav");
  menuBtn?.addEventListener("click", () => {
    const isOpen = mobileNav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(isOpen));
  });
  mobileNav?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mobileNav.classList.remove("open");
      menuBtn?.setAttribute("aria-expanded", "false");
    });
  });

  // Hero Orchestrator preview tabs
  const previewModuleEl = document.getElementById("preview-module");
  const previewStatusEl = document.getElementById("preview-status");
  const previewTitleEl = document.getElementById("preview-title");
  const previewBodyEl = document.getElementById("preview-body");
  const previewChannelEl = document.getElementById("preview-channel");
  const previewApproveBtn = document.getElementById("preview-approve-btn");

  function renderModulePreview() {
    const item = modulePreviews[activeModuleKey];
    if (!item) return;
    const isApproved = previewApprovedOverride !== null ? previewApprovedOverride : item.approved;

    previewModuleEl.textContent = item.module;
    previewTitleEl.textContent = item.title;
    previewBodyEl.textContent = item.body;
    previewChannelEl.textContent = item.channel;

    previewStatusEl.textContent = isApproved ? "Approved • Ready for Calendar" : "Pending Owner Approval";
    previewStatusEl.classList.toggle("approved", isApproved);
    previewApproveBtn.textContent = isApproved ? "Move Back to Review" : "Approve for Calendar";
  }

  document.querySelectorAll(".preview-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".preview-tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeModuleKey = btn.dataset.module;
      previewApprovedOverride = null;
      renderModulePreview();
    });
  });

  previewApproveBtn?.addEventListener("click", () => {
    const current =
      previewApprovedOverride !== null
        ? previewApprovedOverride
        : modulePreviews[activeModuleKey].approved;
    previewApprovedOverride = !current;
    renderModulePreview();
  });

  renderModulePreview();

  // International preset switcher
  function renderCountryPreset(code) {
    const data = countryPresets[code] || countryPresets.IN;
    document.getElementById("intl-country").textContent = `${data.flag} ${data.name} (${code})`;
    document.getElementById("intl-calling").textContent = data.callingCode;
    document.getElementById("intl-currency").textContent = data.currency;
    document.getElementById("intl-region").textContent = data.regionLabel;
    document.getElementById("intl-postal").textContent = data.postalLabel;
    document.getElementById("intl-timezone").textContent = data.timezone;
    document.getElementById("intl-date").textContent = data.dateFormat;

    const currencySelect = document.getElementById("pricing-currency");
    if (currencySelect) {
      currencySelect.value = data.currency;
      activeCurrency = data.currency;
      renderPricing();
    }
  }

  document.querySelectorAll(".country-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".country-pill").forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      renderCountryPreset(pill.dataset.country);
    });
  });

  // Multi-currency pricing formatter
  function formatCurrency(usdValue, currencyCode) {
    const rate = fxRates[currencyCode] || 1;
    const raw = usdValue * rate;
    const rounded = currencyCode === "INR" ? Math.round(raw / 10) * 10 : Math.round(raw);
    const locale = currencyCode === "INR" ? "en-IN" : "en-US";
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 0
      }).format(rounded);
    } catch {
      return `${currencyCode} ${rounded}`;
    }
  }

  function renderPricing() {
    document.getElementById("price-starter").textContent = formatCurrency(usdPlans.starter, activeCurrency);
    document.getElementById("price-growth").textContent = formatCurrency(usdPlans.growth, activeCurrency);
    document.getElementById("price-business").textContent = formatCurrency(usdPlans.business, activeCurrency);
    document.getElementById("fx-source-label").textContent =
      `Display currency: ${activeCurrency} • ${fxSourceLabel}`;
  }

  document.getElementById("pricing-currency")?.addEventListener("change", (e) => {
    activeCurrency = e.target.value;
    renderPricing();
  });

  renderCountryPreset("IN");

  // Fetch live exchange rates from open.er-api.com (with silent fallback to baseline rates)
  fetch("https://open.er-api.com/v6/latest/USD")
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data && data.result === "success" && data.rates) {
        ["INR", "GBP", "EUR", "AED", "CAD", "AUD", "USD"].forEach((code) => {
          if (typeof data.rates[code] === "number") {
            fxRates[code] = data.rates[code];
          }
        });
        const updatedDate = data.time_last_update_utc
          ? new Date(data.time_last_update_utc).toLocaleDateString()
          : "today";
        fxSourceLabel = `Live FX rates (${updatedDate})`;
        renderPricing();
      }
    })
    .catch(() => {
      renderPricing();
    });

  // Early Access Form -> Email Handoff + Copyable Summary
  const form = document.getElementById("early-access-form");
  const feedbackEl = document.getElementById("form-feedback");

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const business = document.getElementById("lead-business").value.trim();
    const email = document.getElementById("lead-email").value.trim();
    const country = document.getElementById("lead-country").value.trim();
    const category = document.getElementById("lead-category").value;
    const plan = document.getElementById("lead-plan").value;
    const goal = document.getElementById("lead-goal").value.trim();

    if (!business || !email) return;

    const subject = encodeURIComponent(`MarketOS Early Access Request — ${business}`);
    const bodyText = [
      `Business Name: ${business}`,
      `Work Email: ${email}`,
      `Country: ${country || "Not specified"}`,
      `Industry: ${category}`,
      `Preferred Plan: ${plan} (${activeCurrency})`,
      `Marketing Goal: ${goal || "General AI marketing setup"}`
    ].join("\n");

    const mailtoUrl = `mailto:marketosagency@gmail.com?subject=${subject}&body=${encodeURIComponent(bodyText)}`;
    window.location.href = mailtoUrl;

    feedbackEl.textContent =
      `Prepared an inquiry draft for ${business} to marketosagency@gmail.com. ` +
      `If your email client did not open automatically, please email us directly with your details.`;
    feedbackEl.classList.add("visible");
  });
})();
