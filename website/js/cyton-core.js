export const CYTON_COLLECTIONS = {
  SETTINGS: "cyton_settings",
  AGENTS: "cyton_agents",
  TASKS: "cyton_tasks",
  WORKFLOWS: "cyton_workflows",
  MEMORY: "cyton_memory",
  INSIGHTS: "cyton_insights",
  APPROVALS: "cyton_approvals",
  ACTIVITY_LOGS: "cyton_activity_logs",
  USAGE: "cyton_usage",
  SCHEDULES: "cyton_schedules"
};

export const CYTON_AGENTS = {
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

export const CYTON_AUTONOMY_MODES = {
  SUPERVISED: { id: "SUPERVISED", label: "Supervised", description: "Require approval before every action plan" },
  SEMI_AUTONOMOUS: { id: "SEMI_AUTONOMOUS", label: "Semi-Autonomous", description: "Analyze & create drafts autonomously; confirm publishing & spend" },
  AUTONOMOUS_DRAFTS: { id: "AUTONOMOUS_DRAFTS", label: "Autonomous Workflows", description: "Run approved recurring workflows & proactive monitoring; confirm external actions" }
};

export const CYTON_STATES = ["ONLINE", "THINKING", "LISTENING", "PROCESSING", "PAUSED"];

export function createDefaultCytonSettings(userId, businessId) {
  return {
    userId,
    businessId,
    autonomyMode: "SEMI_AUTONOMOUS",
    emergencyPaused: false,
    dailyCreditBudget: 25,
    maxTasksPerHour: 20,
    voiceEnabled: true,
    proactiveMonitoringEnabled: true,
    monitorIntervalMinutes: 60,
    allowDashboardContext: true
  };
}

export function isAgentToolPermitted(agentRole, toolId) {
  const agent = CYTON_AGENTS[agentRole];
  return Boolean(agent && agent.allowedTools.includes(toolId));
}

export async function fetchCytonServerHealth() {
  const res = await fetch("/api/cyton/health", { method: "GET" });
  if (!res.ok) {
    throw new Error(`CYTON health endpoint unavailable (HTTP ${res.status})`);
  }
  return res.json();
}
