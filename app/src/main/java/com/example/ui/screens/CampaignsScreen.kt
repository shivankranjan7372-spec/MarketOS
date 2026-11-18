package com.example.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Archive
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.data.ai.AiGeneratedDeliverable
import com.example.data.intl.CurrencyEngine
import com.example.data.intl.ExchangeRateSnapshot
import com.example.data.model.AiModule
import com.example.data.model.BusinessWorkspace
import com.example.data.model.CampaignStatus
import com.example.data.model.ContentItem
import com.example.data.model.MarketingCampaign
import com.example.data.model.UiState
import com.example.ui.components.AiDeliverablePreviewCard
import com.example.ui.components.AiGeneratingCard
import com.example.ui.components.EmptyStateCard
import com.example.ui.components.ErrorBanner
import com.example.ui.components.MarketOsCard
import com.example.ui.components.StatusPill
import com.example.ui.components.approvalStatusColor

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun CampaignPlannerScreen(
    business: BusinessWorkspace,
    campaigns: List<MarketingCampaign>,
    contentItems: List<ContentItem>,
    exchangeRates: ExchangeRateSnapshot,
    aiState: UiState<AiGeneratedDeliverable>,
    onGenerateCampaignPlan: (goalPrompt: String) -> Unit,
    onCreateOrUpdateCampaign: (MarketingCampaign, isEdit: Boolean) -> Unit,
    onDuplicateCampaign: (MarketingCampaign) -> Unit,
    onSetCampaignStatus: (String, CampaignStatus) -> Unit,
    onSaveDeliverableAsCampaign: (AiGeneratedDeliverable) -> Unit,
    onSaveDeliverableAsContent: (AiGeneratedDeliverable, Boolean) -> Unit,
    onDismissAi: () -> Unit
) {
    var statusFilter by remember { mutableStateOf<CampaignStatus?>(null) }
    var editingCampaign by remember { mutableStateOf<MarketingCampaign?>(null) }
    var showCreateDialog by remember { mutableStateOf(false) }
    var aiGoalInput by remember { mutableStateOf("") }

    val filteredCampaigns = remember(campaigns, statusFilter) {
        if (statusFilter == null) campaigns
        else campaigns.filter { it.statusEnum() == statusFilter }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("Campaign Planner", style = MaterialTheme.typography.headlineMedium)
                Text(
                    "Budgets stored in ${business.billingCurrency}, displayed in ${business.displayCurrency}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Button(
                onClick = { showCreateDialog = true },
                modifier = Modifier.testTag("new_campaign_button")
            ) {
                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(4.dp))
                Text("New")
            }
        }

        // AI Campaign Strategist Card
        MarketOsCard(highlighted = true, modifier = Modifier.fillMaxWidth()) {
            Text("AI Campaign Strategist (${AiModule.CAMPAIGN_PLANNER.displayName})", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(6.dp))
            OutlinedTextField(
                value = aiGoalInput,
                onValueChange = { aiGoalInput = it },
                label = { Text("Campaign goal, festival, or launch brief") },
                placeholder = { Text("e.g., 30-day festival launch with ${business.billingCurrency} 10,000 budget") },
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("campaign_ai_prompt_input")
            )
            Spacer(Modifier.height(8.dp))
            Button(
                onClick = {
                    if (aiGoalInput.isNotBlank()) onGenerateCampaignPlan(aiGoalInput.trim())
                },
                enabled = aiGoalInput.isNotBlank() && aiState !is UiState.Loading,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.AutoAwesome, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text("Generate Campaign Strategy")
            }
        }

        when (aiState) {
            is UiState.Loading -> AiGeneratingCard("Designing campaign objectives, channels, and budget split...")
            is UiState.Error -> ErrorBanner(message = aiState.message, onDismiss = onDismissAi)
            is UiState.Success -> AiDeliverablePreviewCard(
                deliverable = aiState.data,
                onSaveDraft = { onSaveDeliverableAsContent(aiState.data, false) },
                onSubmitApproval = { onSaveDeliverableAsContent(aiState.data, true) },
                onSaveAsCampaign = { onSaveDeliverableAsCampaign(aiState.data) },
                onDismiss = onDismissAi
            )
            UiState.Idle -> {}
        }

        // Status Filter Chips
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(
                selected = statusFilter == null,
                onClick = { statusFilter = null },
                label = { Text("All (${campaigns.size})") }
            )
            CampaignStatus.entries.forEach { st ->
                FilterChip(
                    selected = statusFilter == st,
                    onClick = { statusFilter = st },
                    label = { Text(st.name.lowercase().replaceFirstChar { it.uppercase() }) }
                )
            }
        }

        if (filteredCampaigns.isEmpty()) {
            EmptyStateCard(
                icon = Icons.Default.Campaign,
                title = "No campaigns in this view",
                description = "Create a campaign manually or generate a strategy using the AI Campaign Strategist above.",
                actionLabel = "Create Campaign",
                onAction = { showCreateDialog = true }
            )
        } else {
            filteredCampaigns.forEach { campaign ->
                val linkedCount = contentItems.count { it.campaignId == campaign.id }
                val budgetDisplay = CurrencyEngine.formatConvertedWithOriginal(
                    originalAmount = campaign.budgetAmount,
                    originalCurrency = campaign.budgetCurrency,
                    displayCurrency = business.displayCurrency,
                    numberLocaleTag = business.numberFormat,
                    rates = exchangeRates
                )
                MarketOsCard(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(campaign.title, style = MaterialTheme.typography.titleMedium)
                            Text(
                                "${campaign.platforms.joinToString(", ").ifBlank { "Multi-channel" }} • $linkedCount content item(s)",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        StatusPill(
                            label = campaign.statusEnum().name,
                            color = approvalStatusColor(campaign.status)
                        )
                    }
                    if (campaign.objective.isNotBlank()) {
                        Spacer(Modifier.height(6.dp))
                        Text(campaign.objective, style = MaterialTheme.typography.bodyMedium)
                    }
                    Spacer(Modifier.height(8.dp))
                    Text(
                        text = "Budget: $budgetDisplay",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.primary
                    )
                    if (campaign.strategySummary.isNotBlank()) {
                        Spacer(Modifier.height(6.dp))
                        Text(
                            text = campaign.strategySummary.take(240) + if (campaign.strategySummary.length > 240) "..." else "",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Spacer(Modifier.height(10.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        OutlinedButton(
                            onClick = { editingCampaign = campaign },
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Edit")
                        }
                        OutlinedButton(
                            onClick = { onDuplicateCampaign(campaign) },
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Clone")
                        }
                        if (campaign.statusEnum() == CampaignStatus.ACTIVE) {
                            IconButton(onClick = { onSetCampaignStatus(campaign.id, CampaignStatus.PAUSED) }) {
                                Icon(Icons.Default.Pause, contentDescription = "Pause campaign")
                            }
                        } else if (campaign.statusEnum() != CampaignStatus.ARCHIVED) {
                            IconButton(onClick = { onSetCampaignStatus(campaign.id, CampaignStatus.ACTIVE) }) {
                                Icon(Icons.Default.PlayArrow, contentDescription = "Activate campaign")
                            }
                        }
                        if (campaign.statusEnum() != CampaignStatus.ARCHIVED) {
                            IconButton(onClick = { onSetCampaignStatus(campaign.id, CampaignStatus.ARCHIVED) }) {
                                Icon(Icons.Default.Archive, contentDescription = "Archive campaign")
                            }
                        }
                    }
                }
            }
        }
    }

    if (showCreateDialog || editingCampaign != null) {
        CampaignEditorDialog(
            business = business,
            initial = editingCampaign,
            onDismiss = { showCreateDialog = false; editingCampaign = null },
            onSave = { updated ->
                onCreateOrUpdateCampaign(updated, editingCampaign != null)
                showCreateDialog = false
                editingCampaign = null
            }
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun CampaignEditorDialog(
    business: BusinessWorkspace,
    initial: MarketingCampaign?,
    onDismiss: () -> Unit,
    onSave: (MarketingCampaign) -> Unit
) {
    var title by remember { mutableStateOf(initial?.title ?: "") }
    var objective by remember { mutableStateOf(initial?.objective ?: "") }
    var budgetText by remember { mutableStateOf((initial?.budgetAmount ?: 5000.0).toInt().toString()) }
    var strategy by remember { mutableStateOf(initial?.strategySummary ?: "") }
    var selectedPlatforms by remember {
        mutableStateOf(initial?.platforms?.toSet() ?: setOf("Instagram"))
    }
    var status by remember { mutableStateOf(initial?.statusEnum() ?: CampaignStatus.DRAFT) }

    val availablePlatforms = listOf("Instagram", "Facebook", "YouTube", "Email", "Google Ads", "Website SEO")

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (initial == null) "Create Campaign" else "Edit Campaign") },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("Campaign Title *") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = objective,
                    onValueChange = { objective = it },
                    label = { Text("Objective") },
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = budgetText,
                    onValueChange = { budgetText = it },
                    label = { Text("Budget (${business.billingCurrency})") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Text("Platforms", style = MaterialTheme.typography.labelLarge)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    availablePlatforms.forEach { p ->
                        val active = selectedPlatforms.contains(p)
                        FilterChip(
                            selected = active,
                            onClick = {
                                selectedPlatforms = if (active) selectedPlatforms - p else selectedPlatforms + p
                            },
                            label = { Text(p) }
                        )
                    }
                }
                Text("Status", style = MaterialTheme.typography.labelLarge)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    CampaignStatus.entries.forEach { st ->
                        FilterChip(
                            selected = status == st,
                            onClick = { status = st },
                            label = { Text(st.name) }
                        )
                    }
                }
                OutlinedTextField(
                    value = strategy,
                    onValueChange = { strategy = it },
                    label = { Text("Strategy Summary") },
                    minLines = 2,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val nowSec = System.currentTimeMillis() / 1000L
                    onSave(
                        (initial ?: MarketingCampaign()).copy(
                            title = title.trim().ifBlank { "Untitled Campaign" },
                            objective = objective.trim(),
                            status = status.name,
                            platforms = selectedPlatforms.toList(),
                            budgetAmount = budgetText.toDoubleOrNull() ?: 0.0,
                            budgetCurrency = initial?.budgetCurrency ?: business.billingCurrency,
                            startDateEpoch = initial?.startDateEpoch?.takeIf { it > 0 } ?: nowSec,
                            endDateEpoch = initial?.endDateEpoch?.takeIf { it > 0 } ?: (nowSec + 30L * 86400L),
                            strategySummary = strategy.trim()
                        )
                    )
                },
                enabled = title.isNotBlank()
            ) {
                Text("Save")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}
