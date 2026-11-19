package com.example.data.model

import androidx.annotation.Keep
import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentId
import com.google.firebase.firestore.IgnoreExtraProperties
import com.google.firebase.firestore.ServerTimestamp

enum class CytonAgentRole(
    val displayName: String,
    val scopeDescription: String
) {
    ANALYST("Analyst Agent", "Business analytics, reporting, trend detection, and anomaly identification"),
    MARKETING("Marketing Agent", "Campaign analysis, marketing strategies, audience insights, and improvements"),
    CREATIVE("Creative Agent", "Marketing scripts, promotional concepts, image/video generation job requests"),
    FINANCE("Finance Agent", "Revenue analysis, expenditure, API costs, credit usage, and margin calculations"),
    GROWTH("Growth Agent", "Growth opportunities, retention recommendations, experiments, and evaluations"),
    OPERATIONS("Operations Agent", "Task scheduling, workflow execution, retries, notifications, and monitoring")
}

enum class CytonTool(
    val displayName: String,
    val estimatedCredits: Int,
    val requiresOwnerApproval: Boolean
) {
    READ_BUSINESS_METRICS("Read Business Metrics & Analytics", 1, false),
    DETECT_ANOMALIES("Detect Performance Anomalies", 2, false),
    INSPECT_WEBSITE_SEO("Inspect Live Website SEO Metadata", 1, false),
    GENERATE_STRATEGY_PLAN("Generate Campaign Strategy Plan", 3, false),
    DRAFT_CONTENT_ASSET("Create Content Draft (Approval Gated)", 2, false),
    REQUEST_IMAGE_GENERATION("Request Image Generation Job", 5, false),
    REQUEST_VIDEO_GENERATION("Request Video Generation Job", 10, false),
    CALCULATE_MARGINS_AND_COSTS("Analyze Spend, API Costs & Margins", 1, false),
    DESIGN_GROWTH_EXPERIMENT("Design Growth & Retention Experiment", 2, false),
    SCHEDULE_WORKFLOW_TASK("Schedule Approved Workflow Task", 1, false),
    PUBLISH_EXTERNAL_CONTENT("Publish External Post or Ad", 1, true),
    MODIFY_BUDGET_OR_BILLING("Modify Spend Outside Budget or Billing", 0, true),
    DELETE_TENANT_DATA("Delete Business or Memory Data", 0, true)
}

enum class CytonAutonomyMode(val displayName: String) {
    SUPERVISED("Supervised (Approve Every Plan)"),
    SEMI_AUTONOMOUS("Semi-Autonomous (Analyze & Draft Freely)"),
    AUTONOMOUS_DRAFTS("Autonomous Workflows (Drafts & Scheduled Monitoring)")
}

enum class CytonPriority { LOW, NORMAL, HIGH, CRITICAL }

enum class CytonTaskStatus {
    QUEUED,
    RUNNING,
    AWAITING_APPROVAL,
    COMPLETED,
    FAILED,
    CANCELLED
}

enum class CytonWorkflowTrigger { MANUAL, SCHEDULED, METRIC_EVENT }

enum class CytonMemoryType {
    PREFERENCE,
    BRAND_GUIDELINE,
    DECISION,
    APPROVED_REC,
    REJECTED_REC,
    WORKFLOW_SUMMARY,
    PERFORMANCE_SUMMARY
}

enum class CytonInsightPriority { LOW, MEDIUM, HIGH, CRITICAL }

enum class CytonInsightOutcome { UNRATED, HELPFUL, NOT_HELPFUL }

enum class CytonApprovalActionType {
    PUBLISH_CONTENT,
    PUBLISH_AD,
    SPEND_OVER_BUDGET,
    DELETE_BUSINESS_DATA,
    CHANGE_SUBSCRIPTION_OR_BILLING,
    IRREVERSIBLE_EXTERNAL_ACTION
}

enum class CytonApprovalDecision { PENDING, APPROVED, REJECTED, EXPIRED }

enum class CytonActivityOutcome { SUCCESS, BLOCKED, FAILED, PENDING_APPROVAL }

enum class CytonLedgerStatus { RESERVED, SETTLED, REFUNDED, FAILED }

@Keep
@IgnoreExtraProperties
data class CytonSettings(
    @DocumentId val id: String = "",
    val userId: String = "",
    val businessId: String = "",
    val autonomyMode: String = CytonAutonomyMode.SEMI_AUTONOMOUS.name,
    val emergencyPaused: Boolean = false,
    val dailyCreditBudget: Long = 25L,
    val maxTasksPerHour: Long = 20L,
    val voiceEnabled: Boolean = true,
    val proactiveMonitoringEnabled: Boolean = true,
    val monitorIntervalMinutes: Long = 60L,
    val allowDashboardContext: Boolean = true,
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
) {
    fun autonomyEnum(): CytonAutonomyMode = safeEnumValueOf(autonomyMode, CytonAutonomyMode.SEMI_AUTONOMOUS)
}

