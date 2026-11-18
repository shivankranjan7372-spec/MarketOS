package com.example.data.model

import androidx.annotation.Keep
import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentId
import com.google.firebase.firestore.IgnoreExtraProperties
import com.google.firebase.firestore.ServerTimestamp

enum class AppSection(val route: String, val label: String) {
    OVERVIEW("overview", "Overview"),
    AI_ASSISTANT("ai_assistant", "AI Assistant"),
    CAMPAIGN_PLANNER("campaign_planner", "Campaign Planner"),
    SOCIAL_MEDIA("social_media", "Social Media"),
    SEO_STUDIO("seo_studio", "SEO Studio"),
    EMAIL_STUDIO("email_studio", "Email Studio"),
    BRAND_STUDIO("brand_studio", "Brand Studio"),
    ADS_STUDIO("ads_studio", "Ads Studio"),
    CONTENT_CALENDAR("content_calendar", "Content Calendar"),
    APPROVALS("approvals", "Approvals"),
    ANALYTICS("analytics", "Analytics"),
    INTEGRATIONS("integrations", "Integrations"),
    SETTINGS("settings", "Settings")
}

enum class SubscriptionTier(
    val displayName: String,
    val monthlyAiLimit: Int,
    val maxBusinesses: Int,
    val usdMonthlyEstimate: Double,
    val featuresSummary: String
) {
    STARTER(
        displayName = "Starter",
        monthlyAiLimit = 25,
        maxBusinesses = 1,
        usdMonthlyEstimate = 9.0,
        featuresSummary = "25 AI generations/mo, 1 business workspace, basic social & campaign planning"
    ),
    GROWTH(
        displayName = "Growth",
        monthlyAiLimit = 150,
        maxBusinesses = 3,
        usdMonthlyEstimate = 29.0,
        featuresSummary = "150 AI generations/mo, up to 3 workspaces, all 7 marketing modules, calendar & analytics"
    ),
    BUSINESS(
        displayName = "Business",
        monthlyAiLimit = 600,
        maxBusinesses = 10,
        usdMonthlyEstimate = 79.0,
        featuresSummary = "600 AI generations/mo, up to 10 international workspaces, multi-currency reports & full integrations"
    )
}

enum class CampaignStatus { DRAFT, ACTIVE, PAUSED, ARCHIVED }

enum class ContentType(val displayName: String) {
    SOCIAL_POST("Social Post"),
    CAPTION("Caption"),
    EMAIL_DRAFT("Email Draft"),
    BLOG_OUTLINE("Blog Outline"),
    AD_COPY("Ad Copy"),
    CREATIVE_BRIEF("Creative Brief"),
    SEO_META("SEO Meta & Strategy")
}

enum class ApprovalStatus(val displayName: String) {
    DRAFT("Draft"),
    PENDING_APPROVAL("Pending Approval"),
    APPROVED("Approved"),
    REJECTED("Rejected"),
    SCHEDULED("Scheduled"),
    PUBLISHED("Published"),
    FAILED("Publish Failed")
}

enum class IntegrationProvider(
    val displayName: String,
    val category: String,
    val officialNote: String,
    val oauthSupportedInClient: Boolean
) {
    INSTAGRAM(
        displayName = "Instagram Business",
        category = "Social Publishing",
        officialNote = "Requires Meta Graph API Business OAuth & linked Facebook Page. Export & calendar scheduling active now.",
        oauthSupportedInClient = false
    ),
    FACEBOOK(
        displayName = "Facebook Pages",
        category = "Social Publishing",
        officialNote = "Requires Meta App Review for pages_manage_posts. Export & calendar scheduling active now.",
        oauthSupportedInClient = false
    ),
    YOUTUBE(
        displayName = "YouTube Studio",
        category = "Video & Shorts",
        officialNote = "Uses Google YouTube Data API v3 OAuth. Script & brief export available now.",
        oauthSupportedInClient = false
    ),
    EMAIL_PROVIDER(
        displayName = "Email Provider (ESP / SMTP)",
        category = "Email Marketing",
        officialNote = "Connect Mailchimp, SendGrid, or Brevo API on backend, or launch draft directly in your email client.",
        oauthSupportedInClient = true
    ),
    GOOGLE_ANALYTICS(
        displayName = "Google Analytics 4",
        category = "Analytics",
        officialNote = "Requires GA4 Data API OAuth property access. Manual actual metrics logging supported now.",
        oauthSupportedInClient = false
    ),
    WEBSITE_ANALYTICS(
        displayName = "Website SEO Inspector",
        category = "Web & SEO",
        officialNote = "Live HTTP metadata & tag inspection is active for your business website URL.",
        oauthSupportedInClient = true
    )
}

enum class IntegrationStatus(val displayName: String) {
    DISCONNECTED("Not Connected"),
    PENDING_OAUTH("OAuth Pending"),
    CONNECTED("Connected"),
    UNAVAILABLE("OAuth Setup Required")
}

enum class AiModule(val displayName: String, val subtitle: String) {
    GENERAL_ASSISTANT("AI Orchestrator", "Routes requests across your brand & regional modules"),
    CAMPAIGN_PLANNER("Campaign Planner", "Objectives, launches, festival plans & budget splits"),
    SOCIAL_MEDIA("Social Media Agent", "Posts, captions, reels & hashtag strategies"),
    SEO_STUDIO("SEO Agent", "Keywords, meta tags & blog outlines from live URL data"),
    EMAIL_STUDIO("Email Marketing Agent", "Newsletters, promotions, segments & sequences"),
    BRAND_STUDIO("Brand Agent", "Brand voice, guidelines & visual direction"),
    GROWTH_ANALYST("Growth Analyst", "Data-grounded reviews & improvement suggestions"),
    ADS_STUDIO("Advertising Agent", "Ad copy, briefs & budget plans (approval required)")
}

