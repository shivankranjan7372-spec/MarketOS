import {
  AI_MODULES,
  APP_SECTIONS,
  APPROVAL_STATUSES,
  CAMPAIGN_STATUSES,
  CONTENT_TYPES,
  COUNTRIES,
  CURRENCIES,
  INDUSTRIES,
  INTEGRATION_PROVIDERS,
  SUBSCRIPTION_TIERS,
  convertCurrency,
  fetchLiveExchangeRates,
  findCountryByCode,
  findCurrency,
  formatConvertedWithOriginal,
  formatCurrencyAmount,
  suggestCountryFromBrowserLocale
} from "./catalog.js";
import { inspectWebsiteSeoMetadata, orchestrateMarketOsAi } from "./ai.js";
import {
  DEFAULT_FIREBASE_CONFIG,
  MarketOsWebStore,
  getSavedPreferences,
  savePreferences
} from "./storage.js";
import { renderCytonCommandCentre } from "./cyton-ui.js";

const store = new MarketOsWebStore();

const appState = {
  screen: "splash", // splash | auth | onboarding | app
  sessionMode: "none", // firebase | local | none
  user: null,
  profile: null,
  businesses: [],
  campaigns: [],
  contentItems: [],
  integrations: [],
  aiMessages: [],
  analytics: [],
  cytonSettings: [],
  cytonWorkflows: [],
  cytonTasks: [],
  cytonMemory: [],
  cytonApprovals: [],
  cytonLogs: [],
  cytonUsage: [],
  activeSection: "cyton",
  exchangeRates: null,
  aiStatus: "idle", // idle | loading | success | error
  aiDeliverable: null,
  aiError: "",
  lastAiPrompt: "",
  seoStatus: "idle", // idle | loading | success | error
  seoResult: null,
  seoError: "",
  theme: getSavedPreferences().theme,
  sidebarOpen: false,
  filters: {
    campaignStatus: "ALL",
    approvalTab: "QUEUE",
    calendarView: "WEEKLY",
    analyticsFilter: "ALL",
    socialFormat: "Instagram Caption",
    emailType: "Promotional Email",
    adsChannel: "Instagram Ads"
  },
  onboarding: null
};

// ---------------- Utilities ----------------
function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toast(message) {
  const root = document.getElementById("toast-root");
  if (!root) return;
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

function applyTheme(theme) {
  appState.theme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  savePreferences({ theme });
}

function getActiveBusiness() {
  const activeId = appState.profile?.activeBusinessId || "";
  return (
    appState.businesses.find((b) => b.id === activeId) ||
    appState.businesses[0] ||
    null
  );
}

function activeScoped(list) {
  const biz = getActiveBusiness();
  if (!biz) return [];
  return list.filter((item) => item.businessId === biz.id);
}

function formatInTz(epochMs, timeZone) {
  if (!epochMs) return "Unscheduled";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: timeZone || "UTC",
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(epochMs));
  } catch {
    return new Date(epochMs).toLocaleString();
  }
}

function openModal(html, onBind) {
  const root = document.getElementById("modal-root");
  root.innerHTML = `<div class="modal-backdrop" id="modal-backdrop">${html}</div>`;
  document.getElementById("modal-backdrop")?.addEventListener("click", (e) => {
    if (e.target.id === "modal-backdrop") closeModal();
  });
  if (onBind) onBind(root);
}

function closeModal() {
  const root = document.getElementById("modal-root");
  if (root) root.innerHTML = "";
}

function initOnboardingDraft() {
  const c = suggestCountryFromBrowserLocale();
  appState.onboarding = {
    countryCode: c.code,
    businessName: "",
    industry: INDUSTRIES[0],
    stateRegion: "",
    city: "",
    postalCode: "",
    address: "",
    websiteUrl: "",
    billingCurrency: c.defaultCurrency,
    displayCurrency: c.defaultCurrency,
    language: c.defaultLanguage,
    timeZone: c.defaultTimeZone,
    dateFormat: c.defaultDateFormat,
    numberFormat: c.defaultNumberLocale,
    brandVoice: "",
    targetAudience: "",
    locationMsg: ""
  };
}

// ---------------- Bootstrap ----------------
async function bootstrap() {
  applyTheme(appState.theme);
  fetchLiveExchangeRates().then((rates) => {
    appState.exchangeRates = rates;
    if (appState.screen === "app") render();
  });

  const session = await store.getCurrentSession();
  setTimeout(async () => {
    if (session.user) {
      await startUserSession(session);
    } else {
      appState.screen = "auth";
      render();
    }
  }, 650);
}

async function startUserSession(session) {
  resetAuthUiState();
  appState.sessionMode = session.mode;
  appState.user = session.user;
  try {
    await store.ensureUserProfile(session.user);
  } catch (err) {
    toast("Profile setup error: " + (err?.message || err));
  }
  store.subscribeAll(
    session.user.uid,
    (snapshot) => {
      appState.profile = snapshot.profile;
      appState.businesses = snapshot.businesses || [];
      appState.campaigns = snapshot.campaigns || [];
      appState.contentItems = snapshot.contentItems || [];
      appState.integrations = snapshot.integrations || [];
      appState.aiMessages = snapshot.aiMessages || [];
      appState.analytics = snapshot.analytics || [];
      appState.cytonSettings = snapshot.cytonSettings || [];
      appState.cytonWorkflows = snapshot.cytonWorkflows || [];
      appState.cytonTasks = snapshot.cytonTasks || [];
      appState.cytonMemory = snapshot.cytonMemory || [];
      appState.cytonApprovals = snapshot.cytonApprovals || [];
      appState.cytonLogs = snapshot.cytonLogs || [];
      appState.cytonUsage = snapshot.cytonUsage || [];
      if (appState.businesses.length === 0) {
        if (!appState.onboarding) initOnboardingDraft();
        appState.screen = "onboarding";
      } else {
        appState.screen = "app";
      }
      render();
    },
    (errMsg) => toast(errMsg)
  );
}

// ---------------- AI Runner ----------------
async function triggerAiOrchestrator({
  prompt,
  requestedModule = null,
  extraContext = "",
  imageAttachment = null,
  attachmentLabel = "",
  saveConversation = true
}) {
  const biz = getActiveBusiness();
  if (!biz || !appState.user) {
    toast("Create a business workspace first.");
    return;
  }
  const tierId = appState.profile?.subscriptionTier || "STARTER";
  const tier = SUBSCRIPTION_TIERS[tierId] || SUBSCRIPTION_TIERS.STARTER;
  const used = appState.profile?.aiGenerationsThisMonth || 0;
  if (used >= tier.monthlyAiLimit) {
    appState.aiStatus = "error";
    appState.aiError = `Monthly AI limit reached (${used}/${tier.monthlyAiLimit} on ${tier.displayName} plan). Upgrade in Settings.`;
    render();
    return;
  }

  appState.lastAiPrompt = prompt;
  appState.aiStatus = "loading";
  appState.aiError = "";
  render();

  if (saveConversation) {
    try {
      await store.saveAiMessage(appState.user.uid, {
        businessId: biz.id,
        role: "USER",
        moduleUsed: requestedModule || "GENERAL_ASSISTANT",
        messageText: prompt,
        structuredPreview: "",
        attachmentLabel: attachmentLabel || "",
        tokensEstimated: 0
      });
    } catch {}
  }

  try {
    const deliverable = await orchestrateMarketOsAi({
      prompt,
      business: biz,
      requestedModule,
      extraContext,
      imageAttachment
    });
    appState.aiDeliverable = deliverable;
    appState.aiStatus = "success";
    await store.incrementAiUsage(
      appState.user.uid,
      used,
      appState.profile?.aiTokenCountThisMonth || 0,
      deliverable.estimatedTokens
    );
    if (saveConversation) {
      await store.saveAiMessage(appState.user.uid, {
        businessId: biz.id,
        role: "ASSISTANT",
        moduleUsed: deliverable.selectedModule,
        messageText: deliverable.generatedBody,
        structuredPreview: `${deliverable.contentTitle} • ${deliverable.targetPlatform}`,
        attachmentLabel: "",
        tokensEstimated: deliverable.estimatedTokens
      });
    }
  } catch (err) {
    appState.aiStatus = "error";
    appState.aiError = err?.message || "AI generation failed.";
  }
  render();
}

async function saveAiDeliverable(submitForApproval) {
  const d = appState.aiDeliverable;
  const biz = getActiveBusiness();
  if (!d || !biz || !appState.user) return;
  try {
    await store.createContentItem(appState.user.uid, {
      businessId: biz.id,
      campaignId: "",
      contentType: d.contentType,
      platform: d.targetPlatform,
      title: d.contentTitle,
      body: d.generatedBody,
      hashtags: d.hashtags,
      approvalStatus: submitForApproval ? "PENDING_APPROVAL" : "DRAFT",
      scheduledTimeZone: biz.timeZone,
      aiModule: d.selectedModule
    });
    toast(submitForApproval ? "Submitted for owner approval" : "Saved to Drafts");
  } catch (err) {
    toast("Save failed: " + err.message);
  }
}

async function saveAiAsCampaign() {
  const d = appState.aiDeliverable;
  const biz = getActiveBusiness();
  if (!d || !biz || !appState.user) return;
  const nowSec = Math.floor(Date.now() / 1000);
  try {
    await store.saveCampaign(
      appState.user.uid,
      {
        businessId: biz.id,
        title: d.suggestedCampaignTitle || d.contentTitle,
        objective: d.summary,
        status: "DRAFT",
        platforms: [d.targetPlatform],
        budgetAmount: d.suggestedBudgetAmount || 0,
        budgetCurrency: biz.billingCurrency,
        spentAmount: 0,
        startDateEpoch: nowSec,
        endDateEpoch: nowSec + 30 * 86400,
        strategySummary: d.generatedBody
      },
      false
    );
    toast("Campaign draft created from AI plan");
  } catch (err) {
    toast("Failed: " + err.message);
  }
}

// ---------------- Render Screens ----------------
function render() {
  const root = document.getElementById("app-root");
  if (!root) return;

  if (appState.screen === "splash") {
    root.innerHTML = `
      <div class="splash-screen">
        <img src="./assets/brand-logo.png" alt="MarketOS CYTON logo" width="76" height="76" class="splash-logo" />
        <h1 class="splash-title">Market<span>OS</span></h1>
        <p class="splash-tagline">PLAN • CREATE • GROW</p>
      </div>`;
    return;
  }

  if (appState.screen === "auth") {
    renderAuthScreen(root);
    return;
  }

  if (appState.screen === "onboarding") {
    renderOnboardingScreen(root);
    return;
  }

  renderAppShell(root);
}

function createRobotChallenge() {
  const ops = ["+", "-", "+"];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a = 2 + Math.floor(Math.random() * 8);
  let b = 1 + Math.floor(Math.random() * 7);
  if (op === "-" && b >= a) {
    a = b + 2 + Math.floor(Math.random() * 5);
  }
  const answer = op === "+" ? a + b : a - b;
  const optionSet = new Set([answer]);
  while (optionSet.size < 4) {
    const delta = Math.floor(Math.random() * 7) - 3;
    const candidate = answer + (delta === 0 ? 4 : delta);
    if (candidate >= 0) optionSet.add(candidate);
  }
  const options = Array.from(optionSet).sort(() => Math.random() - 0.5);
  return {
    verified: false,
    challengeOpen: false,
    question: `${a} ${op} ${b}`,
    answer,
    options,
    error: ""
  };
}

const authUiState = {
  tab: "signin", // signin | signup | reset
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  showPassword: false,
  showConfirmPassword: false,
  submitting: false,
  error: "",
  success: "",
  robot: createRobotChallenge()
};

function resetAuthUiState() {
  authUiState.tab = "signin";
  authUiState.name = "";
  authUiState.email = "";
  authUiState.password = "";
  authUiState.confirmPassword = "";
  authUiState.showPassword = false;
  authUiState.showConfirmPassword = false;
  authUiState.submitting = false;
  authUiState.error = "";
  authUiState.success = "";
  authUiState.robot = createRobotChallenge();
}

function getPasswordStrength(pw) {
  const value = String(pw || "");
  const hasMinLen = value.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSpecialOrUpper = /[^a-zA-Z0-9]/.test(value) || /[A-Z]/.test(value);
  let score = 0;
  if (hasMinLen) score += 1;
  if (hasLetter && hasNumber) score += 1;
  if (hasSpecialOrUpper && value.length >= 8) score += 1;
  if (value.length >= 12 && hasLetter && hasNumber) score += 1;
  const labels = ["Enter password", "Weak", "Fair", "Good", "Strong"];
  return {
    score,
    label: value.length === 0 ? labels[0] : labels[Math.max(1, score)],
    hasMinLen,
    hasLetterAndNumber: hasLetter && hasNumber
  };
}

function updatePasswordIndicatorsInPlace() {
  const strengthBox = document.getElementById("pw-strength-box");
  if (strengthBox) {
    const info = getPasswordStrength(authUiState.password);
    const barClass = info.score > 0 ? `s${info.score}` : "";
    strengthBox.innerHTML = `
      <div class="strength-bars">
        ${[1, 2, 3, 4]
          .map((n) => `<div class="strength-bar ${info.score >= n ? barClass : ""}"></div>`)
          .join("")}
      </div>
      <div class="row-between">
        <span class="rule-list">
          <span class="rule-item ${info.hasMinLen ? "ok" : ""}">${info.hasMinLen ? "✓" : "•"} 8+ characters</span>
          <span class="rule-item ${info.hasLetterAndNumber ? "ok" : ""}">${info.hasLetterAndNumber ? "✓" : "•"} Letters & numbers</span>
        </span>
        <span class="small muted">${esc(info.label)}</span>
      </div>`;
  }

  const matchBox = document.getElementById("pw-match-box");
  if (matchBox) {
    if (!authUiState.confirmPassword) {
      matchBox.innerHTML = "";
    } else if (authUiState.password === authUiState.confirmPassword) {
      matchBox.innerHTML = `<span class="rule-item ok">✓ Passwords match</span>`;
    } else {
      matchBox.innerHTML = `<span class="rule-item bad">✕ Passwords do not match</span>`;
    }
  }
}

