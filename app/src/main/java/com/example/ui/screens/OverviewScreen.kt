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
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.FactCheck
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.EditNote
import androidx.compose.material.icons.filled.EventAvailable
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.example.data.intl.CountryCatalog
import com.example.data.intl.CurrencyEngine
import com.example.data.intl.ExchangeRateSnapshot
import com.example.data.model.AnalyticsRecord
import com.example.data.model.AppSection
import com.example.data.model.ApprovalStatus
import com.example.data.model.BusinessWorkspace
import com.example.data.model.CampaignStatus
import com.example.data.model.ContentItem
import com.example.data.model.MarketingCampaign
import com.example.data.model.UserProfile
import com.example.ui.components.EmptyStateCard
import com.example.ui.components.KpiStatCard
import com.example.ui.components.MarketOsCard
import com.example.ui.components.MarketOsHeroBanner
import com.example.ui.components.StatusPill
import com.example.ui.components.approvalStatusColor
import com.example.ui.theme.AmberWarning
import com.example.ui.theme.BrightViolet
import com.example.ui.theme.EmeraldSuccess
import com.example.ui.theme.SkyInfo

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun OverviewScreen(
    business: BusinessWorkspace,
    profile: UserProfile?,
    campaigns: List<MarketingCampaign>,
    contentItems: List<ContentItem>,
    analytics: List<AnalyticsRecord>,
    exchangeRates: ExchangeRateSnapshot,
    onNavigate: (AppSection) -> Unit,
    onQuickAiRecommendation: () -> Unit
) {
    val country = CountryCatalog.findByCode(business.countryCode)
    val activeCampaigns = campaigns.filter { it.statusEnum() == CampaignStatus.ACTIVE }
    val draftItems = contentItems.filter { it.approvalEnum() == ApprovalStatus.DRAFT }
    val pendingApprovals = contentItems.filter { it.approvalEnum() == ApprovalStatus.PENDING_APPROVAL }
    val scheduledItems = contentItems.filter { it.approvalEnum() == ApprovalStatus.SCHEDULED }
    val publishedItems = contentItems.filter { it.approvalEnum() == ApprovalStatus.PUBLISHED }

    val totalSpendInDisplay = analytics.sumOf { record ->
        exchangeRates.convert(record.spendAmount, record.spendCurrency, business.displayCurrency)
    } + campaigns.sumOf { camp ->
        exchangeRates.convert(camp.spentAmount, camp.budgetCurrency, business.displayCurrency)
    }

    val tier = profile?.tierEnum() ?: com.example.data.model.SubscriptionTier.STARTER
    val aiUsed = profile?.aiGenerationsThisMonth ?: 0L
    val aiProgress = (aiUsed.toFloat() / tier.monthlyAiLimit.coerceAtLeast(1).toFloat()).coerceIn(0f, 1f)

    val actualRecords = analytics.filter { it.actualData }
    val totalImpressions = analytics.sumOf { it.impressions }
    val totalClicks = analytics.sumOf { it.clicks }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        MarketOsHeroBanner(
            title = "${country.flag} ${business.name}",
            subtitle = "${business.industry} • ${business.city.ifBlank { business.countryName }} • Display ${business.displayCurrency} • ${business.timeZone}",
            badge = "Plan. Create. Grow."
        )

        // KPI Grid Row 1
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            KpiStatCard(
                title = "Active Campaigns",
                value = activeCampaigns.size.toString(),
                caption = "${campaigns.size} total campaigns",
                icon = Icons.Default.Campaign,
                accent = BrightViolet,
                modifier = Modifier.weight(1f),
                onClick = { onNavigate(AppSection.CAMPAIGN_PLANNER) }
            )
            KpiStatCard(
                title = "Pending Approvals",
                value = pendingApprovals.size.toString(),
                caption = "${draftItems.size} drafts waiting",
                icon = Icons.AutoMirrored.Filled.FactCheck,
                accent = AmberWarning,
                modifier = Modifier.weight(1f),
                onClick = { onNavigate(AppSection.APPROVALS) }
            )
        }

        // KPI Grid Row 2
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            KpiStatCard(
                title = "Scheduled Queue",
                value = scheduledItems.size.toString(),
                caption = "${publishedItems.size} published",
                icon = Icons.Default.EventAvailable,
                accent = SkyInfo,
                modifier = Modifier.weight(1f),
                onClick = { onNavigate(AppSection.CONTENT_CALENDAR) }
            )
            KpiStatCard(
                title = "Monthly Spend",
                value = CurrencyEngine.formatAmount(
                    totalSpendInDisplay,
                    business.displayCurrency,
                    business.numberFormat
                ),
                caption = "Rate: ${exchangeRates.formattedTimestamp()}",
                icon = Icons.Default.Payments,
                accent = EmeraldSuccess,
                modifier = Modifier.weight(1f),
                onClick = { onNavigate(AppSection.ANALYTICS) }
            )
        }

        // AI Usage & Growth Recommendations
        MarketOsCard(highlighted = true, modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = BrightViolet)
                    Text("AI Department Quota & Growth", style = MaterialTheme.typography.titleMedium)
                }
                StatusPill(label = "${tier.displayName} Plan", color = BrightViolet)
            }
            Spacer(Modifier.height(10.dp))
            LinearProgressIndicator(
                progress = { aiProgress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp),
            )
            Spacer(Modifier.height(6.dp))
            Text(
                text = "$aiUsed / ${tier.monthlyAiLimit} AI generations used this month • ${profile?.aiTokenCountThisMonth ?: 0L} est. tokens",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = onQuickAiRecommendation,
                    modifier = Modifier
                        .weight(1f)
                        .testTag("overview_ask_ai_button")
                ) {
                    Icon(Icons.Default.AutoAwesome, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("AI Growth Plan")
                }
                OutlinedButton(
                    onClick = { onNavigate(AppSection.AI_ASSISTANT) },
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Open Assistant")
                }
            }
        }

        // Marketing Performance Snapshot (strictly grounded)
        MarketOsCard(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(Icons.AutoMirrored.Filled.TrendingUp, contentDescription = null, tint = EmeraldSuccess)
                    Text("Performance Snapshot", style = MaterialTheme.typography.titleMedium)
                }
                TextButton(onClick = { onNavigate(AppSection.ANALYTICS) }) {
                    Text("Full Analytics")
                }
            }
            if (analytics.isEmpty()) {
                Text(
                    text = "No verified or logged performance metrics yet. Log actual campaign results or connect analytics in Analytics.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            } else {
                Text(
                    text = "${actualRecords.size} actual record(s) • ${analytics.size - actualRecords.size} estimate(s) • $totalImpressions impressions • $totalClicks clicks",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
        }

        // Quick Launch Studios
        Text("Marketing Studios", style = MaterialTheme.typography.titleMedium)
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            AssistChip(onClick = { onNavigate(AppSection.CAMPAIGN_PLANNER) }, label = { Text("Campaign Planner") })
            AssistChip(onClick = { onNavigate(AppSection.SOCIAL_MEDIA) }, label = { Text("Social Media") })
            AssistChip(onClick = { onNavigate(AppSection.SEO_STUDIO) }, label = { Text("SEO Studio") })
            AssistChip(onClick = { onNavigate(AppSection.EMAIL_STUDIO) }, label = { Text("Email Studio") })
            AssistChip(onClick = { onNavigate(AppSection.BRAND_STUDIO) }, label = { Text("Brand Studio") })
            AssistChip(onClick = { onNavigate(AppSection.ADS_STUDIO) }, label = { Text("Ads Studio") })
        }

        // Recent Content Activity
        Text("Recent Content & Publishing Pipeline", style = MaterialTheme.typography.titleMedium)
        if (contentItems.isEmpty()) {
            EmptyStateCard(
                icon = Icons.Default.EditNote,
                title = "No content drafts yet",
                description = "Ask the AI Assistant or open Social, Email, or Ads Studio to generate your first campaign asset.",
                actionLabel = "Launch AI Assistant",
                onAction = { onNavigate(AppSection.AI_ASSISTANT) }
            )
        } else {
            contentItems.take(5).forEach { item ->
                val statusColor = approvalStatusColor(item.approvalStatus)
                MarketOsCard(
                    modifier = Modifier.fillMaxWidth(),
                    onClick = {
                        when (item.approvalEnum()) {
                            ApprovalStatus.PENDING_APPROVAL -> onNavigate(AppSection.APPROVALS)
                            ApprovalStatus.APPROVED, ApprovalStatus.SCHEDULED, ApprovalStatus.FAILED -> onNavigate(AppSection.CONTENT_CALENDAR)
                            else -> onNavigate(AppSection.APPROVALS)
                        }
                    }
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(item.title, style = MaterialTheme.typography.titleMedium)
                            Text(
                                "${item.platform} • ${item.typeEnum().displayName}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        StatusPill(label = item.approvalEnum().displayName, color = statusColor)
                    }
                }
            }
        }

        // Recently published summary
        if (publishedItems.isNotEmpty()) {
            MarketOsCard(modifier = Modifier.fillMaxWidth()) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = EmeraldSuccess)
                    Text("Recently Published (${publishedItems.size})", style = MaterialTheme.typography.titleMedium)
                }
                Spacer(Modifier.height(6.dp))
                publishedItems.take(3).forEach { pub ->
                    Text(
                        "• ${pub.title} (${pub.platform})",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}