@Keep
@IgnoreExtraProperties
data class CytonAgent(
    @DocumentId val id: String = "",
    val userId: String = "",
    val businessId: String = "",
    val role: String = CytonAgentRole.ANALYST.name,
    val displayName: String = "",
    val status: String = "IDLE",
    val allowedTools: List<String> = emptyList(),
    val tasksCompleted: Long = 0L,
    val lastRunAtEpoch: Long = 0L,
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
) {
    fun roleEnum(): CytonAgentRole = safeEnumValueOf(role, CytonAgentRole.ANALYST)
}

@Keep
@IgnoreExtraProperties
data class CytonTask(
    @DocumentId val id: String = "",
    val userId: String = "",
    val businessId: String = "",
    val workflowId: String = "",
    val idempotencyKey: String = "",
    val assignedAgent: String = CytonAgentRole.ANALYST.name,
    val requestedTool: String = CytonTool.READ_BUSINESS_METRICS.name,
    val title: String = "",
    val inputSummary: String = "",
    val priority: String = CytonPriority.NORMAL.name,
    val status: String = CytonTaskStatus.QUEUED.name,
    val retryCount: Int = 0,
    val maxRetries: Int = 3,
    val estimatedCredits: Long = 1L,
    val actualCredits: Long = 0L,
    val requiresApproval: Boolean = false,
    val resultSummary: String = "",
    val errorMessage: String = "",
    val scheduledRunAtEpoch: Long = 0L,
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

@Keep
@IgnoreExtraProperties
data class CytonWorkflow(
    @DocumentId val id: String = "",
    val userId: String = "",
    val businessId: String = "",
    val name: String = "",
    val objective: String = "",
    val agentsInvolved: List<String> = emptyList(),
    val triggerType: String = CytonWorkflowTrigger.MANUAL.name,
    val creditBudgetCap: Long = 15L,
    val enabled: Boolean = true,
    val lastRunAtEpoch: Long = 0L,
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

@Keep
@IgnoreExtraProperties
data class CytonMemoryEntry(
    @DocumentId val id: String = "",
    val userId: String = "",
    val businessId: String = "",
    val memoryType: String = CytonMemoryType.PREFERENCE.name,
    val title: String = "",
    val content: String = "",
    val sourceAgent: String = "",
    val retentionDays: Int = 365,
    val expiresAtEpoch: Long = 0L,
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

@Keep
@IgnoreExtraProperties
data class CytonInsight(
    @DocumentId val id: String = "",
    val userId: String = "",
    val businessId: String = "",
    val priority: String = CytonInsightPriority.MEDIUM.name,
    val category: String = "",
    val title: String = "",
    val evidenceSummary: String = "",
    val recommendedAction: String = "",
    val actualData: Boolean = true,
    val usefulOutcome: String = CytonInsightOutcome.UNRATED.name,
    val dismissed: Boolean = false,
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

@Keep
@IgnoreExtraProperties
data class CytonApprovalRequest(
    @DocumentId val id: String = "",
    val userId: String = "",
    val businessId: String = "",
    val taskId: String = "",
    val requestedByAgent: String = "",
    val actionType: String = CytonApprovalActionType.PUBLISH_CONTENT.name,
    val summary: String = "",
    val targetCollection: String = "",
    val targetId: String = "",
    val estimatedSpend: Double = 0.0,
    val currencyCode: String = "USD",
    val decision: String = CytonApprovalDecision.PENDING.name,
    val decisionNote: String = "",
    val decidedAtEpoch: Long = 0L,
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

@Keep
@IgnoreExtraProperties
data class CytonActivityLog(
    @DocumentId val id: String = "",
    val userId: String = "",
    val businessId: String = "",
    val actor: String = "",
    val action: String = "",
    val outcome: String = CytonActivityOutcome.SUCCESS.name,
    val idempotencyKey: String = "",
    val details: String = "",
    @ServerTimestamp val createdAt: Timestamp? = null
)

@Keep
@IgnoreExtraProperties
data class CytonUsageLedger(
    @DocumentId val id: String = "",
    val userId: String = "",
    val businessId: String = "",
    val taskId: String = "",
    val operationType: String = "",
    val creditsReserved: Long = 0L,
    val creditsSettled: Long = 0L,
    val creditsRefunded: Long = 0L,
    val estimatedUsdCost: Double = 0.0,
    val status: String = CytonLedgerStatus.RESERVED.name,
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

@Keep
@IgnoreExtraProperties
data class CytonSchedule(
    @DocumentId val id: String = "",
    val userId: String = "",
    val businessId: String = "",
    val workflowId: String = "",
    val cronExpression: String = "0 9 * * *",
    val timeZone: String = "UTC",
    val nextRunEpoch: Long = 0L,
    val lastRunEpoch: Long = 0L,
    val consecutiveFailures: Int = 0,
    val enabled: Boolean = true,
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)