inline fun <reified T : Enum<T>> safeEnumValueOf(raw: String?, default: T): T {
    if (raw.isNullOrBlank()) return default
    return enumValues<T>().firstOrNull { it.name.equals(raw, ignoreCase = true) } ?: default
}

@Keep
@IgnoreExtraProperties
data class UserProfile(
    @DocumentId val id: String = "",
    val userId: String = "",
    val displayName: String = "",
    val email: String = "",
    val subscriptionTier: String = SubscriptionTier.STARTER.name,
    val activeBusinessId: String = "",
    val aiGenerationsThisMonth: Long = 0L,
    val aiTokenCountThisMonth: Long = 0L,
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
) {
    fun tierEnum(): SubscriptionTier = safeEnumValueOf(subscriptionTier, SubscriptionTier.STARTER)
}

@Keep
@IgnoreExtraProperties
data class BusinessWorkspace(
    @DocumentId val id: String = "",
    val userId: String = "",
    val name: String = "",
    val industry: String = "",
    val countryCode: String = "IN",
    val countryName: String = "India",
    val stateRegion: String = "",
    val city: String = "",
    val postalCode: String = "",
    val address: String = "",
    val websiteUrl: String = "",
    val billingCurrency: String = "INR",
    val displayCurrency: String = "INR",
    val language: String = "English",
    val timeZone: String = "Asia/Kolkata",
    val dateFormat: String = "dd/MM/yyyy",
    val numberFormat: String = "en-IN",
    val brandVoice: String = "",
    val targetAudience: String = "",
    val brandGuidelines: String = "",
    val visualDirection: String = "",
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

@Keep
@IgnoreExtraProperties
data class MarketingCampaign(
    @DocumentId val id: String = "",
    val userId: String = "",
    val businessId: String = "",
    val title: String = "",
    val objective: String = "",
    val status: String = CampaignStatus.DRAFT.name,
    val platforms: List<String> = emptyList(),
    val budgetAmount: Double = 0.0,
    val budgetCurrency: String = "INR",
    val spentAmount: Double = 0.0,
    val startDateEpoch: Long = 0L,
    val endDateEpoch: Long = 0L,
    val strategySummary: String = "",
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
) {
    fun statusEnum(): CampaignStatus = safeEnumValueOf(status, CampaignStatus.DRAFT)
}

@Keep
@IgnoreExtraProperties
data class ContentItem(
    @DocumentId val id: String = "",
    val userId: String = "",
    val businessId: String = "",
    val campaignId: String = "",
    val contentType: String = ContentType.SOCIAL_POST.name,
    val platform: String = "Instagram",
    val title: String = "",
    val body: String = "",
    val hashtags: String = "",
    val approvalStatus: String = ApprovalStatus.DRAFT.name,
    val rejectionReason: String = "",
    val scheduledEpochMillis: Long = 0L,
    val scheduledTimeZone: String = "UTC",
    val publishError: String = "",
    val aiModule: String = AiModule.GENERAL_ASSISTANT.name,
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
) {
    fun typeEnum(): ContentType = safeEnumValueOf(contentType, ContentType.SOCIAL_POST)
    fun approvalEnum(): ApprovalStatus = safeEnumValueOf(approvalStatus, ApprovalStatus.DRAFT)
}

@Keep
@IgnoreExtraProperties
data class ChannelIntegration(
    @DocumentId val id: String = "",
    val userId: String = "",
    val businessId: String = "",
    val provider: String = IntegrationProvider.INSTAGRAM.name,
    val status: String = IntegrationStatus.DISCONNECTED.name,
    val accountLabel: String = "",
    val permissionStatus: String = "",
    val lastError: String = "",
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
) {
    fun providerEnum(): IntegrationProvider = safeEnumValueOf(provider, IntegrationProvider.INSTAGRAM)
    fun statusEnum(): IntegrationStatus = safeEnumValueOf(status, IntegrationStatus.DISCONNECTED)
}

@Keep
@IgnoreExtraProperties
data class AiMessage(
    @DocumentId val id: String = "",
    val userId: String = "",
    val businessId: String = "",
    val role: String = "USER",
    val moduleUsed: String = AiModule.GENERAL_ASSISTANT.name,
    val messageText: String = "",
    val structuredPreview: String = "",
    val attachmentLabel: String = "",
    val tokensEstimated: Long = 0L,
    @ServerTimestamp val createdAt: Timestamp? = null
)

@Keep
@IgnoreExtraProperties
data class AnalyticsRecord(
    @DocumentId val id: String = "",
    val userId: String = "",
    val businessId: String = "",
    val campaignId: String = "",
    val actualData: Boolean = true,
    val sourceLabel: String = "",
    val periodLabel: String = "",
    val impressions: Long = 0L,
    val clicks: Long = 0L,
    val conversions: Long = 0L,
    val spendAmount: Double = 0.0,
    val spendCurrency: String = "INR",
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

data class WebsiteSeoMetadata(
    val url: String,
    val httpStatus: Int,
    val title: String,
    val metaDescription: String,
    val primaryHeading: String,
    val wordCountEstimate: Int,
    val fetchedAtMillis: Long
)

sealed interface UiState<out T> {
    data object Idle : UiState<Nothing>
    data object Loading : UiState<Nothing>
    data class Success<T>(val data: T) : UiState<T>
    data class Error(val message: String) : UiState<Nothing>
}
