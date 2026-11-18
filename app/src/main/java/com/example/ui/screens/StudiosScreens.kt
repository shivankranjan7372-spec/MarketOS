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
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Palette
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.example.data.ai.AiGeneratedDeliverable
import com.example.data.model.AiModule
import com.example.data.model.BusinessWorkspace
import com.example.data.model.UiState
import com.example.data.model.WebsiteSeoMetadata
import com.example.ui.components.AiDeliverablePreviewCard
import com.example.ui.components.AiGeneratingCard
import com.example.ui.components.ErrorBanner
import com.example.ui.components.MarketOsCard
import com.example.ui.components.StatusPill
import com.example.ui.theme.AmberWarning
import com.example.ui.theme.BrightViolet
import com.example.ui.theme.EmeraldSuccess

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SocialMediaStudioScreen(
    business: BusinessWorkspace,
    aiState: UiState<AiGeneratedDeliverable>,
    onGenerate: (String, AiModule) -> Unit,
    onSaveContent: (AiGeneratedDeliverable, Boolean) -> Unit,
    onDismissAi: () -> Unit
) {
    val formats = listOf("Instagram Caption", "Facebook Post", "Reel Concept", "7-Day Content Calendar", "Creative Brief")
    var selectedFormat by remember { mutableStateOf(formats.first()) }
    var topic by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Social Media Studio", style = MaterialTheme.typography.headlineMedium)
        MarketOsCard(highlighted = true, modifier = Modifier.fillMaxWidth()) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.Share, contentDescription = null, tint = BrightViolet)
                Text("Social Media Agent (${business.countryName})", style = MaterialTheme.typography.titleMedium)
            }
            Spacer(Modifier.height(8.dp))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                formats.forEach { f ->
                    FilterChip(selected = selectedFormat == f, onClick = { selectedFormat = f }, label = { Text(f) })
                }
            }
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = topic,
                onValueChange = { topic = it },
                label = { Text("Product, offer, or occasion") },
                placeholder = { Text("e.g., Weekend brunch special or new festive collection") },
                minLines = 2,
                modifier = Modifier.fillMaxWidth().testTag("social_studio_topic_input")
            )
            Spacer(Modifier.height(10.dp))
            Button(
                onClick = {
                    val prompt = "Create a $selectedFormat for ${business.name} (${business.industry}) in ${business.countryName}. Topic: ${topic.trim()}. Include platform-specific formatting and hashtags."
                    onGenerate(prompt, AiModule.SOCIAL_MEDIA)
                },
                enabled = topic.isNotBlank() && aiState !is UiState.Loading,
                modifier = Modifier.fillMaxWidth().testTag("social_studio_generate_button")
            ) {
                Icon(Icons.Default.AutoAwesome, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text("Generate $selectedFormat")
            }
        }
        AiResultSection(aiState, onSaveContent, onDismissAi)
    }
}

