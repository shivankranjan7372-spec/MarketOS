package com.example.data.intl

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Currency
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

data class ExchangeRateSnapshot(
    val baseCurrency: String = "USD",
    val ratesFromUsd: Map<String, Double> = DEFAULT_USD_RATES,
    val fetchedAtMillis: Long = System.currentTimeMillis(),
    val sourceLabel: String = "Baseline Reference Rates",
    val isLive: Boolean = false
) {
    fun convert(amount: Double, fromCurrency: String, toCurrency: String): Double {
        val from = fromCurrency.uppercase(Locale.ROOT)
        val to = toCurrency.uppercase(Locale.ROOT)
        if (from == to) return amount
        val fromRate = ratesFromUsd[from] ?: 1.0
        val toRate = ratesFromUsd[to] ?: 1.0
        if (fromRate <= 0.0) return amount
        val amountInUsd = amount / fromRate
        return amountInUsd * toRate
    }

    fun formattedTimestamp(): String {
        val sdf = SimpleDateFormat("dd MMM yyyy, HH:mm", Locale.getDefault())
        return sdf.format(Date(fetchedAtMillis))
    }

    companion object {
        val DEFAULT_USD_RATES: Map<String, Double> = mapOf(
            "USD" to 1.0,
            "INR" to 84.4,
            "GBP" to 0.79,
            "EUR" to 0.94,
            "AED" to 3.6725,
            "CAD" to 1.40,
            "AUD" to 1.54,
            "SGD" to 1.34,
            "JPY" to 154.0,
            "SAR" to 3.75,
            "BRL" to 5.75,
            "MXN" to 20.2,
            "IDR" to 15850.0,
            "MYR" to 4.46,
            "ZAR" to 18.1,
            "NGN" to 1650.0
        )
    }
}

class CurrencyEngine(
    private val httpClient: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(8, TimeUnit.SECONDS)
        .build()
) {
    suspend fun fetchLiveRates(): ExchangeRateSnapshot = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url("https://open.er-api.com/v6/latest/USD")
                .header("Accept", "application/json")
                .build()
            httpClient.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext ExchangeRateSnapshot(
                        sourceLabel = "Cached Reference (HTTP ${response.code})",
                        isLive = false
                    )
                }
                val body = response.body?.string().orEmpty()
                val json = JSONObject(body)
                if (json.optString("result") != "success") {
                    return@withContext ExchangeRateSnapshot(isLive = false)
                }
                val ratesJson = json.getJSONObject("rates")
                val parsed = mutableMapOf<String, Double>()
                val keys = ratesJson.keys()
                while (keys.hasNext()) {
                    val key = keys.next()
                    parsed[key] = ratesJson.getDouble(key)
                }
                val timeUnix = json.optLong("time_last_update_unix", 0L)
                val timestamp = if (timeUnix > 0L) timeUnix * 1000L else System.currentTimeMillis()
                ExchangeRateSnapshot(
                    baseCurrency = "USD",
                    ratesFromUsd = parsed,
                    fetchedAtMillis = timestamp,
                    sourceLabel = "Open Exchange Rates API",
                    isLive = true
                )
            }
        } catch (e: Exception) {
            Log.w("CurrencyEngine", "Exchange rate fetch failed, using baseline rates: ${e.message}")
            ExchangeRateSnapshot(
                sourceLabel = "Offline Baseline Rates",
                isLive = false
            )
        }
    }

    companion object {
        fun formatAmount(
            amount: Double,
            currencyCode: String,
            numberLocaleTag: String = "en-US"
        ): String {
            return try {
                val locale = Locale.forLanguageTag(numberLocaleTag)
                val format = NumberFormat.getCurrencyInstance(locale)
                val iso = currencyCode.uppercase(Locale.ROOT)
                format.currency = Currency.getInstance(iso)
                if (iso == "JPY" || iso == "IDR") {
                    format.maximumFractionDigits = 0
                } else {
                    format.maximumFractionDigits = 2
                }
                format.format(amount)
            } catch (_: Exception) {
                "${currencyCode.uppercase(Locale.ROOT)} ${String.format(Locale.US, "%.2f", amount)}"
            }
        }

        fun formatConvertedWithOriginal(
            originalAmount: Double,
            originalCurrency: String,
            displayCurrency: String,
            numberLocaleTag: String,
            rates: ExchangeRateSnapshot
        ): String {
            val origFormatted = formatAmount(originalAmount, originalCurrency, numberLocaleTag)
            if (originalCurrency.equals(displayCurrency, ignoreCase = true)) {
                return origFormatted
            }
            val converted = rates.convert(originalAmount, originalCurrency, displayCurrency)
            val convFormatted = formatAmount(converted, displayCurrency, numberLocaleTag)
            return "$convFormatted ($origFormatted)"
        }
    }
}
