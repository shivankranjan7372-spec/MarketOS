"use strict";

const SUBSCRIPTION_LIMITS = {
  STARTER: { monthlyAiLimit: 25, maxBusinesses: 1 },
  GROWTH: { monthlyAiLimit: 150, maxBusinesses: 3 },
  BUSINESS: { monthlyAiLimit: 600, maxBusinesses: 10 }
};

const CYTON_TOOLS = {
  READ_BUSINESS_METRICS: {
    id: "READ_BUSINESS_METRICS",
    displayName: "Read Business Metrics & Analytics",
    estimatedCredits: 1,
    requiresOwnerApproval: false,
    verifiedAvailable: true
  },
  DETECT_ANOMALIES: {
    id: "DETECT_ANOMALIES",
    displayName: "Detect Performance Anomalies",
    estimatedCredits: 2,
    requiresOwnerApproval: false,
    verifiedAvailable: true
  },
  INSPECT_WEBSITE_SEO: {
    id: "INSPECT_WEBSITE_SEO",
    displayName: "Inspect Live Website SEO Metadata",
    estimatedCredits: 1,
    requiresOwnerApproval: false,
    verifiedAvailable: true
  },
  GENERATE_STRATEGY_PLAN: {
    id: "GENERATE_STRATEGY_PLAN",
    displayName: "Generate Campaign Strategy Plan",
    estimatedCredits: 3,
    requiresOwnerApproval: false,
    verifiedAvailable: true
  },
  DRAFT_CONTENT_ASSET: {
    id: "DRAFT_CONTENT_ASSET",
    displayName: "Create Content Draft (Approval Gated)",
    estimatedCredits: 2,
    requiresOwnerApproval: false,
    verifiedAvailable: true
  },
  REQUEST_IMAGE_GENERATION: {
    id: "REQUEST_IMAGE_GENERATION",
    displayName: "Request Image Generation Job",
    estimatedCredits: 5,
    requiresOwnerApproval: false,
    verifiedAvailable: false,
    unavailableReason: "Server-side runtime image generation worker is scheduled for Phase 5 integration."
  },
  REQUEST_VIDEO_GENERATION: {
    id: "REQUEST_VIDEO_GENERATION",
    displayName: "Request Video Generation Job",
    estimatedCredits: 10,
    requiresOwnerApproval: false,
    verifiedAvailable: false,
    unavailableReason: "External video generation API is not configured in MarketOS integrations."
  },
  CALCULATE_MARGINS_AND_COSTS: {
    id: "CALCULATE_MARGINS_AND_COSTS",
    displayName: "Analyze Spend, API Costs & Margins",
    estimatedCredits: 1,
    requiresOwnerApproval: false,
    verifiedAvailable: true
  },
  DESIGN_GROWTH_EXPERIMENT: {
    id: "DESIGN_GROWTH_EXPERIMENT",
    displayName: "Design Growth & Retention Experiment",
    estimatedCredits: 2,
    requiresOwnerApproval: false,
    verifiedAvailable: true
  },
  SCHEDULE_WORKFLOW_TASK: {
    id: "SCHEDULE_WORKFLOW_TASK",
    displayName: "Schedule Approved Workflow Task",
    estimatedCredits: 1,
    requiresOwnerApproval: false,
    verifiedAvailable: true
  },
  PUBLISH_EXTERNAL_CONTENT: {
    id: "PUBLISH_EXTERNAL_CONTENT",
    displayName: "Publish External Post or Ad",
    estimatedCredits: 1,
    requiresOwnerApproval: true,
    verifiedAvailable: false,
    unavailableReason: "Social OAuth publishing requires backend Meta/YouTube OAuth review and explicit owner approval."
  },
  MODIFY_BUDGET_OR_BILLING: {
    id: "MODIFY_BUDGET_OR_BILLING",
    displayName: "Modify Spend Outside Budget or Billing",
    estimatedCredits: 0,
    requiresOwnerApproval: true,
    verifiedAvailable: false,
    unavailableReason: "Agents cannot directly modify MarketOS billing or subscription records."
  },
  DELETE_TENANT_DATA: {
    id: "DELETE_TENANT_DATA",
    displayName: "Delete Business or Memory Data",
    estimatedCredits: 0,
    requiresOwnerApproval: true,
    verifiedAvailable: true
  }
};

