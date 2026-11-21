import {
  DEFAULT_USD_RATES,
  convertCurrency,
  fetchLiveExchangeRates
} from "./catalog.js";

const LANDING_CURRENCY_KEY = "marketos_landing_currency";

export const SUPPORTED_LANDING_CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee", locale: "en-IN", flag: "INR" },
  { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US", flag: "USD" },
  { code: "EUR", symbol: "€", name: "Euro", locale: "de-DE", flag: "EUR" },
  { code: "GBP", symbol: "£", name: "British Pound", locale: "en-GB", flag: "GBP" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham", locale: "en-AE", flag: "AED" }
];

const listeners = new Set();

const currencyState = {
  code: readPersistedCurrency(),
  ratesFromUsd: { ...DEFAULT_USD_RATES },
  sourceLabel: "Configured Fallback Rates",
  fetchedAtMillis: 0,
  isLive: false
};

function readPersistedCurrency() {
  try {
    if (typeof localStorage !== "undefined") {
      const saved = String(localStorage.getItem(LANDING_CURRENCY_KEY) || "").toUpperCase();
      if (SUPPORTED_LANDING_CURRENCIES.some((c) => c.code === saved)) {
        return saved;
      }
    }
  } catch {
    // Ignore storage access restrictions
  }
  return "INR";
}

function writePersistedCurrency(code) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(LANDING_CURRENCY_KEY, code);
    }
  } catch {
    // Ignore storage access restrictions
  }
}

export function getCurrencyMeta(code = currencyState.code) {
  const upper = String(code || "INR").toUpperCase();
  return SUPPORTED_LANDING_CURRENCIES.find((c) => c.code === upper) || SUPPORTED_LANDING_CURRENCIES[0];
}

export function getCurrencyState() {
  return {
    ...currencyState,
    meta: getCurrencyMeta(currencyState.code)
  };
}

export function setSelectedCurrency(code) {
  const meta = getCurrencyMeta(code);
  currencyState.code = meta.code;
  writePersistedCurrency(meta.code);
  notifyCurrencySubscribers();
  return getCurrencyState();
}

export function setExchangeRatesSnapshot(snapshot) {
  if (!snapshot || !snapshot.ratesFromUsd) return;
  currencyState.ratesFromUsd = {
    ...DEFAULT_USD_RATES,
    ...snapshot.ratesFromUsd,
    USD: 1.0
  };
  currencyState.sourceLabel = snapshot.sourceLabel || "Exchange Rate Feed";
  currencyState.fetchedAtMillis = snapshot.fetchedAtMillis || Date.now();
  currencyState.isLive = Boolean(snapshot.isLive);
  notifyCurrencySubscribers();
}

export async function hydrateLandingExchangeRates() {
  const snapshot = await fetchLiveExchangeRates();
  setExchangeRatesSnapshot(snapshot);
  return getCurrencyState();
}

export function subscribeCurrency(listener) {
  if (typeof listener !== "function") return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyCurrencySubscribers() {
  const snapshot = getCurrencyState();
  listeners.forEach((fn) => {
    try {
      fn(snapshot);
    } catch {
      // Isolate listener errors
    }
  });
}

/**
 * Formats an indicative amount converted from canonical INR.
 * Never mutates the canonical billing INR amount.
 */
export function formatIndicativeFromInr(inrAmount, targetCurrency = currencyState.code, options = {}) {
  const canonicalInr = Number(inrAmount) || 0;
  const meta = getCurrencyMeta(targetCurrency);
  const converted =
    meta.code === "INR"
      ? canonicalInr
      : convertCurrency(canonicalInr, "INR", meta.code, currencyState.ratesFromUsd);

  const isWholeInr = meta.code === "INR" && Number.isInteger(Math.round(converted * 100) / 100) && Math.abs(converted - Math.round(converted)) < 0.005;
  const defaultMin = isWholeInr ? 0 : 2;
  const defaultMax = isWholeInr ? 0 : 2;
  const { minDecimals = defaultMin, maxDecimals = defaultMax } = options;

  try {
    return new Intl.NumberFormat(meta.locale, {
      style: "currency",
      currency: meta.code,
      minimumFractionDigits: Math.min(minDecimals, maxDecimals),
      maximumFractionDigits: maxDecimals
    }).format(converted);
  } catch {
    return `${meta.symbol}${converted.toFixed(maxDecimals)}`;
  }
}

export function formatCanonicalInr(inrAmount) {
  const val = Number(inrAmount) || 0;
  const isWhole = Math.abs(val - Math.round(val)) < 0.005;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2
  }).format(val);
}

