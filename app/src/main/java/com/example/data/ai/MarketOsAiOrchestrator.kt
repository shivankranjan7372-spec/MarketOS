package com.example.data.ai

import android.graphics.Bitmap
import android.util.Log
import com.example.data.intl.CountryCatalog
import com.example.data.model.AiModule
import com.example.data.model.BusinessWorkspace
import com.example.data.model.ContentType
import com.example.data.model.safeEnumValueOf
import com.google.firebase.Firebase
import com.google.firebase.ai.ai
import com.google.firebase.ai.type.Schema
import com.google.firebase.ai.type.content
import com.google.firebase.ai.type.generationConfig
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.withTimeout
import org.json.JSONObject

data class AiGeneratedDeliverable(
    val selectedModule: AiModule,
    val summary: String,
    val contentTitle: String,
    val contentType: ContentType,
    val targetPlatform: String,
    val generatedBody: String,
    val hashtags: String,
    val strategicNotes: String,
    val suggestedBudgetAmount: Double,
    val suggestedCampaignTitle: String,
    val estimatedTokens: Long
)

interface AiProvider {
    val providerName: String
    val modelName: String
    suspend fun generateStructuredMarketing(
        prompt: String,
        business: BusinessWorkspace,
        requestedModule: AiModule?,
        extraContext: String,
        attachmentBitmap: Bitmap?
    ): AiGeneratedDeliverable
}

