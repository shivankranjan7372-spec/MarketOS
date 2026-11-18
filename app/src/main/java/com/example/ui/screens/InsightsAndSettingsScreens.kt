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
import androidx.compose.material.icons.filled.Analytics
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.Hub
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
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
import com.example.data.intl.CountryCatalog
import com.example.data.intl.CurrencyEngine
import com.example.data.intl.ExchangeRateSnapshot
import com.example.data.model.AiModule
import com.example.data.model.AnalyticsRecord
import com.example.data.model.BusinessWorkspace
import com.example.data.model.ChannelIntegration
import com.example.data.model.IntegrationStatus
import com.example.data.model.MarketingCampaign
import com.example.data.model.SubscriptionTier
import com.example.data.model.UiState
import com.example.data.model.UserProfile
import com.example.ui.components.AiDeliverablePreviewCard
import com.example.ui.components.AiGeneratingCard
import com.example.ui.components.CountryPickerDialog
import com.example.ui.components.CurrencyPickerDialog
import com.example.ui.components.EmptyStateCard
import com.example.ui.components.ErrorBanner
import com.example.ui.components.MarketOsCard
import com.example.ui.components.StatusPill
import com.example.ui.components.approvalStatusColor
import com.example.ui.theme.AmberWarning
import com.example.ui.theme.BrightViolet
import com.example.ui.theme.EmeraldSuccess
import com.example.ui.theme.SkyInfo

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AnalyticsScreen(
    business: BusinessWorkspace,
    campaigns: List<MarketingCampaign>,
    records: List<AnalyticsRecord>,
    exchangeRates: ExchangeRateSnapshot,
    aiState: UiState<AiGeneratedDeliverable>,
    onLogRecord: (
        campaignId: String,
        sourceLabel: String,
        periodLabel: String,
        impressions: Long,
        clicks: Long,
        conversions: Long,
        spendAmount: Double,
        isActual: Boolean
    ) -> Unit,
    onRunGrowthAnalyst: (String) -> Unit,
    onSaveContent: (AiGeneratedDeliverable, Boolean) -> Unit,
    onDismissAi: () -> Unit
) {
    var filterMode by remember { mutableStateOf("ALL") }
    var showLogDialog by remember { mutableStateOf(false) }

    val filtered = remember(records, filterMode) {
        when (filterMode) {
            "ACTUAL" -> records.filter { it.actualData }
            "ESTIMATE" -> records.filter { !it.actualData }
            else -> records
        }
    }

    val totalImpressions = filtered.sumOf { it.impressions }
    val totalClicks = filtered.sumOf { it.clicks }
    val totalConversions = filtered.sumOf { it.conversions }
    val totalSpendConverted = filtered.sumOf {
        exchangeRates.convert(it.spendAmount, it.spendCurrency, business.displayCurrency)
    }
    val ctr = if (totalImpressions > 0) (totalClicks.toDouble() / totalImpressions * 100.0) else 0.0

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
                Text("Analytics & Growth", style = MaterialTheme.typography.headlineMedium)
                Text(
                    "Actual metrics are clearly separated from estimates. Display currency: ${business.displayCurrency}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Button(onClick = { showLogDialog = true }) {
                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(4.dp))
                Text("Log")
            }
        }

        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(selected = filterMode == "ALL", onClick = { filterMode = "ALL" }, label = { Text("All (${records.size})") })
            FilterChip(selected = filterMode == "ACTUAL", onClick = { filterMode = "ACTUAL" }, label = { Text("Actual Only") })
            FilterChip(selected = filterMode == "ESTIMATE", onClick = { filterMode = "ESTIMATE" }, label = { Text("Estimates") })
        }

        MarketOsCard(highlighted = true, modifier = Modifier.fillMaxWidth()) {
            Text("Summary (${filtered.size} record(s))", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(6.dp))
            Text("Impressions: $totalImpressions  •  Clicks: $totalClicks  •  CTR: ${String.format(java.util.Locale.US, "%.2f", ctr)}%")
            Text("Conversions: $totalConversions  •  Spend: ${CurrencyEngine.formatAmount(totalSpendConverted, business.displayCurrency, business.numberFormat)}")
            Spacer(Modifier.height(4.dp))
            Text(
                "Rate source: ${exchangeRates.sourceLabel} (${exchangeRates.formattedTimestamp()})",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(10.dp))
            Button(
                onClick = {
                    val contextData = if (records.isEmpty()) {
                        "No logged performance records yet. Explain what baseline metrics the business should start tracking without inventing numbers."
                    } else {
                        "Verified logged data: ${records.size} records, impressions=$totalImpressions, clicks=$totalClicks, conversions=$totalConversions, totalSpend=${business.displayCurrency} $totalSpendConverted."
                    }
                    onRunGrowthAnalyst(contextData)
                },
                enabled = aiState !is UiState.Loading,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.AutoAwesome, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text("Run AI Growth Analyst")
            }
        }

        when (aiState) {
            is UiState.Loading -> AiGeneratingCard("Analyzing actual performance and campaign comparisons...")
            is UiState.Error -> ErrorBanner(message = aiState.message, onDismiss = onDismissAi)
            is UiState.Success -> AiDeliverablePreviewCard(
                deliverable = aiState.data,
                onSaveDraft = { onSaveContent(aiState.data, false) },
                onSubmitApproval = { onSaveContent(aiState.data, true) },
                onDismiss = onDismissAi
            )
            UiState.Idle -> {}
        }

        if (filtered.isEmpty()) {
            EmptyStateCard(
                icon = Icons.Default.Analytics,
                title = "No analytics records logged yet",
                description = "MarketOS does not fabricate metrics. Log actual ad/campaign numbers or connect analytics integrations.",
                actionLabel = "Log Campaign Metrics",
                onAction = { showLogDialog = true }
            )
        } else {
            filtered.forEach { rec ->
                MarketOsCard(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(rec.sourceLabel, style = MaterialTheme.typography.titleMedium)
                            Text(rec.periodLabel, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        StatusPill(
                            label = if (rec.actualData) "ACTUAL DATA" else "ESTIMATE",
                            color = if (rec.actualData) EmeraldSuccess else AmberWarning
                        )
                    }
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "Impressions: ${rec.impressions} • Clicks: ${rec.clicks} • Conversions: ${rec.conversions}",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        "Spend: ${CurrencyEngine.formatConvertedWithOriginal(rec.spendAmount, rec.spendCurrency, business.displayCurrency, business.numberFormat, exchangeRates)}",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }
    }

    if (showLogDialog) {
        var sourceLabel by remember { mutableStateOf("Meta Ads Manager") }
        var periodLabel by remember { mutableStateOf("Nov 2026") }
        var impressions by remember { mutableStateOf("0") }
        var clicks by remember { mutableStateOf("0") }
        var conversions by remember { mutableStateOf("0") }
        var spend by remember { mutableStateOf("0") }
        var isActual by remember { mutableStateOf(true) }

        AlertDialog(
            onDismissRequest = { showLogDialog = false },
            title = { Text("Log Performance Record") },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(value = sourceLabel, onValueChange = { sourceLabel = it }, label = { Text("Source (e.g., Instagram Insights)") })
                    OutlinedTextField(value = periodLabel, onValueChange = { periodLabel = it }, label = { Text("Period") })
                    OutlinedTextField(value = impressions, onValueChange = { impressions = it }, label = { Text("Impressions") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                    OutlinedTextField(value = clicks, onValueChange = { clicks = it }, label = { Text("Clicks") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                    OutlinedTextField(value = conversions, onValueChange = { conversions = it }, label = { Text("Conversions") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                    OutlinedTextField(value = spend, onValueChange = { spend = it }, label = { Text("Spend (${business.billingCurrency})") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                        Text("Verified Actual Data")
                        Switch(checked = isActual, onCheckedChange = { isActual = it })
                    }
                }
            },
            confirmButton = {
                Button(onClick = {
                    onLogRecord(
                        campaigns.firstOrNull()?.id.orEmpty(),
                        sourceLabel.ifBlank { "Manual Entry" },
                        periodLabel.ifBlank { "Current Period" },
                        impressions.toLongOrNull() ?: 0L,
                        clicks.toLongOrNull() ?: 0L,
                        conversions.toLongOrNull() ?: 0L,
                        spend.toDoubleOrNull() ?: 0.0,
                        isActual
                    )
                    showLogDialog = false
                }) {
                    Text("Save Record")
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogDialog = false }) { Text("Cancel") }
            }
        )
    }
}

@Composable
fun IntegrationsScreen(
    business: BusinessWorkspace,
    integrations: List<ChannelIntegration>,
    onToggleConnection: (ChannelIntegration, accountLabel: String) -> Unit
) {
    var editingIntegration by remember { mutableStateOf<ChannelIntegration?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Official Integrations", style = MaterialTheme.typography.headlineMedium)
        Text(
            "MarketOS uses official OAuth flows only — never stores third-party passwords or automates unofficial logins.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        if (integrations.isEmpty()) {
            EmptyStateCard(
                icon = Icons.Default.Hub,
                title = "No integrations configured",
                description = "Integrations initialize automatically for your business workspace."
            )
        } else {
            integrations.forEach { item ->
                val provider = item.providerEnum()
                val status = item.statusEnum()
                MarketOsCard(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(provider.displayName, style = MaterialTheme.typography.titleMedium)
                            Text(provider.category, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        StatusPill(label = status.displayName, color = approvalStatusColor(item.status))
                    }
                    Spacer(Modifier.height(6.dp))
                    Text(provider.officialNote, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    if (item.accountLabel.isNotBlank()) {
                        Spacer(Modifier.height(4.dp))
                        Text("Account: ${item.accountLabel}", style = MaterialTheme.typography.labelMedium, color = SkyInfo)
                    }
                    if (item.lastError.isNotBlank()) {
                        Spacer(Modifier.height(4.dp))
                        Text(item.lastError, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
                    }
                    Spacer(Modifier.height(10.dp))
                    OutlinedButton(
                        onClick = {
                            if (status == IntegrationStatus.CONNECTED) {
                                onToggleConnection(item, "")
                            } else {
                                editingIntegration = item
                            }
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            when {
                                status == IntegrationStatus.CONNECTED -> "Disconnect"
                                provider.oauthSupportedInClient -> "Configure Connection"
                                else -> "Check Official OAuth Status"
                            }
                        )
                    }
                }
            }
        }
    }

    if (editingIntegration != null) {
        var labelInput by remember { mutableStateOf(business.websiteUrl.ifBlank { business.name }) }
        AlertDialog(
            onDismissRequest = { editingIntegration = null },
            title = { Text(editingIntegration!!.providerEnum().displayName) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(editingIntegration!!.providerEnum().officialNote, style = MaterialTheme.typography.bodySmall)
                    OutlinedTextField(
                        value = labelInput,
                        onValueChange = { labelInput = it },
                        label = { Text("Endpoint / Account Label") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(onClick = {
                    onToggleConnection(editingIntegration!!, labelInput)
                    editingIntegration = null
                }) {
                    Text("Apply")
                }
            },
            dismissButton = {
                TextButton(onClick = { editingIntegration = null }) { Text("Cancel") }
            }
        )
    }
}

@Composable
fun SettingsScreen(
    business: BusinessWorkspace,
    allBusinesses: List<BusinessWorkspace>,
    profile: UserProfile?,
    exchangeRates: ExchangeRateSnapshot,
    isDarkTheme: Boolean,
    onToggleTheme: (Boolean) -> Unit,
    onSwitchBusiness: (String) -> Unit,
    onOpenAddBusiness: () -> Unit,
    onUpdateRegionalSettings: (BusinessWorkspace) -> Unit,
    onRefreshRates: () -> Unit,
    onSelectPlanPreview: (String, SubscriptionTier) -> Unit,
    onSignOut: () -> Unit
) {
    var showCountryPicker by remember { mutableStateOf(false) }
    var showCurrencyPicker by remember { mutableStateOf(false) }
    var selectedCountry by remember(business.id) { mutableStateOf(CountryCatalog.findByCode(business.countryCode)) }
    var displayCurrency by remember(business.id) { mutableStateOf(business.displayCurrency) }
    var timeZone by remember(business.id) { mutableStateOf(business.timeZone) }
    var language by remember(business.id) { mutableStateOf(business.language) }
    var websiteUrl by remember(business.id) { mutableStateOf(business.websiteUrl) }

    val currentTier = profile?.tierEnum() ?: SubscriptionTier.STARTER

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Text("Settings & Workspaces", style = MaterialTheme.typography.headlineMedium)

        // Multi-Business Workspaces
        MarketOsCard(highlighted = true, modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.Business, contentDescription = null, tint = BrightViolet)
                    Text("Business Workspaces (${allBusinesses.size})", style = MaterialTheme.typography.titleMedium)
                }
                OutlinedButton(onClick = onOpenAddBusiness, modifier = Modifier.testTag("add_business_button")) {
                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Add")
                }
            }
            Spacer(Modifier.height(8.dp))
            allBusinesses.forEach { biz ->
                val isActive = biz.id == business.id
                val c = CountryCatalog.findByCode(biz.countryCode)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("${c.flag} ${biz.name}", style = MaterialTheme.typography.bodyLarge)
                        Text(
                            "${biz.industry} • Billing: ${biz.billingCurrency} • Display: ${biz.displayCurrency}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    if (isActive) {
                        StatusPill(label = "Active", color = EmeraldSuccess)
                    } else {
                        TextButton(onClick = { onSwitchBusiness(biz.id) }) {
                            Text("Switch")
                        }
                    }
                }
            }
        }

        // Regional & Currency Settings
        MarketOsCard(modifier = Modifier.fillMaxWidth()) {
            Text("Regional & Display Currency", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(4.dp))
            Text(
                "Billing currency (${business.billingCurrency}) is preserved; display currency converts values using ${exchangeRates.sourceLabel}.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(10.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedButton(onClick = { showCountryPicker = true }, modifier = Modifier.weight(1f)) {
                    Text("${selectedCountry.flag} ${selectedCountry.name}")
                }
                OutlinedButton(onClick = { showCurrencyPicker = true }, modifier = Modifier.weight(1f)) {
                    Text("Display: $displayCurrency")
                }
            }
            Spacer(Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(value = language, onValueChange = { language = it }, label = { Text("Language") }, singleLine = true, modifier = Modifier.weight(1f))
                OutlinedTextField(value = timeZone, onValueChange = { timeZone = it }, label = { Text("Time Zone") }, singleLine = true, modifier = Modifier.weight(1f))
            }
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(value = websiteUrl, onValueChange = { websiteUrl = it }, label = { Text("Website URL") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onRefreshRates) {
                    Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Refresh FX")
                }
                Button(
                    onClick = {
                        onUpdateRegionalSettings(
                            business.copy(
                                countryCode = selectedCountry.code,
                                countryName = selectedCountry.name,
                                displayCurrency = displayCurrency,
                                language = language.ifBlank { selectedCountry.defaultLanguage },
                                timeZone = timeZone.ifBlank { selectedCountry.defaultTimeZone },
                                dateFormat = selectedCountry.defaultDateFormat,
                                numberFormat = selectedCountry.defaultNumberLocale,
                                websiteUrl = websiteUrl.trim()
                            )
                        )
                    },
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Save Regional Settings")
                }
            }
        }

        // Subscription Plans (Billing-Ready Architecture)
        MarketOsCard(modifier = Modifier.fillMaxWidth()) {
            Text("Subscription Plans (Billing-Ready)", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(4.dp))
            Text(
                "Plan limits are enforced live. Select a tier to preview workspace quotas; Google Play Billing / Stripe checkout connects on release.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(10.dp))
            SubscriptionTier.entries.forEach { tier ->
                val priceConverted = exchangeRates.convert(tier.usdMonthlyEstimate, "USD", business.displayCurrency)
                val priceText = CurrencyEngine.formatAmount(priceConverted, business.displayCurrency, business.numberFormat)
                val isCurrent = currentTier == tier
                MarketOsCard(
                    highlighted = isCurrent,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    onClick = {
                        onSelectPlanPreview(profile?.displayName ?: "MarketOS Owner", tier)
                    }
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("${tier.displayName} • $priceText/mo", style = MaterialTheme.typography.titleMedium)
                            Text(tier.featuresSummary, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        if (isCurrent) {
                            StatusPill(label = "Current", color = BrightViolet)
                        }
                    }
                }
            }
        }

        // Appearance & Account
        MarketOsCard(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Dark SaaS Theme", style = MaterialTheme.typography.titleMedium)
                    Text("Near-black canvas with violet accents", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Switch(
                    checked = isDarkTheme,
                    onCheckedChange = onToggleTheme,
                    modifier = Modifier.testTag("theme_switch")
                )
            }
            Spacer(Modifier.height(12.dp))
            Text("Signed in as ${profile?.email.orEmpty()}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(8.dp))
            OutlinedButton(
                onClick = onSignOut,
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("sign_out_button")
            ) {
                Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("Sign Out")
            }
        }
    }

    if (showCountryPicker) {
        CountryPickerDialog(
            selectedCode = selectedCountry.code,
            onSelect = { selectedCountry = it; showCountryPicker = false },
            onDismiss = { showCountryPicker = false }
        )
    }
    if (showCurrencyPicker) {
        CurrencyPickerDialog(
            selectedCode = displayCurrency,
            onSelect = { displayCurrency = it.code; showCurrencyPicker = false },
            onDismiss = { showCurrencyPicker = false }
        )
    }
}
