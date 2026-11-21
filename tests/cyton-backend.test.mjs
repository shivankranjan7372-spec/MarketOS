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
import { renderLandingPage, cleanupLandingExperience } from "../website/js/landing.js";

test("MarketOS 3D scroll-driven landing page renders all 7 storyboard scenes with brand identity & pricing intact", () => {
  assert.equal(fs.existsSync(path.resolve("website/assets/brand-logo.png")), true);
  assert.equal(fs.existsSync(path.resolve("website/assets/marketos-wordmark.png")), true);

  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  const makeMockEl = () => ({
    style: {},
    classList: { toggle() {}, remove() {}, add() {} },
    addEventListener() {},
    appendChild() {},
    getContext() {
      return null;
    },
    querySelector() {
      return null;
    }
  });
  globalThis.document = {
    documentElement: { scrollHeight: 4000 },
    hidden: false,
    createElement: makeMockEl,
    getElementById: makeMockEl,
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  globalThis.window = {
    scrollY: 0,
    innerWidth: 1280,
    innerHeight: 800,
    devicePixelRatio: 1,
    addEventListener: () => {},
    removeEventListener: () => {},
    matchMedia: () => ({ matches: false })
  };

  try {
    const mockRoot = {
      innerHTML: "",
      querySelectorAll() {
        return [];
      }
    };
    renderLandingPage(mockRoot, {
      isAuthenticated: false,
      activeTierId: "",
      onOpenAuth: () => {},
      onOpenDashboard: () => {},
      onExploreSection: () => {}
    });

    assert.match(mockRoot.innerHTML, /Your entire marketing operation\./);
    assert.match(mockRoot.innerHTML, /Plan smarter\. Create faster\. Grow without the chaos\./);
    assert.match(mockRoot.innerHTML, /Meet CYTON\./);
    assert.match(mockRoot.innerHTML, /CYTON, prepare a campaign for our new product\./);
    assert.match(mockRoot.innerHTML, /Stop managing tools\./);
    assert.match(mockRoot.innerHTML, /Every campaign\./);
    assert.match(mockRoot.innerHTML, /ILLUSTRATIVE PREVIEW DATA/);
    assert.match(mockRoot.innerHTML, /Plan\. Create\. Grow\./);
    assert.match(mockRoot.innerHTML, /Privacy Policy/);
    assert.match(mockRoot.innerHTML, /Terms and Conditions/);
    assert.match(mockRoot.innerHTML, /marketosagency@gmail\.com/);
    assert.match(mockRoot.innerHTML, /assets\/marketos-wordmark\.png/);

    for (const id of [
      "scene-intro",
      "scene-command",
      "scene-cyton",
      "scene-automation",
      "scene-analytics",
      "scene-pricing",
      "scene-final"
    ]) {
      assert.equal(mockRoot.innerHTML.includes(`id="${id}"`), true, `Missing 3D scene #${id}`);
      assert.equal(mockRoot.innerHTML.includes("data-mos-reveal"), true);
    }
    cleanupLandingExperience();
  } finally {
    if (prevDoc === undefined) delete globalThis.document;
    else globalThis.document = prevDoc;
    if (prevWin === undefined) delete globalThis.window;
    else globalThis.window = prevWin;
  }
});

import { createRevealComponent, REVEAL_DEFAULTS, mountRevealAnimations } from "../website/js/scenes/Reveal.js";

test("Reveal Framer Motion component configures viewport opacity & transform animation with reduced-motion support", () => {
  const fakeReact = {
    createElement(tag, props, children) {
      return { tag, props, children };
    }
  };
  let reducedSetting = false;
  const fakeFramer = {
    motion: { div: "motion.div" },
    useReducedMotion: () => reducedSetting
  };

  const Reveal = createRevealComponent(fakeReact, fakeFramer);
  const el = Reveal({ children: "Scene Content", delay: 0.12, y: 32, scale: 0.96, className: "custom" });

  assert.equal(el.tag, "motion.div");
  assert.deepEqual(el.props.initial, { opacity: 0, y: 32, scale: 0.96 });
  assert.deepEqual(el.props.whileInView, { opacity: 1, y: 0, scale: 1 });
  assert.deepEqual(el.props.viewport, { once: true, amount: REVEAL_DEFAULTS.viewportAmount });
  assert.equal(el.props.transition.delay, 0.12);
  assert.deepEqual(el.props.transition.ease, [0.22, 1, 0.36, 1]);
  assert.equal(el.props.className, "mos-reveal-node custom");

  reducedSetting = true;
  const reducedEl = Reveal({ children: "Reduced" });
  assert.deepEqual(reducedEl.props.initial, { opacity: 1, y: 0, scale: 1 });
  assert.equal(reducedEl.props.transition.duration, 0);

  const prevWin = globalThis.window;
  globalThis.window = { matchMedia: () => ({ matches: true }) };
  try {
    const added = [];
    const unmount = mountRevealAnimations({
      querySelectorAll: () => [{ classList: { add: (c) => added.push(c) } }]
    });
    assert.deepEqual(added, ["is-visible"]);
    assert.equal(typeof unmount, "function");
    unmount();
  } finally {
    if (prevWin === undefined) delete globalThis.window;
    else globalThis.window = prevWin;
  }
});


