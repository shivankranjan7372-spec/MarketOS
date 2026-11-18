package com.example.data.intl

import java.util.Locale

data class CountryOption(
    val code: String,
    val name: String,
    val flag: String,
    val callingCode: String,
    val defaultCurrency: String,
    val defaultLanguage: String,
    val defaultTimeZone: String,
    val defaultDateFormat: String,
    val defaultNumberLocale: String,
    val regionLabel: String,
    val postalLabel: String
)

data class CurrencyOption(
    val code: String,
    val symbol: String,
    val name: String
)

object CountryCatalog {
    val countries: List<CountryOption> = listOf(
        CountryOption("IN", "India", "\uD83C\uDDEE\uD83C\uDDF3", "+91", "INR", "English", "Asia/Kolkata", "dd/MM/yyyy", "en-IN", "State", "PIN Code"),
        CountryOption("US", "United States", "\uD83C\uDDFA\uD83C\uDDF8", "+1", "USD", "English", "America/New_York", "MM/dd/yyyy", "en-US", "State", "ZIP Code"),
        CountryOption("GB", "United Kingdom", "\uD83C\uDDEC\uD83C\uDDE7", "+44", "GBP", "English", "Europe/London", "dd/MM/yyyy", "en-GB", "County / Nation", "Postcode"),
        CountryOption("AE", "United Arab Emirates", "\uD83C\uDDE6\uD83C\uDDEA", "+971", "AED", "English / Arabic", "Asia/Dubai", "dd/MM/yyyy", "en-AE", "Emirate", "P.O. Box"),
        CountryOption("DE", "Germany", "\uD83C\uDDE9\uD83C\uDDEA", "+49", "EUR", "German", "Europe/Berlin", "dd.MM.yyyy", "de-DE", "Federal State", "Postal Code"),
        CountryOption("FR", "France", "\uD83C\uDDEB\uD83C\uDDF7", "+33", "EUR", "French", "Europe/Paris", "dd/MM/yyyy", "fr-FR", "Region", "Postal Code"),
        CountryOption("ES", "Spain", "\uD83C\uDDEA\uD83C\uDDF8", "+34", "EUR", "Spanish", "Europe/Madrid", "dd/MM/yyyy", "es-ES", "Autonomous Community", "Postal Code"),
        CountryOption("IT", "Italy", "\uD83C\uDDEE\uD83C\uDDF9", "+39", "EUR", "Italian", "Europe/Rome", "dd/MM/yyyy", "it-IT", "Region / Province", "CAP"),
        CountryOption("NL", "Netherlands", "\uD83C\uDDF3\uD83C\uDDF1", "+31", "EUR", "Dutch", "Europe/Amsterdam", "dd-MM-yyyy", "nl-NL", "Province", "Postcode"),
        CountryOption("CA", "Canada", "\uD83C\uDDE8\uD83C\uDDE6", "+1", "CAD", "English / French", "America/Toronto", "yyyy-MM-dd", "en-CA", "Province / Territory", "Postal Code"),
        CountryOption("AU", "Australia", "\uD83C\uDDE6\uD83C\uDDFA", "+61", "AUD", "English", "Australia/Sydney", "dd/MM/yyyy", "en-AU", "State / Territory", "Postcode"),
        CountryOption("SG", "Singapore", "\uD83C\uDDF8\uD83C\uDDEC", "+65", "SGD", "English", "Asia/Singapore", "dd/MM/yyyy", "en-SG", "District", "Postal Code"),
        CountryOption("JP", "Japan", "\uD83C\uDDEF\uD83C\uDDF5", "+81", "JPY", "Japanese", "Asia/Tokyo", "yyyy/MM/dd", "ja-JP", "Prefecture", "Postal Code"),
        CountryOption("SA", "Saudi Arabia", "\uD83C\uDDF8\uD83C\uDDE6", "+966", "SAR", "Arabic / English", "Asia/Riyadh", "dd/MM/yyyy", "en-SA", "Province", "Postal Code"),
        CountryOption("BR", "Brazil", "\uD83C\uDDE7\uD83C\uDDF7", "+55", "BRL", "Portuguese", "America/Sao_Paulo", "dd/MM/yyyy", "pt-BR", "State", "CEP"),
        CountryOption("MX", "Mexico", "\uD83C\uDDF2\uD83C\uDDFD", "+52", "MXN", "Spanish", "America/Mexico_City", "dd/MM/yyyy", "es-MX", "State", "Postal Code"),
        CountryOption("ID", "Indonesia", "\uD83C\uDDEE\uD83C\uDDE9", "+62", "IDR", "Indonesian", "Asia/Jakarta", "dd/MM/yyyy", "id-ID", "Province", "Postal Code"),
        CountryOption("MY", "Malaysia", "\uD83C\uDDF2\uD83C\uDDFE", "+60", "MYR", "Malay / English", "Asia/Kuala_Lumpur", "dd/MM/yyyy", "ms-MY", "State", "Postcode"),
        CountryOption("ZA", "South Africa", "\uD83C\uDDFF\uD83C\uDDE6", "+27", "ZAR", "English", "Africa/Johannesburg", "yyyy/MM/dd", "en-ZA", "Province", "Postal Code"),
        CountryOption("NG", "Nigeria", "\uD83C\uDDF3\uD83C\uDDEC", "+234", "NGN", "English", "Africa/Lagos", "dd/MM/yyyy", "en-NG", "State", "Postal Code")
    )

    val currencies: List<CurrencyOption> = listOf(
        CurrencyOption("INR", "\u20B9", "Indian Rupee"),
        CurrencyOption("USD", "$", "US Dollar"),
        CurrencyOption("GBP", "\u00A3", "British Pound"),
        CurrencyOption("EUR", "\u20AC", "Euro"),
        CurrencyOption("AED", "AED", "UAE Dirham"),
        CurrencyOption("CAD", "CA$", "Canadian Dollar"),
        CurrencyOption("AUD", "A$", "Australian Dollar"),
        CurrencyOption("SGD", "S$", "Singapore Dollar"),
        CurrencyOption("JPY", "\u00A5", "Japanese Yen"),
        CurrencyOption("SAR", "SAR", "Saudi Riyal"),
        CurrencyOption("BRL", "R$", "Brazilian Real"),
        CurrencyOption("MXN", "MX$", "Mexican Peso"),
        CurrencyOption("IDR", "Rp", "Indonesian Rupiah"),
        CurrencyOption("MYR", "RM", "Malaysian Ringgit"),
        CurrencyOption("ZAR", "R", "South African Rand"),
        CurrencyOption("NGN", "\u20A6", "Nigerian Naira")
    )

    val industries: List<String> = listOf(
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
    )

    fun suggestFromDeviceLocale(): CountryOption {
        val iso = Locale.getDefault().country.uppercase(Locale.ROOT)
        return countries.firstOrNull { it.code == iso } ?: countries.first()
    }

    fun findByCode(code: String): CountryOption {
        return countries.firstOrNull { it.code.equals(code, ignoreCase = true) } ?: countries.first()
    }

    fun findCurrency(code: String): CurrencyOption {
        return currencies.firstOrNull { it.code.equals(code, ignoreCase = true) }
            ?: CurrencyOption(code.uppercase(Locale.ROOT), code.uppercase(Locale.ROOT), code)
    }
}
