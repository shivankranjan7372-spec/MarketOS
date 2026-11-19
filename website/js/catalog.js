export const APP_SECTIONS = [
  { id: "cyton", label: "CYTON Command Centre", icon: "orb", group: "CYTON" },
  { id: "overview", label: "Overview", icon: "dashboard", group: "WORKSPACE" },
  { id: "ai_assistant", label: "AI Assistant", icon: "sparkles", group: "WORKSPACE" },
  { id: "campaign_planner", label: "Campaign Planner", icon: "campaign", group: "CREATE" },
  { id: "social_media", label: "Social Media", icon: "share", group: "CREATE" },
  { id: "seo_studio", label: "SEO Studio", icon: "globe", group: "CREATE" },
  { id: "email_studio", label: "Email Studio", icon: "mail", group: "CREATE" },
  { id: "brand_studio", label: "Brand Studio", icon: "palette", group: "CREATE" },
  { id: "ads_studio", label: "Ads Studio", icon: "ads", group: "CREATE" },
  { id: "content_calendar", label: "Content Calendar", icon: "calendar", group: "PUBLISH & TRACK" },
  { id: "approvals", label: "Approvals", icon: "check", group: "PUBLISH & TRACK" },
  { id: "analytics", label: "Analytics", icon: "chart", group: "PUBLISH & TRACK" },
  { id: "integrations", label: "Integrations", icon: "hub", group: "SYSTEM" },
  { id: "settings", label: "Settings", icon: "settings", group: "SYSTEM" }
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

// ---------------- CYTON AI Autonomous Workspace Catalog ----------------
export const CYTON_CATEGORIES = [
  "Marketing",
  "Business strategy",
  "Social media",
  "Content creation",
  "Graphic design",
  "Research",
  "Email communication",
  "Productivity",
  "Document creation",
  "Data analysis",
  "Education",
  "Coding",
  "Website development",
  "Project management",
  "General assistance"
];

export const CYTON_ACTION_CLASSES = {
  READ: { id: "READ", label: "Read", requiresApproval: false, description: "Read authorized project or web information" },
  CREATE: { id: "CREATE", label: "Create", requiresApproval: false, description: "Create drafts, briefs, documents, and task plans" },
  MODIFY: { id: "MODIFY", label: "Modify", requiresApproval: false, description: "Update internal drafts or workspace settings" },
  PUBLISH: { id: "PUBLISH", label: "Publish", requiresApproval: true, description: "Publish content to external platforms (owner approval required)" },
  SEND: { id: "SEND", label: "Send", requiresApproval: true, description: "Send external emails or messages (owner approval required)" },
  DELETE: { id: "DELETE", label: "Delete", requiresApproval: true, description: "Delete stored files or records (owner approval required)" }
};

export const CYTON_MODEL_PROVIDERS = [
  {
    id: "gemini",
    name: "Google Gemini",
    defaultModel: "gemini-2.5-flash",
    models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
    supportsVision: true,
    note: "Multimodal text, image & document analysis via Google AI"
  },
  {
    id: "openai",
    name: "OpenAI",
    defaultModel: "gpt-4o-mini",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
    supportsVision: true,
    note: "Structured reasoning and JSON workflow orchestration"
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    defaultModel: "claude-3-5-sonnet-latest",
    models: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest"],
    supportsVision: true,
    note: "Long-form writing, strategy, and coding execution"
  },
  {
    id: "openrouter",
    name: "OpenRouter Gateway",
    defaultModel: "google/gemini-2.5-flash",
    models: ["google/gemini-2.5-flash", "openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet"],
    supportsVision: true,
    note: "Multi-model router across open & frontier models"
  },
  {
    id: "custom",
    name: "Custom / Self-Hosted (OpenAI-Compatible)",
    defaultModel: "llama-3.3-70b-instruct",
    models: ["llama-3.3-70b-instruct", "qwen-2.5-72b-instruct"],
    supportsVision: false,
    note: "Connect your own OpenAI-compatible gateway endpoint"
  }
];

export const CYTON_SUBSCRIPTION_PLANS = {
  FREE: {
    id: "FREE",
    mappedTier: "STARTER",
    name: "Free",
    monthlyRequests: 25,
    maxProjects: 2,
    summary: "Basic chat, up to 25 AI executions/mo, 2 projects, Markdown & CSV exports"
  },
  PRO: {
    id: "PRO",
    mappedTier: "GROWTH",
    name: "Pro",
    monthlyRequests: 150,
    maxProjects: 10,
    summary: "150 AI executions/mo, multi-provider gateway, 10 projects, slide decks & creative studio"
  },
  BUSINESS: {
    id: "BUSINESS",
    mappedTier: "BUSINESS",
    name: "Business",
    monthlyRequests: 600,
    maxProjects: 50,
    summary: "600 AI executions/mo, unlimited workflows, audit trails, advanced OAuth & team governance"
  }
};

export const CYTON_MARKETPLACE_INTEGRATIONS = [
  { id: "gmail", name: "Gmail", category: "Email & Comms", icon: "✉", description: "Draft outreach emails, follow-ups, and send with explicit confirmation.", permissions: "gmail.compose, gmail.readonly", oauthKey: "gmail" },
  { id: "google_drive", name: "Google Drive", category: "Documents", icon: "📁", description: "Store generated proposals, marketing plans, and brand assets.", permissions: "drive.file", oauthKey: "google_drive" },
  { id: "google_calendar", name: "Google Calendar", category: "Scheduling", icon: "📅", description: "Schedule campaign launch dates and weekly execution reminders.", permissions: "calendar.events", oauthKey: "google_calendar" },
  { id: "instagram", name: "Instagram", category: "Social Media", icon: "📸", description: "Prepare captions, reels, and publish approved posts via Meta Graph API.", permissions: "instagram_basic, instagram_content_publish", oauthKey: "instagram" },
  { id: "facebook", name: "Facebook", category: "Social Media", icon: "📘", description: "Manage business page drafts and approved campaigns.", permissions: "pages_manage_posts, pages_read_engagement", oauthKey: "facebook" },
  { id: "linkedin", name: "LinkedIn", category: "Social Media", icon: "💼", description: "Publish B2B thought-leadership and company updates after approval.", permissions: "openid, profile, w_member_social", oauthKey: "linkedin" },
  { id: "youtube", name: "YouTube", category: "Video", icon: "▶", description: "Video scripts, titles, descriptions, thumbnail briefs & channel sync.", permissions: "youtube.readonly, youtube.upload", oauthKey: "youtube" },
  { id: "x", name: "X", category: "Social Media", icon: "𝕏", description: "Draft threads, launch announcements, and scheduled posts.", permissions: "tweet.read, tweet.write", oauthKey: "x" },
  { id: "canva", name: "Canva", category: "Design", icon: "🎨", description: "Creative briefs and visual asset handoff to Canva templates.", permissions: "design:content:read, design:content:write", oauthKey: "canva" },
  { id: "slack", name: "Slack", category: "Collaboration", icon: "#", description: "Send approved task summaries and team notifications to Slack channels.", permissions: "chat:write, channels:read", oauthKey: "slack" },
  { id: "notion", name: "Notion", category: "Knowledge", icon: "📝", description: "Sync marketing plans, SOPs, and project briefs to Notion pages.", permissions: "read_content, insert_content", oauthKey: "notion" },
  { id: "discord", name: "Discord", category: "Community", icon: "💬", description: "Post approved community announcements via Discord webhooks/OAuth.", permissions: "identify, webhook.incoming", oauthKey: "discord" },
  { id: "website_research", name: "Live Web Research", category: "Research", icon: "🌐", description: "Real server-side HTML/metadata inspection for competitor & SEO audits (Active now).", permissions: "Public HTTP/HTTPS GET (SSRF protected)", oauthKey: null, builtIn: true },
  { id: "email_esp", name: "Email Delivery (Resend/SendGrid)", category: "Email & Comms", icon: "📨", description: "Server-side transactional/outreach email dispatch or mailto draft launch.", permissions: "Explicit send confirmation", oauthKey: null, builtIn: true }
];

export const CYTON_EXAMPLE_COMMANDS = [
  "Create a marketing strategy for my clothing brand.",
  "Generate five Instagram post ideas.",
  "Write an email to a potential business client.",
  "Create a complete product launch campaign.",
  "Research my competitors.",
  "Build a weekly productivity plan.",
  "Create an advertisement concept.",
  "Turn this document into a presentation."
];

