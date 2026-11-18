package com.example.ui.viewmodel

import android.graphics.Bitmap
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.ai.AiGeneratedDeliverable
import com.example.data.ai.MarketOsAiOrchestrator
import com.example.data.intl.CurrencyEngine
import com.example.data.intl.ExchangeRateSnapshot
import com.example.data.model.AiMessage
import com.example.data.model.AiModule
import com.example.data.model.AnalyticsRecord
import com.example.data.model.AppSection
import com.example.data.model.ApprovalStatus
import com.example.data.model.BusinessWorkspace
import com.example.data.model.CampaignStatus
import com.example.data.model.ChannelIntegration
import com.example.data.model.ContentItem
import com.example.data.model.IntegrationStatus
import com.example.data.model.MarketingCampaign
import com.example.data.model.SubscriptionTier
import com.example.data.model.UiState
import com.example.data.model.UserProfile
import com.example.data.model.WebsiteSeoMetadata
import com.example.data.preferences.UserPreferencesRepository
import com.example.data.repository.MarketOsRepository
import com.google.firebase.firestore.FirebaseFirestoreException
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class MarketOsViewModel(
    private val repository: MarketOsRepository,
    private val preferences: UserPreferencesRepository,
    private val orchestrator: MarketOsAiOrchestrator,
    private val currencyEngine: CurrencyEngine,
    private val currentUserId: String,
    private val initialDisplayName: String,
    private val initialEmail: String
) : ViewModel() {

    private val _selectedSection = MutableStateFlow(AppSection.OVERVIEW)
    val selectedSection: StateFlow<AppSection> = _selectedSection.asStateFlow()

    private val _showCreateBusinessSheet = MutableStateFlow(false)
    val showCreateBusinessSheet: StateFlow<Boolean> = _showCreateBusinessSheet.asStateFlow()

    private val _exchangeRates = MutableStateFlow(ExchangeRateSnapshot())
    val exchangeRates: StateFlow<ExchangeRateSnapshot> = _exchangeRates.asStateFlow()

    private val _aiState = MutableStateFlow<UiState<AiGeneratedDeliverable>>(UiState.Idle)
    val aiState: StateFlow<UiState<AiGeneratedDeliverable>> = _aiState.asStateFlow()

    private val _seoFetchState = MutableStateFlow<UiState<WebsiteSeoMetadata>>(UiState.Idle)
    val seoFetchState: StateFlow<UiState<WebsiteSeoMetadata>> = _seoFetchState.asStateFlow()

    private val _snackbarEvents = MutableSharedFlow<String>(extraBufferCapacity = 16)
    val snackbarEvents: SharedFlow<String> = _snackbarEvents.asSharedFlow()

    val isDarkTheme: StateFlow<Boolean> = preferences.isDarkTheme
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), true)

    val userProfileState: StateFlow<UiState<UserProfile?>> =
        repository.observeUserProfile(currentUserId).asUiStateFlow("profile")

    val businessesState: StateFlow<UiState<List<BusinessWorkspace>>> =
        repository.observeBusinesses(currentUserId).asUiStateFlow("businesses")

    val allCampaignsState: StateFlow<UiState<List<MarketingCampaign>>> =
        repository.observeCampaigns(currentUserId).asUiStateFlow("campaigns")

    val allContentItemsState: StateFlow<UiState<List<ContentItem>>> =
        repository.observeContentItems(currentUserId).asUiStateFlow("content items")

    val allIntegrationsState: StateFlow<UiState<List<ChannelIntegration>>> =
        repository.observeIntegrations(currentUserId).asUiStateFlow("integrations")

    val allAiMessagesState: StateFlow<UiState<List<AiMessage>>> =
        repository.observeAiMessages(currentUserId).asUiStateFlow("AI history")

    val allAnalyticsState: StateFlow<UiState<List<AnalyticsRecord>>> =
        repository.observeAnalyticsRecords(currentUserId).asUiStateFlow("analytics")

    val activeBusiness: StateFlow<BusinessWorkspace?> = combine(
        userProfileState,
        businessesState
    ) { profileState, bizState ->
        val list = (bizState as? UiState.Success)?.data.orEmpty()
        val activeId = (profileState as? UiState.Success)?.data?.activeBusinessId.orEmpty()
        list.firstOrNull { it.id == activeId } ?: list.firstOrNull()
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), null)

    val activeCampaigns: StateFlow<List<MarketingCampaign>> = combine(
        allCampaignsState,
        activeBusiness
    ) { state, biz ->
        val items = (state as? UiState.Success)?.data.orEmpty()
        if (biz == null) emptyList() else items.filter { it.businessId == biz.id }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), emptyList())

    val activeContentItems: StateFlow<List<ContentItem>> = combine(
        allContentItemsState,
        activeBusiness
    ) { state, biz ->
        val items = (state as? UiState.Success)?.data.orEmpty()
        if (biz == null) emptyList() else items.filter { it.businessId == biz.id }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), emptyList())

    val activeIntegrations: StateFlow<List<ChannelIntegration>> = combine(
        allIntegrationsState,
        activeBusiness
    ) { state, biz ->
        val items = (state as? UiState.Success)?.data.orEmpty()
        if (biz == null) emptyList() else items.filter { it.businessId == biz.id }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), emptyList())

    val activeAiMessages: StateFlow<List<AiMessage>> = combine(
        allAiMessagesState,
        activeBusiness
    ) { state, biz ->
        val items = (state as? UiState.Success)?.data.orEmpty()
        if (biz == null) emptyList() else items.filter { it.businessId == biz.id }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), emptyList())

    val activeAnalytics: StateFlow<List<AnalyticsRecord>> = combine(
        allAnalyticsState,
        activeBusiness
    ) { state, biz ->
        val items = (state as? UiState.Success)?.data.orEmpty()
        if (biz == null) emptyList() else items.filter { it.businessId == biz.id }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), emptyList())

    val aiProviderLabel: String
        get() = orchestrator.activeProviderLabel

    init {
        viewModelScope.launch {
            repository.ensureUserProfileExists(
                userId = currentUserId,
                displayName = initialDisplayName,
                email = initialEmail
            ).onFailure { err ->
                _snackbarEvents.tryEmit("Profile init error: ${err.localizedMessage}")
            }
        }
        refreshExchangeRates()
    }

    private fun <T> Flow<T>.asUiStateFlow(label: String): StateFlow<UiState<T>> =
        map<T, UiState<T>> { UiState.Success(it) }
            .catch { error ->
                val firestoreError = generateSequence(error) { it.cause }
                    .filterIsInstance<FirebaseFirestoreException>()
                    .firstOrNull()
                if (firestoreError == null && error is CancellationException) throw error
                val rootError = firestoreError ?: error
                Log.w(TAG, "Error observing $label", rootError)
                emit(UiState.Error(rootError.message ?: "Failed to load $label"))
            }
            .stateIn(
                scope = viewModelScope,
                started = SharingStarted.WhileSubscribed(5000L),
                initialValue = UiState.Loading
            )

    fun navigateTo(section: AppSection) {
        _selectedSection.value = section
    }

    fun setCreateBusinessDialogVisible(visible: Boolean) {
        _showCreateBusinessSheet.value = visible
    }

    fun toggleDarkTheme(enabled: Boolean) {
        viewModelScope.launch {
            preferences.setDarkTheme(enabled)
        }
    }

    fun refreshExchangeRates() {
        viewModelScope.launch {
            val snapshot = currencyEngine.fetchLiveRates()
            _exchangeRates.value = snapshot
        }
    }

    fun createBusinessWorkspace(workspace: BusinessWorkspace) {
        val profile = (userProfileState.value as? UiState.Success)?.data
        val currentCount = (businessesState.value as? UiState.Success)?.data?.size ?: 0
        val tier = profile?.tierEnum() ?: SubscriptionTier.STARTER
        if (currentCount >= tier.maxBusinesses) {
            _snackbarEvents.tryEmit(
                "${tier.displayName} plan supports up to ${tier.maxBusinesses} workspace(s). Upgrade plan in Settings for more."
            )
            return
        }
        viewModelScope.launch {
            repository.createBusinessWorkspace(currentUserId, workspace)
                .onSuccess {
                    _showCreateBusinessSheet.value = false
                    _snackbarEvents.tryEmit("Workspace '${workspace.name}' created")
                }
                .onFailure {
                    _snackbarEvents.tryEmit("Could not save workspace: ${it.localizedMessage}")
                }
        }
    }

    fun switchBusiness(businessId: String) {
        viewModelScope.launch {
            repository.setActiveBusinessId(currentUserId, businessId)
                .onSuccess { _snackbarEvents.tryEmit("Switched business workspace") }
                .onFailure { _snackbarEvents.tryEmit("Failed to switch workspace: ${it.localizedMessage}") }
        }
    }

    fun updateRegionalSettings(updated: BusinessWorkspace) {
        viewModelScope.launch {
            repository.updateBusinessRegionalSettings(currentUserId, updated)
                .onSuccess { _snackbarEvents.tryEmit("Regional & currency settings saved") }
                .onFailure { _snackbarEvents.tryEmit("Save failed: ${it.localizedMessage}") }
        }
    }

    fun updateBrandProfile(
        brandVoice: String,
        targetAudience: String,
        brandGuidelines: String,
        visualDirection: String
    ) {
        val biz = activeBusiness.value ?: return
        viewModelScope.launch {
            repository.updateBrandProfile(
                currentUserId,
                biz.id,
                brandVoice,
                targetAudience,
                brandGuidelines,
                visualDirection
            ).onSuccess {
                _snackbarEvents.tryEmit("Brand guidelines saved to business memory")
            }.onFailure {
                _snackbarEvents.tryEmit("Failed to update brand profile: ${it.localizedMessage}")
            }
        }
    }

    fun updateSubscriptionPreview(displayName: String, tier: SubscriptionTier) {
        viewModelScope.launch {
            repository.updateUserSubscriptionPreview(currentUserId, displayName, tier)
                .onSuccess { _snackbarEvents.tryEmit("Switched active plan preview to ${tier.displayName}") }
                .onFailure { _snackbarEvents.tryEmit("Failed to update profile: ${it.localizedMessage}") }
        }
    }

    fun runAiOrchestrator(
        prompt: String,
        requestedModule: AiModule? = null,
        extraContext: String = "",
        attachmentBitmap: Bitmap? = null,
        attachmentLabel: String = "",
        saveConversation: Boolean = true
    ) {
        val biz = activeBusiness.value ?: run {
            _snackbarEvents.tryEmit("Please set up a business workspace first.")
            return
        }
        val profile = (userProfileState.value as? UiState.Success)?.data
        val tier = profile?.tierEnum() ?: SubscriptionTier.STARTER
        val used = profile?.aiGenerationsThisMonth ?: 0L
        if (used >= tier.monthlyAiLimit) {
            _aiState.value = UiState.Error(
                "Monthly AI generation limit reached (${used}/${tier.monthlyAiLimit} on ${tier.displayName} plan). Upgrade in Settings."
            )
            return
        }

        viewModelScope.launch {
            _aiState.value = UiState.Loading
            if (saveConversation) {
                repository.saveAiMessage(
                    currentUserId,
                    AiMessage(
                        userId = currentUserId,
                        businessId = biz.id,
                        role = "USER",
                        moduleUsed = (requestedModule ?: AiModule.GENERAL_ASSISTANT).name,
                        messageText = prompt,
                        attachmentLabel = attachmentLabel
                    )
                )
            }
            try {
                val deliverable = orchestrator.orchestrate(
                    prompt = prompt,
                    business = biz,
                    requestedModule = requestedModule,
                    extraContext = extraContext,
                    attachmentBitmap = attachmentBitmap
                )
                _aiState.value = UiState.Success(deliverable)
                repository.incrementAiUsage(
                    userId = currentUserId,
                    currentGenerations = used,
                    currentTokens = profile?.aiTokenCountThisMonth ?: 0L,
                    addedTokens = deliverable.estimatedTokens
                )
                if (saveConversation) {
                    repository.saveAiMessage(
                        currentUserId,
                        AiMessage(
                            userId = currentUserId,
                            businessId = biz.id,
                            role = "ASSISTANT",
                            moduleUsed = deliverable.selectedModule.name,
                            messageText = deliverable.generatedBody,
                            structuredPreview = "${deliverable.contentTitle} • ${deliverable.targetPlatform}",
                            tokensEstimated = deliverable.estimatedTokens
                        )
                    )
                }
            } catch (e: TimeoutCancellationException) {
                Log.e(TAG, "AI Orchestrator timed out", e)
                _aiState.value = UiState.Error("AI request timed out after 60s. Please try again.")
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Log.e(TAG, "AI Orchestrator failed", e)
                _aiState.value = UiState.Error(e.localizedMessage ?: "AI generation failed.")
            }
        }
    }

    fun clearAiState() {
        _aiState.value = UiState.Idle
    }

    fun saveDeliverableAsContent(
        deliverable: AiGeneratedDeliverable,
        submitForApproval: Boolean,
        campaignId: String = ""
    ) {
        val biz = activeBusiness.value ?: return
        viewModelScope.launch {
            val item = ContentItem(
                userId = currentUserId,
                businessId = biz.id,
                campaignId = campaignId,
                contentType = deliverable.contentType.name,
                platform = deliverable.targetPlatform,
                title = deliverable.contentTitle,
                body = deliverable.generatedBody,
                hashtags = deliverable.hashtags,
                approvalStatus = if (submitForApproval) {
                    ApprovalStatus.PENDING_APPROVAL.name
                } else {
                    ApprovalStatus.DRAFT.name
                },
                scheduledTimeZone = biz.timeZone,
                aiModule = deliverable.selectedModule.name
            )
            repository.createContentItem(currentUserId, item)
                .onSuccess {
                    val label = if (submitForApproval) "Submitted for owner approval" else "Saved to Drafts"
                    _snackbarEvents.tryEmit(label)
                }
                .onFailure {
                    _snackbarEvents.tryEmit("Failed to save content: ${it.localizedMessage}")
                }
        }
    }

    fun saveDeliverableAsCampaign(deliverable: AiGeneratedDeliverable) {
        val biz = activeBusiness.value ?: return
        viewModelScope.launch {
            val nowSec = System.currentTimeMillis() / 1000L
            val campaign = MarketingCampaign(
                userId = currentUserId,
                businessId = biz.id,
                title = deliverable.suggestedCampaignTitle.ifBlank { deliverable.contentTitle },
                objective = deliverable.summary,
                status = CampaignStatus.DRAFT.name,
                platforms = listOf(deliverable.targetPlatform),
                budgetAmount = deliverable.suggestedBudgetAmount,
                budgetCurrency = biz.billingCurrency,
                spentAmount = 0.0,
                startDateEpoch = nowSec,
                endDateEpoch = nowSec + 30L * 86400L,
                strategySummary = deliverable.generatedBody
            )
            repository.createCampaign(currentUserId, campaign)
                .onSuccess { _snackbarEvents.tryEmit("Campaign draft created from AI plan") }
                .onFailure { _snackbarEvents.tryEmit("Failed to create campaign: ${it.localizedMessage}") }
        }
    }

    fun createOrUpdateCampaign(campaign: MarketingCampaign, isEdit: Boolean) {
        val biz = activeBusiness.value ?: return
        viewModelScope.launch {
            val target = campaign.copy(userId = currentUserId, businessId = biz.id)
            val res = if (isEdit) {
                repository.updateCampaign(currentUserId, target)
            } else {
                repository.createCampaign(currentUserId, target).map { }
            }
            res.onSuccess {
                _snackbarEvents.tryEmit(if (isEdit) "Campaign updated" else "Campaign created")
            }.onFailure {
                _snackbarEvents.tryEmit("Campaign error: ${it.localizedMessage}")
            }
        }
    }

    fun duplicateCampaign(campaign: MarketingCampaign) {
        viewModelScope.launch {
            val copy = campaign.copy(
                id = "",
                title = "${campaign.title} (Copy)".take(140),
                status = CampaignStatus.DRAFT.name,
                spentAmount = 0.0
            )
            repository.createCampaign(currentUserId, copy)
                .onSuccess { _snackbarEvents.tryEmit("Campaign duplicated as Draft") }
                .onFailure { _snackbarEvents.tryEmit("Duplicate failed: ${it.localizedMessage}") }
        }
    }

    fun setCampaignStatus(campaignId: String, status: CampaignStatus) {
        viewModelScope.launch {
            repository.updateCampaignStatus(currentUserId, campaignId, status)
                .onSuccess { _snackbarEvents.tryEmit("Campaign marked ${status.name.lowercase()}") }
                .onFailure { _snackbarEvents.tryEmit("Status update failed: ${it.localizedMessage}") }
        }
    }

    fun createManualContent(item: ContentItem) {
        val biz = activeBusiness.value ?: return
        viewModelScope.launch {
            repository.createContentItem(
                currentUserId,
                item.copy(
                    userId = currentUserId,
                    businessId = biz.id,
                    scheduledTimeZone = biz.timeZone
                )
            ).onSuccess {
                _snackbarEvents.tryEmit("Content saved")
            }.onFailure {
                _snackbarEvents.tryEmit("Save failed: ${it.localizedMessage}")
            }
        }
    }

    fun editContentDraft(
        contentId: String,
        title: String,
        body: String,
        hashtags: String,
        platform: String,
        submitForApproval: Boolean
    ) {
        viewModelScope.launch {
            repository.updateContentItemDraft(
                currentUserId,
                contentId,
                title,
                body,
                hashtags,
                platform,
                submitForApproval
            ).onSuccess {
                _snackbarEvents.tryEmit(
                    if (submitForApproval) "Submitted for approval" else "Draft updated"
                )
            }.onFailure {
                _snackbarEvents.tryEmit("Update failed: ${it.localizedMessage}")
            }
        }
    }

    fun approveOrRejectContent(contentId: String, approve: Boolean, reason: String = "") {
        viewModelScope.launch {
            repository.decideApproval(currentUserId, contentId, approve, reason)
                .onSuccess {
                    _snackbarEvents.tryEmit(if (approve) "Content approved" else "Content rejected")
                }
                .onFailure {
                    _snackbarEvents.tryEmit("Decision failed: ${it.localizedMessage}")
                }
        }
    }

    fun scheduleApprovedContent(contentId: String, scheduledEpochMillis: Long) {
        val biz = activeBusiness.value ?: return
        viewModelScope.launch {
            repository.scheduleApprovedContent(
                currentUserId,
                contentId,
                scheduledEpochMillis,
                biz.timeZone
            ).onSuccess {
                _snackbarEvents.tryEmit("Scheduled for ${biz.timeZone}")
            }.onFailure {
                _snackbarEvents.tryEmit("Schedule blocked: ${it.localizedMessage}")
            }
        }
    }

    fun attemptPublishOrReportIntegration(item: ContentItem) {
        val matchingIntegration = activeIntegrations.value.firstOrNull { int ->
            item.platform.contains(int.providerEnum().name, ignoreCase = true) ||
                (item.platform.contains("Instagram", true) && int.provider == "INSTAGRAM") ||
                (item.platform.contains("Facebook", true) && int.provider == "FACEBOOK") ||
                (item.platform.contains("YouTube", true) && int.provider == "YOUTUBE") ||
                (item.platform.contains("Email", true) && int.provider == "EMAIL_PROVIDER")
        }
        viewModelScope.launch {
            if (matchingIntegration == null || matchingIntegration.statusEnum() != IntegrationStatus.CONNECTED) {
                val reason = "Official publishing integration for ${item.platform} is not connected. Use Export / Share to publish manually."
                repository.recordPublishAttemptOutcome(currentUserId, item.id, succeeded = false, errorMessage = reason)
                _snackbarEvents.tryEmit(reason)
            } else {
                // Only Email Provider / verified connected endpoint can transition; official social OAuth requires backend review
                val reason = "Direct API publishing requires backend webhook confirmation; use Export or configure ESP endpoint."
                repository.recordPublishAttemptOutcome(currentUserId, item.id, succeeded = false, errorMessage = reason)
                _snackbarEvents.tryEmit(reason)
            }
        }
    }

    fun deleteContentItem(contentId: String) {
        viewModelScope.launch {
            repository.deleteContentItem(currentUserId, contentId)
                .onSuccess { _snackbarEvents.tryEmit("Content removed") }
                .onFailure { _snackbarEvents.tryEmit("Delete failed: ${it.localizedMessage}") }
        }
    }

    fun fetchWebsiteSeo(url: String) {
        if (url.isBlank()) {
            _seoFetchState.value = UiState.Error("Enter a valid website URL first.")
            return
        }
        viewModelScope.launch {
            _seoFetchState.value = UiState.Loading
            repository.fetchWebsiteSeoMetadata(url)
                .onSuccess { _seoFetchState.value = UiState.Success(it) }
                .onFailure {
                    _seoFetchState.value = UiState.Error(
                        "Unable to fetch URL (${it.localizedMessage ?: "network error"}). Check URL and try again."
                    )
                }
        }
    }

    fun toggleIntegrationConnection(integration: ChannelIntegration, accountLabel: String) {
        val provider = integration.providerEnum()
        viewModelScope.launch {
            if (!provider.oauthSupportedInClient) {
                repository.updateIntegrationState(
                    currentUserId,
                    integration.id,
                    IntegrationStatus.UNAVAILABLE,
                    accountLabel.ifBlank { integration.accountLabel },
                    provider.officialNote,
                    lastError = "Client-side password login is disabled for security. Configure official OAuth app credentials on backend."
                )
                _snackbarEvents.tryEmit("${provider.displayName}: Official OAuth required on backend")
                return@launch
            }

            val nextStatus = if (integration.statusEnum() == IntegrationStatus.CONNECTED) {
                IntegrationStatus.DISCONNECTED
            } else {
                IntegrationStatus.CONNECTED
            }
            repository.updateIntegrationState(
                currentUserId,
                integration.id,
                nextStatus,
                if (nextStatus == IntegrationStatus.CONNECTED) accountLabel.ifBlank { "Configured" } else "",
                if (nextStatus == IntegrationStatus.CONNECTED) "Active" else "Disconnected",
                ""
            ).onSuccess {
                _snackbarEvents.tryEmit(
                    if (nextStatus == IntegrationStatus.CONNECTED) "${provider.displayName} connected"
                    else "${provider.displayName} disconnected"
                )
            }
        }
    }

    fun logAnalyticsRecord(
        campaignId: String,
        sourceLabel: String,
        periodLabel: String,
        impressions: Long,
        clicks: Long,
        conversions: Long,
        spendAmount: Double,
        isActual: Boolean
    ) {
        val biz = activeBusiness.value ?: return
        viewModelScope.launch {
            val record = AnalyticsRecord(
                userId = currentUserId,
                businessId = biz.id,
                campaignId = campaignId,
                actualData = isActual,
                sourceLabel = sourceLabel,
                periodLabel = periodLabel,
                impressions = impressions,
                clicks = clicks,
                conversions = conversions,
                spendAmount = spendAmount,
                spendCurrency = biz.billingCurrency
            )
            repository.addAnalyticsRecord(currentUserId, record)
                .onSuccess { _snackbarEvents.tryEmit("Analytics record saved (${biz.billingCurrency})") }
                .onFailure { _snackbarEvents.tryEmit("Failed to log record: ${it.localizedMessage}") }
        }
    }

    private companion object {
        const val TAG = "MarketOsVM"
    }
}