@Composable
fun SeoStudioScreen(
    business: BusinessWorkspace,
    seoFetchState: UiState<WebsiteSeoMetadata>,
    aiState: UiState<AiGeneratedDeliverable>,
    onFetchWebsite: (String) -> Unit,
    onGenerateSeo: (prompt: String, extraContext: String) -> Unit,
    onSaveContent: (AiGeneratedDeliverable, Boolean) -> Unit,
    onDismissAi: () -> Unit
) {
    var websiteInput by remember(business.id) { mutableStateOf(business.websiteUrl) }
    var focusTopic by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("SEO Studio", style = MaterialTheme.typography.headlineMedium)
        MarketOsCard(modifier = Modifier.fillMaxWidth()) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.Language, contentDescription = null, tint = BrightViolet)
                Text("Live Website Metadata Inspector", style = MaterialTheme.typography.titleMedium)
            }
            Spacer(Modifier.height(6.dp))
            Text(
                "Fetches actual HTML title, meta description, and H1 tags. MarketOS never fabricates search volume or domain authority metrics.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = websiteInput,
                onValueChange = { websiteInput = it },
                label = { Text("Business Website URL") },
                placeholder = { Text("https://yourbusiness.com") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().testTag("seo_url_input")
            )
            Spacer(Modifier.height(8.dp))
            OutlinedButton(
                onClick = { onFetchWebsite(websiteInput) },
                enabled = websiteInput.isNotBlank() && seoFetchState !is UiState.Loading,
                modifier = Modifier.fillMaxWidth().testTag("seo_fetch_button")
            ) {
                if (seoFetchState is UiState.Loading) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                    Spacer(Modifier.width(8.dp))
                    Text("Inspecting URL...")
                } else {
                    Text("Inspect Live Website Tags")
                }
            }
            when (seoFetchState) {
                is UiState.Error -> {
                    Spacer(Modifier.height(8.dp))
                    ErrorBanner(message = seoFetchState.message)
                }
                is UiState.Success -> {
                    val m = seoFetchState.data
                    Spacer(Modifier.height(10.dp))
                    StatusPill(label = "HTTP ${m.httpStatus} • ~${m.wordCountEstimate} words", color = EmeraldSuccess)
                    Spacer(Modifier.height(6.dp))
                    Text("Title: ${m.title}", style = MaterialTheme.typography.bodySmall)
                    Text("Meta Description: ${m.metaDescription}", style = MaterialTheme.typography.bodySmall)
                    Text("Primary H1: ${m.primaryHeading}", style = MaterialTheme.typography.bodySmall)
                }
                else -> {}
            }
        }

        MarketOsCard(highlighted = true, modifier = Modifier.fillMaxWidth()) {
            Text("SEO Strategy & Content Briefs", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = focusTopic,
                onValueChange = { focusTopic = it },
                label = { Text("Target product, service, or blog keyword") },
                placeholder = { Text("e.g., Organic cotton kurtas in Mumbai / Local coffee roastery") },
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(Modifier.height(10.dp))
            Button(
                onClick = {
                    val liveMeta = (seoFetchState as? UiState.Success)?.data
                    val extra = if (liveMeta != null) {
                        "Real fetched website metadata for ${liveMeta.url}: HTTP ${liveMeta.httpStatus}, Title='${liveMeta.title}', MetaDesc='${liveMeta.metaDescription}', H1='${liveMeta.primaryHeading}', Words=${liveMeta.wordCountEstimate}"
                    } else "No live website snapshot fetched yet; provide qualitative keyword ideas, meta title/description, and blog outline without inventing traffic numbers."
                    onGenerateSeo(
                        "Generate SEO keyword suggestions, improved meta title & meta description, and a blog outline for: ${focusTopic.ifBlank { business.industry }}.",
                        extra
                    )
                },
                enabled = aiState !is UiState.Loading,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.AutoAwesome, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text("Generate SEO Strategy")
            }
        }
        AiResultSection(aiState, onSaveContent, onDismissAi)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun EmailStudioScreen(
    business: BusinessWorkspace,
    aiState: UiState<AiGeneratedDeliverable>,
    onGenerate: (String, AiModule) -> Unit,
    onSaveContent: (AiGeneratedDeliverable, Boolean) -> Unit,
    onDismissAi: () -> Unit
) {
    val types = listOf("Promotional Email", "Monthly Newsletter", "3-Step Follow-up Sequence", "Win-Back Campaign")
    var selectedType by remember { mutableStateOf(types.first()) }
    var audienceSegment by remember { mutableStateOf("All opted-in customers") }
    var offerDetails by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Email Studio", style = MaterialTheme.typography.headlineMedium)
        MarketOsCard(highlighted = true, modifier = Modifier.fillMaxWidth()) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.Email, contentDescription = null, tint = BrightViolet)
                Text("Email Marketing Agent", style = MaterialTheme.typography.titleMedium)
            }
            Spacer(Modifier.height(8.dp))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                types.forEach { t ->
                    FilterChip(selected = selectedType == t, onClick = { selectedType = t }, label = { Text(t) })
                }
            }
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = audienceSegment,
                onValueChange = { audienceSegment = it },
                label = { Text("Audience Segment") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = offerDetails,
                onValueChange = { offerDetails = it },
                label = { Text("Email goal, offer, or announcement") },
                minLines = 2,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(Modifier.height(10.dp))
            Button(
                onClick = {
                    onGenerate(
                        "Create a $selectedType for segment '$audienceSegment' for ${business.name}. Goal: ${offerDetails.trim()}. Include 3 subject lines, preview text, body copy, and CTA.",
                        AiModule.EMAIL_STUDIO
                    )
                },
                enabled = offerDetails.isNotBlank() && aiState !is UiState.Loading,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.AutoAwesome, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text("Draft Email Campaign")
            }
        }
        AiResultSection(aiState, onSaveContent, onDismissAi)
    }
}