/**
 * Computes annual savings directly from actual monthly and annual INR pricing.
 */
export function calculateAnnualPlanSavings(tier) {
  const monthlyInr = Number(tier?.inrMonthly) || 0;
  const annualInr = Number(tier?.inrAnnual) || monthlyInr * 10;
  const annualizedMonthlyInr = monthlyInr * 12;
  const savingsInr = Math.max(0, annualizedMonthlyInr - annualInr);
  const savingsPercent =
    annualizedMonthlyInr > 0 ? Math.round((savingsInr / annualizedMonthlyInr) * 1000) / 10 : 0;
  return {
    monthlyInr,
    annualInr,
    annualizedMonthlyInr,
    savingsInr,
    savingsPercent
  };
}

/**
 * Formats subscription plan pricing in the selected display currency for monthly or annual billing
 * from canonical INR base prices without altering actual checkout amounts.
 */
export function formatSubscriptionTierPrice(tier, billingPeriod = "monthly", targetCurrency = currencyState.code) {
  const isAnnual = billingPeriod === "annual";
  const savings = calculateAnnualPlanSavings(tier);
  const canonicalInr = isAnnual ? savings.annualInr : savings.monthlyInr;
  const meta = getCurrencyMeta(targetCurrency);

  return {
    billingPeriod: isAnnual ? "annual" : "monthly",
    canonicalCurrency: "INR",
    canonicalAmountInr: canonicalInr,
    canonicalFormatted: formatCanonicalInr(canonicalInr),
    monthlyCanonicalFormatted: formatCanonicalInr(savings.monthlyInr),
    displayCurrency: meta.code,
    displayFormatted: formatIndicativeFromInr(canonicalInr, meta.code),
    annualSavingsInr: savings.savingsInr,
    annualSavingsPercent: savings.savingsPercent,
    annualSavingsFormatted: formatIndicativeFromInr(savings.savingsInr, meta.code),
    annualSavingsCanonicalFormatted: formatCanonicalInr(savings.savingsInr),
    periodSuffix: isAnnual ? "/ year" : "/ month",
    billingFrequencyLabel: isAnnual ? "Billed annually" : "Billed monthly"
  };
}

export function renderCurrencySelectorHtml(activeCode = currencyState.code, idPrefix = "mos-currency") {
  const current = getCurrencyMeta(activeCode);
  return `
    <div class="mos-currency-bar" role="group" aria-label="Subscription display currency selector">
      <div class="mos-currency-pills">
        ${SUPPORTED_LANDING_CURRENCIES.map(
          (c) => `
            <button
              type="button"
              class="mos-currency-btn ${c.code === current.code ? "active" : ""}"
              data-currency-code="${c.code}"
              id="${idPrefix}-${c.code.toLowerCase()}"
              aria-pressed="${c.code === current.code}"
            >
              <span class="mos-curr-sym">${c.symbol}</span>
              <span>${c.code}</span>
            </button>`
        ).join("")}
      </div>
      <div class="mos-currency-rate-meta" data-currency-status>
        <span>Canonical pricing: INR (₹) &bull; Display: <strong>${current.code} (${current.symbol})</strong> &bull; ${currencyState.sourceLabel}</span>
      </div>
    </div>
  `;
}

export function bindCurrencySelectorEvents(root) {
  root.querySelectorAll("[data-currency-code]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const code = btn.getAttribute("data-currency-code");
      setSelectedCurrency(code);
    });
  });
}
