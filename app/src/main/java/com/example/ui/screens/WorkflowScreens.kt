package com.example.ui.screens

import android.content.Intent
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
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.IosShare
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
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
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.example.data.model.ApprovalStatus
import com.example.data.model.BusinessWorkspace
import com.example.data.model.ContentItem
import com.example.data.model.ContentType
import com.example.ui.components.EmptyStateCard
import com.example.ui.components.MarketOsCard
import com.example.ui.components.StatusPill
import com.example.ui.components.approvalStatusColor
import com.example.ui.theme.EmeraldSuccess
import com.example.ui.theme.RoseError
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ApprovalsScreen(
    business: BusinessWorkspace,
    contentItems: List<ContentItem>,
    onCreateDraft: (ContentItem) -> Unit,
    onEditDraft: (id: String, title: String, body: String, hashtags: String, platform: String, submit: Boolean) -> Unit,
    onApproveOrReject: (id: String, approve: Boolean, reason: String) -> Unit,
    onDeleteItem: (String) -> Unit,
    onGoToCalendar: () -> Unit
) {
    val context = LocalContext.current
    var selectedFilter by remember { mutableStateOf("QUEUE") }
    var editingItem by remember { mutableStateOf<ContentItem?>(null) }
    var creatingNew by remember { mutableStateOf(false) }
    var rejectingItem by remember { mutableStateOf<ContentItem?>(null) }

    val filtered = remember(contentItems, selectedFilter) {
        when (selectedFilter) {
            "QUEUE" -> contentItems.filter {
                it.approvalEnum() == ApprovalStatus.PENDING_APPROVAL || it.approvalEnum() == ApprovalStatus.DRAFT
            }
            "APPROVED" -> contentItems.filter { it.approvalEnum() == ApprovalStatus.APPROVED }
            "REJECTED" -> contentItems.filter { it.approvalEnum() == ApprovalStatus.REJECTED }
            else -> contentItems
        }
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
                Text("Approvals & Content Hub", style = MaterialTheme.typography.headlineMedium)
                Text(
                    "Only owner-approved content can enter the scheduling queue.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Button(
                onClick = { creatingNew = true },
                modifier = Modifier.testTag("new_content_draft_button")
            ) {
                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(4.dp))
                Text("Draft")
            }
        }

        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(
                selected = selectedFilter == "QUEUE",
                onClick = { selectedFilter = "QUEUE" },
                label = {
                    val count = contentItems.count {
                        it.approvalEnum() == ApprovalStatus.PENDING_APPROVAL || it.approvalEnum() == ApprovalStatus.DRAFT
                    }
                    Text("Review Queue ($count)")
                }
            )
            FilterChip(
                selected = selectedFilter == "APPROVED",
                onClick = { selectedFilter = "APPROVED" },
                label = { Text("Approved (${contentItems.count { it.approvalEnum() == ApprovalStatus.APPROVED }})") }
            )
            FilterChip(
                selected = selectedFilter == "REJECTED",
                onClick = { selectedFilter = "REJECTED" },
                label = { Text("Rejected (${contentItems.count { it.approvalEnum() == ApprovalStatus.REJECTED }})") }
            )
            FilterChip(
                selected = selectedFilter == "ALL",
                onClick = { selectedFilter = "ALL" },
                label = { Text("All (${contentItems.size})") }
            )
        }

        if (filtered.isEmpty()) {
            EmptyStateCard(
                icon = Icons.AutoMirrored.Filled.FactCheck,
                title = "No items in this approval stage",
                description = "Generate content with AI or create a draft to review, approve, and schedule.",
                actionLabel = "Create Draft",
                onAction = { creatingNew = true }
            )
        } else {
            filtered.forEach { item ->
                val status = item.approvalEnum()
                val statusColor = approvalStatusColor(item.approvalStatus)
                MarketOsCard(modifier = Modifier.fillMaxWidth()) {
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
                        StatusPill(label = status.displayName, color = statusColor)
                    }
                    Spacer(Modifier.height(8.dp))
                    Text(
                        text = item.body,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    if (item.hashtags.isNotBlank()) {
                        Spacer(Modifier.height(4.dp))
                        Text(
                            text = item.hashtags,
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                    if (item.rejectionReason.isNotBlank()) {
                        Spacer(Modifier.height(6.dp))
                        Text(
                            text = "Rejection reason: ${item.rejectionReason}",
                            style = MaterialTheme.typography.bodySmall,
                            color = RoseError
                        )
                    }
                    Spacer(Modifier.height(10.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (status == ApprovalStatus.DRAFT || status == ApprovalStatus.REJECTED || status == ApprovalStatus.PENDING_APPROVAL) {
                            OutlinedButton(
                                onClick = { editingItem = item },
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(4.dp))
                                Text("Edit")
                            }
                        }
                        if (status == ApprovalStatus.PENDING_APPROVAL || status == ApprovalStatus.DRAFT) {
                            Button(
                                onClick = { onApproveOrReject(item.id, true, "") },
                                colors = ButtonDefaults.buttonColors(containerColor = EmeraldSuccess),
                                modifier = Modifier
                                    .weight(1f)
                                    .testTag("approve_content_button")
                            ) {
                                Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(4.dp))
                                Text("Approve")
                            }
                            OutlinedButton(
                                onClick = { rejectingItem = item },
                                modifier = Modifier.testTag("reject_content_button")
                            ) {
                                Icon(Icons.Default.Close, contentDescription = "Reject", modifier = Modifier.size(16.dp))
                            }
                        }
                        if (status == ApprovalStatus.APPROVED) {
                            Button(
                                onClick = onGoToCalendar,
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(Icons.Default.Schedule, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(4.dp))
                                Text("Schedule in Calendar")
                            }
                        }
                        IconButton(onClick = {
                            val shareText = buildString {
                                appendLine(item.title)
                                appendLine()
                                appendLine(item.body)
                                if (item.hashtags.isNotBlank()) {
                                    appendLine()
                                    appendLine(item.hashtags)
                                }
                            }
                            val intent = Intent(Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                putExtra(Intent.EXTRA_SUBJECT, item.title)
                                putExtra(Intent.EXTRA_TEXT, shareText)
                            }
                            context.startActivity(Intent.createChooser(intent, "Export Marketing Content"))
                        }) {
                            Icon(Icons.Default.IosShare, contentDescription = "Export content")
                        }
                        IconButton(onClick = { onDeleteItem(item.id) }) {
                            Icon(Icons.Default.Delete, contentDescription = "Delete content")
                        }
                    }
                }
            }
        }
    }

    if (creatingNew || editingItem != null) {
        ContentDraftEditorDialog(
            business = business,
            initial = editingItem,
            onDismiss = { creatingNew = false; editingItem = null },
            onSave = { title, body, hashtags, platform, submit ->
                val existing = editingItem
                if (existing == null) {
                    onCreateDraft(
                        ContentItem(
                            contentType = ContentType.SOCIAL_POST.name,
                            platform = platform,
                            title = title,
                            body = body,
                            hashtags = hashtags,
                            approvalStatus = if (submit) ApprovalStatus.PENDING_APPROVAL.name else ApprovalStatus.DRAFT.name
                        )
                    )
                } else {
                    onEditDraft(existing.id, title, body, hashtags, platform, submit)
                }
                creatingNew = false
                editingItem = null
            }
        )
    }

    if (rejectingItem != null) {
        var reason by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { rejectingItem = null },
            title = { Text("Reject Content") },
            text = {
                OutlinedTextField(
                    value = reason,
                    onValueChange = { reason = it },
                    label = { Text("Rejection reason *") },
                    placeholder = { Text("e.g., Tone needs to be softer / update pricing") },
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        onApproveOrReject(rejectingItem!!.id, false, reason.ifBlank { "Needs revision" })
                        rejectingItem = null
                    }
                ) {
                    Text("Reject")
                }
            },
            dismissButton = {
                TextButton(onClick = { rejectingItem = null }) { Text("Cancel") }
            }
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ContentCalendarScreen(
    business: BusinessWorkspace,
    contentItems: List<ContentItem>,
    onScheduleApproved: (contentId: String, scheduledEpochMillis: Long) -> Unit,
    onAttemptPublish: (ContentItem) -> Unit,
    onGoToApprovals: () -> Unit
) {
    val context = LocalContext.current
    var viewMode by remember { mutableStateOf("WEEKLY") }
    var schedulingItem by remember { mutableStateOf<ContentItem?>(null) }

    val approvedReady = contentItems.filter { it.approvalEnum() == ApprovalStatus.APPROVED }
    val now = System.currentTimeMillis()
    val horizonMillis = when (viewMode) {
        "DAILY" -> 24L * 3600L * 1000L
        "WEEKLY" -> 7L * 24L * 3600L * 1000L
        else -> 31L * 24L * 3600L * 1000L
    }

    val scheduledAndQueue = contentItems.filter {
        it.approvalEnum() == ApprovalStatus.SCHEDULED ||
            it.approvalEnum() == ApprovalStatus.FAILED ||
            it.approvalEnum() == ApprovalStatus.PUBLISHED
    }.filter {
        it.scheduledEpochMillis == 0L || it.scheduledEpochMillis <= (now + horizonMillis)
    }

    val dateFormatter = remember(business.timeZone, business.dateFormat) {
        SimpleDateFormat("${business.dateFormat} HH:mm", Locale.getDefault()).apply {
            timeZone = TimeZone.getTimeZone(business.timeZone.ifBlank { "UTC" })
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Content Calendar", style = MaterialTheme.typography.headlineMedium)
        Text(
            "Timezone: ${business.timeZone} • Only Approved content can be scheduled.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("DAILY" to "Daily", "WEEKLY" to "Weekly", "MONTHLY" to "Monthly").forEach { (key, label) ->
                FilterChip(
                    selected = viewMode == key,
                    onClick = { viewMode = key },
                    label = { Text(label) }
                )
            }
        }

        // Approved & Ready to Schedule
        Text("Approved & Ready to Schedule (${approvedReady.size})", style = MaterialTheme.typography.titleMedium)
        if (approvedReady.isEmpty()) {
            MarketOsCard(modifier = Modifier.fillMaxWidth()) {
                Text(
                    "No approved items waiting to be scheduled. Approve drafts in Approvals first.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(Modifier.height(8.dp))
                OutlinedButton(onClick = onGoToApprovals) {
                    Text("Review Approvals")
                }
            }
        } else {
            approvedReady.forEach { item ->
                MarketOsCard(highlighted = true, modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(item.title, style = MaterialTheme.typography.titleMedium)
                            Text(item.platform, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Button(
                            onClick = { schedulingItem = item },
                            modifier = Modifier.testTag("schedule_item_button")
                        ) {
                            Icon(Icons.Default.Schedule, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Schedule")
                        }
                    }
                }
            }
        }

        // Publishing Queue
        Text("$viewMode Publishing Queue (${scheduledAndQueue.size})", style = MaterialTheme.typography.titleMedium)
        if (scheduledAndQueue.isEmpty()) {
            EmptyStateCard(
                icon = Icons.Default.CalendarMonth,
                title = "No scheduled posts in $viewMode view",
                description = "Schedule an approved post above, or export content directly for manual publishing."
            )
        } else {
            scheduledAndQueue.forEach { item ->
                val st = item.approvalEnum()
                val formattedTime = if (item.scheduledEpochMillis > 0L) {
                    "${dateFormatter.format(Date(item.scheduledEpochMillis))} (${item.scheduledTimeZone})"
                } else "Unscheduled"
                MarketOsCard(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(item.title, style = MaterialTheme.typography.titleMedium)
                            Text(
                                "${item.platform} • $formattedTime",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        StatusPill(label = st.displayName, color = approvalStatusColor(item.approvalStatus))
                    }
                    if (item.publishError.isNotBlank()) {
                        Spacer(Modifier.height(6.dp))
                        Text(
                            text = item.publishError,
                            style = MaterialTheme.typography.bodySmall,
                            color = RoseError
                        )
                    }
                    Spacer(Modifier.height(10.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        if (st == ApprovalStatus.SCHEDULED) {
                            OutlinedButton(
                                onClick = { onAttemptPublish(item) },
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(Icons.AutoMirrored.Filled.Send, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(4.dp))
                                Text("Run Publish Check")
                            }
                        } else if (st == ApprovalStatus.FAILED) {
                            OutlinedButton(
                                onClick = { schedulingItem = item },
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(4.dp))
                                Text("Reschedule / Retry")
                            }
                        }
                        OutlinedButton(
                            onClick = {
                                val shareText = "${item.title}\n\n${item.body}\n\n${item.hashtags}".trim()
                                val intent = Intent(Intent.ACTION_SEND).apply {
                                    type = "text/plain"
                                    putExtra(Intent.EXTRA_TEXT, shareText)
                                }
                                context.startActivity(Intent.createChooser(intent, "Export Scheduled Content"))
                            },
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.IosShare, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Export / Post")
                        }
                    }
                }
            }
        }
    }

    if (schedulingItem != null) {
        var offsetHours by remember { mutableIntStateOf(24) }
        AlertDialog(
            onDismissRequest = { schedulingItem = null },
            title = { Text("Schedule (${business.timeZone})") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Choose publish slot for '${schedulingItem!!.title}':")
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(2 to "In 2 hrs", 24 to "Tomorrow", 72 to "In 3 days", 168 to "Next Week").forEach { (hrs, lbl) ->
                            FilterChip(
                                selected = offsetHours == hrs,
                                onClick = { offsetHours = hrs },
                                label = { Text(lbl) }
                            )
                        }
                    }
                    val previewTime = dateFormatter.format(Date(System.currentTimeMillis() + offsetHours * 3600L * 1000L))
                    Text(
                        "Scheduled slot: $previewTime (${business.timeZone})",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            },
            confirmButton = {
                Button(onClick = {
                    val targetMillis = System.currentTimeMillis() + offsetHours * 3600L * 1000L
                    onScheduleApproved(schedulingItem!!.id, targetMillis)
                    schedulingItem = null
                }) {
                    Text("Confirm Schedule")
                }
            },
            dismissButton = {
                TextButton(onClick = { schedulingItem = null }) { Text("Cancel") }
            }
        )
    }
}

@Composable
private fun ContentDraftEditorDialog(
    business: BusinessWorkspace,
    initial: ContentItem?,
    onDismiss: () -> Unit,
    onSave: (title: String, body: String, hashtags: String, platform: String, submitForApproval: Boolean) -> Unit
) {
    var title by remember { mutableStateOf(initial?.title ?: "") }
    var body by remember { mutableStateOf(initial?.body ?: "") }
    var hashtags by remember { mutableStateOf(initial?.hashtags ?: "") }
    var platform by remember { mutableStateOf(initial?.platform ?: "Instagram") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (initial == null) "New Marketing Draft" else "Edit Content Draft") },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("Title *") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = platform,
                    onValueChange = { platform = it },
                    label = { Text("Platform") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = body,
                    onValueChange = { body = it },
                    label = { Text("Content Copy * (${business.language})") },
                    minLines = 4,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = hashtags,
                    onValueChange = { hashtags = it },
                    label = { Text("Hashtags / Keywords") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                OutlinedButton(
                    onClick = { onSave(title, body, hashtags, platform, false) },
                    enabled = title.isNotBlank() && body.isNotBlank()
                ) {
                    Text("Draft")
                }
                Button(
                    onClick = { onSave(title, body, hashtags, platform, true) },
                    enabled = title.isNotBlank() && body.isNotBlank()
                ) {
                    Text("For Approval")
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}