function renderAuthScreen(root) {
  const isSignup = authUiState.tab === "signup";
  const isReset = authUiState.tab === "reset";
  const headingText = isReset
    ? "Reset your password"
    : isSignup
      ? "Create your MarketOS account"
      : "Sign in to MarketOS";
  const subText = isReset
    ? "Update your browser account password or send a Firebase reset email."
    : isSignup
      ? "Set up your credentials to launch and manage your AI marketing workspaces."
      : "Enter your account credentials to continue to your marketing command center.";

  root.innerHTML = `
    <div class="auth-page">
      <div class="auth-card stack">
        <div class="row-between">
          <div class="brand-row" style="padding:0">
            <img src="./assets/brand-logo.png" alt="MarketOS CYTON logo" />
            <div>
              <div class="brand-name">Market<span>OS</span></div>
              <div class="brand-sub">Plan • Create • Grow</div>
            </div>
          </div>
          <button id="auth-theme-toggle" type="button" class="btn btn-outline btn-sm" aria-label="Toggle theme">
            ${appState.theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>

        <div>
          <h2 style="font-size:1.45rem;">${headingText}</h2>
          <p class="muted" style="margin-top:0.3rem;font-size:0.86rem;">${subText}</p>
        </div>

        ${
          !isReset
            ? `
          <div class="auth-tabs" role="tablist" aria-label="Authentication mode">
            <button id="tab-signin" type="button" role="tab" aria-selected="${!isSignup}" class="auth-tab ${!isSignup ? "active" : ""}">Sign In</button>
            <button id="tab-signup" type="button" role="tab" aria-selected="${isSignup}" class="auth-tab ${isSignup ? "active" : ""}">Create Account</button>
          </div>`
            : ""
        }

        ${authUiState.error ? `<div id="auth-error-box" class="error-banner">${esc(authUiState.error)}</div>` : `<div id="auth-error-box" class="error-banner" style="display:none;"></div>`}
        ${authUiState.success ? `<div id="auth-success-box" class="success-banner">${esc(authUiState.success)}</div>` : ""}

        <form id="auth-main-form" class="stack" novalidate>
          ${
            isSignup
              ? `
            <div class="field">
              <label for="auth-name">Full Name</label>
              <input id="auth-name" type="text" class="input" autocomplete="name" placeholder="Enter your full name" value="${esc(authUiState.name)}" required />
            </div>`
              : ""
          }

          <div class="field">
            <label for="auth-email">Email Address</label>
            <input id="auth-email" type="email" class="input" autocomplete="email" placeholder="Enter your email address" value="${esc(authUiState.email)}" required />
          </div>

          <div class="field">
            <div class="row-between">
              <label for="auth-password">${isSignup ? "Create Password" : isReset ? "New Password (min. 8 characters)" : "Password"}</label>
              ${!isSignup && !isReset ? `<button id="btn-forgot-pw" type="button" class="link-btn">Forgot password?</button>` : ""}
            </div>
            <div class="password-wrap">
              <input
                id="auth-password"
                type="${authUiState.showPassword ? "text" : "password"}"
                class="input"
                autocomplete="${isSignup || isReset ? "new-password" : "current-password"}"
                placeholder="${isSignup || isReset ? "Minimum 8 characters" : "Enter your password"}"
                value="${esc(authUiState.password)}"
                ${isReset ? "" : "required"}
              />
              <button id="toggle-pw" type="button" class="password-toggle" aria-label="Toggle password visibility">
                ${authUiState.showPassword ? "Hide" : "Show"}
              </button>
            </div>
            ${isSignup || isReset ? `<div id="pw-strength-box" class="strength-meter"></div>` : ""}
          </div>

          ${
            isSignup || isReset
              ? `
            <div class="field">
              <label for="auth-confirm-password">${isReset ? "Confirm New Password" : "Confirm Password"}</label>
              <div class="password-wrap">
                <input
                  id="auth-confirm-password"
                  type="${authUiState.showConfirmPassword ? "text" : "password"}"
                  class="input"
                  autocomplete="new-password"
                  placeholder="Re-enter your password"
                  value="${esc(authUiState.confirmPassword)}"
                  ${isSignup ? "required" : ""}
                />
                <button id="toggle-confirm-pw" type="button" class="password-toggle" aria-label="Toggle confirm password visibility">
                  ${authUiState.showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
              <div id="pw-match-box" class="rule-list" style="min-height:1.1rem;"></div>
            </div>`
              : ""
          }

          ${isReset ? `<div class="muted small">For Firebase email accounts, you can leave the password fields blank to receive a reset link by email.</div>` : ""}

          <div class="robot-box ${authUiState.robot.verified ? "verified" : ""}" id="robot-box">
            <div class="robot-top">
              <button id="robot-check-btn" type="button" class="robot-trigger" aria-pressed="${authUiState.robot.verified}">
                <span class="robot-checkbox">${authUiState.robot.verified ? "✓" : ""}</span>
                <span>${authUiState.robot.verified ? "Verified — I'm not a robot" : "I'm not a robot"}</span>
              </button>
              <span class="badge ${authUiState.robot.verified ? "emerald" : "violet"}">
                ${authUiState.robot.verified ? "Human Verified" : "Human Check"}
              </span>
            </div>

            ${
              !authUiState.robot.verified && authUiState.robot.challengeOpen
                ? `
              <div class="robot-challenge">
                <div class="row-between">
                  <span class="small">Quick verification: What is <strong>${esc(authUiState.robot.question)}</strong>?</span>
                  <button id="robot-refresh-btn" type="button" class="link-btn" style="font-size:0.76rem;">New check</button>
                </div>
                <div class="robot-options">
                  ${authUiState.robot.options
                    .map((opt) => `<button type="button" class="robot-opt-btn" data-robot-opt="${opt}">${opt}</button>`)
                    .join("")}
                </div>
                ${authUiState.robot.error ? `<div class="small" style="color:var(--rose);">${esc(authUiState.robot.error)}</div>` : ""}
              </div>`
                : ""
            }
          </div>

          <button id="auth-submit-btn" type="submit" class="btn btn-primary" style="width:100%;padding:0.78rem;" ${authUiState.submitting ? "disabled" : ""}>
            ${
              authUiState.submitting
                ? "Please wait..."
                : isReset
                  ? "Reset Password"
                  : isSignup
                    ? "Create Account"
                    : "Sign In"
            }
          </button>

          ${
            isReset
              ? `<button id="btn-back-signin" type="button" class="btn btn-outline" style="width:100%;">Back to Sign In</button>`
              : ""
          }
        </form>

        <div class="auth-divider"><span>or</span></div>

        <button id="btn-google-signin" type="button" class="btn btn-outline" style="width:100%;padding:0.72rem;" ${authUiState.submitting ? "disabled" : ""}>
          Continue with Google (Firebase Cloud Sync)
        </button>

        <div class="muted small" style="text-align:center;">
          Cloud Project: <span class="mono">${esc(DEFAULT_FIREBASE_CONFIG.projectId)}</span>
        </div>
      </div>
    </div>
  `;

  if (isSignup || isReset) {
    updatePasswordIndicatorsInPlace();
  }

  document.getElementById("auth-theme-toggle")?.addEventListener("click", () => {
    applyTheme(appState.theme === "dark" ? "light" : "dark");
    renderAuthScreen(root);
  });

  document.getElementById("tab-signin")?.addEventListener("click", () => {
    authUiState.tab = "signin";
    authUiState.error = "";
    authUiState.success = "";
    renderAuthScreen(root);
  });

  document.getElementById("tab-signup")?.addEventListener("click", () => {
    authUiState.tab = "signup";
    authUiState.error = "";
    authUiState.success = "";
    renderAuthScreen(root);
  });

  document.getElementById("btn-forgot-pw")?.addEventListener("click", () => {
    authUiState.tab = "reset";
    authUiState.password = "";
    authUiState.confirmPassword = "";
    authUiState.error = "";
    authUiState.success = "";
    authUiState.robot = createRobotChallenge();
    renderAuthScreen(root);
  });

  document.getElementById("btn-back-signin")?.addEventListener("click", () => {
    authUiState.tab = "signin";
    authUiState.password = "";
    authUiState.confirmPassword = "";
    authUiState.error = "";
    authUiState.success = "";
    authUiState.robot = createRobotChallenge();
    renderAuthScreen(root);
  });

  document.getElementById("auth-name")?.addEventListener("input", (e) => {
    authUiState.name = e.target.value;
  });

  document.getElementById("auth-email")?.addEventListener("input", (e) => {
    authUiState.email = e.target.value;
  });

  document.getElementById("auth-password")?.addEventListener("input", (e) => {
    authUiState.password = e.target.value;
    if (isSignup || isReset) updatePasswordIndicatorsInPlace();
  });

  document.getElementById("auth-confirm-password")?.addEventListener("input", (e) => {
    authUiState.confirmPassword = e.target.value;
    if (isSignup || isReset) updatePasswordIndicatorsInPlace();
  });

  document.getElementById("toggle-pw")?.addEventListener("click", () => {
    authUiState.showPassword = !authUiState.showPassword;
    renderAuthScreen(root);
  });

  document.getElementById("toggle-confirm-pw")?.addEventListener("click", () => {
    authUiState.showConfirmPassword = !authUiState.showConfirmPassword;
    renderAuthScreen(root);
  });

  document.getElementById("robot-check-btn")?.addEventListener("click", () => {
    if (authUiState.robot.verified) return;
    authUiState.robot.challengeOpen = !authUiState.robot.challengeOpen;
    authUiState.robot.error = "";
    renderAuthScreen(root);
  });

  document.getElementById("robot-refresh-btn")?.addEventListener("click", () => {
    authUiState.robot = { ...createRobotChallenge(), challengeOpen: true };
    renderAuthScreen(root);
  });

  document.querySelectorAll("[data-robot-opt]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const picked = Number(btn.getAttribute("data-robot-opt"));
      if (picked === authUiState.robot.answer) {
        authUiState.robot.verified = true;
        authUiState.robot.challengeOpen = false;
        authUiState.robot.error = "";
        authUiState.error = "";
      } else {
        authUiState.robot = {
          ...createRobotChallenge(),
          challengeOpen: true,
          error: "Incorrect answer. Please try the new verification check."
        };
      }
      renderAuthScreen(root);
    });
  });

  document.getElementById("auth-main-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    authUiState.error = "";
    authUiState.success = "";

    const name = authUiState.name.trim();
    const email = authUiState.email.trim();
    const password = authUiState.password;
    const confirmPassword = authUiState.confirmPassword;

    if (isSignup && !name) {
      authUiState.error = "Please enter your full name.";
      renderAuthScreen(root);
      return;
    }
    if (!email || !email.includes("@")) {
      authUiState.error = "Please enter a valid email address.";
      renderAuthScreen(root);
      return;
    }
    if (isSignup) {
      if (password.length < 8) {
        authUiState.error = "Please create a password with at least 8 characters.";
        renderAuthScreen(root);
        return;
      }
      if (password !== confirmPassword) {
        authUiState.error = "Passwords do not match. Please confirm your password.";
        renderAuthScreen(root);
        return;
      }
    } else if (authUiState.tab === "signin") {
      if (!password) {
        authUiState.error = "Please enter your password.";
        renderAuthScreen(root);
        return;
      }
    } else if (isReset && (password || confirmPassword)) {
      if (password.length < 8) {
        authUiState.error = "New password must be at least 8 characters.";
        renderAuthScreen(root);
        return;
      }
      if (password !== confirmPassword) {
        authUiState.error = "New password and confirmation do not match.";
        renderAuthScreen(root);
        return;
      }
    }

    if (!authUiState.robot.verified) {
      authUiState.robot.challengeOpen = true;
      authUiState.error = "Please complete the 'I'm not a robot' verification before continuing.";
      renderAuthScreen(root);
      return;
    }

    authUiState.submitting = true;
    renderAuthScreen(root);

    try {
      if (isSignup) {
        const session = await store.signUpWithEmail({ name, email, password });
        if (session.notice) toast(session.notice);
        await startUserSession(session);
      } else if (isReset) {
        const msg = await store.resetAccountPassword({ email, newPassword: password });
        authUiState.submitting = false;
        authUiState.tab = "signin";
        authUiState.password = "";
        authUiState.confirmPassword = "";
        authUiState.success = msg;
        authUiState.robot = createRobotChallenge();
        renderAuthScreen(root);
      } else {
        const session = await store.signInWithEmail({ email, password });
        await startUserSession(session);
      }
    } catch (err) {
      authUiState.submitting = false;
      authUiState.error = err?.message || String(err);
      renderAuthScreen(root);
    }
  });

  document.getElementById("btn-google-signin")?.addEventListener("click", async () => {
    authUiState.error = "";
    authUiState.success = "";
    if (!authUiState.robot.verified) {
      authUiState.robot.challengeOpen = true;
      authUiState.error = "Please complete the 'I'm not a robot' verification before continuing.";
      renderAuthScreen(root);
      return;
    }
    authUiState.submitting = true;
    renderAuthScreen(root);
    try {
      const session = await store.signInWithGoogleFirebase();
      await startUserSession(session);
    } catch (err) {
      authUiState.submitting = false;
      const msg = err?.message || String(err);
      authUiState.error = msg.includes("unauthorized-domain")
        ? "Add marketosai.vercel.app to Firebase Console -> Authentication -> Settings -> Authorized domains, or create an email/password account above."
        : msg;
      renderAuthScreen(root);
    }
  });
}

