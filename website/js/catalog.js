export const APP_SECTIONS = [
  { id: "overview", label: "Overview", icon: "dashboard", group: "Workspace" },
  { id: "ai_assistant", label: "AI Assistant", icon: "sparkles", group: "Workspace" },
  { id: "campaign_planner", label: "Campaign Planner", icon: "campaign", group: "Create" },
  { id: "social_media", label: "Social Media", icon: "share", group: "Create" },
  { id: "seo_studio", label: "SEO Studio", icon: "globe", group: "Create" },
  { id: "email_studio", label: "Email Studio", icon: "mail", group: "Create" },
  { id: "brand_studio", label: "Brand Studio", icon: "palette", group: "Create" },
  { id: "ads_studio", label: "Ads Studio", icon: "ads", group: "Create" },
  { id: "content_calendar", label: "Content Calendar", icon: "calendar", group: "Publish & Track" },
  { id: "approvals", label: "Approvals", icon: "check", group: "Publish & Track" },
  { id: "analytics", label: "Analytics", icon: "chart", group: "Publish & Track" },
  { id: "integrations", label: "Integrations", icon: "hub", group: "System" },
  { id: "settings", label: "Settings", icon: "settings", group: "System" }
];

export const SUBSCRIPTION_TIERS = {
  STARTER: {
    id: "STARTER",
    displayName: "Starter",
    monthlyAiLimit: 25,
    maxBusinesses: 1,
    usdMonthlyEstimate: 9.0,
    featuresSummary: "25 AI generations/mo, 1 business workspace, basic social & campaign planning"
  },
  GROWTH: {
    id: "GROWTH",
    displayName: "Growth",
    monthlyAiLimit: 150,
    maxBusinesses: 3,
    usdMonthlyEstimate: 29.0,
    featuresSummary: "150 AI generations/mo, up to 3 workspaces, all 7 marketing modules, calendar & analytics"
  },
  BUSINESS: {
    id: "BUSINESS",
    displayName: "Business",
    monthlyAiLimit: 600,
    maxBusinesses: 10,
    usdMonthlyEstimate: 79.0,
    featuresSummary: "600 AI generations/mo, up to 10 international workspaces, multi-currency reports & full integrations"
  }
};

export const AI_MODULES = {
  GENERAL_ASSISTANT: { id: "GENERAL_ASSISTANT", displayName: "AI Orchestrator", subtitle: "Routes requests across your brand & regional modules" },
  CAMPAIGN_PLANNER: { id: "CAMPAIGN_PLANNER", displayName: "Campaign Planner", subtitle: "Objectives, launches, festival plans & budget splits" },
  SOCIAL_MEDIA: { id: "SOCIAL_MEDIA", displayName: "Social Media Agent", subtitle: "Posts, captions, reels & hashtag strategies" },
  SEO_STUDIO: { id: "SEO_STUDIO", displayName: "SEO Agent", subtitle: "Keywords, meta tags & blog outlines from live URL data" },
  EMAIL_STUDIO: { id: "EMAIL_STUDIO", displayName: "Email Marketing Agent", subtitle: "Newsletters, promotions, segments & sequences" },
  BRAND_STUDIO: { id: "BRAND_STUDIO", displayName: "Brand Agent", subtitle: "Brand voice, guidelines & visual direction" },
  GROWTH_ANALYST: { id: "GROWTH_ANALYST", displayName: "Growth Analyst", subtitle: "Data-grounded reviews & improvement suggestions" },
  ADS_STUDIO: { id: "ADS_STUDIO", displayName: "Advertising Agent", subtitle: "Ad copy, briefs & budget plans (approval required)" }
};

export const CONTENT_TYPES = {
  SOCIAL_POST: "Social Post",
  CAPTION: "Caption",
  EMAIL_DRAFT: "Email Draft",
  BLOG_OUTLINE: "Blog Outline",
  AD_COPY: "Ad Copy",
  CREATIVE_BRIEF: "Creative Brief",
  SEO_META: "SEO Meta & Strategy"
};

export const APPROVAL_STATUSES = {
  DRAFT: { id: "DRAFT", label: "Draft", color: "neutral" },
  PENDING_APPROVAL: { id: "PENDING_APPROVAL", label: "Pending Approval", color: "amber" },
  APPROVED: { id: "APPROVED", label: "Approved", color: "emerald" },
  REJECTED: { id: "REJECTED", label: "Rejected", color: "rose" },
  SCHEDULED: { id: "SCHEDULED", label: "Scheduled", color: "sky" },
  PUBLISHED: { id: "PUBLISHED", label: "Published", color: "emerald" },
  FAILED: { id: "FAILED", label: "Publish Failed", color: "rose" }
};

