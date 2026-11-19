package com.example

import com.example.core.CytonPolicyDecision
import com.example.core.CytonPolicyEngine
import com.example.data.model.CytonAgentRole
import com.example.data.model.CytonAutonomyMode
import com.example.data.model.CytonLedgerStatus
import com.example.data.model.CytonSettings
import com.example.data.model.CytonTool
import com.example.data.model.CytonUsageLedger
import com.example.data.model.SubscriptionTier
import com.example.data.model.UserProfile
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CytonPhase1Test {

    private fun sampleProfile(
        tier: SubscriptionTier = SubscriptionTier.GROWTH,
        usedThisMonth: Long = 10L
    ) = UserProfile(
        id = "user_1",
        userId = "user_1",
        displayName = "Test Owner",
        email = "owner@marketos.test",
        subscriptionTier = tier.name,
        activeBusinessId = "biz_1",
        aiGenerationsThisMonth = usedThisMonth,
        aiTokenCountThisMonth = 2000L
    )

    private fun sampleSettings(
        mode: CytonAutonomyMode = CytonAutonomyMode.SEMI_AUTONOMOUS,
        paused: Boolean = false,
        dailyBudget: Long = 25L
    ) = CytonSettings(
        id = "default",
        userId = "user_1",
        businessId = "biz_1",
        autonomyMode = mode.name,
        emergencyPaused = paused,
        dailyCreditBudget = dailyBudget
    )

    @Test
    fun `agent permission matrix restricts tools strictly per agent role`() {
        assertTrue(CytonPolicyEngine.isToolPermittedForRole(CytonAgentRole.ANALYST, CytonTool.DETECT_ANOMALIES))
        assertFalse(CytonPolicyEngine.isToolPermittedForRole(CytonAgentRole.ANALYST, CytonTool.PUBLISH_EXTERNAL_CONTENT))
        assertFalse(CytonPolicyEngine.isToolPermittedForRole(CytonAgentRole.CREATIVE, CytonTool.CALCULATE_MARGINS_AND_COSTS))
        assertTrue(CytonPolicyEngine.isToolPermittedForRole(CytonAgentRole.FINANCE, CytonTool.CALCULATE_MARGINS_AND_COSTS))
        assertTrue(CytonPolicyEngine.isToolPermittedForRole(CytonAgentRole.GROWTH, CytonTool.DESIGN_GROWTH_EXPERIMENT))
        assertTrue(CytonPolicyEngine.isToolPermittedForRole(CytonAgentRole.OPERATIONS, CytonTool.SCHEDULE_WORKFLOW_TASK))

        // No agent may directly modify billing or subscription tier
        CytonAgentRole.entries.forEach { role ->
            assertFalse(CytonPolicyEngine.isToolPermittedForRole(role, CytonTool.MODIFY_BUDGET_OR_BILLING))
        }
    }

    @Test
    fun `emergency kill switch blocks all agent execution immediately`() {
        val decision = CytonPolicyEngine.evaluateExecutionPolicy(
            profile = sampleProfile(),
            settings = sampleSettings(paused = true),
            role = CytonAgentRole.ANALYST,
            tool = CytonTool.READ_BUSINESS_METRICS,
            creditsUsedToday = 0L,
            workflowBudgetCap = 10L,
            ownerApprovedExplicitly = true
        )
        assertTrue(decision is CytonPolicyDecision.Denied)
        assertTrue((decision as CytonPolicyDecision.Denied).reason.contains("emergency pause", ignoreCase = true))
    }

    @Test
    fun `publishing and supervised mode enforce explicit owner approval`() {
        val publishDecision = CytonPolicyEngine.evaluateExecutionPolicy(
            profile = sampleProfile(),
            settings = sampleSettings(mode = CytonAutonomyMode.AUTONOMOUS_DRAFTS),
            role = CytonAgentRole.OPERATIONS,
            tool = CytonTool.PUBLISH_EXTERNAL_CONTENT,
            creditsUsedToday = 0L,
            workflowBudgetCap = 10L,
            ownerApprovedExplicitly = false
        )
        assertTrue(publishDecision is CytonPolicyDecision.RequiresApproval)

        val supervisedDecision = CytonPolicyEngine.evaluateExecutionPolicy(
            profile = sampleProfile(),
            settings = sampleSettings(mode = CytonAutonomyMode.SUPERVISED),
            role = CytonAgentRole.MARKETING,
            tool = CytonTool.GENERATE_STRATEGY_PLAN,
            creditsUsedToday = 0L,
            workflowBudgetCap = 10L,
            ownerApprovedExplicitly = false
        )
        assertTrue(supervisedDecision is CytonPolicyDecision.RequiresApproval)

        val approvedDecision = CytonPolicyEngine.evaluateExecutionPolicy(
            profile = sampleProfile(),
            settings = sampleSettings(mode = CytonAutonomyMode.SUPERVISED),
            role = CytonAgentRole.MARKETING,
            tool = CytonTool.GENERATE_STRATEGY_PLAN,
            creditsUsedToday = 0L,
            workflowBudgetCap = 10L,
            ownerApprovedExplicitly = true
        )
        assertTrue(approvedDecision is CytonPolicyDecision.Permitted)
    }

    @Test
    fun `budget and quota caps deny over-limit requests`() {
        val overDaily = CytonPolicyEngine.evaluateExecutionPolicy(
            profile = sampleProfile(),
            settings = sampleSettings(dailyBudget = 5L),
            role = CytonAgentRole.CREATIVE,
            tool = CytonTool.REQUEST_VIDEO_GENERATION,
            creditsUsedToday = 0L,
            workflowBudgetCap = 20L,
            ownerApprovedExplicitly = false
        )
        assertTrue(overDaily is CytonPolicyDecision.Denied)

        val overMonthly = CytonPolicyEngine.evaluateExecutionPolicy(
            profile = sampleProfile(tier = SubscriptionTier.STARTER, usedThisMonth = 24L),
            settings = sampleSettings(dailyBudget = 25L),
            role = CytonAgentRole.MARKETING,
            tool = CytonTool.GENERATE_STRATEGY_PLAN,
            creditsUsedToday = 0L,
            workflowBudgetCap = 10L,
            ownerApprovedExplicitly = false
        )
        assertTrue(overMonthly is CytonPolicyDecision.Denied)

        val overWorkflow = CytonPolicyEngine.evaluateExecutionPolicy(
            profile = sampleProfile(),
            settings = sampleSettings(dailyBudget = 25L),
            role = CytonAgentRole.MARKETING,
            tool = CytonTool.GENERATE_STRATEGY_PLAN,
            creditsUsedToday = 0L,
            workflowBudgetCap = 2L,
            ownerApprovedExplicitly = false
        )
        assertTrue(overWorkflow is CytonPolicyDecision.Denied)
    }

    @Test
    fun `credit reservation ledger settles partial spend and refunds failures`() {
        val reserved = CytonUsageLedger(
            id = "usage_1",
            userId = "user_1",
            businessId = "biz_1",
            taskId = "task_1",
            operationType = CytonTool.GENERATE_STRATEGY_PLAN.name,
            creditsReserved = 5L,
            status = CytonLedgerStatus.RESERVED.name
        )

        val settled = CytonPolicyEngine.settleUsageLedger(reserved, actualCreditsUsed = 3L, succeeded = true)
        assertEquals(3L, settled.creditsSettled)
        assertEquals(2L, settled.creditsRefunded)
        assertEquals(CytonLedgerStatus.SETTLED.name, settled.status)

        val failed = CytonPolicyEngine.settleUsageLedger(reserved, actualCreditsUsed = 3L, succeeded = false)
        assertEquals(0L, failed.creditsSettled)
        assertEquals(5L, failed.creditsRefunded)
        assertEquals(CytonLedgerStatus.REFUNDED.name, failed.status)
    }
}