@Composable
fun BrandStudioScreen(
    business: BusinessWorkspace,
    aiState: UiState<AiGeneratedDeliverable>,
    onSaveBrandProfile: (voice: String, audience: String, guidelines: String, visual: String) -> Unit,
    onGenerateBrandBrief: (String, AiModule) -> Unit,
    onSaveContent: (AiGeneratedDeliverable, Boolean) -> Unit,
    onDismissAi: () -> Unit
) {
    var voice by remember(business.id) { mutableStateOf(business.brandVoice) }
    var audience by remember(business.id) { mutableStateOf(business.targetAudience) }
    var guidelines by remember(business.id) { mutableStateOf(business.brandGuidelines) }
    var visual by remember(business.id) { mutableStateOf(business.visualDirection) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Brand Studio", style = MaterialTheme.typography.headlineMedium)
        MarketOsCard(modifier = Modifier.fillMaxWidth()) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.Palette, contentDescription = null, tint = BrightViolet)
                Text("Brand Memory & Guidelines", style = MaterialTheme.typography.titleMedium)
            }
            Spacer(Modifier.height(6.dp))
            Text(
                "Saved here directly feeds the Central AI Orchestrator for all campaigns, social posts, emails, and ads.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = voice,
                onValueChange = { voice = it },
                label = { Text("Brand Voice & Tone") },
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = audience,
                onValueChange = { audience = it },
                label = { Text("Target Audience Persona") },
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = guidelines,
                onValueChange = { guidelines = it },
                label = { Text("Messaging Guidelines & Do's / Don'ts") },
                minLines = 2,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = visual,
                onValueChange = { visual = it },
                label = { Text("Visual Direction & Aesthetic") },
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = { onSaveBrandProfile(voice, audience, guidelines, visual) },
                    modifier = Modifier.weight(1f).testTag("save_brand_profile_button")
                ) {
                    Text("Save Brand Memory")
                }
                OutlinedButton(
                    onClick = {
                        onGenerateBrandBrief(
                            "Develop a cohesive brand identity brief, messaging pillars, and visual direction for ${business.name} (${business.industry}) in ${business.countryName}.",
                            AiModule.BRAND_STUDIO
                        )
                    },
                    enabled = aiState !is UiState.Loading,
                    modifier = Modifier.weight(1f)
                ) {
                    Text("AI Brand Brief")
                }
            }
        }
        AiResultSection(aiState, onSaveContent, onDismissAi)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AdsStudioScreen(
    business: BusinessWorkspace,
    aiState: UiState<AiGeneratedDeliverable>,
    onGenerate: (String, AiModule) -> Unit,
    onSaveContent: (AiGeneratedDeliverable, Boolean) -> Unit,
    onDismissAi: () -> Unit
) {
    val channels = listOf("Instagram Ads", "Facebook Ads", "Google Search Ads")
    var selectedChannel by remember { mutableStateOf(channels.first()) }
    var budgetHint by remember { mutableStateOf("5000") }
    var offer by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Ads Studio", style = MaterialTheme.typography.headlineMedium)

        // Safety Notice: Never auto-launch paid ads
        MarketOsCard(modifier = Modifier.fillMaxWidth()) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.Security, contentDescription = null, tint = AmberWarning)
                Text("Owner Approval Required Before Any Paid Spend", style = MaterialTheme.typography.titleMedium)
            }
            Spacer(Modifier.height(4.dp))
            Text(
                "MarketOS generates ad copy, creative briefs, targeting ideas, and budget plans as drafts. Paid campaigns are never auto-launched.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        MarketOsCard(highlighted = true, modifier = Modifier.fillMaxWidth()) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.Campaign, contentDescription = null, tint = BrightViolet)
                Text("Advertising Agent", style = MaterialTheme.typography.titleMedium)
            }
            Spacer(Modifier.height(8.dp))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                channels.forEach { ch ->
                    FilterChip(selected = selectedChannel == ch, onClick = { selectedChannel = ch }, label = { Text(ch) })
                }
            }
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = budgetHint,
                onValueChange = { budgetHint = it },
                label = { Text("Proposed Budget (${business.billingCurrency})") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = offer,
                onValueChange = { offer = it },
                label = { Text("Product, offer, & landing goal") },
                minLines = 2,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(Modifier.height(10.dp))
            Button(
                onClick = {
                    onGenerate(
                        "Create $selectedChannel ad copy variations, creative brief, audience targeting suggestions, and budget allocation for ${business.billingCurrency} $budgetHint. Offer: ${offer.trim()}.",
                        AiModule.ADS_STUDIO
                    )
                },
                enabled = offer.isNotBlank() && aiState !is UiState.Loading,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.AutoAwesome, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text("Generate Ad Draft")
            }
        }
        AiResultSection(aiState, onSaveContent, onDismissAi)
    }
}

@Composable
private fun AiResultSection(
    aiState: UiState<AiGeneratedDeliverable>,
    onSaveContent: (AiGeneratedDeliverable, Boolean) -> Unit,
    onDismissAi: () -> Unit
) {
    when (aiState) {
        is UiState.Loading -> AiGeneratingCard()
        is UiState.Error -> ErrorBanner(message = aiState.message, onDismiss = onDismissAi)
        is UiState.Success -> AiDeliverablePreviewCard(
            deliverable = aiState.data,
            onSaveDraft = { onSaveContent(aiState.data, false) },
            onSubmitApproval = { onSaveContent(aiState.data, true) },
            onDismiss = onDismissAi
        )
        UiState.Idle -> {}
    }
}