export const CAMPAIGN_STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"];

export const INTEGRATION_PROVIDERS = [
  {
    id: "INSTAGRAM",
    displayName: "Instagram Business",
    category: "Social Publishing",
    officialNote: "Requires Meta Graph API Business OAuth & linked Facebook Page. Export & calendar scheduling active now.",
    oauthSupportedInClient: false
  },
  {
    id: "FACEBOOK",
    displayName: "Facebook Pages",
    category: "Social Publishing",
    officialNote: "Requires Meta App Review for pages_manage_posts. Export & calendar scheduling active now.",
    oauthSupportedInClient: false
  },
  {
    id: "YOUTUBE",
    displayName: "YouTube Studio",
    category: "Video & Shorts",
    officialNote: "Uses Google YouTube Data API v3 OAuth. Script & brief export available now.",
    oauthSupportedInClient: false
  },
  {
    id: "EMAIL_PROVIDER",
    displayName: "Email Provider (ESP / SMTP)",
    category: "Email Marketing",
    officialNote: "Connect Mailchimp, SendGrid, or Brevo API on backend, or launch draft directly in your email client.",
    oauthSupportedInClient: true
  },
  {
    id: "GOOGLE_ANALYTICS",
    displayName: "Google Analytics 4",
    category: "Analytics",
    officialNote: "Requires GA4 Data API OAuth property access. Manual actual metrics logging supported now.",
    oauthSupportedInClient: false
  },
  {
    id: "WEBSITE_ANALYTICS",
    displayName: "Website SEO Inspector",
    category: "Web & SEO",
    officialNote: "Live HTTP metadata & tag inspection is active for your business website URL.",
    oauthSupportedInClient: true
  }
];

