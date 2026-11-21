import {
  DEFAULT_USD_RATES,
  convertCurrency,
  fetchLiveExchangeRates
} from "./catalog.js";

const LANDING_CURRENCY_KEY = "marketos_landing_currency";

export const SUPPORTED_LANDING_CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US", flag: "USD" },
  { code: "INR", symbol: "₹", name: "Indian Rupee", locale: "en-IN", flag: "INR" },
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
  return "USD";
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
  const upper = String(code || "USD").toUpperCase();
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
 * Formats an indicative amount converted from canonical USD.
 * Never mutates the canonical billing USD amount.
 */
export function formatIndicativeAmount(usdAmount, targetCurrency = currencyState.code, options = {}) {
  const canonicalUsd = Number(usdAmount) || 0;
  const meta = getCurrencyMeta(targetCurrency);
  const converted = convertCurrency(canonicalUsd, "USD", meta.code, currencyState.ratesFromUsd);
  const { minDecimals = 0, maxDecimals } = options;

  let computedMax = maxDecimals;
  if (computedMax === undefined) {
    if (converted > 0 && converted < 0.1) computedMax = 4;
    else if (converted > 0 && converted < 2) computedMax = 3;
    else computedMax = 2;
  }

  const effectiveMin = Math.min(minDecimals, computedMax);
  try {
    return new Intl.NumberFormat(meta.locale, {
      style: "currency",
      currency: meta.code,
      minimumFractionDigits: effectiveMin,
      maximumFractionDigits: computedMax
    }).format(converted);
  } catch {
    return `${meta.symbol}${converted.toFixed(computedMax)}`;
  }
}

export function formatCanonicalUsd(usdAmount) {
  const val = Number(usdAmount) || 0;
  const maxDecimals = val > 0 && val < 0.1 ? 4 : 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimals
  }).format(val);
}

/**
 * Formats subscription plan pricing in the selected display currency for monthly or annual billing
 * without altering canonical USD checkout/billing figures.
 */
export function formatSubscriptionTierPrice(tier, billingPeriod = "monthly", targetCurrency = currencyState.code) {
  const isAnnual = billingPeriod === "annual";
  const monthlyUsd = Number(tier?.usdMonthlyEstimate) || 0;
  const canonicalUsd = isAnnual ? monthlyUsd * 12 : monthlyUsd;
  return {
    billingPeriod: isAnnual ? "annual" : "monthly",
    canonicalUsd,
    displayFormatted: formatIndicativeAmount(canonicalUsd, targetCurrency),
    canonicalFormatted: formatCanonicalUsd(canonicalUsd),
    monthlyCanonicalFormatted: formatCanonicalUsd(monthlyUsd),
    periodSuffix: isAnnual ? "/ year" : "/ month"
  };
}

export function renderCurrencySelectorHtml(activeCode = currencyState.code, idPrefix = "mos-currency") {
  const current = getCurrencyMeta(activeCode);
  return `
    <div class="mos-currency-bar" role="group" aria-label="Display currency selector">
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
        <span>Canonical billing: USD &bull; Display: <strong>${current.code} (${current.symbol})</strong> &bull; ${currencyState.sourceLabel}</span>
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
