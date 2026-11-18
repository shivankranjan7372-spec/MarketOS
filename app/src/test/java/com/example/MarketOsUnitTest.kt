package com.example

import com.example.data.intl.CountryCatalog
import com.example.data.intl.CurrencyEngine
import com.example.data.intl.ExchangeRateSnapshot
import com.example.data.model.ApprovalStatus
import com.example.data.model.CampaignStatus
import com.example.data.model.SubscriptionTier
import com.example.data.model.safeEnumValueOf
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class MarketOsUnitTest {

    @Test
    fun `currency conversion converts values accurately instead of swapping symbols`() {
        val rates = ExchangeRateSnapshot(
            ratesFromUsd = mapOf(
                "USD" to 1.0,
                "INR" to 80.0,
                "GBP" to 0.8
            )
        )
        val inUsd = rates.convert(8000.0, fromCurrency = "INR", toCurrency = "USD")
        assertEquals(100.0, inUsd, 0.01)

        val inGbp = rates.convert(8000.0, fromCurrency = "INR", toCurrency = "GBP")
        assertEquals(80.0, inGbp, 0.01)

        val same = rates.convert(5000.0, fromCurrency = "INR", toCurrency = "INR")
        assertEquals(5000.0, same, 0.001)
    }

    @Test
    fun `currency formatting preserves original currency alongside display currency`() {
        val rates = ExchangeRateSnapshot(
            ratesFromUsd = mapOf("USD" to 1.0, "INR" to 80.0)
        )
        val formatted = CurrencyEngine.formatConvertedWithOriginal(
            originalAmount = 8000.0,
            originalCurrency = "INR",
            displayCurrency = "USD",
            numberLocaleTag = "en-US",
            rates = rates
        )
        assertTrue(formatted.contains("$100"))
        assertTrue(formatted.contains("8,000") || formatted.contains("8000"))
    }

    @Test
    fun `country catalog includes India and international defaults`() {
        val india = CountryCatalog.findByCode("IN")
        assertEquals("INR", india.defaultCurrency)
        assertEquals("+91", india.callingCode)
        assertEquals("PIN Code", india.postalLabel)

        val us = CountryCatalog.findByCode("US")
        assertEquals("USD", us.defaultCurrency)
        assertEquals("ZIP Code", us.postalLabel)

        val ae = CountryCatalog.findByCode("AE")
        assertEquals("AED", ae.defaultCurrency)
        assertEquals("Emirate", ae.regionLabel)
    }

    @Test
    fun `safeEnumValueOf handles unknown schema values without crashing`() {
        assertEquals(ApprovalStatus.DRAFT, safeEnumValueOf("UNKNOWN_FUTURE_STATUS", ApprovalStatus.DRAFT))
        assertEquals(CampaignStatus.ACTIVE, safeEnumValueOf("active", CampaignStatus.DRAFT))
        assertTrue(SubscriptionTier.BUSINESS.monthlyAiLimit > SubscriptionTier.GROWTH.monthlyAiLimit)
        assertTrue(SubscriptionTier.GROWTH.maxBusinesses > SubscriptionTier.STARTER.maxBusinesses)
    }
}
