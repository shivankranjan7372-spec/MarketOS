package com.example.data.repository

import android.content.Context
import com.example.R
import com.example.core.OperationType
import com.example.core.handleFirestoreError
import com.example.data.model.AiMessage
import com.example.data.model.AnalyticsRecord
import com.example.data.model.ApprovalStatus
import com.example.data.model.BusinessWorkspace
import com.example.data.model.CampaignStatus
import com.example.data.model.ChannelIntegration
import com.example.data.model.ContentItem
import com.example.data.model.IntegrationProvider
import com.example.data.model.IntegrationStatus
import com.example.data.model.MarketingCampaign
import com.example.data.model.SubscriptionTier
import com.example.data.model.UserProfile
import com.example.data.model.WebsiteSeoMetadata
import com.google.firebase.Firebase
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.auth
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.snapshots
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

class MarketOsRepository(
    private val db: FirebaseFirestore,
    private val auth: FirebaseAuth = Firebase.auth,
    private val httpClient: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()
) {
    constructor(context: Context) : this(
        FirebaseFirestore.getInstance(
            context.applicationContext.getString(R.string.firestore_database_id)
        )
    )

    private fun requireUserId(expectedUserId: String? = null): String {
        val uid = auth.currentUser?.uid
            ?: throw IllegalStateException("User must be signed in with Google before accessing MarketOS data.")
        if (expectedUserId != null) {
            check(uid == expectedUserId) { "Authenticated user mismatch; refusing cross-user operation." }
        }
        return uid
    }

    private fun userDoc(userId: String) = db.collection("users").document(userId)

    fun observeUserProfile(userId: String): Flow<UserProfile?> =
        userDoc(userId).snapshots()
            .map { snapshot ->
                if (!snapshot.exists()) null
                else snapshot.toObject(UserProfile::class.java, DocumentSnapshot.ServerTimestampBehavior.ESTIMATE)
            }

    fun observeBusinesses(userId: String): Flow<List<BusinessWorkspace>> =
        userDoc(userId).collection("businesses")
            .snapshots()
            .map { snap ->
                snap.toObjects(BusinessWorkspace::class.java, DocumentSnapshot.ServerTimestampBehavior.ESTIMATE)
            }

    fun observeCampaigns(userId: String): Flow<List<MarketingCampaign>> =
        userDoc(userId).collection("campaigns")
            .orderBy("updatedAt", Query.Direction.DESCENDING)
            .snapshots()
            .map { snap ->
                snap.toObjects(MarketingCampaign::class.java, DocumentSnapshot.ServerTimestampBehavior.ESTIMATE)
            }

    fun observeContentItems(userId: String): Flow<List<ContentItem>> =
        userDoc(userId).collection("content_items")
            .orderBy("updatedAt", Query.Direction.DESCENDING)
            .snapshots()
            .map { snap ->
                snap.toObjects(ContentItem::class.java, DocumentSnapshot.ServerTimestampBehavior.ESTIMATE)
            }

    fun observeIntegrations(userId: String): Flow<List<ChannelIntegration>> =
        userDoc(userId).collection("integrations")
            .snapshots()
            .map { snap ->
                snap.toObjects(ChannelIntegration::class.java, DocumentSnapshot.ServerTimestampBehavior.ESTIMATE)
            }

    fun observeAiMessages(userId: String): Flow<List<AiMessage>> =
        userDoc(userId).collection("ai_messages")
            .orderBy("createdAt", Query.Direction.ASCENDING)
            .snapshots()
            .map { snap ->
                snap.toObjects(AiMessage::class.java, DocumentSnapshot.ServerTimestampBehavior.ESTIMATE)
            }

    fun observeAnalyticsRecords(userId: String): Flow<List<AnalyticsRecord>> =
        userDoc(userId).collection("analytics_records")
            .orderBy("updatedAt", Query.Direction.DESCENDING)
            .snapshots()
            .map { snap ->
                snap.toObjects(AnalyticsRecord::class.java, DocumentSnapshot.ServerTimestampBehavior.ESTIMATE)
            }

    suspend fun ensureUserProfileExists(
        userId: String,
        displayName: String,
        email: String
    ): Result<Unit> {
        val path = "users/$userId"
        return try {
            val uid = requireUserId(userId)
            val snap = userDoc(uid).get().await()
            if (!snap.exists()) {
                val safeName = displayName.trim().ifBlank { "MarketOS Owner" }.take(100)
                val safeEmail = email.trim().take(150)
                val payload = mapOf(
                    "userId" to uid,
                    "displayName" to safeName,
                    "email" to safeEmail,
                    "subscriptionTier" to SubscriptionTier.STARTER.name,
                    "activeBusinessId" to "",
                    "aiGenerationsThisMonth" to 0L,
                    "aiTokenCountThisMonth" to 0L,
                    "createdAt" to FieldValue.serverTimestamp(),
                    "updatedAt" to FieldValue.serverTimestamp()
                )
                userDoc(uid).set(payload).await()
            }
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.CREATE, path)
            Result.failure(e)
        }
    }

    suspend fun setActiveBusinessId(userId: String, businessId: String): Result<Unit> {
        val path = "users/$userId"
        return try {
            val uid = requireUserId(userId)
            userDoc(uid).update(
                mapOf(
                    "activeBusinessId" to businessId.take(128),
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.UPDATE, path)
            Result.failure(e)
        }
    }

    suspend fun updateUserSubscriptionPreview(
        userId: String,
        displayName: String,
        tier: SubscriptionTier
    ): Result<Unit> {
        val path = "users/$userId"
        return try {
            val uid = requireUserId(userId)
            userDoc(uid).update(
                mapOf(
                    "displayName" to displayName.trim().ifBlank { "MarketOS Owner" }.take(100),
                    "subscriptionTier" to tier.name,
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.UPDATE, path)
            Result.failure(e)
        }
    }

    suspend fun incrementAiUsage(
        userId: String,
        currentGenerations: Long,
        currentTokens: Long,
        addedTokens: Long
    ): Result<Unit> {
        val path = "users/$userId"
        return try {
            val uid = requireUserId(userId)
            userDoc(uid).update(
                mapOf(
                    "aiGenerationsThisMonth" to (currentGenerations + 1L),
                    "aiTokenCountThisMonth" to (currentTokens + addedTokens.coerceAtLeast(0L)),
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.UPDATE, path)
            Result.failure(e)
        }
    }

    suspend fun createBusinessWorkspace(
        userId: String,
        business: BusinessWorkspace
    ): Result<String> {
        var path = "users/$userId/businesses"
        return try {
            val uid = requireUserId(userId)
            val bizRef = userDoc(uid).collection("businesses").document()
            path = bizRef.path
            val batch = db.batch()
            val bizPayload = mapOf(
                "userId" to uid,
                "name" to business.name.trim().ifBlank { "My Business" }.take(100),
                "industry" to business.industry.trim().ifBlank { "Local Services" }.take(80),
                "countryCode" to business.countryCode.trim().uppercase().take(4).ifBlank { "IN" },
                "countryName" to business.countryName.trim().ifBlank { "India" }.take(80),
                "stateRegion" to business.stateRegion.trim().take(80),
                "city" to business.city.trim().take(80),
                "postalCode" to business.postalCode.trim().take(24),
                "address" to business.address.trim().take(200),
                "websiteUrl" to business.websiteUrl.trim().take(300),
                "billingCurrency" to business.billingCurrency.trim().uppercase().take(3).ifBlank { "INR" },
                "displayCurrency" to business.displayCurrency.trim().uppercase().take(3).ifBlank { "INR" },
                "language" to business.language.trim().ifBlank { "English" }.take(40),
                "timeZone" to business.timeZone.trim().ifBlank { "UTC" }.take(64),
                "dateFormat" to business.dateFormat.trim().ifBlank { "dd/MM/yyyy" }.take(32),
                "numberFormat" to business.numberFormat.trim().ifBlank { "en-US" }.take(32),
                "brandVoice" to business.brandVoice.trim().take(1000),
                "targetAudience" to business.targetAudience.trim().take(1000),
                "brandGuidelines" to business.brandGuidelines.trim().take(2000),
                "visualDirection" to business.visualDirection.trim().take(1000),
                "createdAt" to FieldValue.serverTimestamp(),
                "updatedAt" to FieldValue.serverTimestamp()
            )
            batch.set(bizRef, bizPayload)

            // Seed default integration stubs for the new business workspace
            IntegrationProvider.entries.forEach { provider ->
                val intRef = userDoc(uid).collection("integrations").document()
                val defaultStatus = when {
                    provider == IntegrationProvider.WEBSITE_ANALYTICS -> IntegrationStatus.CONNECTED.name
                    provider.oauthSupportedInClient -> IntegrationStatus.DISCONNECTED.name
                    else -> IntegrationStatus.UNAVAILABLE.name
                }
                batch.set(
                    intRef,
                    mapOf(
                        "userId" to uid,
                        "businessId" to bizRef.id,
                        "provider" to provider.name,
                        "status" to defaultStatus,
                        "accountLabel" to if (provider == IntegrationProvider.WEBSITE_ANALYTICS && business.websiteUrl.isNotBlank()) {
                            business.websiteUrl.take(120)
                        } else "",
                        "permissionStatus" to provider.officialNote.take(200),
                        "lastError" to "",
                        "createdAt" to FieldValue.serverTimestamp(),
                        "updatedAt" to FieldValue.serverTimestamp()
                    )
                )
            }

            // Point user's activeBusinessId to the newly created workspace
            batch.update(
                userDoc(uid),
                mapOf(
                    "activeBusinessId" to bizRef.id,
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            )
            batch.commit().await()
            Result.success(bizRef.id)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.CREATE, path)
            Result.failure(e)
        }
    }

    suspend fun updateBusinessRegionalSettings(
        userId: String,
        business: BusinessWorkspace
    ): Result<Unit> {
        val path = "users/$userId/businesses/${business.id}"
        return try {
            val uid = requireUserId(userId)
            require(business.id.isNotBlank())
            userDoc(uid).collection("businesses").document(business.id).update(
                mapOf(
                    "name" to business.name.trim().ifBlank { "My Business" }.take(100),
                    "industry" to business.industry.trim().ifBlank { "Local Services" }.take(80),
                    "countryCode" to business.countryCode.trim().uppercase().take(4),
                    "countryName" to business.countryName.trim().take(80),
                    "stateRegion" to business.stateRegion.trim().take(80),
                    "city" to business.city.trim().take(80),
                    "postalCode" to business.postalCode.trim().take(24),
                    "address" to business.address.trim().take(200),
                    "websiteUrl" to business.websiteUrl.trim().take(300),
                    "displayCurrency" to business.displayCurrency.trim().uppercase().take(3),
                    "language" to business.language.trim().take(40),
                    "timeZone" to business.timeZone.trim().take(64),
                    "dateFormat" to business.dateFormat.trim().take(32),
                    "numberFormat" to business.numberFormat.trim().take(32),
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.UPDATE, path)
            Result.failure(e)
        }
    }

    suspend fun updateBrandProfile(
        userId: String,
        businessId: String,
        brandVoice: String,
        targetAudience: String,
        brandGuidelines: String,
        visualDirection: String
    ): Result<Unit> {
        val path = "users/$userId/businesses/$businessId"
        return try {
            val uid = requireUserId(userId)
            require(businessId.isNotBlank())
            userDoc(uid).collection("businesses").document(businessId).update(
                mapOf(
                    "brandVoice" to brandVoice.trim().take(1000),
                    "targetAudience" to targetAudience.trim().take(1000),
                    "brandGuidelines" to brandGuidelines.trim().take(2000),
                    "visualDirection" to visualDirection.trim().take(1000),
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.UPDATE, path)
            Result.failure(e)
        }
    }

    suspend fun createCampaign(
        userId: String,
        campaign: MarketingCampaign
    ): Result<String> {
        var path = "users/$userId/campaigns"
        return try {
            val uid = requireUserId(userId)
            require(campaign.businessId.isNotBlank())
            val docRef = userDoc(uid).collection("campaigns").document()
            path = docRef.path
            docRef.set(
                mapOf(
                    "userId" to uid,
                    "businessId" to campaign.businessId,
                    "title" to campaign.title.trim().ifBlank { "Untitled Campaign" }.take(140),
                    "objective" to campaign.objective.trim().take(500),
                    "status" to campaign.statusEnum().name,
                    "platforms" to campaign.platforms.take(10),
                    "budgetAmount" to campaign.budgetAmount.coerceAtLeast(0.0),
                    "budgetCurrency" to campaign.budgetCurrency.trim().uppercase().take(3).ifBlank { "INR" },
                    "spentAmount" to campaign.spentAmount.coerceAtLeast(0.0),
                    "startDateEpoch" to campaign.startDateEpoch.coerceAtLeast(0L),
                    "endDateEpoch" to campaign.endDateEpoch.coerceAtLeast(0L),
                    "strategySummary" to campaign.strategySummary.trim().take(4000),
                    "createdAt" to FieldValue.serverTimestamp(),
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
            Result.success(docRef.id)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.CREATE, path)
            Result.failure(e)
        }
    }

    suspend fun updateCampaign(userId: String, campaign: MarketingCampaign): Result<Unit> {
        val path = "users/$userId/campaigns/${campaign.id}"
        return try {
            val uid = requireUserId(userId)
            require(campaign.id.isNotBlank())
            userDoc(uid).collection("campaigns").document(campaign.id).update(
                mapOf(
                    "title" to campaign.title.trim().ifBlank { "Untitled Campaign" }.take(140),
                    "objective" to campaign.objective.trim().take(500),
                    "status" to campaign.statusEnum().name,
                    "platforms" to campaign.platforms.take(10),
                    "budgetAmount" to campaign.budgetAmount.coerceAtLeast(0.0),
                    "budgetCurrency" to campaign.budgetCurrency.trim().uppercase().take(3),
                    "spentAmount" to campaign.spentAmount.coerceAtLeast(0.0),
                    "startDateEpoch" to campaign.startDateEpoch.coerceAtLeast(0L),
                    "endDateEpoch" to campaign.endDateEpoch.coerceAtLeast(0L),
                    "strategySummary" to campaign.strategySummary.trim().take(4000),
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.UPDATE, path)
            Result.failure(e)
        }
    }

    suspend fun updateCampaignStatus(
        userId: String,
        campaignId: String,
        status: CampaignStatus
    ): Result<Unit> {
        val path = "users/$userId/campaigns/$campaignId"
        return try {
            val uid = requireUserId(userId)
            require(campaignId.isNotBlank())
            userDoc(uid).collection("campaigns").document(campaignId).update(
                mapOf(
                    "status" to status.name,
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.UPDATE, path)
            Result.failure(e)
        }
    }

    suspend fun createContentItem(userId: String, item: ContentItem): Result<String> {
        var path = "users/$userId/content_items"
        return try {
            val uid = requireUserId(userId)
            require(item.businessId.isNotBlank())
            val docRef = userDoc(uid).collection("content_items").document()
            path = docRef.path
            val initialStatus = if (item.approvalEnum() == ApprovalStatus.PENDING_APPROVAL) {
                ApprovalStatus.PENDING_APPROVAL.name
            } else {
                ApprovalStatus.DRAFT.name
            }
            docRef.set(
                mapOf(
                    "userId" to uid,
                    "businessId" to item.businessId,
                    "campaignId" to item.campaignId.take(128),
                    "contentType" to item.typeEnum().name,
                    "platform" to item.platform.trim().ifBlank { "Instagram" }.take(40),
                    "title" to item.title.trim().ifBlank { "Untitled Content" }.take(160),
                    "body" to item.body.trim().ifBlank { "Draft content" }.take(8000),
                    "hashtags" to item.hashtags.trim().take(500),
                    "approvalStatus" to initialStatus,
                    "rejectionReason" to "",
                    "scheduledEpochMillis" to 0L,
                    "scheduledTimeZone" to item.scheduledTimeZone.ifBlank { "UTC" }.take(64),
                    "publishError" to "",
                    "aiModule" to item.aiModule.take(64),
                    "createdAt" to FieldValue.serverTimestamp(),
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
            Result.success(docRef.id)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.CREATE, path)
            Result.failure(e)
        }
    }

    suspend fun updateContentItemDraft(
        userId: String,
        contentId: String,
        title: String,
        body: String,
        hashtags: String,
        platform: String,
        submitForApproval: Boolean
    ): Result<Unit> {
        val path = "users/$userId/content_items/$contentId"
        return try {
            val uid = requireUserId(userId)
            require(contentId.isNotBlank())
            val newStatus = if (submitForApproval) ApprovalStatus.PENDING_APPROVAL.name else ApprovalStatus.DRAFT.name
            userDoc(uid).collection("content_items").document(contentId).update(
                mapOf(
                    "title" to title.trim().ifBlank { "Untitled Content" }.take(160),
                    "body" to body.trim().ifBlank { "Draft content" }.take(8000),
                    "hashtags" to hashtags.trim().take(500),
                    "platform" to platform.trim().ifBlank { "Instagram" }.take(40),
                    "approvalStatus" to newStatus,
                    "rejectionReason" to "",
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.UPDATE, path)
            Result.failure(e)
        }
    }

    suspend fun decideApproval(
        userId: String,
        contentId: String,
        approve: Boolean,
        rejectionReason: String = ""
    ): Result<Unit> {
        val path = "users/$userId/content_items/$contentId"
        return try {
            val uid = requireUserId(userId)
            require(contentId.isNotBlank())
            val status = if (approve) ApprovalStatus.APPROVED.name else ApprovalStatus.REJECTED.name
            userDoc(uid).collection("content_items").document(contentId).update(
                mapOf(
                    "approvalStatus" to status,
                    "rejectionReason" to if (approve) "" else rejectionReason.trim().take(500),
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.UPDATE, path)
            Result.failure(e)
        }
    }

    suspend fun scheduleApprovedContent(
        userId: String,
        contentId: String,
        scheduledEpochMillis: Long,
        timeZoneId: String
    ): Result<Unit> {
        val path = "users/$userId/content_items/$contentId"
        return try {
            val uid = requireUserId(userId)
            require(contentId.isNotBlank())
            require(scheduledEpochMillis > 0L) { "Schedule time must be valid." }
            userDoc(uid).collection("content_items").document(contentId).update(
                mapOf(
                    "approvalStatus" to ApprovalStatus.SCHEDULED.name,
                    "scheduledEpochMillis" to scheduledEpochMillis,
                    "scheduledTimeZone" to timeZoneId.ifBlank { "UTC" }.take(64),
                    "publishError" to "",
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.UPDATE, path)
            Result.failure(e)
        }
    }

    suspend fun recordPublishAttemptOutcome(
        userId: String,
        contentId: String,
        succeeded: Boolean,
        errorMessage: String = ""
    ): Result<Unit> {
        val path = "users/$userId/content_items/$contentId"
        return try {
            val uid = requireUserId(userId)
            require(contentId.isNotBlank())
            val nextStatus = if (succeeded) ApprovalStatus.PUBLISHED.name else ApprovalStatus.FAILED.name
            userDoc(uid).collection("content_items").document(contentId).update(
                mapOf(
                    "approvalStatus" to nextStatus,
                    "publishError" to if (succeeded) "" else errorMessage.trim().take(500),
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.UPDATE, path)
            Result.failure(e)
        }
    }

    suspend fun deleteContentItem(userId: String, contentId: String): Result<Unit> {
        val path = "users/$userId/content_items/$contentId"
        return try {
            val uid = requireUserId(userId)
            require(contentId.isNotBlank())
            userDoc(uid).collection("content_items").document(contentId).delete().await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.DELETE, path)
            Result.failure(e)
        }
    }

    suspend fun updateIntegrationState(
        userId: String,
        integrationId: String,
        status: IntegrationStatus,
        accountLabel: String,
        permissionStatus: String,
        lastError: String = ""
    ): Result<Unit> {
        val path = "users/$userId/integrations/$integrationId"
        return try {
            val uid = requireUserId(userId)
            require(integrationId.isNotBlank())
            userDoc(uid).collection("integrations").document(integrationId).update(
                mapOf(
                    "status" to status.name,
                    "accountLabel" to accountLabel.trim().take(120),
                    "permissionStatus" to permissionStatus.trim().take(200),
                    "lastError" to lastError.trim().take(500),
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.UPDATE, path)
            Result.failure(e)
        }
    }

    suspend fun saveAiMessage(userId: String, message: AiMessage): Result<Unit> {
        var path = "users/$userId/ai_messages"
        return try {
            val uid = requireUserId(userId)
            require(message.businessId.isNotBlank())
            val docRef = userDoc(uid).collection("ai_messages").document()
            path = docRef.path
            docRef.set(
                mapOf(
                    "userId" to uid,
                    "businessId" to message.businessId,
                    "role" to if (message.role == "ASSISTANT") "ASSISTANT" else "USER",
                    "moduleUsed" to message.moduleUsed.take(64),
                    "messageText" to message.messageText.trim().ifBlank { "..." }.take(12000),
                    "structuredPreview" to message.structuredPreview.trim().take(4000),
                    "attachmentLabel" to message.attachmentLabel.trim().take(200),
                    "tokensEstimated" to message.tokensEstimated.coerceAtLeast(0L),
                    "createdAt" to FieldValue.serverTimestamp()
                )
            ).await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.CREATE, path)
            Result.failure(e)
        }
    }

    suspend fun addAnalyticsRecord(userId: String, record: AnalyticsRecord): Result<Unit> {
        var path = "users/$userId/analytics_records"
        return try {
            val uid = requireUserId(userId)
            require(record.businessId.isNotBlank())
            val docRef = userDoc(uid).collection("analytics_records").document()
            path = docRef.path
            docRef.set(
                mapOf(
                    "userId" to uid,
                    "businessId" to record.businessId,
                    "campaignId" to record.campaignId.take(128),
                    "actualData" to record.actualData,
                    "sourceLabel" to record.sourceLabel.trim().ifBlank { "Manual Verified Entry" }.take(80),
                    "periodLabel" to record.periodLabel.trim().ifBlank { "Current Month" }.take(60),
                    "impressions" to record.impressions.coerceAtLeast(0L),
                    "clicks" to record.clicks.coerceAtLeast(0L),
                    "conversions" to record.conversions.coerceAtLeast(0L),
                    "spendAmount" to record.spendAmount.coerceAtLeast(0.0),
                    "spendCurrency" to record.spendCurrency.trim().uppercase().take(3).ifBlank { "INR" },
                    "createdAt" to FieldValue.serverTimestamp(),
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.CREATE, path)
            Result.failure(e)
        }
    }

    suspend fun fetchWebsiteSeoMetadata(rawUrl: String): Result<WebsiteSeoMetadata> = withContext(Dispatchers.IO) {
        try {
            val normalized = rawUrl.trim().let {
                if (it.startsWith("http://") || it.startsWith("https://")) it else "https://$it"
            }
            val request = Request.Builder()
                .url(normalized)
                .header("User-Agent", "MarketOS-SEO-Inspector/1.0")
                .build()
            httpClient.newCall(request).execute().use { response ->
                val html = response.body?.string().orEmpty()
                val title = Regex("<title[^>]*>(.*?)</title>", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL))
                    .find(html)?.groupValues?.getOrNull(1)?.replace(Regex("\\s+"), " ")?.trim().orEmpty()
                val metaDesc = Regex("<meta[^>]*name=[\"']description[\"'][^>]*content=[\"'](.*?)[\"'][^>]*>", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL))
                    .find(html)?.groupValues?.getOrNull(1)?.trim()
                    ?: Regex("<meta[^>]*content=[\"'](.*?)[\"'][^>]*name=[\"']description[\"'][^>]*>", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL))
                        .find(html)?.groupValues?.getOrNull(1)?.trim().orEmpty()
                val h1 = Regex("<h1[^>]*>(.*?)</h1>", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL))
                    .find(html)?.groupValues?.getOrNull(1)?.replace(Regex("<[^>]+>"), "")?.replace(Regex("\\s+"), " ")?.trim().orEmpty()
                val textWords = html.replace(Regex("<script[^>]*>.*?</script>", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL)), " ")
                    .replace(Regex("<style[^>]*>.*?</style>", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL)), " ")
                    .replace(Regex("<[^>]+>"), " ")
                    .trim()
                    .split(Regex("\\s+"))
                    .count { it.isNotBlank() }
                Result.success(
                    WebsiteSeoMetadata(
                        url = normalized,
                        httpStatus = response.code,
                        title = title.ifBlank { "(No <title> tag found)" },
                        metaDescription = metaDesc.ifBlank { "(No meta description found)" },
                        primaryHeading = h1.ifBlank { "(No <h1> heading found)" },
                        wordCountEstimate = textWords,
                        fetchedAtMillis = System.currentTimeMillis()
                    )
                )
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