export const COUNTRIES = [
  { code: "IN", name: "India", flag: "🇮🇳", callingCode: "+91", defaultCurrency: "INR", defaultLanguage: "English", defaultTimeZone: "Asia/Kolkata", defaultDateFormat: "dd/MM/yyyy", defaultNumberLocale: "en-IN", regionLabel: "State", postalLabel: "PIN Code" },
  { code: "US", name: "United States", flag: "🇺🇸", callingCode: "+1", defaultCurrency: "USD", defaultLanguage: "English", defaultTimeZone: "America/New_York", defaultDateFormat: "MM/dd/yyyy", defaultNumberLocale: "en-US", regionLabel: "State", postalLabel: "ZIP Code" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", callingCode: "+44", defaultCurrency: "GBP", defaultLanguage: "English", defaultTimeZone: "Europe/London", defaultDateFormat: "dd/MM/yyyy", defaultNumberLocale: "en-GB", regionLabel: "County / Nation", postalLabel: "Postcode" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", callingCode: "+971", defaultCurrency: "AED", defaultLanguage: "English / Arabic", defaultTimeZone: "Asia/Dubai", defaultDateFormat: "dd/MM/yyyy", defaultNumberLocale: "en-AE", regionLabel: "Emirate", postalLabel: "P.O. Box" },
  { code: "DE", name: "Germany", flag: "🇩🇪", callingCode: "+49", defaultCurrency: "EUR", defaultLanguage: "German", defaultTimeZone: "Europe/Berlin", defaultDateFormat: "dd.MM.yyyy", defaultNumberLocale: "de-DE", regionLabel: "Federal State", postalLabel: "Postal Code" },
  { code: "FR", name: "France", flag: "🇫🇷", callingCode: "+33", defaultCurrency: "EUR", defaultLanguage: "French", defaultTimeZone: "Europe/Paris", defaultDateFormat: "dd/MM/yyyy", defaultNumberLocale: "fr-FR", regionLabel: "Region", postalLabel: "Postal Code" },
  { code: "ES", name: "Spain", flag: "🇪🇸", callingCode: "+34", defaultCurrency: "EUR", defaultLanguage: "Spanish", defaultTimeZone: "Europe/Madrid", defaultDateFormat: "dd/MM/yyyy", defaultNumberLocale: "es-ES", regionLabel: "Autonomous Community", postalLabel: "Postal Code" },
  { code: "IT", name: "Italy", flag: "🇮🇹", callingCode: "+39", defaultCurrency: "EUR", defaultLanguage: "Italian", defaultTimeZone: "Europe/Rome", defaultDateFormat: "dd/MM/yyyy", defaultNumberLocale: "it-IT", regionLabel: "Region / Province", postalLabel: "CAP" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱", callingCode: "+31", defaultCurrency: "EUR", defaultLanguage: "Dutch", defaultTimeZone: "Europe/Amsterdam", defaultDateFormat: "dd-MM-yyyy", defaultNumberLocale: "nl-NL", regionLabel: "Province", postalLabel: "Postcode" },
  { code: "CA", name: "Canada", flag: "🇨🇦", callingCode: "+1", defaultCurrency: "CAD", defaultLanguage: "English / French", defaultTimeZone: "America/Toronto", defaultDateFormat: "yyyy-MM-dd", defaultNumberLocale: "en-CA", regionLabel: "Province / Territory", postalLabel: "Postal Code" },
  { code: "AU", name: "Australia", flag: "🇦🇺", callingCode: "+61", defaultCurrency: "AUD", defaultLanguage: "English", defaultTimeZone: "Australia/Sydney", defaultDateFormat: "dd/MM/yyyy", defaultNumberLocale: "en-AU", regionLabel: "State / Territory", postalLabel: "Postcode" },
  { code: "SG", name: "Singapore", flag: "🇸🇬", callingCode: "+65", defaultCurrency: "SGD", defaultLanguage: "English", defaultTimeZone: "Asia/Singapore", defaultDateFormat: "dd/MM/yyyy", defaultNumberLocale: "en-SG", regionLabel: "District", postalLabel: "Postal Code" },
  { code: "JP", name: "Japan", flag: "🇯🇵", callingCode: "+81", defaultCurrency: "JPY", defaultLanguage: "Japanese", defaultTimeZone: "Asia/Tokyo", defaultDateFormat: "yyyy/MM/dd", defaultNumberLocale: "ja-JP", regionLabel: "Prefecture", postalLabel: "Postal Code" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", callingCode: "+966", defaultCurrency: "SAR", defaultLanguage: "Arabic / English", defaultTimeZone: "Asia/Riyadh", defaultDateFormat: "dd/MM/yyyy", defaultNumberLocale: "en-SA", regionLabel: "Province", postalLabel: "Postal Code" },
  { code: "BR", name: "Brazil", flag: "🇧🇷", callingCode: "+55", defaultCurrency: "BRL", defaultLanguage: "Portuguese", defaultTimeZone: "America/Sao_Paulo", defaultDateFormat: "dd/MM/yyyy", defaultNumberLocale: "pt-BR", regionLabel: "State", postalLabel: "CEP" },
  { code: "MX", name: "Mexico", flag: "🇲🇽", callingCode: "+52", defaultCurrency: "MXN", defaultLanguage: "Spanish", defaultTimeZone: "America/Mexico_City", defaultDateFormat: "dd/MM/yyyy", defaultNumberLocale: "es-MX", regionLabel: "State", postalLabel: "Postal Code" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", callingCode: "+62", defaultCurrency: "IDR", defaultLanguage: "Indonesian", defaultTimeZone: "Asia/Jakarta", defaultDateFormat: "dd/MM/yyyy", defaultNumberLocale: "id-ID", regionLabel: "Province", postalLabel: "Postal Code" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾", callingCode: "+60", defaultCurrency: "MYR", defaultLanguage: "Malay / English", defaultTimeZone: "Asia/Kuala_Lumpur", defaultDateFormat: "dd/MM/yyyy", defaultNumberLocale: "ms-MY", regionLabel: "State", postalLabel: "Postcode" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", callingCode: "+27", defaultCurrency: "ZAR", defaultLanguage: "English", defaultTimeZone: "Africa/Johannesburg", defaultDateFormat: "yyyy/MM/dd", defaultNumberLocale: "en-ZA", regionLabel: "Province", postalLabel: "Postal Code" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", callingCode: "+234", defaultCurrency: "NGN", defaultLanguage: "English", defaultTimeZone: "Africa/Lagos", defaultDateFormat: "dd/MM/yyyy", defaultNumberLocale: "en-NG", regionLabel: "State", postalLabel: "Postal Code" }
];

export const CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "AED", symbol: "AED", name: "UAE Dirham" },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "SAR", symbol: "SAR", name: "Saudi Riyal" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "MXN", symbol: "MX$", name: "Mexican Peso" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" }
];

