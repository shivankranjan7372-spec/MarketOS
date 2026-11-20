import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const healthHandler = require("../api/cyton/health.js");
const oauthHandler = require("../api/cyton/oauth.js");
const orchestrateHandler = require("../api/cyton/orchestrate.js");
const executeHandler = require("../api/cyton/execute.js");

import {
  APP_SECTIONS,
  CYTON_ACTION_CLASSES,
  CYTON_CATEGORIES,
  CYTON_MARKETPLACE_INTEGRATIONS,
  CYTON_MODEL_PROVIDERS,
  CYTON_SUBSCRIPTION_PLANS
} from "../website/js/catalog.js";

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) {
      this.headers[k] = v;
    },
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

test("GET /api/cyton/health returns boolean capabilities without leaking secrets", async () => {
  const req = { method: "GET", headers: {} };
  const res = createMockRes();
  await healthHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.service, "cyton-serverless-gateway");
  assert.equal(typeof res.body.providers.gemini.configuredOnServer, "boolean");
  assert.equal(typeof res.body.billing.configured, "boolean");
  assert.equal(res.body.integrations.website_research.liveServerFetchAvailable, true);
  assert.equal(JSON.stringify(res.body).includes("GEMINI_API_KEY"), false);
});

test("GET /api/cyton/oauth handles unknown, unconfigured, and configured providers honestly", async () => {
  const resUnknown = createMockRes();
  await oauthHandler({ method: "GET", query: { provider: "unknown_app" }, headers: {} }, resUnknown);
  assert.equal(resUnknown.statusCode, 400);
  assert.equal(resUnknown.body.ok, false);

  const prevClientId = process.env.LINKEDIN_CLIENT_ID;
  const prevSecret = process.env.LINKEDIN_CLIENT_SECRET;
  delete process.env.LINKEDIN_CLIENT_ID;
  delete process.env.LINKEDIN_CLIENT_SECRET;

  const resUnconf = createMockRes();
  await oauthHandler({ method: "GET", query: { provider: "linkedin" }, headers: {} }, resUnconf);
  assert.equal(resUnconf.statusCode, 200);
  assert.equal(resUnconf.body.configured, false);
  assert.deepEqual(resUnconf.body.requiredEnvVars, ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"]);

  process.env.LINKEDIN_CLIENT_ID = "demo-client-id";
  process.env.LINKEDIN_CLIENT_SECRET = "demo-secret";
  const resConf = createMockRes();
  await oauthHandler(
    { method: "GET", query: { provider: "linkedin" }, headers: { host: "marketosai.vercel.app" } },
    resConf
  );
  assert.equal(resConf.statusCode, 200);
  assert.equal(resConf.body.configured, true);
  assert.match(resConf.body.authorizationUrl, /^https:\/\/www\.linkedin\.com\/oauth\/v2\/authorization\?/);
  assert.match(resConf.body.authorizationUrl, /client_id=demo-client-id/);

  if (prevClientId === undefined) delete process.env.LINKEDIN_CLIENT_ID;
  else process.env.LINKEDIN_CLIENT_ID = prevClientId;
  if (prevSecret === undefined) delete process.env.LINKEDIN_CLIENT_SECRET;
  else process.env.LINKEDIN_CLIENT_SECRET = prevSecret;
});

test("POST /api/cyton/orchestrate validates input and missing API keys", async () => {
  const resGet = createMockRes();
  await orchestrateHandler({ method: "GET", headers: {} }, resGet);
  assert.equal(resGet.statusCode, 405);

  const resEmpty = createMockRes();
  await orchestrateHandler({ method: "POST", headers: {}, body: { prompt: "   " } }, resEmpty);
  assert.equal(resEmpty.statusCode, 400);
  assert.equal(resEmpty.body.code, "INVALID_PROMPT");

  const resTooBig = createMockRes();
  await orchestrateHandler(
    {
      method: "POST",
      headers: {},
      body: { prompt: "Inspect attachment", attachment: { base64Data: "x".repeat(7000001) } }
    },
    resTooBig
  );
  assert.equal(resTooBig.statusCode, 400);
  assert.equal(resTooBig.body.code, "ATTACHMENT_TOO_LARGE");

  const prevGemini = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  const resMissingKey = createMockRes();
  await orchestrateHandler(
    { method: "POST", headers: {}, body: { prompt: "Create a launch plan", provider: "gemini" } },
    resMissingKey
  );
  assert.equal(resMissingKey.statusCode, 422);
  assert.equal(resMissingKey.body.code, "PROVIDER_KEY_MISSING");
  if (prevGemini !== undefined) process.env.GEMINI_API_KEY = prevGemini;
});

test("orchestrate.js enforces approval gates on sensitive action classes and fallback intent classification", () => {
  assert.equal(orchestrateHandler.classifyFallbackCategory("Write 5 Instagram captions"), "Social media");
  assert.equal(orchestrateHandler.classifyFallbackCategory("Draft an email to our wholesale supplier"), "Email communication");
  assert.equal(orchestrateHandler.classifyFallbackCategory("Research competitors in sustainable fashion"), "Research");

  const normalized = orchestrateHandler.normalizeOrchestrationResult(
    {
      category: "Social media",
      statusSummary: "Drafts ready",
      assistantReply: "Created drafts; publish awaits approval.",
      executionPlan: [
        { stepTitle: "Generate captions", assignedAgent: "CREATIVE", actionClass: "CREATE", status: "COMPLETED" },
        { stepTitle: "Publish to Instagram", assignedAgent: "MARKETING", actionClass: "PUBLISH", status: "COMPLETED", requiresApproval: false }
      ],
      deliverables: [
        { title: "Launch Post", type: "SOCIAL_POST", platform: "Instagram", content: "Drop 01 live Friday" }
      ]
    },
    "Publish launch post",
    "gemini",
    "gemini-2.5-flash",
    120,
    300
  );

  assert.equal(normalized.executionPlan[0].status, "COMPLETED");
  assert.equal(normalized.executionPlan[0].requiresApproval, false);
  // Server must override a model claiming PUBLISH/SEND/DELETE is already COMPLETED without approval
  assert.equal(normalized.executionPlan[1].requiresApproval, true);
  assert.equal(normalized.executionPlan[1].status, "WAITING_APPROVAL");
});

test("POST /api/cyton/execute blocks unapproved sensitive actions and SSRF targets", async () => {
  const resUnapproved = createMockRes();
  await executeHandler(
    {
      method: "POST",
      headers: {},
      body: {
        actionType: "SEND_EMAIL",
        actionClass: "SEND",
        explicitApproval: false,
        payload: { to: "client@example.com", subject: "Hi", body: "Hello" }
      }
    },
    resUnapproved
  );
  assert.equal(resUnapproved.statusCode, 403);
  assert.equal(resUnapproved.body.code, "APPROVAL_REQUIRED");
  assert.equal(resUnapproved.body.executed, false);

  // Private / SSRF host blocklist verification
  for (const host of ["localhost", "127.0.0.1", "10.0.0.8", "169.254.169.254", "172.16.0.1", "192.168.1.10", "::1"]) {
    assert.equal(executeHandler.isBlockedPrivateHost(host), true, `Expected ${host} to be blocked`);
  }
  assert.equal(executeHandler.isBlockedPrivateHost("example.com"), false);

  const resSsrf = createMockRes();
  await executeHandler(
    {
      method: "POST",
      headers: {},
      body: {
        actionType: "WEBSITE_RESEARCH",
        actionClass: "READ",
        explicitApproval: true,
        payload: { url: "http://169.254.169.254/latest/meta-data/" }
      }
    },
    resSsrf
  );
  assert.equal(resSsrf.statusCode, 400);
  assert.match(resSsrf.body.error, /blocked/i);

  // Approved email send without server ESP configured honestly returns 501 + mailto fallback
  const prevResend = process.env.RESEND_API_KEY;
  const prevSg = process.env.SENDGRID_API_KEY;
  delete process.env.RESEND_API_KEY;
  delete process.env.SENDGRID_API_KEY;

  const resEmailUnconf = createMockRes();
  await executeHandler(
    {
      method: "POST",
      headers: {},
      body: {
        actionType: "SEND_EMAIL",
        actionClass: "SEND",
        explicitApproval: true,
        payload: { to: "client@example.com", subject: "Proposal", body: "Please review attached." }
      }
    },
    resEmailUnconf
  );
  assert.equal(resEmailUnconf.statusCode, 501);
  assert.equal(resEmailUnconf.body.code, "INTEGRATION_NOT_CONFIGURED");
  assert.equal(resEmailUnconf.body.executed, false);
  assert.match(resEmailUnconf.body.mailtoUrl, /^mailto:client%40example\.com\?/);

  if (prevResend !== undefined) process.env.RESEND_API_KEY = prevResend;
  if (prevSg !== undefined) process.env.SENDGRID_API_KEY = prevSg;

  // Approved social publish without OAuth token honestly returns 501
  const resSocial = createMockRes();
  await executeHandler(
    {
      method: "POST",
      headers: {},
      body: {
        actionType: "PUBLISH_SOCIAL",
        actionClass: "PUBLISH",
        explicitApproval: true,
        payload: { platform: "Instagram", caption: "Test" }
      }
    },
    resSocial
  );
  assert.equal(resSocial.statusCode, 501);
  assert.equal(resSocial.body.code, "INTEGRATION_NOT_CONNECTED");
  assert.equal(resSocial.body.executed, false);
});

test("website/js/catalog.js preserves all MarketOS sections and adds complete Cyton metadata", () => {
  assert.equal(APP_SECTIONS[0].id, "cyton");
  assert.equal(APP_SECTIONS.length, 14);
  for (const legacyId of [
    "overview",
    "ai_assistant",
    "campaign_planner",
    "social_media",
    "seo_studio",
    "email_studio",
    "brand_studio",
    "ads_studio",
    "content_calendar",
    "approvals",
    "analytics",
    "integrations",
    "settings"
  ]) {
    assert.equal(APP_SECTIONS.some((s) => s.id === legacyId), true, `Missing legacy section ${legacyId}`);
  }
  assert.equal(CYTON_CATEGORIES.length, 15);
  assert.deepEqual(Object.keys(CYTON_ACTION_CLASSES), ["READ", "CREATE", "MODIFY", "PUBLISH", "SEND", "DELETE"]);
  assert.equal(CYTON_ACTION_CLASSES.PUBLISH.requiresApproval, true);
  assert.equal(CYTON_ACTION_CLASSES.SEND.requiresApproval, true);
  assert.equal(CYTON_ACTION_CLASSES.DELETE.requiresApproval, true);
  assert.equal(CYTON_ACTION_CLASSES.CREATE.requiresApproval, false);
  assert.equal(CYTON_MODEL_PROVIDERS.length >= 4, true);
  assert.equal(CYTON_MARKETPLACE_INTEGRATIONS.length >= 10, true);
  assert.equal(Boolean(CYTON_SUBSCRIPTION_PLANS.FREE && CYTON_SUBSCRIPTION_PLANS.PRO && CYTON_SUBSCRIPTION_PLANS.BUSINESS), true);
});

import fs from "node:fs";
import path from "node:path";
import { renderLuxuryLandingPage } from "../website/js/landing.js";

test("MarketOS cinematic luxury landing page preserves assets, copy, and zero fake stats", () => {
  assert.equal(fs.existsSync(path.resolve("website/assets/hero-yacht.jpg")), true);
  assert.equal(fs.existsSync(path.resolve("website/assets/marketos-wordmark.png")), true);

  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  globalThis.document = {
    getElementById: () => ({ addEventListener: () => {}, classList: { toggle() {}, remove() {} } })
  };
  globalThis.window = {
    scrollY: 0,
    addEventListener: () => {},
    removeEventListener: () => {}
  };

  try {
    const mockRoot = {
      innerHTML: "",
      querySelectorAll() {
        return [];
      }
    };
    renderLuxuryLandingPage(mockRoot, {
      isAuthenticated: false,
      onOpenAuth: () => {},
      onOpenDashboard: () => {},
      onExploreSection: () => {}
    });

    assert.match(mockRoot.innerHTML, /THE FUTURE OF BUSINESS/);
    assert.match(mockRoot.innerHTML, /Think Beyond Limits\./);
    assert.match(mockRoot.innerHTML, /Build Beyond Expectations\./);
    assert.match(mockRoot.innerHTML, /One intelligent ecosystem\. Endless possibilities\./);
    assert.match(mockRoot.innerHTML, /Explore MarketOS/);
    assert.match(mockRoot.innerHTML, /Get Started/);
    assert.match(mockRoot.innerHTML, /SCROLL TO EXPLORE/);
    assert.match(mockRoot.innerHTML, /assets\/hero-yacht\.jpg/);
    assert.match(mockRoot.innerHTML, /assets\/marketos-wordmark\.png/);
    for (const id of ["platform", "cyton", "solutions", "intelligence", "automation", "pricing", "about"]) {
      assert.equal(mockRoot.innerHTML.includes(`id="${id}"`), true, `Missing landing section #${id}`);
    }
  } finally {
    if (prevDoc === undefined) delete globalThis.document;
    else globalThis.document = prevDoc;
    if (prevWin === undefined) delete globalThis.window;
    else globalThis.window = prevWin;
  }
});