function renderOnboardingScreen(root, isModal = false) {
  if (!appState.onboarding) initOnboardingDraft();
  const ob = appState.onboarding;
  const country = findCountryByCode(ob.countryCode);

  const formHtml = `
    <div class="hero-banner">
      <div class="row-gap" style="align-items:center;">
        <img src="./assets/brand-logo.png" alt="MarketOS CYTON logo" width="44" height="44" style="border-radius:10px;border:1px solid var(--border-hi);object-fit:cover;" />
        <div>
          <div class="badge violet">International Onboarding</div>
          <h2 style="margin-top:0.35rem;">${isModal ? "Add New Business Workspace" : "Welcome to MarketOS"}</h2>
        </div>
      </div>
      <p class="muted" style="margin:0.45rem 0 0;">Configure your country, adapted location fields, currency, and brand voice so AI campaigns match your market.</p>
    </div>

    <div class="card stack">
      <div class="row-between">
        <h3>1. Country & Region</h3>
        <button id="ob-detect-loc" type="button" class="btn btn-outline btn-sm">Detect via Location</button>
      </div>
      <div class="field">
        <label for="ob-country">Country (with flags & calling codes)</label>
        <select id="ob-country" class="select">
          ${COUNTRIES.map(
            (c) =>
              `<option value="${c.code}" ${c.code === ob.countryCode ? "selected" : ""}>${c.flag} ${esc(c.name)} (${c.callingCode}) — ${c.defaultCurrency}</option>`
          ).join("")}
        </select>
      </div>
      ${ob.locationMsg ? `<div class="badge sky">${esc(ob.locationMsg)}</div>` : ""}
    </div>

    <div class="card stack">
      <h3>2. Business Identity & Adapted Location</h3>
      <div class="field">
        <label for="ob-name">Business Name *</label>
        <input id="ob-name" class="input" value="${esc(ob.businessName)}" placeholder="e.g. Ziva Apparel Studio or Brew & Co" />
      </div>
      <div class="field">
        <label>Industry</label>
        <div class="chips" id="ob-industry-chips">
          ${INDUSTRIES.map(
            (ind) =>
              `<button type="button" class="chip ${ob.industry === ind ? "active" : ""}" data-industry="${esc(ind)}">${esc(ind)}</button>`
          ).join("")}
        </div>
      </div>
      <div class="grid-2">
        <div class="field">
          <label for="ob-state">${esc(country.regionLabel)}</label>
          <input id="ob-state" class="input" value="${esc(ob.stateRegion)}" />
        </div>
        <div class="field">
          <label for="ob-city">City</label>
          <input id="ob-city" class="input" value="${esc(ob.city)}" />
        </div>
      </div>
      <div class="grid-2">
        <div class="field">
          <label for="ob-postal">${esc(country.postalLabel)} (Optional)</label>
          <input id="ob-postal" class="input" value="${esc(ob.postalCode)}" />
        </div>
        <div class="field">
          <label for="ob-website">Website URL (Optional)</label>
          <input id="ob-website" class="input" value="${esc(ob.websiteUrl)}" placeholder="https://..." />
        </div>
      </div>
      <div class="field">
        <label for="ob-address">Business Address (Optional)</label>
        <input id="ob-address" class="input" value="${esc(ob.address)}" />
      </div>
    </div>

    <div class="card stack">
      <h3>3. Currency & Regional Formatting</h3>
      <p class="muted small" style="margin:0;">Country, billing currency, and display currency are stored separately. Changing display currency converts figures dynamically.</p>
      <div class="grid-2">
        <div class="field">
          <label for="ob-billing">Billing Currency</label>
          <select id="ob-billing" class="select">
            ${CURRENCIES.map(
              (cu) => `<option value="${cu.code}" ${cu.code === ob.billingCurrency ? "selected" : ""}>${cu.code} (${cu.symbol}) — ${esc(cu.name)}</option>`
            ).join("")}
          </select>
        </div>
        <div class="field">
          <label for="ob-display">Display Currency</label>
          <select id="ob-display" class="select">
            ${CURRENCIES.map(
              (cu) => `<option value="${cu.code}" ${cu.code === ob.displayCurrency ? "selected" : ""}>${cu.code} (${cu.symbol}) — ${esc(cu.name)}</option>`
            ).join("")}
          </select>
        </div>
      </div>
      <div class="grid-2">
        <div class="field">
          <label for="ob-lang">Content Language</label>
          <input id="ob-lang" class="input" value="${esc(ob.language)}" />
        </div>
        <div class="field">
          <label for="ob-tz">Time Zone</label>
          <input id="ob-tz" class="input" value="${esc(ob.timeZone)}" />
        </div>
      </div>
      <div class="grid-2">
        <div class="field">
          <label for="ob-voice">Brand Voice (Optional)</label>
          <input id="ob-voice" class="input" value="${esc(ob.brandVoice)}" placeholder="Warm, modern, trustworthy" />
        </div>
        <div class="field">
          <label for="ob-aud">Target Audience (Optional)</label>
          <input id="ob-aud" class="input" value="${esc(ob.targetAudience)}" placeholder="Young professionals aged 22-38" />
        </div>
      </div>
    </div>

    <div class="row-between">
      ${isModal ? `<button id="ob-cancel" type="button" class="btn btn-outline">Cancel</button>` : `<button id="ob-signout" type="button" class="btn btn-outline">Sign Out</button>`}
      <button id="ob-submit" type="button" class="btn btn-primary">${isModal ? "Create Workspace" : "Launch MarketOS Dashboard"}</button>
    </div>
  `;

  if (!isModal) {
    root.innerHTML = `<div class="onboarding-page"><div class="onboarding-container">${formHtml}</div></div>`;
  } else {
    openModal(`<div class="modal-card" style="width:min(700px,100%);">${formHtml}</div>`, () => bindOnboardingEvents(true));
    return;
  }
  bindOnboardingEvents(false);
}