export const INDUSTRIES = [
  "Clothing & Apparel",
  "Restaurant & Cafe",
  "Salon & Beauty",
  "Gym & Fitness",
  "E-Commerce Store",
  "Local Services",
  "Marketing Agency",
  "Healthcare & Wellness",
  "Education & Coaching",
  "SaaS & Technology"
];

export const DEFAULT_USD_RATES = {
  USD: 1.0,
  INR: 84.4,
  GBP: 0.79,
  EUR: 0.94,
  AED: 3.6725,
  CAD: 1.4,
  AUD: 1.54,
  SGD: 1.34,
  JPY: 154.0,
  SAR: 3.75,
  BRL: 5.75,
  MXN: 20.2,
  IDR: 15850.0,
  MYR: 4.46,
  ZAR: 18.1,
  NGN: 1650.0
};

export function findCountryByCode(code) {
  return COUNTRIES.find((c) => c.code.toUpperCase() === String(code || "").toUpperCase()) || COUNTRIES[0];
}

export function findCurrency(code) {
  const upper = String(code || "INR").toUpperCase();
  return CURRENCIES.find((c) => c.code === upper) || { code: upper, symbol: upper, name: upper };
}

export function suggestCountryFromBrowserLocale() {
  const lang = navigator.language || "en-IN";
  const parts = lang.split(/[-_]/);
  const region = parts.length > 1 ? parts[1].toUpperCase() : "IN";
  return COUNTRIES.find((c) => c.code === region) || COUNTRIES[0];
}

export function convertCurrency(amount, fromCurrency, toCurrency, ratesFromUsd) {
  const from = String(fromCurrency || "USD").toUpperCase();
  const to = String(toCurrency || "USD").toUpperCase();
  if (from === to) return Number(amount) || 0;
  const rates = ratesFromUsd || DEFAULT_USD_RATES;
  const fromRate = rates[from] || 1.0;
  const toRate = rates[to] || 1.0;
  if (fromRate <= 0) return Number(amount) || 0;
  return ((Number(amount) || 0) / fromRate) * toRate;
}

export function formatCurrencyAmount(amount, currencyCode, numberLocale = "en-US") {
  const iso = String(currencyCode || "INR").toUpperCase();
  const digits = iso === "JPY" || iso === "IDR" ? 0 : 2;
  try {
    return new Intl.NumberFormat(numberLocale || "en-US", {
      style: "currency",
      currency: iso,
      minimumFractionDigits: 0,
      maximumFractionDigits: digits
    }).format(Number(amount) || 0);
  } catch {
    return `${iso} ${(Number(amount) || 0).toFixed(digits)}`;
  }
}

export function formatConvertedWithOriginal(originalAmount, originalCurrency, displayCurrency, numberLocale, ratesFromUsd) {
  const origFormatted = formatCurrencyAmount(originalAmount, originalCurrency, numberLocale);
  if (String(originalCurrency).toUpperCase() === String(displayCurrency).toUpperCase()) {
    return origFormatted;
  }
  const converted = convertCurrency(originalAmount, originalCurrency, displayCurrency, ratesFromUsd);
  const convFormatted = formatCurrencyAmount(converted, displayCurrency, numberLocale);
  return `${convFormatted} (${origFormatted})`;
}

export async function fetchLiveExchangeRates() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      headers: { Accept: "application/json" }
    });
    if (!res.ok) {
      return {
        ratesFromUsd: { ...DEFAULT_USD_RATES },
        fetchedAtMillis: Date.now(),
        sourceLabel: `Cached Reference (HTTP ${res.status})`,
        isLive: false
      };
    }
    const json = await res.json();
    if (json.result !== "success" || !json.rates) {
      return {
        ratesFromUsd: { ...DEFAULT_USD_RATES },
        fetchedAtMillis: Date.now(),
        sourceLabel: "Baseline Reference Rates",
        isLive: false
      };
    }
    return {
      ratesFromUsd: json.rates,
      fetchedAtMillis: json.time_last_update_unix ? json.time_last_update_unix * 1000 : Date.now(),
      sourceLabel: "Open Exchange Rates API",
      isLive: true
    };
  } catch {
    return {
      ratesFromUsd: { ...DEFAULT_USD_RATES },
      fetchedAtMillis: Date.now(),
      sourceLabel: "Offline Baseline Rates",
      isLive: false
    };
  }
}