class FirebaseGeminiAiProvider(
    override val modelName: String = "gemini-3.8-flash"
) : AiProvider {

    override val providerName: String = "Firebase AI Logic (Gemini)"

    private val marketingSchema = Schema.obj(
        properties = mapOf(
            "selectedModule" to Schema.enumeration(
                values = AiModule.entries.map { it.name },
                description = "The specialized MarketOS marketing module best suited to handle the request"
            ),
            "summary" to Schema.string(description = "Concise executive summary of what was generated"),
            "contentTitle" to Schema.string(description = "Short, punchy title for the generated deliverable"),
            "contentType" to Schema.enumeration(
                values = ContentType.entries.map { it.name },
                description = "Type of marketing content deliverable"
            ),
            "targetPlatform" to Schema.string(description = "Primary channel such as Instagram, Facebook, Email, Google Ads, Website SEO, or Multi-Channel"),
            "generatedBody" to Schema.string(description = "Full ready-to-review marketing deliverable formatted cleanly for the business"),
            "hashtags" to Schema.string(description = "Relevant hashtags or keywords if applicable, otherwise empty string"),
            "strategicNotes" to Schema.string(description = "Actionable next steps, timing, or brand voice alignment notes"),
            "suggestedBudgetAmount" to Schema.double(description = "Suggested campaign budget in the business billing currency, or 0 if not a budget plan"),
            "suggestedCampaignTitle" to Schema.string(description = "Campaign name if this belongs to a new campaign, otherwise empty string")
        ),
        optionalProperties = listOf("hashtags", "suggestedBudgetAmount", "suggestedCampaignTitle")
    )

    private val structuredModel by lazy {
        Firebase.ai.generativeModel(
            modelName = modelName,
            generationConfig = generationConfig {
                responseMimeType = "application/json"
                responseSchema = marketingSchema
                temperature = 0.7f
            }
        )
    }

    override suspend fun generateStructuredMarketing(
        prompt: String,
        business: BusinessWorkspace,
        requestedModule: AiModule?,
        extraContext: String,
        attachmentBitmap: Bitmap?
    ): AiGeneratedDeliverable {
        val country = CountryCatalog.findByCode(business.countryCode)
        val systemPrompt = buildString {
            appendLine("You are MarketOS Central AI Orchestrator — an international AI marketing department for small businesses.")
            appendLine("Active Business Profile:")
            appendLine("- Name: ${business.name}")
            appendLine("- Industry: ${business.industry}")
            appendLine("- Country: ${business.countryName} (${business.countryCode}) | City/Region: ${business.city}, ${business.stateRegion}")
            appendLine("- Billing Currency: ${business.billingCurrency} | Display Currency: ${business.displayCurrency}")
            appendLine("- Language: ${business.language} | Time Zone: ${business.timeZone}")
            appendLine("- Website: ${business.websiteUrl.ifBlank { "Not provided" }}")
            appendLine("- Brand Voice: ${business.brandVoice.ifBlank { "Professional, clear, conversion-focused" }}")
            appendLine("- Target Audience: ${business.targetAudience.ifBlank { "Local & regional customers" }}")
            appendLine("- Brand Guidelines: ${business.brandGuidelines.ifBlank { "Consistent, trustworthy messaging" }}")
            appendLine("- Visual Direction: ${business.visualDirection.ifBlank { "Clean modern visuals" }}")
            if (requestedModule != null && requestedModule != AiModule.GENERAL_ASSISTANT) {
                appendLine("Preferred Module: ${requestedModule.name} (${requestedModule.displayName})")
            }
            if (extraContext.isNotBlank()) {
                appendLine("Additional Grounded Context:")
                appendLine(extraContext)
            }
            appendLine("Rules:")
            appendLine("1. Adapt festivals, holidays, idioms, pricing, and currency strictly to ${business.countryName} (${business.billingCurrency}).")
            appendLine("2. Never fabricate SEO domain authority, traffic numbers, or analytics metrics not present in Additional Grounded Context.")
            appendLine("3. Never state that paid ads or posts are auto-launched; every deliverable enters human owner approval first.")
            appendLine("User Request: $prompt")
        }

        val inputContent = content {
            text(systemPrompt)
            if (attachmentBitmap != null) {
                image(attachmentBitmap)
            }
        }

        val response = withTimeout(60_000L) {
            try {
                structuredModel.generateContent(inputContent)
            } catch (e: TimeoutCancellationException) {
                throw e
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                // Single transient retry before surfacing real error
                Log.w("MarketOsAI", "Initial AI call failed, retrying once: ${e.message}")
                structuredModel.generateContent(inputContent)
            }
        }

        val rawJson = response.text
            ?: throw IllegalStateException("AI model returned an empty response.")
        val json = JSONObject(rawJson)

        val module = safeEnumValueOf(
            json.optString("selectedModule"),
            requestedModule ?: AiModule.GENERAL_ASSISTANT
        )
        val cType = safeEnumValueOf(
            json.optString("contentType"),
            when (module) {
                AiModule.EMAIL_STUDIO -> ContentType.EMAIL_DRAFT
                AiModule.SEO_STUDIO -> ContentType.SEO_META
                AiModule.ADS_STUDIO -> ContentType.AD_COPY
                AiModule.BRAND_STUDIO -> ContentType.CREATIVE_BRIEF
                else -> ContentType.SOCIAL_POST
            }
        )

        val bodyText = json.optString("generatedBody").ifBlank { json.optString("summary") }
        val estimatedTokens = ((systemPrompt.length + rawJson.length) / 4L).coerceAtLeast(120L)

        return AiGeneratedDeliverable(
            selectedModule = module,
            summary = json.optString("summary").ifBlank { "Generated marketing deliverable." },
            contentTitle = json.optString("contentTitle").ifBlank { "${module.displayName} Draft" }.take(160),
            contentType = cType,
            targetPlatform = json.optString("targetPlatform").ifBlank {
                if (country.code == "IN") "Instagram" else "Multi-Channel"
            }.take(40),
            generatedBody = bodyText.ifBlank { "Draft generated for ${business.name}." }.take(8000),
            hashtags = json.optString("hashtags").take(500),
            strategicNotes = json.optString("strategicNotes"),
            suggestedBudgetAmount = json.optDouble("suggestedBudgetAmount", 0.0).let {
                if (it.isNaN() || it < 0.0) 0.0 else it
            },
            suggestedCampaignTitle = json.optString("suggestedCampaignTitle").take(140),
            estimatedTokens = estimatedTokens
        )
    }
}

class MarketOsAiOrchestrator(
    private val provider: AiProvider = FirebaseGeminiAiProvider()
) {
    val activeProviderLabel: String
        get() = "${provider.providerName} • ${provider.modelName}"

    suspend fun orchestrate(
        prompt: String,
        business: BusinessWorkspace,
        requestedModule: AiModule? = null,
        extraContext: String = "",
        attachmentBitmap: Bitmap? = null
    ): AiGeneratedDeliverable {
        return provider.generateStructuredMarketing(
            prompt = prompt,
            business = business,
            requestedModule = requestedModule,
            extraContext = extraContext,
            attachmentBitmap = attachmentBitmap
        )
    }
}