function bindOnboardingEvents(isModal) {
  const ob = appState.onboarding;
  const syncFields = () => {
    ob.businessName = document.getElementById("ob-name")?.value || "";
    ob.stateRegion = document.getElementById("ob-state")?.value || "";
    ob.city = document.getElementById("ob-city")?.value || "";
    ob.postalCode = document.getElementById("ob-postal")?.value || "";
    ob.websiteUrl = document.getElementById("ob-website")?.value || "";
    ob.address = document.getElementById("ob-address")?.value || "";
    ob.billingCurrency = document.getElementById("ob-billing")?.value || ob.billingCurrency;
    ob.displayCurrency = document.getElementById("ob-display")?.value || ob.displayCurrency;
    ob.language = document.getElementById("ob-lang")?.value || ob.language;
    ob.timeZone = document.getElementById("ob-tz")?.value || ob.timeZone;
    ob.brandVoice = document.getElementById("ob-voice")?.value || "";
    ob.targetAudience = document.getElementById("ob-aud")?.value || "";
  };

  document.getElementById("ob-country")?.addEventListener("change", (e) => {
    syncFields();
    const c = findCountryByCode(e.target.value);
    ob.countryCode = c.code;
    ob.billingCurrency = c.defaultCurrency;
    ob.displayCurrency = c.defaultCurrency;
    ob.language = c.defaultLanguage;
    ob.timeZone = c.defaultTimeZone;
    ob.dateFormat = c.defaultDateFormat;
    ob.numberFormat = c.defaultNumberLocale;
    if (isModal) renderOnboardingScreen(null, true);
    else renderOnboardingScreen(document.getElementById("app-root"), false);
  });

  document.querySelectorAll("#ob-industry-chips .chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      syncFields();
      ob.industry = btn.dataset.industry;
      if (isModal) renderOnboardingScreen(null, true);
      else renderOnboardingScreen(document.getElementById("app-root"), false);
    });
  });

  document.getElementById("ob-detect-loc")?.addEventListener("click", () => {
    syncFields();
    if (!navigator.geolocation) {
      ob.locationMsg = "Browser geolocation unavailable; select country manually.";
      if (isModal) renderOnboardingScreen(null, true);
      else renderOnboardingScreen(document.getElementById("app-root"), false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`
          );
          const geo = await res.json();
          const c = findCountryByCode(geo.countryCode || "IN");
          ob.countryCode = c.code;
          ob.billingCurrency = c.defaultCurrency;
          ob.displayCurrency = c.defaultCurrency;
          ob.language = c.defaultLanguage;
          ob.timeZone = c.defaultTimeZone;
          ob.dateFormat = c.defaultDateFormat;
          ob.numberFormat = c.defaultNumberLocale;
          if (geo.principalSubdivision) ob.stateRegion = geo.principalSubdivision;
          if (geo.city || geo.locality) ob.city = geo.city || geo.locality;
          ob.locationMsg = `Suggested ${c.flag} ${c.name} from browser location.`;
        } catch {
          ob.locationMsg = "Could not reverse-geocode coordinates; manual selection ready.";
        }
        if (isModal) renderOnboardingScreen(null, true);
        else renderOnboardingScreen(document.getElementById("app-root"), false);
      },
      () => {
        ob.locationMsg = "Location permission declined. Manual country selection is ready.";
        if (isModal) renderOnboardingScreen(null, true);
        else renderOnboardingScreen(document.getElementById("app-root"), false);
      },
      { timeout: 8000 }
    );
  });

  document.getElementById("ob-cancel")?.addEventListener("click", closeModal);
  document.getElementById("ob-signout")?.addEventListener("click", async () => {
    await store.signOut();
    appState.screen = "auth";
    render();
  });

  document.getElementById("ob-submit")?.addEventListener("click", async () => {
    syncFields();
    if (!ob.businessName.trim()) {
      toast("Please enter your business name.");
      return;
    }
    const tier = SUBSCRIPTION_TIERS[appState.profile?.subscriptionTier || "STARTER"] || SUBSCRIPTION_TIERS.STARTER;
    if (appState.businesses.length >= tier.maxBusinesses) {
      toast(`${tier.displayName} plan supports up to ${tier.maxBusinesses} workspace(s). Upgrade plan in Settings.`);
      return;
    }
    const c = findCountryByCode(ob.countryCode);
    try {
      await store.createBusinessWorkspace(appState.user.uid, {
        ...ob,
        name: ob.businessName.trim(),
        countryName: c.name
      });
      if (isModal) closeModal();
      appState.onboarding = null;
      toast(`Workspace '${ob.businessName.trim()}' ready!`);
    } catch (err) {
      toast("Save failed: " + err.message);
    }
  });
}

// ---------------- App Shell ----------------
function renderAppShell(root) {
  const biz = getActiveBusiness();
  if (!biz) {
    renderOnboardingScreen(root, false);
    return;
  }
  const country = findCountryByCode(biz.countryCode);
  const items = activeScoped(appState.contentItems);
  const pendingCount = items.filter((i) => i.approvalStatus === "PENDING_APPROVAL").length;
  const scheduledCount = items.filter((i) => i.approvalStatus === "SCHEDULED").length;

  const groups = ["Cyton AI", "Workspace", "Create", "Publish & Track", "System"];
  const navHtml = groups
    .map((grp) => {
      const links = APP_SECTIONS.filter((s) => s.group === grp)
        .map((s) => {
          const count = s.id === "approvals" ? pendingCount : s.id === "content_calendar" ? scheduledCount : 0;
          return `
            <button type="button" class="nav-item ${appState.activeSection === s.id ? "active" : ""}" data-nav="${s.id}">
              <span>${esc(s.label)}</span>
              ${count > 0 ? `<span class="nav-badge">${count}</span>` : ""}
            </button>`;
        })
        .join("");
      return `<div><div class="nav-group-label">${grp}</div>${links}</div>`;
    })
    .join("");

  root.innerHTML = `
    <div class="app-shell">
      <div class="mobile-backdrop ${appState.sidebarOpen ? "open" : ""}" id="mobile-backdrop"></div>
      <aside class="sidebar ${appState.sidebarOpen ? "open" : ""}">
        <div class="brand-row">
          <img src="./assets/brand-logo.png" alt="CYTON by MarketOS logo" />
          <div>
            <div class="brand-name">CYTON <span>AI</span></div>
            <div class="brand-sub">by MarketOS</div>
          </div>
        </div>
        ${navHtml}
      </aside>

      <div class="main-area">
        <header class="topbar">
          <div class="topbar-left">
            <button id="btn-toggle-sidebar" class="btn btn-outline btn-sm mobile-drawer-btn" type="button">Menu</button>
            <select id="workspace-switcher" class="workspace-select" aria-label="Switch active business">
              ${appState.businesses
                .map((b) => {
                  const bc = findCountryByCode(b.countryCode);
                  return `<option value="${esc(b.id)}" ${b.id === biz.id ? "selected" : ""}>${bc.flag} ${esc(b.name)} (${esc(b.displayCurrency)})</option>`;
                })
                .join("")}
            </select>
            <button id="btn-topbar-add-biz" class="btn btn-outline btn-sm" type="button">+ Business</button>
          </div>
          <div class="topbar-right">
            <button id="btn-topbar-cyton" class="btn ${appState.activeSection === "cyton" ? "btn-primary" : "btn-outline"} btn-sm" type="button">
              ✦ Cyton Core
            </button>
            <span class="badge ${appState.sessionMode === "firebase" ? "emerald" : "sky"}">
              ${appState.sessionMode === "firebase" ? "Cloud Sync" : "Web Session"}
            </span>
            <button id="btn-theme-toggle" class="btn btn-outline btn-sm" type="button">
              ${appState.theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
          </div>
        </header>

        <main class="content-wrap ${appState.activeSection === "cyton" ? "cyton-full-wrap" : ""}" id="section-content"></main>
      </div>
    </div>
  `;

  document.getElementById("btn-toggle-sidebar")?.addEventListener("click", () => {
    appState.sidebarOpen = !appState.sidebarOpen;
    render();
  });
  document.getElementById("mobile-backdrop")?.addEventListener("click", () => {
    appState.sidebarOpen = false;
    render();
  });
  document.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      appState.activeSection = btn.dataset.nav;
      appState.sidebarOpen = false;
      appState.aiStatus = "idle";
      appState.aiError = "";
      render();
    });
  });
  document.getElementById("btn-topbar-cyton")?.addEventListener("click", () => {
    appState.activeSection = "cyton";
    appState.sidebarOpen = false;
    render();
  });
  document.getElementById("workspace-switcher")?.addEventListener("change", async (e) => {
    await store.setActiveBusinessId(appState.user.uid, e.target.value);
    toast("Switched business workspace");
  });
  document.getElementById("btn-topbar-add-biz")?.addEventListener("click", () => {
    initOnboardingDraft();
    renderOnboardingScreen(null, true);
  });
  document.getElementById("btn-theme-toggle")?.addEventListener("click", () => {
    applyTheme(appState.theme === "dark" ? "light" : "dark");
    render();
  });

  const main = document.getElementById("section-content");
  switch (appState.activeSection) {
    case "cyton":
      renderCytonCommandCentre(main, { appState, store, biz, toast, openModal, closeModal, render });
      break;
    case "overview":
      renderOverview(main, biz, country);
      break;
    case "ai_assistant":
      renderAiAssistant(main, biz);
      break;
    case "campaign_planner":
      renderCampaignPlanner(main, biz);
      break;
    case "social_media":
      renderSocialStudio(main, biz);
      break;
    case "seo_studio":
      renderSeoStudio(main, biz);
      break;
    case "email_studio":
      renderEmailStudio(main, biz);
      break;
    case "brand_studio":
      renderBrandStudio(main, biz);
      break;
    case "ads_studio":
      renderAdsStudio(main, biz);
      break;
    case "content_calendar":
      renderContentCalendar(main, biz);
      break;
    case "approvals":
      renderApprovals(main, biz);
      break;
    case "analytics":
      renderAnalytics(main, biz);
      break;
    case "integrations":
      renderIntegrations(main, biz);
      break;
    case "settings":
      renderSettings(main, biz);
      break;
    default:
      renderOverview(main, biz, country);
  }
}

// ---------------- Shared AI Result Widget ----------------
function renderAiResultHtml(showCampaignButton = false) {
  if (appState.aiStatus === "loading") {
    return `
      <div class="card hi">
        <strong>MarketOS Central AI Orchestrator is working...</strong>
        <p class="muted small" style="margin:0.3rem 0 0;">Applying ${esc(getActiveBusiness()?.name)} brand memory & regional context.</p>
      </div>`;
  }
  if (appState.aiStatus === "error") {
    const missingKey = appState.aiError.includes("AI_KEY_MISSING");
    return `
      <div class="error-banner stack">
        <div>${esc(appState.aiError.replace("AI_KEY_MISSING: ", ""))}</div>
        <div class="row-gap">
          ${missingKey ? `<button id="btn-open-ai-key-modal" class="btn btn-primary btn-sm" type="button">Connect Gemini API Key</button>` : ""}
          ${appState.lastAiPrompt ? `<button id="btn-retry-ai" class="btn btn-outline btn-sm" type="button">Retry</button>` : ""}
          <button id="btn-dismiss-ai" class="btn btn-outline btn-sm" type="button">Dismiss</button>
        </div>
      </div>`;
  }
  if (appState.aiStatus === "success" && appState.aiDeliverable) {
    const d = appState.aiDeliverable;
    return `
      <div class="card hi stack">
        <div class="row-between">
          <div>
            <span class="badge violet">${esc(AI_MODULES[d.selectedModule]?.displayName || d.selectedModule)}</span>
            <h3 style="margin-top:0.45rem;">${esc(d.contentTitle)}</h3>
            <div class="muted small">${esc(d.targetPlatform)} • ${esc(CONTENT_TYPES[d.contentType] || d.contentType)} • ~${d.estimatedTokens} tokens</div>
          </div>
          <button id="btn-dismiss-ai" class="btn btn-outline btn-sm" type="button">Close</button>
        </div>
        <p class="small pre-wrap" style="margin:0;">${esc(d.generatedBody)}</p>
        ${d.hashtags ? `<div class="mono small" style="color:var(--purple-bright)">${esc(d.hashtags)}</div>` : ""}
        ${d.strategicNotes ? `<div class="muted small"><strong>Notes:</strong> ${esc(d.strategicNotes)}</div>` : ""}
        <div class="row-gap">
          <button id="btn-ai-save-draft" class="btn btn-outline btn-sm" type="button">Save as Draft</button>
          <button id="btn-ai-submit-approval" class="btn btn-primary btn-sm" type="button">Submit for Approval</button>
          ${showCampaignButton ? `<button id="btn-ai-save-campaign" class="btn btn-outline btn-sm" type="button">Create Campaign</button>` : ""}
        </div>
      </div>`;
  }
  return "";
}

function bindAiResultEvents() {
  document.getElementById("btn-dismiss-ai")?.addEventListener("click", () => {
    appState.aiStatus = "idle";
    appState.aiError = "";
    render();
  });
  document.getElementById("btn-retry-ai")?.addEventListener("click", () => {
    if (appState.lastAiPrompt) triggerAiOrchestrator({ prompt: appState.lastAiPrompt });
  });
  document.getElementById("btn-ai-save-draft")?.addEventListener("click", () => saveAiDeliverable(false));
  document.getElementById("btn-ai-submit-approval")?.addEventListener("click", () => saveAiDeliverable(true));
  document.getElementById("btn-ai-save-campaign")?.addEventListener("click", () => saveAiAsCampaign());
  document.getElementById("btn-open-ai-key-modal")?.addEventListener("click", openGeminiSetupModal);
}

function openGeminiSetupModal() {
  const prefs = getSavedPreferences();
  openModal(
    `<div class="modal-card">
      <h3>Connect Gemini AI Engine</h3>
      <p class="muted small" style="margin:0;">Enter your Gemini API key (stored locally in your browser only) to power live AI orchestration across all 7 MarketOS studios on ${esc("marketosai.vercel.app")}.</p>
      <div class="field">
        <label for="modal-gemini-key">Gemini API Key</label>
        <input id="modal-gemini-key" type="password" class="input" value="${esc(prefs.geminiKey)}" placeholder="AIza..." />
      </div>
      <div class="field">
        <label for="modal-gemini-model">Model</label>
        <input id="modal-gemini-model" class="input" value="${esc(prefs.geminiModel)}" />
      </div>
      <div class="row-between">
        <button id="modal-cancel" class="btn btn-outline" type="button">Cancel</button>
        <button id="modal-save-key" class="btn btn-primary" type="button">Save Key</button>
      </div>
    </div>`,
    () => {
      document.getElementById("modal-cancel")?.addEventListener("click", closeModal);
      document.getElementById("modal-save-key")?.addEventListener("click", () => {
        const key = document.getElementById("modal-gemini-key").value;
        const model = document.getElementById("modal-gemini-model").value || "gemini-2.5-flash";
        savePreferences({ geminiKey: key, geminiModel: model });
        closeModal();
        toast("Gemini AI configuration saved");
        if (appState.lastAiPrompt) {
          triggerAiOrchestrator({ prompt: appState.lastAiPrompt });
        }
      });
    }
  );
}

// ---------------- Section 1: Overview ----------------
function renderOverview(container, biz, country) {
  const campaigns = activeScoped(appState.campaigns);
  const items = activeScoped(appState.contentItems);
  const analytics = activeScoped(appState.analytics);
  const rates = appState.exchangeRates?.ratesFromUsd;

  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE");
  const drafts = items.filter((i) => i.approvalStatus === "DRAFT");
  const pending = items.filter((i) => i.approvalStatus === "PENDING_APPROVAL");
  const scheduled = items.filter((i) => i.approvalStatus === "SCHEDULED");
  const published = items.filter((i) => i.approvalStatus === "PUBLISHED");

  const totalSpendDisplay =
    analytics.reduce((sum, r) => sum + convertCurrency(r.spendAmount, r.spendCurrency, biz.displayCurrency, rates), 0) +
    campaigns.reduce((sum, c) => sum + convertCurrency(c.spentAmount, c.budgetCurrency, biz.displayCurrency, rates), 0);

  const tier = SUBSCRIPTION_TIERS[appState.profile?.subscriptionTier || "STARTER"] || SUBSCRIPTION_TIERS.STARTER;
  const aiUsed = appState.profile?.aiGenerationsThisMonth || 0;
  const pct = Math.min(100, Math.round((aiUsed / Math.max(1, tier.monthlyAiLimit)) * 100));

  const actualCount = analytics.filter((a) => a.actualData).length;
  const impressions = analytics.reduce((s, a) => s + (a.impressions || 0), 0);
  const clicks = analytics.reduce((s, a) => s + (a.clicks || 0), 0);

  container.innerHTML = `
    <div class="hero-banner">
      <div class="badge violet">Plan. Create. Grow.</div>
      <h2 style="margin-top:0.5rem;">${country.flag} ${esc(biz.name)}</h2>
      <p class="muted" style="margin:0.25rem 0 0;">${esc(biz.industry)} • ${esc(biz.city || biz.countryName)} • Display ${esc(biz.displayCurrency)} • ${esc(biz.timeZone)}</p>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card" data-jump="campaign_planner">
        <div class="kpi-label">Active Campaigns</div>
        <div class="kpi-value">${activeCampaigns.length}</div>
        <div class="kpi-caption">${campaigns.length} total campaigns</div>
      </div>
      <div class="kpi-card" data-jump="approvals">
        <div class="kpi-label">Pending Approvals</div>
        <div class="kpi-value" style="color:var(--amber)">${pending.length}</div>
        <div class="kpi-caption">${drafts.length} drafts waiting</div>
      </div>
      <div class="kpi-card" data-jump="content_calendar">
        <div class="kpi-label">Scheduled Queue</div>
        <div class="kpi-value" style="color:var(--sky)">${scheduled.length}</div>
        <div class="kpi-caption">${published.length} published</div>
      </div>
      <div class="kpi-card" data-jump="analytics">
        <div class="kpi-label">Monthly Spend</div>
        <div class="kpi-value" style="color:var(--emerald)">${esc(formatCurrencyAmount(totalSpendDisplay, biz.displayCurrency, biz.numberFormat))}</div>
        <div class="kpi-caption">${esc(appState.exchangeRates?.sourceLabel || "Baseline FX")}</div>
      </div>
    </div>

    <div class="card hi stack">
      <div class="row-between">
        <h3>AI Department Quota & Growth</h3>
        <span class="badge violet">${esc(tier.displayName)} Plan</span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="muted small">${aiUsed} / ${tier.monthlyAiLimit} AI generations used this month • ${appState.profile?.aiTokenCountThisMonth || 0} est. tokens</div>
      <div class="row-gap">
        <button id="ov-quick-ai" class="btn btn-primary btn-sm" type="button">AI Growth Plan</button>
        <button class="btn btn-outline btn-sm" data-jump="ai_assistant" type="button">Open Assistant</button>
      </div>
    </div>

    ${renderAiResultHtml(true)}

    <div class="card stack">
      <div class="row-between">
        <h3>Performance Snapshot</h3>
        <button class="btn btn-outline btn-sm" data-jump="analytics" type="button">Full Analytics</button>
      </div>
      <p class="muted" style="margin:0;">
        ${
          analytics.length === 0
            ? "No verified or logged performance metrics yet. Log actual campaign results or connect analytics in Analytics."
            : `${actualCount} actual record(s) • ${analytics.length - actualCount} estimate(s) • ${impressions} impressions • ${clicks} clicks`
        }
      </p>
    </div>

    <div class="card stack">
      <h3>Recent Content & Publishing Pipeline</h3>
      ${
        items.length === 0
          ? `<p class="muted" style="margin:0;">No content drafts yet. Launch AI Assistant or any marketing studio to generate your first asset.</p>`
          : items
              .slice(0, 5)
              .map((it) => {
                const st = APPROVAL_STATUSES[it.approvalStatus] || APPROVAL_STATUSES.DRAFT;
                return `
                  <div class="row-between" style="padding:0.45rem 0;border-bottom:1px solid var(--border);">
                    <div>
                      <strong>${esc(it.title)}</strong>
                      <div class="muted small">${esc(it.platform)} • ${esc(CONTENT_TYPES[it.contentType] || it.contentType)}</div>
                    </div>
                    <span class="badge ${st.color}">${esc(st.label)}</span>
                  </div>`;
              })
              .join("")
      }
    </div>
  `;

  container.querySelectorAll("[data-jump]").forEach((el) => {
    el.addEventListener("click", () => {
      appState.activeSection = el.dataset.jump;
      render();
    });
  });

  document.getElementById("ov-quick-ai")?.addEventListener("click", () => {
    triggerAiOrchestrator({
      prompt: `Recommend the top 3 high-ROI marketing actions this month for ${biz.name} (${biz.industry}) in ${biz.countryName} using currency ${biz.billingCurrency}.`,
      requestedModule: "GROWTH_ANALYST"
    });
  });
  bindAiResultEvents();
}

// ---------------- Section 2: AI Assistant ----------------
let pendingAiImage = null;

function renderAiAssistant(container, biz) {
  const messages = activeScoped(appState.aiMessages);
  const cu = findCurrency(biz.billingCurrency);
  const prompts = [
    `Create a 7-day Instagram campaign for ${biz.name}`,
    biz.countryCode === "IN" ? "Prepare a Diwali marketing campaign" : "Prepare a seasonal holiday promotion campaign",
    "Generate an email campaign for our flagship offer",
    `Create a monthly marketing strategy with a ${cu.symbol}5,000 budget`
  ];

  container.innerHTML = `
    <div class="card row-between">
      <div>
        <h2>MarketOS Central AI Orchestrator</h2>
        <div class="muted small">Context: ${esc(biz.name)} (${esc(biz.countryName)}, ${esc(biz.billingCurrency)}) • Model: ${esc(getSavedPreferences().geminiModel)}</div>
      </div>
      <button id="ai-cfg-btn" class="btn btn-outline btn-sm" type="button">AI Key / Model</button>
    </div>

    <div class="chips">
      ${prompts.map((p) => `<button type="button" class="chip ai-sample-chip" data-sample="${esc(p)}">${esc(p)}</button>`).join("")}
    </div>

    <div class="card hi stack">
      <div class="field">
        <label for="ai-prompt-box">Ask your AI marketing department...</label>
        <textarea id="ai-prompt-box" class="textarea" rows="3" placeholder="e.g. Launch a weekend offer for Instagram & Email"></textarea>
      </div>
      <div class="row-between">
        <div class="row-gap">
          <label class="btn btn-outline btn-sm" style="cursor:pointer;">
            Attach Image
            <input id="ai-image-input" type="file" accept="image/*" style="display:none;" />
          </label>
          <span id="ai-image-label" class="muted small">${pendingAiImage ? esc(pendingAiImage.label) : ""}</span>
        </div>
        <button id="ai-send-btn" class="btn btn-primary" type="button" ${appState.aiStatus === "loading" ? "disabled" : ""}>Orchestrate</button>
      </div>
    </div>

    ${renderAiResultHtml(true)}

    <div class="stack">
      <h3>Conversation History (${messages.length})</h3>
      ${
        messages.length === 0
          ? `<div class="card muted">Your assistant remembers ${esc(biz.name)}'s brand voice, country, and currency across every conversation.</div>`
          : [...messages]
              .reverse()
              .slice(0, 20)
              .map(
                (m) => `
              <div class="card ${m.role === "ASSISTANT" ? "hi" : ""}">
                <div class="row-between">
                  <strong class="small" style="color:${m.role === "ASSISTANT" ? "var(--purple-bright)" : "var(--text-muted)"}">
                    ${m.role === "USER" ? "You" : `MarketOS • ${esc(m.moduleUsed)}`}
                  </strong>
                  ${m.attachmentLabel ? `<span class="badge violet">${esc(m.attachmentLabel)}</span>` : ""}
                </div>
                ${m.structuredPreview ? `<div class="small" style="color:var(--purple-bright);margin-top:0.25rem;">${esc(m.structuredPreview)}</div>` : ""}
                <p class="small pre-wrap" style="margin:0.45rem 0 0;">${esc(m.messageText)}</p>
              </div>`
              )
              .join("")
      }
    </div>
  `;

  document.getElementById("ai-cfg-btn")?.addEventListener("click", openGeminiSetupModal);

  document.querySelectorAll(".ai-sample-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const box = document.getElementById("ai-prompt-box");
      if (box) box.value = chip.dataset.sample;
    });
  });

  document.getElementById("ai-image-input")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const [meta, base64Data] = dataUrl.split(",");
      const mimeType = meta?.match(/data:(.*?);/)?.[1] || "image/jpeg";
      pendingAiImage = { mimeType, base64Data, label: file.name };
      const lbl = document.getElementById("ai-image-label");
      if (lbl) lbl.textContent = file.name;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById("ai-send-btn")?.addEventListener("click", () => {
    const val = document.getElementById("ai-prompt-box")?.value.trim();
    if (!val) return;
    const img = pendingAiImage;
    pendingAiImage = null;
    triggerAiOrchestrator({
      prompt: val,
      imageAttachment: img ? { mimeType: img.mimeType, base64Data: img.base64Data } : null,
      attachmentLabel: img?.label || ""
    });
  });

  bindAiResultEvents();
}

// ---------------- Section 3: Campaign Planner ----------------
function renderCampaignPlanner(container, biz) {
  const allCampaigns = activeScoped(appState.campaigns);
  const items = activeScoped(appState.contentItems);
  const rates = appState.exchangeRates?.ratesFromUsd;
  const f = appState.filters.campaignStatus;
  const filtered = f === "ALL" ? allCampaigns : allCampaigns.filter((c) => c.status === f);

  container.innerHTML = `
    <div class="row-between">
      <div>
        <h2>Campaign Planner</h2>
        <div class="muted small">Budgets stored in ${esc(biz.billingCurrency)}, displayed in ${esc(biz.displayCurrency)}</div>
      </div>
      <button id="cmp-new-btn" class="btn btn-primary" type="button">+ New Campaign</button>
    </div>

    <div class="card hi stack">
      <h3>AI Campaign Strategist</h3>
      <div class="field">
        <label for="cmp-ai-input">Campaign goal, festival, or launch brief</label>
        <input id="cmp-ai-input" class="input" placeholder="e.g. 30-day festival launch with ${esc(biz.billingCurrency)} 10,000 budget" />
      </div>
      <button id="cmp-ai-btn" class="btn btn-primary" type="button">Generate Campaign Strategy</button>
    </div>

    ${renderAiResultHtml(true)}

    <div class="chips">
      <button type="button" class="chip cmp-filter ${f === "ALL" ? "active" : ""}" data-st="ALL">All (${allCampaigns.length})</button>
      ${CAMPAIGN_STATUSES.map(
        (st) => `<button type="button" class="chip cmp-filter ${f === st ? "active" : ""}" data-st="${st}">${st}</button>`
      ).join("")}
    </div>

    <div class="stack">
      ${
        filtered.length === 0
          ? `<div class="card muted">No campaigns in this view. Create a campaign or generate one above.</div>`
          : filtered
              .map((c) => {
                const linked = items.filter((i) => i.campaignId === c.id).length;
                const budget = formatConvertedWithOriginal(c.budgetAmount, c.budgetCurrency, biz.displayCurrency, biz.numberFormat, rates);
                return `
                  <div class="card stack">
                    <div class="row-between">
                      <div>
                        <strong>${esc(c.title)}</strong>
                        <div class="muted small">${esc((c.platforms || []).join(", ") || "Multi-channel")} • ${linked} content item(s)</div>
                      </div>
                      <span class="badge violet">${esc(c.status)}</span>
                    </div>
                    ${c.objective ? `<p class="small" style="margin:0;">${esc(c.objective)}</p>` : ""}
                    <div class="small" style="color:var(--purple-bright);font-weight:600;">Budget: ${esc(budget)}</div>
                    ${c.strategySummary ? `<p class="muted small" style="margin:0;">${esc(c.strategySummary.slice(0, 220))}</p>` : ""}
                    <div class="row-gap">
                      <button class="btn btn-outline btn-sm cmp-edit" data-id="${esc(c.id)}" type="button">Edit</button>
                      <button class="btn btn-outline btn-sm cmp-clone" data-id="${esc(c.id)}" type="button">Clone</button>
                      ${
                        c.status === "ACTIVE"
                          ? `<button class="btn btn-outline btn-sm cmp-status" data-id="${esc(c.id)}" data-next="PAUSED" type="button">Pause</button>`
                          : c.status !== "ARCHIVED"
                            ? `<button class="btn btn-outline btn-sm cmp-status" data-id="${esc(c.id)}" data-next="ACTIVE" type="button">Activate</button>`
                            : ""
                      }
                      ${
                        c.status !== "ARCHIVED"
                          ? `<button class="btn btn-outline btn-sm cmp-status" data-id="${esc(c.id)}" data-next="ARCHIVED" type="button">Archive</button>`
                          : ""
                      }
                    </div>
                  </div>`;
              })
              .join("")
      }
    </div>
  `;

  document.getElementById("cmp-ai-btn")?.addEventListener("click", () => {
    const val = document.getElementById("cmp-ai-input")?.value.trim();
    if (!val) return;
    triggerAiOrchestrator({
      prompt: `Build a full marketing campaign strategy for ${biz.name} (${biz.industry}). Brief: ${val}`,
      requestedModule: "CAMPAIGN_PLANNER",
      saveConversation: false
    });
  });

  document.querySelectorAll(".cmp-filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      appState.filters.campaignStatus = btn.dataset.st;
      render();
    });
  });

  document.getElementById("cmp-new-btn")?.addEventListener("click", () => openCampaignEditorModal(biz, null));
  document.querySelectorAll(".cmp-edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = allCampaigns.find((c) => c.id === btn.dataset.id);
      if (target) openCampaignEditorModal(biz, target);
    });
  });
  document.querySelectorAll(".cmp-clone").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const target = allCampaigns.find((c) => c.id === btn.dataset.id);
      if (!target) return;
      await store.saveCampaign(
        appState.user.uid,
        { ...target, id: "", title: `${target.title} (Copy)`.slice(0, 140), status: "DRAFT", spentAmount: 0 },
        false
      );
      toast("Campaign duplicated as Draft");
    });
  });
  document.querySelectorAll(".cmp-status").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await store.updateCampaignStatus(appState.user.uid, btn.dataset.id, btn.dataset.next);
      toast(`Campaign marked ${btn.dataset.next.toLowerCase()}`);
    });
  });
  bindAiResultEvents();
}

function openCampaignEditorModal(biz, initial) {
  const platformsList = ["Instagram", "Facebook", "YouTube", "Email", "Google Ads", "Website SEO"];
  const chosen = new Set(initial?.platforms || ["Instagram"]);
  openModal(
    `<div class="modal-card">
      <h3>${initial ? "Edit Campaign" : "Create Campaign"}</h3>
      <div class="field"><label>Title *</label><input id="m-cmp-title" class="input" value="${esc(initial?.title || "")}" /></div>
      <div class="field"><label>Objective</label><input id="m-cmp-obj" class="input" value="${esc(initial?.objective || "")}" /></div>
      <div class="field"><label>Budget (${esc(biz.billingCurrency)})</label><input id="m-cmp-budget" type="number" class="input" value="${esc(initial?.budgetAmount ?? 5000)}" /></div>
      <div class="field">
        <label>Platforms</label>
        <div class="chips" id="m-cmp-plats">
          ${platformsList.map((p) => `<button type="button" class="chip ${chosen.has(p) ? "active" : ""}" data-p="${p}">${p}</button>`).join("")}
        </div>
      </div>
      <div class="field">
        <label>Status</label>
        <select id="m-cmp-status" class="select">
          ${CAMPAIGN_STATUSES.map((s) => `<option value="${s}" ${(initial?.status || "DRAFT") === s ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </div>
      <div class="field"><label>Strategy Summary</label><textarea id="m-cmp-strat" class="textarea" rows="3">${esc(initial?.strategySummary || "")}</textarea></div>
      <div class="row-between">
        <button id="modal-cancel" class="btn btn-outline" type="button">Cancel</button>
        <button id="modal-save" class="btn btn-primary" type="button">Save Campaign</button>
      </div>
    </div>`,
    () => {
      document.querySelectorAll("#m-cmp-plats .chip").forEach((ch) => {
        ch.addEventListener("click", () => {
          const p = ch.dataset.p;
          if (chosen.has(p)) chosen.delete(p);
          else chosen.add(p);
          ch.classList.toggle("active", chosen.has(p));
        });
      });
      document.getElementById("modal-cancel")?.addEventListener("click", closeModal);
      document.getElementById("modal-save")?.addEventListener("click", async () => {
        const title = document.getElementById("m-cmp-title").value.trim();
        if (!title) return toast("Title is required.");
        const nowSec = Math.floor(Date.now() / 1000);
        await store.saveCampaign(
          appState.user.uid,
          {
            id: initial?.id || "",
            businessId: biz.id,
            title,
            objective: document.getElementById("m-cmp-obj").value.trim(),
            budgetAmount: parseFloat(document.getElementById("m-cmp-budget").value) || 0,
            budgetCurrency: initial?.budgetCurrency || biz.billingCurrency,
            spentAmount: initial?.spentAmount || 0,
            platforms: Array.from(chosen),
            status: document.getElementById("m-cmp-status").value,
            startDateEpoch: initial?.startDateEpoch || nowSec,
            endDateEpoch: initial?.endDateEpoch || nowSec + 30 * 86400,
            strategySummary: document.getElementById("m-cmp-strat").value.trim()
          },
          Boolean(initial)
        );
        closeModal();
        toast(initial ? "Campaign updated" : "Campaign created");
      });
    }
  );
}

// ---------------- Sections 4-8: Studios ----------------
function renderSocialStudio(container, biz) {
  const formats = ["Instagram Caption", "Facebook Post", "Reel Concept", "7-Day Content Calendar", "Creative Brief"];
  const sel = appState.filters.socialFormat;
  container.innerHTML = `
    <h2>Social Media Studio</h2>
    <div class="card hi stack">
      <div class="muted small">Social Media Agent (${esc(biz.countryName)})</div>
      <div class="chips">
        ${formats.map((f) => `<button type="button" class="chip soc-fmt ${sel === f ? "active" : ""}" data-f="${esc(f)}">${esc(f)}</button>`).join("")}
      </div>
      <div class="field">
        <label for="soc-topic">Product, offer, or occasion</label>
        <textarea id="soc-topic" class="textarea" rows="2" placeholder="e.g. Weekend brunch special or new festive collection"></textarea>
      </div>
      <button id="soc-gen" class="btn btn-primary" type="button">Generate ${esc(sel)}</button>
    </div>
    ${renderAiResultHtml(false)}
  `;
  document.querySelectorAll(".soc-fmt").forEach((b) => {
    b.addEventListener("click", () => {
      appState.filters.socialFormat = b.dataset.f;
      render();
    });
  });
  document.getElementById("soc-gen")?.addEventListener("click", () => {
    const topic = document.getElementById("soc-topic").value.trim();
    if (!topic) return toast("Enter a topic or offer first.");
    triggerAiOrchestrator({
      prompt: `Create a ${sel} for ${biz.name} (${biz.industry}) in ${biz.countryName}. Topic: ${topic}. Include platform-specific formatting and hashtags.`,
      requestedModule: "SOCIAL_MEDIA",
      saveConversation: false
    });
  });
  bindAiResultEvents();
}

function renderSeoStudio(container, biz) {
  const seo = appState.seoResult;
  container.innerHTML = `
    <h2>SEO Studio</h2>
    <div class="card stack">
      <h3>Live Website Metadata Inspector</h3>
      <p class="muted small" style="margin:0;">Inspects real HTML title, meta description, and H1 tags. MarketOS never fabricates search volume or domain authority metrics.</p>
      <div class="row-gap">
        <input id="seo-url" class="input" style="flex:1;min-width:220px;" value="${esc(seo?.url || biz.websiteUrl)}" placeholder="https://yourbusiness.com" />
        <button id="seo-fetch-btn" class="btn btn-outline" type="button" ${appState.seoStatus === "loading" ? "disabled" : ""}>
          ${appState.seoStatus === "loading" ? "Inspecting..." : "Inspect Live Tags"}
        </button>
      </div>
      ${appState.seoStatus === "error" ? `<div class="error-banner">${esc(appState.seoError)}</div>` : ""}
      ${
        appState.seoStatus === "success" && seo
          ? `<div class="stack" style="padding-top:0.4rem;">
              <div><span class="badge emerald">HTTP ${seo.httpStatus} • ~${seo.wordCountEstimate} words</span></div>
              <div class="small"><strong>Title:</strong> ${esc(seo.title)}</div>
              <div class="small"><strong>Meta Description:</strong> ${esc(seo.metaDescription)}</div>
              <div class="small"><strong>Primary H1:</strong> ${esc(seo.primaryHeading)}</div>
            </div>`
          : ""
      }
    </div>

    <div class="card hi stack">
      <h3>SEO Strategy & Content Briefs</h3>
      <div class="field">
        <label for="seo-topic">Target product, service, or blog keyword</label>
        <input id="seo-topic" class="input" placeholder="e.g. Organic cotton kurtas in Mumbai / Local coffee roastery" />
      </div>
      <button id="seo-gen-btn" class="btn btn-primary" type="button">Generate SEO Strategy</button>
    </div>
    ${renderAiResultHtml(false)}
  `;

  document.getElementById("seo-fetch-btn")?.addEventListener("click", async () => {
    const url = document.getElementById("seo-url").value.trim();
    appState.seoStatus = "loading";
    appState.seoError = "";
    render();
    try {
      appState.seoResult = await inspectWebsiteSeoMetadata(url);
      appState.seoStatus = "success";
    } catch (err) {
      appState.seoStatus = "error";
      appState.seoError = err?.message || "Unable to fetch website tags.";
    }
    render();
  });

  document.getElementById("seo-gen-btn")?.addEventListener("click", () => {
    const topic = document.getElementById("seo-topic").value.trim();
    const extra = seo
      ? `Real fetched website metadata for ${seo.url}: HTTP ${seo.httpStatus}, Title='${seo.title}', MetaDesc='${seo.metaDescription}', H1='${seo.primaryHeading}', Words=${seo.wordCountEstimate}`
      : "No live website snapshot fetched yet; provide qualitative keyword ideas, meta title/description, and blog outline without inventing traffic numbers.";
    triggerAiOrchestrator({
      prompt: `Generate SEO keyword suggestions, improved meta title & meta description, and a blog outline for: ${topic || biz.industry}.`,
      requestedModule: "SEO_STUDIO",
      extraContext: extra,
      saveConversation: false
    });
  });
  bindAiResultEvents();
}

function renderEmailStudio(container, biz) {
  const types = ["Promotional Email", "Monthly Newsletter", "3-Step Follow-up Sequence", "Win-Back Campaign"];
  const sel = appState.filters.emailType;
  container.innerHTML = `
    <h2>Email Studio</h2>
    <div class="card hi stack">
      <div class="chips">
        ${types.map((t) => `<button type="button" class="chip em-type ${sel === t ? "active" : ""}" data-t="${esc(t)}">${esc(t)}</button>`).join("")}
      </div>
      <div class="field">
        <label for="em-seg">Audience Segment</label>
        <input id="em-seg" class="input" value="All opted-in customers" />
      </div>
      <div class="field">
        <label for="em-goal">Email goal, offer, or announcement</label>
        <textarea id="em-goal" class="textarea" rows="2" placeholder="e.g. Early access 15% launch offer for repeat customers"></textarea>
      </div>
      <button id="em-gen" class="btn btn-primary" type="button">Draft Email Campaign</button>
    </div>
    ${renderAiResultHtml(false)}
  `;
  document.querySelectorAll(".em-type").forEach((b) => {
    b.addEventListener("click", () => {
      appState.filters.emailType = b.dataset.t;
      render();
    });
  });
  document.getElementById("em-gen")?.addEventListener("click", () => {
    const seg = document.getElementById("em-seg").value.trim() || "Customers";
    const goal = document.getElementById("em-goal").value.trim();
    if (!goal) return toast("Enter the email goal or offer.");
    triggerAiOrchestrator({
      prompt: `Create a ${sel} for segment '${seg}' for ${biz.name}. Goal: ${goal}. Include 3 subject lines, preview text, body copy, and CTA.`,
      requestedModule: "EMAIL_STUDIO",
      saveConversation: false
    });
  });
  bindAiResultEvents();
}

function renderBrandStudio(container, biz) {
  container.innerHTML = `
    <h2>Brand Studio</h2>
    <div class="card stack">
      <h3>Brand Memory & Guidelines</h3>
      <p class="muted small" style="margin:0;">Saved here feeds the Central AI Orchestrator for all campaigns, social posts, emails, and ads.</p>
      <div class="field"><label for="br-voice">Brand Voice & Tone</label><input id="br-voice" class="input" value="${esc(biz.brandVoice)}" /></div>
      <div class="field"><label for="br-aud">Target Audience Persona</label><input id="br-aud" class="input" value="${esc(biz.targetAudience)}" /></div>
      <div class="field"><label for="br-guide">Messaging Guidelines & Do's / Don'ts</label><textarea id="br-guide" class="textarea" rows="2">${esc(biz.brandGuidelines)}</textarea></div>
      <div class="field"><label for="br-vis">Visual Direction & Aesthetic</label><input id="br-vis" class="input" value="${esc(biz.visualDirection)}" /></div>
      <div class="row-gap">
        <button id="br-save" class="btn btn-primary" type="button">Save Brand Memory</button>
        <button id="br-ai" class="btn btn-outline" type="button">Generate AI Brand Brief</button>
      </div>
    </div>
    ${renderAiResultHtml(false)}
  `;
  document.getElementById("br-save")?.addEventListener("click", async () => {
    await store.updateBrandProfile(appState.user.uid, biz.id, {
      brandVoice: document.getElementById("br-voice").value.trim(),
      targetAudience: document.getElementById("br-aud").value.trim(),
      brandGuidelines: document.getElementById("br-guide").value.trim(),
      visualDirection: document.getElementById("br-vis").value.trim()
    });
    toast("Brand guidelines saved to business memory");
  });
  document.getElementById("br-ai")?.addEventListener("click", () => {
    triggerAiOrchestrator({
      prompt: `Develop a cohesive brand identity brief, messaging pillars, and visual direction for ${biz.name} (${biz.industry}) in ${biz.countryName}.`,
      requestedModule: "BRAND_STUDIO",
      saveConversation: false
    });
  });
  bindAiResultEvents();
}

function renderAdsStudio(container, biz) {
  const channels = ["Instagram Ads", "Facebook Ads", "Google Search Ads"];
  const sel = appState.filters.adsChannel;
  container.innerHTML = `
    <h2>Ads Studio</h2>
    <div class="card stack">
      <div class="badge amber">Owner Approval Required Before Any Paid Spend</div>
      <p class="muted small" style="margin:0;">MarketOS generates ad copy, creative briefs, targeting ideas, and budget plans as drafts. Paid campaigns are never auto-launched.</p>
    </div>
    <div class="card hi stack">
      <div class="chips">
        ${channels.map((c) => `<button type="button" class="chip ads-ch ${sel === c ? "active" : ""}" data-ch="${esc(c)}">${esc(c)}</button>`).join("")}
      </div>
      <div class="field"><label for="ads-budget">Proposed Budget (${esc(biz.billingCurrency)})</label><input id="ads-budget" type="number" class="input" value="5000" /></div>
      <div class="field"><label for="ads-offer">Product, offer, & landing goal</label><textarea id="ads-offer" class="textarea" rows="2" placeholder="e.g. Store footfall campaign for weekend combo"></textarea></div>
      <button id="ads-gen" class="btn btn-primary" type="button">Generate Ad Draft</button>
    </div>
    ${renderAiResultHtml(false)}
  `;
  document.querySelectorAll(".ads-ch").forEach((b) => {
    b.addEventListener("click", () => {
      appState.filters.adsChannel = b.dataset.ch;
      render();
    });
  });
  document.getElementById("ads-gen")?.addEventListener("click", () => {
    const budget = document.getElementById("ads-budget").value.trim() || "5000";
    const offer = document.getElementById("ads-offer").value.trim();
    if (!offer) return toast("Enter offer and landing goal.");
    triggerAiOrchestrator({
      prompt: `Create ${sel} ad copy variations, creative brief, audience targeting suggestions, and budget allocation for ${biz.billingCurrency} ${budget}. Offer: ${offer}.`,
      requestedModule: "ADS_STUDIO",
      saveConversation: false
    });
  });
  bindAiResultEvents();
}

// ---------------- Sections 9-10: Approvals & Content Calendar ----------------
function renderApprovals(container, biz) {
  const items = activeScoped(appState.contentItems);
  const tab = appState.filters.approvalTab;
  const queueCount = items.filter((i) => i.approvalStatus === "PENDING_APPROVAL" || i.approvalStatus === "DRAFT").length;
  const appCount = items.filter((i) => i.approvalStatus === "APPROVED").length;
  const rejCount = items.filter((i) => i.approvalStatus === "REJECTED").length;

  const filtered =
    tab === "QUEUE"
      ? items.filter((i) => i.approvalStatus === "PENDING_APPROVAL" || i.approvalStatus === "DRAFT")
      : tab === "APPROVED"
        ? items.filter((i) => i.approvalStatus === "APPROVED")
        : tab === "REJECTED"
          ? items.filter((i) => i.approvalStatus === "REJECTED")
          : items;

  container.innerHTML = `
    <div class="row-between">
      <div>
        <h2>Approvals & Content Hub</h2>
        <div class="muted small">Only owner-approved content can enter the scheduling queue.</div>
      </div>
      <button id="apr-new-btn" class="btn btn-primary" type="button">+ Draft</button>
    </div>

    <div class="chips">
      <button type="button" class="chip apr-tab ${tab === "QUEUE" ? "active" : ""}" data-tab="QUEUE">Review Queue (${queueCount})</button>
      <button type="button" class="chip apr-tab ${tab === "APPROVED" ? "active" : ""}" data-tab="APPROVED">Approved (${appCount})</button>
      <button type="button" class="chip apr-tab ${tab === "REJECTED" ? "active" : ""}" data-tab="REJECTED">Rejected (${rejCount})</button>
      <button type="button" class="chip apr-tab ${tab === "ALL" ? "active" : ""}" data-tab="ALL">All (${items.length})</button>
    </div>

    <div class="stack">
      ${
        filtered.length === 0
          ? `<div class="card muted">No items in this approval stage.</div>`
          : filtered
              .map((it) => {
                const st = APPROVAL_STATUSES[it.approvalStatus] || APPROVAL_STATUSES.DRAFT;
                return `
                  <div class="card stack">
                    <div class="row-between">
                      <div>
                        <strong>${esc(it.title)}</strong>
                        <div class="muted small">${esc(it.platform)} • ${esc(CONTENT_TYPES[it.contentType] || it.contentType)}</div>
                      </div>
                      <span class="badge ${st.color}">${esc(st.label)}</span>
                    </div>
                    <p class="small pre-wrap" style="margin:0;">${esc(it.body)}</p>
                    ${it.hashtags ? `<div class="mono small" style="color:var(--purple-bright)">${esc(it.hashtags)}</div>` : ""}
                    ${it.rejectionReason ? `<div class="small" style="color:var(--rose)">Rejection reason: ${esc(it.rejectionReason)}</div>` : ""}
                    <div class="row-gap">
                      ${
                        ["DRAFT", "REJECTED", "PENDING_APPROVAL"].includes(it.approvalStatus)
                          ? `<button class="btn btn-outline btn-sm apr-edit" data-id="${esc(it.id)}" type="button">Edit</button>`
                          : ""
                      }
                      ${
                        ["PENDING_APPROVAL", "DRAFT"].includes(it.approvalStatus)
                          ? `<button class="btn btn-emerald btn-sm apr-approve" data-id="${esc(it.id)}" type="button">Approve</button>
                             <button class="btn btn-danger btn-sm apr-reject" data-id="${esc(it.id)}" type="button">Reject</button>`
                          : ""
                      }
                      ${
                        it.approvalStatus === "APPROVED"
                          ? `<button class="btn btn-primary btn-sm apr-go-cal" type="button">Schedule in Calendar</button>`
                          : ""
                      }
                      <button class="btn btn-outline btn-sm apr-export" data-id="${esc(it.id)}" type="button">Export / Copy</button>
                      <button class="btn btn-outline btn-sm apr-del" data-id="${esc(it.id)}" type="button">Delete</button>
                    </div>
                  </div>`;
              })
              .join("")
      }
    </div>
  `;

  document.querySelectorAll(".apr-tab").forEach((b) => {
    b.addEventListener("click", () => {
      appState.filters.approvalTab = b.dataset.tab;
      render();
    });
  });
  document.getElementById("apr-new-btn")?.addEventListener("click", () => openDraftModal(biz, null));
  document.querySelectorAll(".apr-edit").forEach((b) => {
    b.addEventListener("click", () => {
      const target = items.find((i) => i.id === b.dataset.id);
      if (target) openDraftModal(biz, target);
    });
  });
  document.querySelectorAll(".apr-approve").forEach((b) => {
    b.addEventListener("click", async () => {
      await store.decideApproval(appState.user.uid, b.dataset.id, true, "");
      toast("Content approved");
    });
  });
  document.querySelectorAll(".apr-reject").forEach((b) => {
    b.addEventListener("click", () => openRejectModal(b.dataset.id));
  });
  document.querySelectorAll(".apr-go-cal").forEach((b) => {
    b.addEventListener("click", () => {
      appState.activeSection = "content_calendar";
      render();
    });
  });
  document.querySelectorAll(".apr-export").forEach((b) => {
    b.addEventListener("click", () => {
      const target = items.find((i) => i.id === b.dataset.id);
      if (target) shareOrCopyContent(target);
    });
  });
  document.querySelectorAll(".apr-del").forEach((b) => {
    b.addEventListener("click", async () => {
      await store.deleteContentItem(appState.user.uid, b.dataset.id);
      toast("Content removed");
    });
  });
}

function openDraftModal(biz, initial) {
  openModal(
    `<div class="modal-card">
      <h3>${initial ? "Edit Content Draft" : "New Marketing Draft"}</h3>
      <div class="field"><label>Title *</label><input id="m-dr-title" class="input" value="${esc(initial?.title || "")}" /></div>
      <div class="field"><label>Platform</label><input id="m-dr-plat" class="input" value="${esc(initial?.platform || "Instagram")}" /></div>
      <div class="field"><label>Content Copy * (${esc(biz.language)})</label><textarea id="m-dr-body" class="textarea" rows="4">${esc(initial?.body || "")}</textarea></div>
      <div class="field"><label>Hashtags / Keywords</label><input id="m-dr-tags" class="input" value="${esc(initial?.hashtags || "")}" /></div>
      <div class="row-between">
        <button id="modal-cancel" class="btn btn-outline" type="button">Cancel</button>
        <div class="row-gap">
          <button id="modal-save-draft" class="btn btn-outline" type="button">Save Draft</button>
          <button id="modal-save-apr" class="btn btn-primary" type="button">For Approval</button>
        </div>
      </div>
    </div>`,
    () => {
      document.getElementById("modal-cancel")?.addEventListener("click", closeModal);
      const save = async (submit) => {
        const title = document.getElementById("m-dr-title").value.trim();
        const body = document.getElementById("m-dr-body").value.trim();
        if (!title || !body) return toast("Title and body are required.");
        const platform = document.getElementById("m-dr-plat").value.trim() || "Instagram";
        const hashtags = document.getElementById("m-dr-tags").value.trim();
        if (initial) {
          await store.editContentDraft(appState.user.uid, initial.id, {
            title,
            body,
            hashtags,
            platform,
            submitForApproval: submit
          });
        } else {
          await store.createContentItem(appState.user.uid, {
            businessId: biz.id,
            contentType: "SOCIAL_POST",
            platform,
            title,
            body,
            hashtags,
            approvalStatus: submit ? "PENDING_APPROVAL" : "DRAFT",
            scheduledTimeZone: biz.timeZone
          });
        }
        closeModal();
        toast(submit ? "Submitted for approval" : "Draft saved");
      };
      document.getElementById("modal-save-draft")?.addEventListener("click", () => save(false));
      document.getElementById("modal-save-apr")?.addEventListener("click", () => save(true));
    }
  );
}

function openRejectModal(contentId) {
  openModal(
    `<div class="modal-card">
      <h3>Reject Content</h3>
      <div class="field"><label>Rejection reason *</label><input id="m-rej-reason" class="input" placeholder="e.g. Tone needs to be softer / update pricing" /></div>
      <div class="row-between">
        <button id="modal-cancel" class="btn btn-outline" type="button">Cancel</button>
        <button id="modal-reject" class="btn btn-danger" type="button">Reject</button>
      </div>
    </div>`,
    () => {
      document.getElementById("modal-cancel")?.addEventListener("click", closeModal);
      document.getElementById("modal-reject")?.addEventListener("click", async () => {
        const reason = document.getElementById("m-rej-reason").value.trim() || "Needs revision";
        await store.decideApproval(appState.user.uid, contentId, false, reason);
        closeModal();
        toast("Content rejected");
      });
    }
  );
}

function shareOrCopyContent(item) {
  const text = [item.title, "", item.body, item.hashtags ? `\n${item.hashtags}` : ""].join("\n").trim();
  if (navigator.share) {
    navigator.share({ title: item.title, text }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => toast("Copied marketing content to clipboard"));
  } else {
    toast("Ready to export: " + item.title);
  }
}

function renderContentCalendar(container, biz) {
  const items = activeScoped(appState.contentItems);
  const view = appState.filters.calendarView;
  const approvedReady = items.filter((i) => i.approvalStatus === "APPROVED");
  const now = Date.now();
  const horizon = view === "DAILY" ? 86400000 : view === "WEEKLY" ? 7 * 86400000 : 31 * 86400000;
  const queue = items
    .filter((i) => ["SCHEDULED", "FAILED", "PUBLISHED"].includes(i.approvalStatus))
    .filter((i) => !i.scheduledEpochMillis || i.scheduledEpochMillis <= now + horizon);

  container.innerHTML = `
    <div>
      <h2>Content Calendar</h2>
      <div class="muted small">Timezone: ${esc(biz.timeZone)} • Only Approved content can be scheduled.</div>
    </div>

    <div class="chips">
      ${["DAILY", "WEEKLY", "MONTHLY"]
        .map((k) => `<button type="button" class="chip cal-view ${view === k ? "active" : ""}" data-v="${k}">${k}</button>`)
        .join("")}
    </div>

    <h3>Approved & Ready to Schedule (${approvedReady.length})</h3>
    <div class="stack">
      ${
        approvedReady.length === 0
          ? `<div class="card row-between"><span class="muted">No approved items waiting to be scheduled. Approve drafts first.</span><button id="cal-go-apr" class="btn btn-outline btn-sm" type="button">Review Approvals</button></div>`
          : approvedReady
              .map(
                (it) => `
              <div class="card hi row-between">
                <div>
                  <strong>${esc(it.title)}</strong>
                  <div class="muted small">${esc(it.platform)}</div>
                </div>
                <button class="btn btn-primary btn-sm cal-sched" data-id="${esc(it.id)}" type="button">Schedule</button>
              </div>`
              )
              .join("")
      }
    </div>

    <h3>${view} Publishing Queue (${queue.length})</h3>
    <div class="stack">
      ${
        queue.length === 0
          ? `<div class="card muted">No scheduled posts in ${view} view.</div>`
          : queue
              .map((it) => {
                const st = APPROVAL_STATUSES[it.approvalStatus] || APPROVAL_STATUSES.SCHEDULED;
                return `
                  <div class="card stack">
                    <div class="row-between">
                      <div>
                        <strong>${esc(it.title)}</strong>
                        <div class="muted small">${esc(it.platform)} • ${esc(formatInTz(it.scheduledEpochMillis, it.scheduledTimeZone || biz.timeZone))}</div>
                      </div>
                      <span class="badge ${st.color}">${esc(st.label)}</span>
                    </div>
                    ${it.publishError ? `<div class="small" style="color:var(--rose)">${esc(it.publishError)}</div>` : ""}
                    <div class="row-gap">
                      ${
                        it.approvalStatus === "SCHEDULED"
                          ? `<button class="btn btn-outline btn-sm cal-pub-check" data-id="${esc(it.id)}" type="button">Run Publish Check</button>`
                          : it.approvalStatus === "FAILED"
                            ? `<button class="btn btn-outline btn-sm cal-sched" data-id="${esc(it.id)}" type="button">Reschedule / Retry</button>`
                            : ""
                      }
                      <button class="btn btn-outline btn-sm cal-export" data-id="${esc(it.id)}" type="button">Export / Copy</button>
                    </div>
                  </div>`;
              })
              .join("")
      }
    </div>
  `;

  document.querySelectorAll(".cal-view").forEach((b) => {
    b.addEventListener("click", () => {
      appState.filters.calendarView = b.dataset.v;
      render();
    });
  });
  document.getElementById("cal-go-apr")?.addEventListener("click", () => {
    appState.activeSection = "approvals";
    render();
  });
  document.querySelectorAll(".cal-sched").forEach((b) => {
    b.addEventListener("click", () => {
      const target = items.find((i) => i.id === b.dataset.id);
      if (target) openScheduleModal(biz, target);
    });
  });
  document.querySelectorAll(".cal-export").forEach((b) => {
    b.addEventListener("click", () => {
      const target = items.find((i) => i.id === b.dataset.id);
      if (target) shareOrCopyContent(target);
    });
  });
  document.querySelectorAll(".cal-pub-check").forEach((b) => {
    b.addEventListener("click", async () => {
      const item = items.find((i) => i.id === b.dataset.id);
      if (!item) return;
      const reason = `Official publishing integration for ${item.platform} requires backend OAuth credentials. Use Export / Copy to publish manually.`;
      await store.recordPublishAttempt(appState.user.uid, item.id, false, reason);
      toast(reason);
    });
  });
}

function openScheduleModal(biz, item) {
  let offsetHours = 24;
  openModal(
    `<div class="modal-card">
      <h3>Schedule (${esc(biz.timeZone)})</h3>
      <p class="muted small" style="margin:0;">Choose publish slot for '${esc(item.title)}':</p>
      <div class="chips" id="m-sch-presets">
        ${[
          [2, "In 2 hrs"],
          [24, "Tomorrow"],
          [72, "In 3 days"],
          [168, "Next Week"]
        ]
          .map(([h, lbl]) => `<button type="button" class="chip ${h === 24 ? "active" : ""}" data-h="${h}">${lbl}</button>`)
          .join("")}
      </div>
      <div class="field">
        <label for="m-sch-custom">Or pick exact date & time</label>
        <input id="m-sch-custom" type="datetime-local" class="input" />
      </div>
      <div class="row-between">
        <button id="modal-cancel" class="btn btn-outline" type="button">Cancel</button>
        <button id="modal-confirm" class="btn btn-primary" type="button">Confirm Schedule</button>
      </div>
    </div>`,
    () => {
      document.querySelectorAll("#m-sch-presets .chip").forEach((ch) => {
        ch.addEventListener("click", () => {
          offsetHours = Number(ch.dataset.h);
          document.querySelectorAll("#m-sch-presets .chip").forEach((x) => x.classList.remove("active"));
          ch.classList.add("active");
        });
      });
      document.getElementById("modal-cancel")?.addEventListener("click", closeModal);
      document.getElementById("modal-confirm")?.addEventListener("click", async () => {
        const customVal = document.getElementById("m-sch-custom").value;
        const targetMs = customVal ? new Date(customVal).getTime() : Date.now() + offsetHours * 3600000;
        await store.scheduleApprovedContent(appState.user.uid, item.id, targetMs, biz.timeZone);
        closeModal();
        toast(`Scheduled for ${biz.timeZone}`);
      });
    }
  );
}

// ---------------- Sections 11-13: Analytics, Integrations, Settings ----------------
function renderAnalytics(container, biz) {
  const records = activeScoped(appState.analytics);
  const campaigns = activeScoped(appState.campaigns);
  const rates = appState.exchangeRates?.ratesFromUsd;
  const f = appState.filters.analyticsFilter;
  const filtered =
    f === "ACTUAL" ? records.filter((r) => r.actualData) : f === "ESTIMATE" ? records.filter((r) => !r.actualData) : records;

  const imp = filtered.reduce((s, r) => s + (r.impressions || 0), 0);
  const clk = filtered.reduce((s, r) => s + (r.clicks || 0), 0);
  const conv = filtered.reduce((s, r) => s + (r.conversions || 0), 0);
  const spend = filtered.reduce((s, r) => s + convertCurrency(r.spendAmount, r.spendCurrency, biz.displayCurrency, rates), 0);
  const ctr = imp > 0 ? ((clk / imp) * 100).toFixed(2) : "0.00";

  container.innerHTML = `
    <div class="row-between">
      <div>
        <h2>Analytics & Growth</h2>
        <div class="muted small">Actual metrics are clearly separated from estimates. Display currency: ${esc(biz.displayCurrency)}</div>
      </div>
      <button id="anl-log-btn" class="btn btn-primary" type="button">+ Log Record</button>
    </div>

    <div class="chips">
      <button type="button" class="chip anl-filter ${f === "ALL" ? "active" : ""}" data-f="ALL">All (${records.length})</button>
      <button type="button" class="chip anl-filter ${f === "ACTUAL" ? "active" : ""}" data-f="ACTUAL">Actual Only</button>
      <button type="button" class="chip anl-filter ${f === "ESTIMATE" ? "active" : ""}" data-f="ESTIMATE">Estimates</button>
    </div>

    <div class="card hi stack">
      <h3>Summary (${filtered.length} record(s))</h3>
      <div>Impressions: <strong>${imp}</strong> • Clicks: <strong>${clk}</strong> • CTR: <strong>${ctr}%</strong></div>
      <div>Conversions: <strong>${conv}</strong> • Spend: <strong>${esc(formatCurrencyAmount(spend, biz.displayCurrency, biz.numberFormat))}</strong></div>
      <div class="muted small">Rate source: ${esc(appState.exchangeRates?.sourceLabel || "Baseline FX")}</div>
      <button id="anl-ai-btn" class="btn btn-primary" type="button">Run AI Growth Analyst</button>
    </div>

    ${renderAiResultHtml(false)}

    <div class="stack">
      ${
        filtered.length === 0
          ? `<div class="card muted">No analytics records logged yet. MarketOS does not fabricate metrics—log actual campaign results above.</div>`
          : filtered
              .map(
                (r) => `
              <div class="card stack">
                <div class="row-between">
                  <div>
                    <strong>${esc(r.sourceLabel)}</strong>
                    <div class="muted small">${esc(r.periodLabel)}</div>
                  </div>
                  <span class="badge ${r.actualData ? "emerald" : "amber"}">${r.actualData ? "ACTUAL DATA" : "ESTIMATE"}</span>
                </div>
                <div class="small">Impressions: ${r.impressions} • Clicks: ${r.clicks} • Conversions: ${r.conversions}</div>
                <div class="small" style="color:var(--purple-bright);font-weight:600;">
                  Spend: ${esc(formatConvertedWithOriginal(r.spendAmount, r.spendCurrency, biz.displayCurrency, biz.numberFormat, rates))}
                </div>
              </div>`
              )
              .join("")
      }
    </div>
  `;

  document.querySelectorAll(".anl-filter").forEach((b) => {
    b.addEventListener("click", () => {
      appState.filters.analyticsFilter = b.dataset.f;
      render();
    });
  });
  document.getElementById("anl-log-btn")?.addEventListener("click", () => openLogAnalyticsModal(biz, campaigns));
  document.getElementById("anl-ai-btn")?.addEventListener("click", () => {
    const context =
      records.length === 0
        ? "No logged performance records yet. Explain what baseline metrics the business should start tracking without inventing numbers."
        : `Verified logged data: ${records.length} records, impressions=${imp}, clicks=${clk}, conversions=${conv}, totalSpend=${biz.displayCurrency} ${spend.toFixed(2)}.`;
    triggerAiOrchestrator({
      prompt: `Analyze marketing performance for ${biz.name} and give 3 concrete optimization recommendations.`,
      requestedModule: "GROWTH_ANALYST",
      extraContext: context,
      saveConversation: false
    });
  });
  bindAiResultEvents();
}

function openLogAnalyticsModal(biz, campaigns) {
  openModal(
    `<div class="modal-card">
      <h3>Log Performance Record</h3>
      <div class="field"><label>Source</label><input id="m-an-src" class="input" value="Meta Ads Manager" /></div>
      <div class="field"><label>Period</label><input id="m-an-per" class="input" value="Nov 2026" /></div>
      <div class="grid-2">
        <div class="field"><label>Impressions</label><input id="m-an-imp" type="number" class="input" value="0" /></div>
        <div class="field"><label>Clicks</label><input id="m-an-clk" type="number" class="input" value="0" /></div>
      </div>
      <div class="grid-2">
        <div class="field"><label>Conversions</label><input id="m-an-conv" type="number" class="input" value="0" /></div>
        <div class="field"><label>Spend (${esc(biz.billingCurrency)})</label><input id="m-an-sp" type="number" class="input" value="0" /></div>
      </div>
      <label class="row-gap small"><input id="m-an-act" type="checkbox" checked /> Verified Actual Data</label>
      <div class="row-between">
        <button id="modal-cancel" class="btn btn-outline" type="button">Cancel</button>
        <button id="modal-save" class="btn btn-primary" type="button">Save Record</button>
      </div>
    </div>`,
    () => {
      document.getElementById("modal-cancel")?.addEventListener("click", closeModal);
      document.getElementById("modal-save")?.addEventListener("click", async () => {
        await store.addAnalyticsRecord(appState.user.uid, {
          businessId: biz.id,
          campaignId: campaigns[0]?.id || "",
          actualData: document.getElementById("m-an-act").checked,
          sourceLabel: document.getElementById("m-an-src").value.trim() || "Manual Entry",
          periodLabel: document.getElementById("m-an-per").value.trim() || "Current Period",
          impressions: parseInt(document.getElementById("m-an-imp").value, 10) || 0,
          clicks: parseInt(document.getElementById("m-an-clk").value, 10) || 0,
          conversions: parseInt(document.getElementById("m-an-conv").value, 10) || 0,
          spendAmount: parseFloat(document.getElementById("m-an-sp").value) || 0,
          spendCurrency: biz.billingCurrency
        });
        closeModal();
        toast(`Analytics record saved (${biz.billingCurrency})`);
      });
    }
  );
}

function renderIntegrations(container, biz) {
  const list = activeScoped(appState.integrations);
  container.innerHTML = `
    <div>
      <h2>Official Integrations</h2>
      <div class="muted small">MarketOS uses official OAuth flows only — never stores third-party passwords or automates unofficial logins.</div>
    </div>
    <div class="grid-2">
      ${list
        .map((item) => {
          const meta = INTEGRATION_PROVIDERS.find((p) => p.id === item.provider) || INTEGRATION_PROVIDERS[0];
          const badgeClass =
            item.status === "CONNECTED" ? "emerald" : item.status === "UNAVAILABLE" ? "rose" : "neutral";
          return `
            <div class="card stack">
              <div class="row-between">
                <div>
                  <strong>${esc(meta.displayName)}</strong>
                  <div class="muted small">${esc(meta.category)}</div>
                </div>
                <span class="badge ${badgeClass}">${esc(item.status)}</span>
              </div>
              <p class="muted small" style="margin:0;">${esc(meta.officialNote)}</p>
              ${item.accountLabel ? `<div class="small" style="color:var(--sky)">Account: ${esc(item.accountLabel)}</div>` : ""}
              ${item.lastError ? `<div class="small" style="color:var(--rose)">${esc(item.lastError)}</div>` : ""}
              <button class="btn btn-outline btn-sm int-btn" data-id="${esc(item.id)}" type="button">
                ${
                  item.status === "CONNECTED"
                    ? "Disconnect"
                    : meta.oauthSupportedInClient
                      ? "Configure Connection"
                      : "Check Official OAuth Status"
                }
              </button>
            </div>`;
        })
        .join("")}
    </div>
  `;

  document.querySelectorAll(".int-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const item = list.find((i) => i.id === btn.dataset.id);
      if (!item) return;
      const meta = INTEGRATION_PROVIDERS.find((p) => p.id === item.provider) || INTEGRATION_PROVIDERS[0];
      if (!meta.oauthSupportedInClient) {
        await store.updateIntegrationState(
          appState.user.uid,
          item.id,
          "UNAVAILABLE",
          item.accountLabel || biz.name,
          meta.officialNote,
          "Client-side password login is disabled for security. Configure official OAuth app credentials on backend."
        );
        toast(`${meta.displayName}: Official OAuth required on backend`);
        return;
      }
      if (item.status === "CONNECTED") {
        await store.updateIntegrationState(appState.user.uid, item.id, "DISCONNECTED", "", "Disconnected", "");
        toast(`${meta.displayName} disconnected`);
      } else {
        await store.updateIntegrationState(
          appState.user.uid,
          item.id,
          "CONNECTED",
          biz.websiteUrl || biz.name,
          "Active",
          ""
        );
        toast(`${meta.displayName} connected`);
      }
    });
  });
}

function renderSettings(container, biz) {
  const rates = appState.exchangeRates?.ratesFromUsd;
  const currentTier = appState.profile?.subscriptionTier || "STARTER";
  const prefs = getSavedPreferences();

  container.innerHTML = `
    <h2>Settings & Workspaces</h2>

    <div class="card hi stack">
      <div class="row-between">
        <h3>Business Workspaces (${appState.businesses.length})</h3>
        <button id="set-add-biz" class="btn btn-primary btn-sm" type="button">+ Add Business</button>
      </div>
      ${appState.businesses
        .map((b) => {
          const c = findCountryByCode(b.countryCode);
          const active = b.id === biz.id;
          return `
            <div class="row-between" style="padding:0.4rem 0;border-bottom:1px solid var(--border);">
              <div>
                <strong>${c.flag} ${esc(b.name)}</strong>
                <div class="muted small">${esc(b.industry)} • Billing: ${esc(b.billingCurrency)} • Display: ${esc(b.displayCurrency)}</div>
              </div>
              ${
                active
                  ? `<span class="badge emerald">Active</span>`
                  : `<button class="btn btn-outline btn-sm set-switch" data-id="${esc(b.id)}" type="button">Switch</button>`
              }
            </div>`;
        })
        .join("")}
    </div>

    <div class="card stack">
      <h3>Regional & Display Currency</h3>
      <p class="muted small" style="margin:0;">Billing currency (${esc(biz.billingCurrency)}) is preserved; display currency converts figures using ${esc(appState.exchangeRates?.sourceLabel || "FX rates")}.</p>
      <div class="grid-2">
        <div class="field">
          <label for="set-country">Country</label>
          <select id="set-country" class="select">
            ${COUNTRIES.map((c) => `<option value="${c.code}" ${c.code === biz.countryCode ? "selected" : ""}>${c.flag} ${esc(c.name)}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="set-disp">Display Currency</label>
          <select id="set-disp" class="select">
            ${CURRENCIES.map((cu) => `<option value="${cu.code}" ${cu.code === biz.displayCurrency ? "selected" : ""}>${cu.code} (${cu.symbol})</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="grid-2">
        <div class="field"><label for="set-lang">Language</label><input id="set-lang" class="input" value="${esc(biz.language)}" /></div>
        <div class="field"><label for="set-tz">Time Zone</label><input id="set-tz" class="input" value="${esc(biz.timeZone)}" /></div>
      </div>
      <div class="field"><label for="set-web">Website URL</label><input id="set-web" class="input" value="${esc(biz.websiteUrl)}" /></div>
      <div class="row-gap">
        <button id="set-fx-btn" class="btn btn-outline" type="button">Refresh FX</button>
        <button id="set-save-reg" class="btn btn-primary" type="button">Save Regional Settings</button>
      </div>
    </div>

    <div class="card stack">
      <h3>AI Engine & Cloud Connection (Web)</h3>
      <div class="grid-2">
        <div class="field"><label for="set-gem-key">Gemini API Key (saved locally in browser)</label><input id="set-gem-key" type="password" class="input" value="${esc(prefs.geminiKey)}" placeholder="AIza..." /></div>
        <div class="field"><label for="set-gem-model">Gemini Model</label><input id="set-gem-model" class="input" value="${esc(prefs.geminiModel)}" /></div>
      </div>
      <div class="field"><label for="set-fb-appid">Firebase Web App ID (optional)</label><input id="set-fb-appid" class="input" value="${esc(prefs.firebaseAppId)}" placeholder="1:13313912377:web:..." /></div>
      <button id="set-save-ai" class="btn btn-outline" type="button">Save AI & Web Settings</button>
    </div>

    <div class="card stack">
      <h3>Subscription Plans</h3>
      ${Object.values(SUBSCRIPTION_TIERS)
        .map((t) => {
          const conv = convertCurrency(t.usdMonthlyEstimate, "USD", biz.displayCurrency, rates);
          const price = formatCurrencyAmount(conv, biz.displayCurrency, biz.numberFormat);
          const isCur = currentTier === t.id;
          return `
            <div class="card ${isCur ? "hi" : ""} row-between" style="cursor:pointer;" data-tier="${t.id}">
              <div>
                <strong>${esc(t.displayName)} • ${esc(price)}/mo</strong>
                <div class="muted small">${esc(t.featuresSummary)}</div>
              </div>
              ${isCur ? `<span class="badge violet">Current</span>` : `<span class="badge">Select</span>`}
            </div>`;
        })
        .join("")}
    </div>

    <div class="card row-between">
      <div>
        <strong>Account: ${esc(appState.user?.email || "")}</strong>
        <div class="muted small">Session: ${appState.sessionMode === "firebase" ? "Firebase Cloud Sync" : "Local Browser Workspace"}</div>
      </div>
      <button id="set-signout" class="btn btn-danger" type="button">Sign Out</button>
    </div>
  `;

  document.getElementById("set-add-biz")?.addEventListener("click", () => {
    initOnboardingDraft();
    renderOnboardingScreen(null, true);
  });
  document.querySelectorAll(".set-switch").forEach((b) => {
    b.addEventListener("click", async () => {
      await store.setActiveBusinessId(appState.user.uid, b.dataset.id);
      toast("Switched workspace");
    });
  });
  document.getElementById("set-fx-btn")?.addEventListener("click", async () => {
    appState.exchangeRates = await fetchLiveExchangeRates();
    toast("Exchange rates refreshed");
    render();
  });
  document.getElementById("set-save-reg")?.addEventListener("click", async () => {
    const c = findCountryByCode(document.getElementById("set-country").value);
    await store.updateBusinessRegionalSettings(appState.user.uid, {
      ...biz,
      countryCode: c.code,
      countryName: c.name,
      displayCurrency: document.getElementById("set-disp").value,
      language: document.getElementById("set-lang").value.trim() || c.defaultLanguage,
      timeZone: document.getElementById("set-tz").value.trim() || c.defaultTimeZone,
      dateFormat: c.defaultDateFormat,
      numberFormat: c.defaultNumberLocale,
      websiteUrl: document.getElementById("set-web").value.trim()
    });
    toast("Regional & currency settings saved");
  });
  document.getElementById("set-save-ai")?.addEventListener("click", () => {
    savePreferences({
      geminiKey: document.getElementById("set-gem-key").value,
      geminiModel: document.getElementById("set-gem-model").value || "gemini-2.5-flash",
      firebaseAppId: document.getElementById("set-fb-appid").value
    });
    toast("Web AI & Firebase settings saved");
  });
  document.querySelectorAll("[data-tier]").forEach((el) => {
    el.addEventListener("click", async () => {
      await store.updateSubscriptionTier(appState.user.uid, appState.profile?.displayName || "MarketOS Owner", el.dataset.tier);
      toast(`Switched active plan preview to ${SUBSCRIPTION_TIERS[el.dataset.tier].displayName}`);
    });
  });
  document.getElementById("set-signout")?.addEventListener("click", async () => {
    await store.signOut();
    appState.screen = "auth";
    appState.businesses = [];
    render();
  });
}

bootstrap();
