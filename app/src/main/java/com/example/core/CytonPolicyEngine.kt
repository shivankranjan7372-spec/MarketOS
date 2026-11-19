package com.example.core

import com.example.data.model.CytonAgentRole
import com.example.data.model.CytonAutonomyMode
import com.example.data.model.CytonLedgerStatus
import com.example.data.model.CytonSettings
import com.example.data.model.CytonTool
import com.example.data.model.CytonUsageLedger
import com.example.data.model.SubscriptionTier
import com.example.data.model.UserProfile
import kotlin.math.max

sealed interface CytonPolicyDecision {
    data class Permitted(
        val reservedCredits: Int,
        val estimatedUsdCost: Double,
        val requiresConfirmation: Boolean
    ) : CytonPolicyDecision

    data class RequiresApproval(
        val reason: String,
        val tool: CytonTool
    ) : CytonPolicyDecision

    data class Denied(
        val reason: String
    ) : CytonPolicyDecision
}

object CytonPolicyEngine {

    private val rolePermissions: Map<CytonAgentRole, Set<CytonTool>> = mapOf(
        CytonAgentRole.ANALYST to setOf(
            CytonTool.READ_BUSINESS_METRICS,
            CytonTool.DETECT_ANOMALIES,
            CytonTool.INSPECT_WEBSITE_SEO
        ),
        CytonAgentRole.MARKETING to setOf(
            CytonTool.READ_BUSINESS_METRICS,
            CytonTool.INSPECT_WEBSITE_SEO,
            CytonTool.GENERATE_STRATEGY_PLAN,
            CytonTool.DRAFT_CONTENT_ASSET
        ),
        CytonAgentRole.CREATIVE to setOf(
            CytonTool.DRAFT_CONTENT_ASSET,
            CytonTool.REQUEST_IMAGE_GENERATION,
            CytonTool.REQUEST_VIDEO_GENERATION
        ),
        CytonAgentRole.FINANCE to setOf(
            CytonTool.READ_BUSINESS_METRICS,
            CytonTool.CALCULATE_MARGINS_AND_COSTS
        ),
        CytonAgentRole.GROWTH to setOf(
            CytonTool.READ_BUSINESS_METRICS,
            CytonTool.DETECT_ANOMALIES,
            CytonTool.DESIGN_GROWTH_EXPERIMENT,
            CytonTool.GENERATE_STRATEGY_PLAN
        ),
        CytonAgentRole.OPERATIONS to setOf(
            CytonTool.READ_BUSINESS_METRICS,
            CytonTool.SCHEDULE_WORKFLOW_TASK,
            CytonTool.PUBLISH_EXTERNAL_CONTENT
        )
    )

    fun allowedToolsFor(role: CytonAgentRole): Set<CytonTool> =
        rolePermissions[role].orEmpty()

    fun isToolPermittedForRole(role: CytonAgentRole, tool: CytonTool): Boolean =
        tool in allowedToolsFor(role)

    fun evaluateExecutionPolicy(
        profile: UserProfile?,
        settings: CytonSettings,
        role: CytonAgentRole,
        tool: CytonTool,
        creditsUsedToday: Long,
        workflowBudgetCap: Long?,
        ownerApprovedExplicitly: Boolean
    ): CytonPolicyDecision {
        if (profile == null || profile.userId.isBlank()) {
            return CytonPolicyDecision.Denied("Customer authentication required before CYTON execution.")
        }
        if (settings.emergencyPaused) {
            return CytonPolicyDecision.Denied("CYTON emergency pause is active. Resume operations in Control Center first.")
        }
        if (!isToolPermittedForRole(role, tool)) {
            return CytonPolicyDecision.Denied(
                "Permission denied: ${role.displayName} is not authorized to invoke ${tool.displayName}."
            )
        }
        if (tool == CytonTool.MODIFY_BUDGET_OR_BILLING) {
            return CytonPolicyDecision.Denied("Agents are never permitted to directly modify MarketOS billing or subscription records.")
        }

        val mustConfirm = tool.requiresOwnerApproval || settings.autonomyEnum() == CytonAutonomyMode.SUPERVISED
        if (mustConfirm && !ownerApprovedExplicitly) {
            return CytonPolicyDecision.RequiresApproval(
                reason = if (tool.requiresOwnerApproval) {
                    "${tool.displayName} performs an irreversible or external action and requires explicit owner approval."
                } else {
                    "Supervised autonomy mode requires owner approval before executing ${tool.displayName}."
                },
                tool = tool
            )
        }

        val tier = profile.tierEnum()
        val remainingMonthlyCredits = tier.monthlyAiLimit - profile.aiGenerationsThisMonth
        val neededCredits = tool.estimatedCredits
        if (neededCredits > 0 && remainingMonthlyCredits < neededCredits) {
            return CytonPolicyDecision.Denied(
                "Insufficient monthly credits (${remainingMonthlyCredits.coerceAtLeast(0)} left on ${tier.displayName}, needs $neededCredits)."
            )
        }
        if (neededCredits > 0 && (creditsUsedToday + neededCredits) > settings.dailyCreditBudget) {
            return CytonPolicyDecision.Denied(
                "Daily CYTON credit budget (${settings.dailyCreditBudget}) would be exceeded."
            )
        }
        if (workflowBudgetCap != null && neededCredits > workflowBudgetCap) {
            return CytonPolicyDecision.Denied(
                "Operation estimate ($neededCredits credits) exceeds workflow budget cap ($workflowBudgetCap)."
            )
        }

        val estUsdCost = neededCredits * 0.0025
        return CytonPolicyDecision.Permitted(
            reservedCredits = neededCredits,
            estimatedUsdCost = estUsdCost,
            requiresConfirmation = false
        )
    }

    fun settleUsageLedger(
        reserved: CytonUsageLedger,
        actualCreditsUsed: Long,
        succeeded: Boolean
    ): CytonUsageLedger {
        val clampedUsed = if (succeeded) {
            actualCreditsUsed.coerceIn(0L, reserved.creditsReserved)
        } else {
            0L
        }
        val refunded = max(0L, reserved.creditsReserved - clampedUsed)
        val status = when {
            !succeeded -> CytonLedgerStatus.REFUNDED.name
            refunded == reserved.creditsReserved && reserved.creditsReserved > 0L -> CytonLedgerStatus.REFUNDED.name
            else -> CytonLedgerStatus.SETTLED.name
        }
        return reserved.copy(
            creditsSettled = clampedUsed,
            creditsRefunded = refunded,
            estimatedUsdCost = clampedUsed * 0.0025,
            status = status
        )
    }

    fun subscriptionLimitFor(tier: SubscriptionTier): Int = tier.monthlyAiLimit
}
