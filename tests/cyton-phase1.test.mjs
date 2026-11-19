import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import {
  CYTON_AGENTS,
  CYTON_AUTONOMY_MODES,
  CYTON_COLLECTIONS,
  createDefaultCytonSettings,
  isAgentToolPermitted
} from "../website/js/cyton-core.js";

const require = createRequire(import.meta.url);
const policy = require("../api/_lib/cytonPolicy.js");
const healthHandler = require("../api/cyton/health.js");
const orchestrateHandler = require("../api/cyton/orchestrate.js");

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

test("CYTON policy enforces 6 specialized agents and blocks billing overrides", () => {
  assert.equal(Object.keys(policy.CYTON_AGENTS).length, 6);
  assert.equal(Object.keys(CYTON_AGENTS).length, 6);
  assert.equal(Object.keys(CYTON_COLLECTIONS).length, 10);
  assert.equal(Object.keys(CYTON_AUTONOMY_MODES).length, 3);

  for (const agentRole of Object.keys(policy.CYTON_AGENTS)) {
    assert.equal(isAgentToolPermitted(agentRole, "MODIFY_BUDGET_OR_BILLING"), false);
  }

  const denied = policy.evaluatePolicy({
    userId: "user_1",
    subscriptionTier: "GROWTH",
    aiGenerationsThisMonth: 0,
    settings: { autonomyMode: "SEMI_AUTONOMOUS", emergencyPaused: false, dailyCreditBudget: 25 },
    agentRole: "FINANCE",
    toolId: "GENERATE_STRATEGY_PLAN"
  });
  assert.equal(denied.status, "DENIED");
});

test("CYTON policy enforces emergency pause, unverified integrations, and approval gates", () => {
  const paused = policy.evaluatePolicy({
    userId: "user_1",
    settings: { emergencyPaused: true },
    agentRole: "ANALYST",
    toolId: "READ_BUSINESS_METRICS"
  });
  assert.equal(paused.status, "DENIED");

  const unavailableImg = policy.evaluatePolicy({
    userId: "user_1",
    settings: { emergencyPaused: false, dailyCreditBudget: 25 },
    agentRole: "CREATIVE",
    toolId: "REQUEST_IMAGE_GENERATION"
  });
  assert.equal(unavailableImg.status, "UNAVAILABLE");

  const supervised = policy.evaluatePolicy({
    userId: "user_1",
    subscriptionTier: "GROWTH",
    settings: { autonomyMode: "SUPERVISED", emergencyPaused: false, dailyCreditBudget: 25 },
    agentRole: "MARKETING",
    toolId: "GENERATE_STRATEGY_PLAN",
    ownerApproved: false
  });
  assert.equal(supervised.status, "REQUIRES_APPROVAL");

  const permitted = policy.evaluatePolicy({
    userId: "user_1",
    subscriptionTier: "GROWTH",
    settings: { autonomyMode: "SEMI_AUTONOMOUS", emergencyPaused: false, dailyCreditBudget: 25 },
    agentRole: "MARKETING",
    toolId: "GENERATE_STRATEGY_PLAN"
  });
  assert.equal(permitted.status, "PERMITTED");
  assert.equal(permitted.reservedCredits, 3);
});

test("CYTON credit reservation refunds cleanly on failure and settles on success", () => {
  const settled = policy.settleCreditReservation(3, 2, true);
  assert.equal(settled.creditsSettled, 2);
  assert.equal(settled.creditsRefunded, 1);
  assert.equal(settled.status, "SETTLED");

  const refunded = policy.settleCreditReservation(3, 3, false);
  assert.equal(refunded.creditsSettled, 0);
  assert.equal(refunded.creditsRefunded, 3);
  assert.equal(refunded.status, "REFUNDED");
});

test("CYTON idempotency, sanitization, and rate limit protect orchestration", () => {
  const clean = policy.sanitizeUntrustedInput("Hello\u0000 CYTON\u0007 ", 50);
  assert.equal(clean, "Hello CYTON");

  const missingKey = policy.checkIdempotency("user_1", "short");
  assert.equal(missingKey.valid, false);

  const first = policy.checkIdempotency("user_1", "idem_key_0001");
  assert.equal(first.valid, true);
  assert.equal(first.duplicate, false);
  policy.saveIdempotencyResult(first.cacheKey, { ok: true });

  const replay = policy.checkIdempotency("user_1", "idem_key_0001");
  assert.equal(replay.duplicate, true);
  assert.deepEqual(replay.cachedResponse, { ok: true });

  const defaults = createDefaultCytonSettings("user_1", "biz_1");
  assert.equal(defaults.emergencyPaused, false);
  assert.equal(defaults.autonomyMode, "SEMI_AUTONOMOUS");
});

test("GET /api/cyton/health exposes engine metadata without leaking credentials", () => {
  const req = { method: "GET" };
  const res = createMockRes();
  healthHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.engine, "CYTON");
  assert.equal(res.body.agents.length, 6);
  assert.equal("GEMINI_API_KEY" in res.body, false);
});

test("POST /api/cyton/orchestrate rejects unauthenticated callers with 401", async () => {
  const req = { method: "POST", headers: {}, body: { command: "Analyze Q2 campaigns" } };
  const res = createMockRes();
  await orchestrateHandler(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.ok, false);
});
