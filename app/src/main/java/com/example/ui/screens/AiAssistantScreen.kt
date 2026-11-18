package com.example.ui.screens

import android.graphics.Bitmap
import android.graphics.ImageDecoder
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.AttachFile
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.example.data.ai.AiGeneratedDeliverable
import com.example.data.intl.CountryCatalog
import com.example.data.model.AiMessage
import com.example.data.model.AiModule
import com.example.data.model.BusinessWorkspace
import com.example.data.model.UiState
import com.example.ui.components.AiDeliverablePreviewCard
import com.example.ui.components.AiGeneratingCard
import com.example.ui.components.EmptyStateCard
import com.example.ui.components.ErrorBanner
import com.example.ui.components.MarketOsCard
import com.example.ui.components.StatusPill
import com.example.ui.theme.BrightViolet

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AiAssistantScreen(
    business: BusinessWorkspace,
    messages: List<AiMessage>,
    aiState: UiState<AiGeneratedDeliverable>,
    providerLabel: String,
    onSendPrompt: (prompt: String, module: AiModule?, bitmap: Bitmap?, attachmentLabel: String) -> Unit,
    onSaveDeliverableContent: (AiGeneratedDeliverable, submitForApproval: Boolean) -> Unit,
    onSaveDeliverableCampaign: (AiGeneratedDeliverable) -> Unit,
    onDismissDeliverable: () -> Unit
) {
    val context = LocalContext.current
    var promptText by remember { mutableStateOf("") }
    var lastSentPrompt by remember { mutableStateOf("") }
    var selectedBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var attachmentName by remember { mutableStateOf("") }

    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri: Uri? ->
        if (uri != null) {
            try {
                val bmp = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    val src = ImageDecoder.createSource(context.contentResolver, uri)
                    ImageDecoder.decodeBitmap(src) { decoder, _, _ ->
                        decoder.isMutableRequired = false
                    }
                } else {
                    @Suppress("DEPRECATION")
                    MediaStore.Images.Media.getBitmap(context.contentResolver, uri)
                }
                // Downscale large images to keep payload well below 20MB
                val maxDim = 1280
                val scale = minOf(1f, maxDim.toFloat() / maxOf(bmp.width, bmp.height).toFloat())
                selectedBitmap = if (scale < 1f) {
                    Bitmap.createScaledBitmap(
                        bmp,
                        (bmp.width * scale).toInt().coerceAtLeast(1),
                        (bmp.height * scale).toInt().coerceAtLeast(1),
                        true
                    )
                } else bmp
                attachmentName = uri.lastPathSegment ?: "Attached image"
            } catch (_: Exception) {
                attachmentName = ""
                selectedBitmap = null
            }
        }
    }

    val currency = CountryCatalog.findCurrency(business.billingCurrency)
    val regionalPrompts = remember(business.countryCode, business.billingCurrency, business.industry) {
        listOf(
            "Create a 7-day Instagram campaign for ${business.name}",
            if (business.countryCode == "IN") "Prepare a Diwali marketing campaign"
            else "Prepare a seasonal holiday promotion campaign",
            "Generate an email campaign for our flagship offer",
            "Create a monthly marketing strategy with a ${currency.symbol}5,000 budget"
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        MarketOsCard(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("MarketOS Central AI Orchestrator", style = MaterialTheme.typography.titleLarge)
                    Text(
                        text = "$providerLabel • Context: ${business.name} (${business.countryName}, ${business.billingCurrency})",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                StatusPill(label = "Grounded", color = BrightViolet)
            }
        }

        // Quick prompt suggestions
        Text("Suggested Prompts", style = MaterialTheme.typography.labelLarge)
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            regionalPrompts.forEach { sample ->
                AssistChip(
                    onClick = { promptText = sample },
                    label = { Text(sample) }
                )
            }
        }

        // Prompt Composer
        MarketOsCard(highlighted = true, modifier = Modifier.fillMaxWidth()) {
            OutlinedTextField(
                value = promptText,
                onValueChange = { promptText = it },
                label = { Text("Ask your AI marketing department...") },
                placeholder = { Text("e.g., Launch a weekend offer for Instagram & Email") },
                minLines = 3,
                maxLines = 6,
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("ai_assistant_prompt_input")
            )
            if (attachmentName.isNotBlank()) {
                Spacer(Modifier.height(8.dp))
                Surface(
                    shape = MaterialTheme.shapes.small,
                    color = MaterialTheme.colorScheme.primaryContainer
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Image: $attachmentName",
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.weight(1f)
                        )
                        IconButton(
                            onClick = { selectedBitmap = null; attachmentName = "" },
                            modifier = Modifier.size(24.dp)
                        ) {
                            Icon(Icons.Default.Close, contentDescription = "Remove image", modifier = Modifier.size(16.dp))
                        }
                    }
                }
            }
            Spacer(Modifier.height(10.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedButton(
                    onClick = {
                        photoPickerLauncher.launch(
                            PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                        )
                    },
                    modifier = Modifier.testTag("ai_attach_image_button")
                ) {
                    Icon(Icons.Default.AttachFile, contentDescription = "Attach image", modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Image")
                }
                Button(
                    onClick = {
                        val trimmed = promptText.trim()
                        if (trimmed.isNotEmpty()) {
                            lastSentPrompt = trimmed
                            onSendPrompt(trimmed, null, selectedBitmap, attachmentName)
                            promptText = ""
                            selectedBitmap = null
                            attachmentName = ""
                        }
                    },
                    enabled = promptText.isNotBlank() && aiState !is UiState.Loading,
                    modifier = Modifier
                        .weight(1f)
                        .testTag("ai_send_prompt_button")
                ) {
                    Icon(Icons.AutoMirrored.Filled.Send, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Orchestrate")
                }
            }
        }

        // Live Generation Status / Output
        when (aiState) {
            is UiState.Loading -> AiGeneratingCard()
            is UiState.Error -> ErrorBanner(
                message = aiState.message,
                onRetry = if (lastSentPrompt.isNotBlank()) {
                    { onSendPrompt(lastSentPrompt, null, null, "") }
                } else null,
                onDismiss = onDismissDeliverable
            )
            is UiState.Success -> {
                AiDeliverablePreviewCard(
                    deliverable = aiState.data,
                    onSaveDraft = { onSaveDeliverableContent(aiState.data, false) },
                    onSubmitApproval = { onSaveDeliverableContent(aiState.data, true) },
                    onSaveAsCampaign = { onSaveDeliverableCampaign(aiState.data) },
                    onRegenerate = if (lastSentPrompt.isNotBlank()) {
                        { onSendPrompt(lastSentPrompt, aiState.data.selectedModule, null, "") }
                    } else null,
                    onDismiss = onDismissDeliverable
                )
            }
            UiState.Idle -> {}
        }

        // Persistent Conversation History
        Text("Conversation History (${messages.size})", style = MaterialTheme.typography.titleMedium)
        if (messages.isEmpty()) {
            EmptyStateCard(
                icon = Icons.Default.AutoAwesome,
                title = "Start collaborating with MarketOS AI",
                description = "Your assistant remembers ${business.name}'s brand voice, country, and currency across every conversation."
            )
        } else {
            messages.reversed().take(20).forEach { msg ->
                val isUser = msg.role == "USER"
                MarketOsCard(
                    highlighted = !isUser,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = if (isUser) "You" else "MarketOS • ${msg.moduleUsed}",
                            style = MaterialTheme.typography.labelLarge,
                            color = if (isUser) MaterialTheme.colorScheme.onSurfaceVariant else BrightViolet
                        )
                        if (msg.attachmentLabel.isNotBlank()) {
                            StatusPill(label = msg.attachmentLabel, color = BrightViolet)
                        }
                    }
                    if (msg.structuredPreview.isNotBlank()) {
                        Spacer(Modifier.height(4.dp))
                        Text(
                            text = msg.structuredPreview,
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                    Spacer(Modifier.height(6.dp))
                    Text(
                        text = msg.messageText,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
            }
        }
    }
}