const CYTON_AGENTS = {
  ANALYST: {
    id: "ANALYST",
    displayName: "Analyst Agent",
    scope: "Business analytics, reporting, trend detection, and anomaly identification",
    allowedTools: ["READ_BUSINESS_METRICS", "DETECT_ANOMALIES", "INSPECT_WEBSITE_SEO"]
  },
  MARKETING: {
    id: "MARKETING",
    displayName: "Marketing Agent",
    scope: "Campaign analysis, marketing strategies, audience insights, and improvements",
    allowedTools: ["READ_BUSINESS_METRICS", "INSPECT_WEBSITE_SEO", "GENERATE_STRATEGY_PLAN", "DRAFT_CONTENT_ASSET"]
  },
  CREATIVE: {
    id: "CREATIVE",
    displayName: "Creative Agent",
    scope: "Marketing scripts, promotional concepts, image/video generation requests",
    allowedTools: ["DRAFT_CONTENT_ASSET", "REQUEST_IMAGE_GENERATION", "REQUEST_VIDEO_GENERATION"]
  },
  FINANCE: {
    id: "FINANCE",
    displayName: "Finance Agent",
    scope: "Revenue analysis, expenditure, API costs, credit usage, and margin calculations",
    allowedTools: ["READ_BUSINESS_METRICS", "CALCULATE_MARGINS_AND_COSTS"]
  },
  GROWTH: {
    id: "GROWTH",
    displayName: "Growth Agent",
    scope: "Growth opportunities, retention recommendations, experiments, and evaluations",
    allowedTools: ["READ_BUSINESS_METRICS", "DETECT_ANOMALIES", "DESIGN_GROWTH_EXPERIMENT", "GENERATE_STRATEGY_PLAN"]
  },
  OPERATIONS: {
    id: "OPERATIONS",
    displayName: "Operations Agent",
    scope: "Task scheduling, workflow execution, retries, notifications, and monitoring",
    allowedTools: ["READ_BUSINESS_METRICS", "SCHEDULE_WORKFLOW_TASK", "PUBLISH_EXTERNAL_CONTENT"]
  }
};

const VERIFIED_MARKETOS_ENDPOINTS = [
  "firestore:/users/{uid}",
  "firestore:/users/{uid}/businesses",
  "firestore:/users/{uid}/campaigns",
  "firestore:/users/{uid}/content_items",
  "firestore:/users/{uid}/integrations",
  "firestore:/users/{uid}/ai_messages",
  "firestore:/users/{uid}/analytics_records",
  "external:open.er-api.com/v6/latest/USD",
  "client:inspectWebsiteSeoMetadata"
];

const rateLimitStore = new Map();
const idempotencyStore = new Map();

function sanitizeUntrustedInput(raw, maxLen = 4000) {
  return String(raw ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLen);
}

function checkRateLimit(userId, limitPerMinute = 30) {
  const now = Date.now();
  const windowMs = 60_000;
  const key = String(userId || "anon");
  const entry = rateLimitStore.get(key) || [];
  const fresh = entry.filter((t) => now - t < windowMs);
  if (fresh.length >= limitPerMinute) {
    rateLimitStore.set(key, fresh);
    return { allowed: false, remaining: 0 };
  }
  fresh.push(now);
  rateLimitStore.set(key, fresh);
  return { allowed: true, remaining: limitPerMinute - fresh.length };
}

function checkIdempotency(userId, idempotencyKey) {
  const cleanKey = sanitizeUntrustedInput(idempotencyKey, 128);
  if (!cleanKey || cleanKey.length < 8) {
    return { valid: false, duplicate: false, reason: "Idempotency key (min 8 chars) is required." };
  }
  const cacheKey = `${userId}:${cleanKey}`;
  const cached = idempotencyStore.get(cacheKey);
  if (cached) {
    return { valid: true, duplicate: true, cachedResponse: cached };
  }
  return { valid: true, duplicate: false, cacheKey };
}

function saveIdempotencyResult(cacheKey, response) {
  if (!cacheKey) return;
  idempotencyStore.set(cacheKey, response);
  if (idempotencyStore.size > 500) {
    const oldest = idempotencyStore.keys().next().value;
    if (oldest) idempotencyStore.delete(oldest);
  }
}

function evaluatePolicy({
  userId,
  subscriptionTier = "STARTER",
  aiGenerationsThisMonth = 0,
  settings = {},
  agentRole,
  toolId,
  creditsUsedToday = 0,
  workflowBudgetCap = null,
  ownerApproved = false
}) {
  if (!userId || typeof userId !== "string") {
    return { status: "DENIED", reason: "Authenticated customer identity is required." };
  }
  if (settings.emergencyPaused === true) {
    return { status: "DENIED", reason: "CYTON emergency pause (kill switch) is currently active." };
  }

  const agent = CYTON_AGENTS[agentRole];
  if (!agent) {
    return { status: "DENIED", reason: `Unknown CYTON agent role: ${agentRole}` };
  }
  const tool = CYTON_TOOLS[toolId];
  if (!tool) {
    return { status: "DENIED", reason: `Unknown CYTON tool: ${toolId}` };
  }
  if (!agent.allowedTools.includes(tool.id)) {
    return {
      status: "DENIED",
      reason: `Permission denied: ${agent.displayName} cannot execute ${tool.displayName}.`
    };
  }
  if (tool.id === "MODIFY_BUDGET_OR_BILLING") {
    return {
      status: "DENIED",
      reason: "Agents are strictly forbidden from modifying billing or subscription records."
    };
  }
  if (!tool.verifiedAvailable) {
    return {
      status: "UNAVAILABLE",
      reason: tool.unavailableReason || `${tool.displayName} is not connected in MarketOS backend.`
    };
  }

  const autonomyMode = settings.autonomyMode || "SEMI_AUTONOMOUS";
  const needsApproval = tool.requiresOwnerApproval || autonomyMode === "SUPERVISED";
  if (needsApproval && !ownerApproved) {
    return {
      status: "REQUIRES_APPROVAL",
      reason: tool.requiresOwnerApproval
        ? `${tool.displayName} requires explicit owner confirmation.`
        : `Supervised autonomy policy requires owner confirmation before ${tool.displayName}.`,
      toolId: tool.id
    };
  }

  const tier = SUBSCRIPTION_LIMITS[subscriptionTier] || SUBSCRIPTION_LIMITS.STARTER;
  const remainingMonthly = Math.max(0, tier.monthlyAiLimit - (Number(aiGenerationsThisMonth) || 0));
  const neededCredits = tool.estimatedCredits;

  if (neededCredits > 0 && remainingMonthly < neededCredits) {
    return {
      status: "DENIED",
      reason: `Insufficient monthly credits (${remainingMonthly} remaining on ${subscriptionTier}, needs ${neededCredits}).`
    };
  }

  const dailyBudget = Number.isFinite(settings.dailyCreditBudget) ? settings.dailyCreditBudget : 25;
  if (neededCredits > 0 && (Number(creditsUsedToday) || 0) + neededCredits > dailyBudget) {
    return {
      status: "DENIED",
      reason: `Daily CYTON credit budget (${dailyBudget}) would be exceeded.`
    };
  }

  if (workflowBudgetCap !== null && workflowBudgetCap !== undefined && neededCredits > workflowBudgetCap) {
    return {
      status: "DENIED",
      reason: `Estimated cost (${neededCredits} credits) exceeds workflow budget cap (${workflowBudgetCap}).`
    };
  }

  return {
    status: "PERMITTED",
    reservedCredits: neededCredits,
    estimatedUsdCost: Number((neededCredits * 0.0025).toFixed(4))
  };
}

function settleCreditReservation(reservedCredits, actualCreditsUsed, succeeded) {
  const reserved = Math.max(0, Number(reservedCredits) || 0);
  const used = succeeded ? Math.min(reserved, Math.max(0, Number(actualCreditsUsed) || 0)) : 0;
  const refunded = Math.max(0, reserved - used);
  return {
    creditsReserved: reserved,
    creditsSettled: used,
    creditsRefunded: refunded,
    estimatedUsdCost: Number((used * 0.0025).toFixed(4)),
    status: !succeeded ? "REFUNDED" : refunded === reserved && reserved > 0 ? "REFUNDED" : "SETTLED"
  };
}

async function verifyFirebaseIdToken(authorizationHeader) {
  const header = String(authorizationHeader || "");
  if (!header.startsWith("Bearer ")) {
    throw Object.assign(new Error("Missing Bearer Firebase ID token."), { statusCode: 401 });
  }
  const idToken = header.slice(7).trim();
  if (!idToken || idToken.length < 20) {
    throw Object.assign(new Error("Malformed authentication token."), { statusCode: 401 });
  }
  const firebaseWebApiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!firebaseWebApiKey) {
    throw Object.assign(
      new Error("Server auth verifier not configured (FIREBASE_WEB_API_KEY missing in server environment)."),
      { statusCode: 503 }
    );
  }
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseWebApiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken })
    }
  );
  if (!res.ok) {
    throw Object.assign(new Error("Invalid or expired Firebase authentication token."), { statusCode: 401 });
  }
  const data = await res.json();
  const user = data?.users?.[0];
  if (!user?.localId) {
    throw Object.assign(new Error("Unable to resolve authenticated user identity."), { statusCode: 401 });
  }
  return { uid: user.localId, email: user.email || "" };
}

module.exports = {
  SUBSCRIPTION_LIMITS,
  CYTON_TOOLS,
  CYTON_AGENTS,
  VERIFIED_MARKETOS_ENDPOINTS,
  sanitizeUntrustedInput,
  checkRateLimit,
  checkIdempotency,
  saveIdempotencyResult,
  evaluatePolicy,
  settleCreditReservation,
  verifyFirebaseIdToken
};
