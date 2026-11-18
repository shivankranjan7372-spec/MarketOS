import { INTEGRATION_PROVIDERS, SUBSCRIPTION_TIERS } from "./catalog.js";

// Shared Firebase backend configuration matching the MarketOS Android project
export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAf6LZE6VYTzUqCZKOVRn7HzBaTs-JaoXA",
  authDomain: "gen-lang-client-0933281863.firebaseapp.com",
  projectId: "gen-lang-client-0933281863",
  storageBucket: "gen-lang-client-0933281863.firebasestorage.app",
  messagingSenderId: "13313912377",
  firestoreDatabaseId: "ai-studio-android-marketos-39516276-33b3-4d1c-af29-438871fb0c87"
};

const STORAGE_KEYS = {
  SESSION_MODE: "marketos_session_mode",
  LOCAL_USER: "marketos_local_user",
  LOCAL_ACCOUNTS: "marketos_local_accounts",
  LOCAL_DB_PREFIX: "marketos_local_db_",
  THEME: "marketos_theme",
  FIREBASE_APP_ID: "marketos_firebase_web_app_id",
  GEMINI_KEY: "marketos_gemini_api_key",
  GEMINI_MODEL: "marketos_gemini_model"
};

function uidGen(prefix = "id") {
  if (crypto && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function hashPassword(password, salt) {
  const input = `${salt}:${password}`;
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export function getSavedPreferences() {
  return {
    theme: localStorage.getItem(STORAGE_KEYS.THEME) || "dark",
    firebaseAppId: localStorage.getItem(STORAGE_KEYS.FIREBASE_APP_ID) || "",
    geminiKey: localStorage.getItem(STORAGE_KEYS.GEMINI_KEY) || "",
    geminiModel: localStorage.getItem(STORAGE_KEYS.GEMINI_MODEL) || "gemini-2.5-flash"
  };
}

export function savePreferences(partial) {
  if (partial.theme !== undefined) localStorage.setItem(STORAGE_KEYS.THEME, partial.theme);
  if (partial.firebaseAppId !== undefined) localStorage.setItem(STORAGE_KEYS.FIREBASE_APP_ID, partial.firebaseAppId.trim());
  if (partial.geminiKey !== undefined) localStorage.setItem(STORAGE_KEYS.GEMINI_KEY, partial.geminiKey.trim());
  if (partial.geminiModel !== undefined) localStorage.setItem(STORAGE_KEYS.GEMINI_MODEL, partial.geminiModel.trim());
}

/**
 * Dual Repository Adapter:
 * - "firebase": Uses Firebase Web SDK (Google Sign-In + Cloud Firestore database ai-studio-android-marketos-...)
 * - "local": Uses browser localStorage scoped per account with identical schema, quotas, and approval rules
 */
export class MarketOsWebStore {
  constructor() {
    this.mode = localStorage.getItem(STORAGE_KEYS.SESSION_MODE) || "none";
    this.firebaseModules = null;
    this.firebaseApp = null;
    this.auth = null;
    this.db = null;
    this.unsubscribers = [];
  }

  async initFirebaseIfNeeded() {
    if (this.firebaseApp) return true;
    const prefs = getSavedPreferences();
    const [appMod, authMod, fsMod] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js")
    ]);
    this.firebaseModules = { appMod, authMod, fsMod };
    const cfg = {
      apiKey: DEFAULT_FIREBASE_CONFIG.apiKey,
      authDomain: DEFAULT_FIREBASE_CONFIG.authDomain,
      projectId: DEFAULT_FIREBASE_CONFIG.projectId,
      storageBucket: DEFAULT_FIREBASE_CONFIG.storageBucket,
      messagingSenderId: DEFAULT_FIREBASE_CONFIG.messagingSenderId
    };
    if (prefs.firebaseAppId) {
      cfg.appId = prefs.firebaseAppId;
    }
    const existing = appMod.getApps();
    this.firebaseApp = existing.length ? existing[0] : appMod.initializeApp(cfg);
    this.auth = authMod.getAuth(this.firebaseApp);
    this.db = fsMod.initializeFirestore(
      this.firebaseApp,
      { ignoreUndefinedProperties: true },
      DEFAULT_FIREBASE_CONFIG.firestoreDatabaseId
    );
    return true;
  }

  async getCurrentSession() {
    if (this.mode === "local") {
      const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_USER);
      if (raw) {
        return { mode: "local", user: JSON.parse(raw) };
      }
      this.mode = "none";
      return { mode: "none", user: null };
    }
    if (this.mode === "firebase") {
      try {
        await this.initFirebaseIfNeeded();
        const user = await new Promise((resolve) => {
          const unsub = this.firebaseModules.authMod.onAuthStateChanged(this.auth, (u) => {
            unsub();
            resolve(u);
          });
        });
        if (user) {
          return {
            mode: "firebase",
            user: {
              uid: user.uid,
              displayName: user.displayName || "MarketOS Owner",
              email: user.email || ""
            }
          };
        }
      } catch {
        // Fall through to unauthenticated
      }
    }
    return { mode: "none", user: null };
  }

  async signInWithGoogleFirebase() {
    await this.initFirebaseIfNeeded();
    const { authMod } = this.firebaseModules;
    const provider = new authMod.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const cred = await authMod.signInWithPopup(this.auth, provider);
    this.mode = "firebase";
    localStorage.setItem(STORAGE_KEYS.SESSION_MODE, "firebase");
    return {
      mode: "firebase",
      user: {
        uid: cred.user.uid,
        displayName: cred.user.displayName || "MarketOS Owner",
        email: cred.user.email || ""
      }
    };
  }

  _readAccounts() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_ACCOUNTS);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  _writeAccounts(map) {
    localStorage.setItem(STORAGE_KEYS.LOCAL_ACCOUNTS, JSON.stringify(map));
  }

  async signUpWithEmail({ name, email, password }) {
    const cleanName = String(name || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanName) throw new Error("Please enter your full name.");
    if (!cleanEmail || !cleanEmail.includes("@")) throw new Error("Please enter a valid email address.");
    if (!password || password.length < 8) throw new Error("Password must be at least 8 characters long.");

    // Attempt Firebase Email/Password authentication first for cloud sync
    try {
      await this.initFirebaseIfNeeded();
      const { authMod } = this.firebaseModules;
      const cred = await authMod.createUserWithEmailAndPassword(this.auth, cleanEmail, password);
      await authMod.updateProfile(cred.user, { displayName: cleanName });
      this.mode = "firebase";
      localStorage.setItem(STORAGE_KEYS.SESSION_MODE, "firebase");
      return {
        mode: "firebase",
        user: {
          uid: cred.user.uid,
          displayName: cleanName,
          email: cleanEmail
        }
      };
    } catch (fbErr) {
      const code = fbErr?.code || "";
      if (code === "auth/email-already-in-use") {
        throw new Error("An account with this email already exists. Switch to Sign In.");
      }
      if (code === "auth/weak-password") {
        throw new Error("Please choose a stronger password (at least 8 characters).");
      }
      if (code && code !== "auth/operation-not-allowed" && code !== "auth/unauthorized-domain") {
        throw fbErr;
      }
    }

    // Browser account registration when Firebase Email/Password provider is not enabled yet
    const accounts = this._readAccounts();
    if (accounts[cleanEmail]) {
      throw new Error("An account with this email already exists in this browser. Switch to Sign In.");
    }
    const salt = uidGen("salt");
    const passwordHash = await hashPassword(password, salt);
    const uid = "local_" + cleanEmail.replace(/[^a-z0-9]/g, "_");
    accounts[cleanEmail] = { uid, displayName: cleanName, email: cleanEmail, salt, passwordHash, createdAt: Date.now() };
    this._writeAccounts(accounts);

    const user = { uid, displayName: cleanName, email: cleanEmail };
    this.mode = "local";
    localStorage.setItem(STORAGE_KEYS.SESSION_MODE, "local");
    localStorage.setItem(STORAGE_KEYS.LOCAL_USER, JSON.stringify(user));
    return { mode: "local", user, notice: "Account created in browser storage (enable Email/Password in Firebase Console for cloud sync)." };
  }

  async signInWithEmail({ email, password }) {
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) throw new Error("Please enter a valid email address.");
    if (!password) throw new Error("Please enter your password.");

    const accounts = this._readAccounts();
    const localAcct = accounts[cleanEmail];
    if (localAcct) {
      const checkHash = await hashPassword(password, localAcct.salt);
      if (checkHash !== localAcct.passwordHash) {
        throw new Error("Incorrect password. Please try again.");
      }
      const user = { uid: localAcct.uid, displayName: localAcct.displayName, email: localAcct.email };
      this.mode = "local";
      localStorage.setItem(STORAGE_KEYS.SESSION_MODE, "local");
      localStorage.setItem(STORAGE_KEYS.LOCAL_USER, JSON.stringify(user));
      return { mode: "local", user };
    }

    try {
      await this.initFirebaseIfNeeded();
      const { authMod } = this.firebaseModules;
      const cred = await authMod.signInWithEmailAndPassword(this.auth, cleanEmail, password);
      this.mode = "firebase";
      localStorage.setItem(STORAGE_KEYS.SESSION_MODE, "firebase");
      return {
        mode: "firebase",
        user: {
          uid: cred.user.uid,
          displayName: cred.user.displayName || cleanEmail.split("@")[0],
          email: cred.user.email || cleanEmail
        }
      };
    } catch (fbErr) {
      const code = fbErr?.code || "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        throw new Error("Invalid email or password.");
      }
      if (code === "auth/operation-not-allowed") {
        throw new Error("No account found for this email. Switch to Create Account to register.");
      }
      throw fbErr;
    }
  }

  async resetAccountPassword({ email, newPassword }) {
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) throw new Error("Please enter your registered email address.");

    const accounts = this._readAccounts();
    if (accounts[cleanEmail]) {
      if (!newPassword || newPassword.length < 8) {
        throw new Error("Enter a new password of at least 8 characters.");
      }
      const salt = uidGen("salt");
      const passwordHash = await hashPassword(newPassword, salt);
      accounts[cleanEmail] = { ...accounts[cleanEmail], salt, passwordHash };
      this._writeAccounts(accounts);
      return "Your browser account password has been updated. You can now sign in.";
    }

    await this.initFirebaseIfNeeded();
    const { authMod } = this.firebaseModules;
    await authMod.sendPasswordResetEmail(this.auth, cleanEmail);
    return `Password reset email sent to ${cleanEmail}. Check your inbox.`;
  }

  async signOut() {
    this.clearListeners();
    if (this.mode === "firebase" && this.auth && this.firebaseModules) {
      try {
        await this.firebaseModules.authMod.signOut(this.auth);
      } catch {
        // Ignore signOut error
      }
    }
    this.mode = "none";
    localStorage.setItem(STORAGE_KEYS.SESSION_MODE, "none");
  }

  clearListeners() {
    this.unsubscribers.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
    this.unsubscribers = [];
  }

  // ---------- Local Storage Store Helpers ----------
  _readLocal(uid) {
    const key = STORAGE_KEYS.LOCAL_DB_PREFIX + uid;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
    return {
      profile: null,
      businesses: [],
      campaigns: [],
      contentItems: [],
      integrations: [],
      aiMessages: [],
      analytics: []
    };
  }

  _writeLocal(uid, data) {
    localStorage.setItem(STORAGE_KEYS.LOCAL_DB_PREFIX + uid, JSON.stringify(data));
    if (this._localNotify) this._localNotify(data);
  }

  // ---------- Lifecycle & Subscriptions ----------
  async ensureUserProfile(user) {
    if (this.mode === "local") {
      const data = this._readLocal(user.uid);
      if (!data.profile) {
        data.profile = {
          id: user.uid,
          userId: user.uid,
          displayName: user.displayName,
          email: user.email,
          subscriptionTier: "STARTER",
          activeBusinessId: "",
          aiGenerationsThisMonth: 0,
          aiTokenCountThisMonth: 0,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        this._writeLocal(user.uid, data);
      }
      return data.profile;
    }

    const { fsMod } = this.firebaseModules;
    const ref = fsMod.doc(this.db, "users", user.uid);
    const snap = await fsMod.getDoc(ref);
    if (!snap.exists()) {
      await fsMod.setDoc(ref, {
        userId: user.uid,
        displayName: user.displayName,
        email: user.email,
        subscriptionTier: "STARTER",
        activeBusinessId: "",
        aiGenerationsThisMonth: 0,
        aiTokenCountThisMonth: 0,
        createdAt: fsMod.serverTimestamp(),
        updatedAt: fsMod.serverTimestamp()
      });
    }
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }

  subscribeAll(uid, onUpdate, onError) {
    this.clearListeners();
    if (this.mode === "local") {
      this._localNotify = (data) => onUpdate({ ...data });
      onUpdate(this._readLocal(uid));
      return;
    }

    const { fsMod } = this.firebaseModules;
    const state = {
      profile: null,
      businesses: [],
      campaigns: [],
      contentItems: [],
      integrations: [],
      aiMessages: [],
      analytics: []
    };
    const emit = () => onUpdate({ ...state });

    const tsToMs = (val) => {
      if (!val) return 0;
      if (typeof val.toMillis === "function") return val.toMillis();
      if (typeof val === "number") return val;
      return 0;
    };

    const subCol = (colName, targetKey, orderDesc = true) => {
      const q = fsMod.collection(this.db, "users", uid, colName);
      const unsub = fsMod.onSnapshot(
        q,
        (snap) => {
          const list = snap.docs.map((d) => {
            const raw = d.data();
            return {
              ...raw,
              id: d.id,
              createdAtMs: tsToMs(raw.createdAt),
              updatedAtMs: tsToMs(raw.updatedAt)
            };
          });
          list.sort((a, b) =>
            orderDesc ? (b.createdAtMs || 0) - (a.createdAtMs || 0) : (a.createdAtMs || 0) - (b.createdAtMs || 0)
          );
          state[targetKey] = list;
          emit();
        },
        (err) => onError(err?.message || `Failed loading ${colName}`)
      );
      this.unsubscribers.push(unsub);
    };

    const userUnsub = fsMod.onSnapshot(
      fsMod.doc(this.db, "users", uid),
      (snap) => {
        state.profile = snap.exists() ? { id: snap.id, ...snap.data() } : null;
        emit();
      },
      (err) => onError(err?.message || "Failed loading user profile")
    );
    this.unsubscribers.push(userUnsub);

    subCol("businesses", "businesses", true);
    subCol("campaigns", "campaigns", true);
    subCol("content_items", "contentItems", true);
    subCol("integrations", "integrations", false);
    subCol("ai_messages", "aiMessages", false);
    subCol("analytics_records", "analytics", true);
  }

  // ---------- Mutations (mirroring MarketOsRepository.kt & firestore.rules) ----------
  async createBusinessWorkspace(uid, workspace) {
    const newBiz = {
      userId: uid,
      name: workspace.name,
      industry: workspace.industry,
      countryCode: workspace.countryCode,
      countryName: workspace.countryName,
      stateRegion: workspace.stateRegion || "",
      city: workspace.city || "",
      postalCode: workspace.postalCode || "",
      address: workspace.address || "",
      websiteUrl: workspace.websiteUrl || "",
      billingCurrency: workspace.billingCurrency,
      displayCurrency: workspace.displayCurrency,
      language: workspace.language,
      timeZone: workspace.timeZone,
      dateFormat: workspace.dateFormat,
      numberFormat: workspace.numberFormat,
      brandVoice: workspace.brandVoice || "",
      targetAudience: workspace.targetAudience || "",
      brandGuidelines: workspace.brandGuidelines || "",
      visualDirection: workspace.visualDirection || ""
    };

    if (this.mode === "local") {
      const data = this._readLocal(uid);
      const id = uidGen("biz");
      data.businesses.unshift({ ...newBiz, id, createdAtMs: Date.now(), updatedAtMs: Date.now() });
      if (data.profile) data.profile.activeBusinessId = id;
      INTEGRATION_PROVIDERS.forEach((p) => {
        data.integrations.push({
          id: uidGen("int"),
          userId: uid,
          businessId: id,
          provider: p.id,
          status: p.id === "WEBSITE_ANALYTICS" && newBiz.websiteUrl ? "CONNECTED" : "DISCONNECTED",
          accountLabel: p.id === "WEBSITE_ANALYTICS" ? newBiz.websiteUrl : "",
          permissionStatus: p.oauthSupportedInClient ? "Supported" : "Backend OAuth setup required",
          lastError: "",
          createdAtMs: Date.now()
        });
      });
      this._writeLocal(uid, data);
      return id;
    }

    const { fsMod } = this.firebaseModules;
    const bizRef = fsMod.doc(fsMod.collection(this.db, "users", uid, "businesses"));
    const batch = fsMod.writeBatch(this.db);
    batch.set(bizRef, {
      ...newBiz,
      createdAt: fsMod.serverTimestamp(),
      updatedAt: fsMod.serverTimestamp()
    });
    batch.update(fsMod.doc(this.db, "users", uid), {
      activeBusinessId: bizRef.id,
      updatedAt: fsMod.serverTimestamp()
    });
    INTEGRATION_PROVIDERS.forEach((p) => {
      const intRef = fsMod.doc(fsMod.collection(this.db, "users", uid, "integrations"));
      batch.set(intRef, {
        userId: uid,
        businessId: bizRef.id,
        provider: p.id,
        status: p.id === "WEBSITE_ANALYTICS" && newBiz.websiteUrl ? "CONNECTED" : "DISCONNECTED",
        accountLabel: p.id === "WEBSITE_ANALYTICS" ? newBiz.websiteUrl : "",
        permissionStatus: p.oauthSupportedInClient ? "Supported" : "Backend OAuth setup required",
        lastError: "",
        createdAt: fsMod.serverTimestamp(),
        updatedAt: fsMod.serverTimestamp()
      });
    });
    await batch.commit();
    return bizRef.id;
  }

  async setActiveBusinessId(uid, businessId) {
    if (this.mode === "local") {
      const data = this._readLocal(uid);
      if (data.profile) data.profile.activeBusinessId = businessId;
      this._writeLocal(uid, data);
      return;
    }
    const { fsMod } = this.firebaseModules;
    await fsMod.updateDoc(fsMod.doc(this.db, "users", uid), {
      activeBusinessId: businessId,
      updatedAt: fsMod.serverTimestamp()
    });
  }

  async updateBusinessRegionalSettings(uid, updated) {
    if (this.mode === "local") {
      const data = this._readLocal(uid);
      data.businesses = data.businesses.map((b) =>
        b.id === updated.id
          ? {
              ...b,
              countryCode: updated.countryCode,
              countryName: updated.countryName,
              displayCurrency: updated.displayCurrency,
              language: updated.language,
              timeZone: updated.timeZone,
              dateFormat: updated.dateFormat,
              numberFormat: updated.numberFormat,
              websiteUrl: updated.websiteUrl,
              updatedAtMs: Date.now()
            }
          : b
      );
      this._writeLocal(uid, data);
      return;
    }
    const { fsMod } = this.firebaseModules;
    await fsMod.updateDoc(fsMod.doc(this.db, "users", uid, "businesses", updated.id), {
      countryCode: updated.countryCode,
      countryName: updated.countryName,
      displayCurrency: updated.displayCurrency,
      language: updated.language,
      timeZone: updated.timeZone,
      dateFormat: updated.dateFormat,
      numberFormat: updated.numberFormat,
      websiteUrl: updated.websiteUrl,
      updatedAt: fsMod.serverTimestamp()
    });
  }

  async updateBrandProfile(uid, businessId, fields) {
    if (this.mode === "local") {
      const data = this._readLocal(uid);
      data.businesses = data.businesses.map((b) =>
        b.id === businessId ? { ...b, ...fields, updatedAtMs: Date.now() } : b
      );
      this._writeLocal(uid, data);
      return;
    }
    const { fsMod } = this.firebaseModules;
    await fsMod.updateDoc(fsMod.doc(this.db, "users", uid, "businesses", businessId), {
      ...fields,
      updatedAt: fsMod.serverTimestamp()
    });
  }

  async updateSubscriptionTier(uid, displayName, tierId) {
    const valid = SUBSCRIPTION_TIERS[tierId] ? tierId : "STARTER";
    if (this.mode === "local") {
      const data = this._readLocal(uid);
      if (data.profile) {
        data.profile.displayName = displayName;
        data.profile.subscriptionTier = valid;
      }
      this._writeLocal(uid, data);
      return;
    }
    const { fsMod } = this.firebaseModules;
    await fsMod.updateDoc(fsMod.doc(this.db, "users", uid), {
      displayName,
      subscriptionTier: valid,
      updatedAt: fsMod.serverTimestamp()
    });
  }

  async incrementAiUsage(uid, currentGenerations, currentTokens, addedTokens) {
    if (this.mode === "local") {
      const data = this._readLocal(uid);
      if (data.profile) {
        data.profile.aiGenerationsThisMonth = (currentGenerations || 0) + 1;
        data.profile.aiTokenCountThisMonth = (currentTokens || 0) + (addedTokens || 0);
      }
      this._writeLocal(uid, data);
      return;
    }
    const { fsMod } = this.firebaseModules;
    await fsMod.updateDoc(fsMod.doc(this.db, "users", uid), {
      aiGenerationsThisMonth: (currentGenerations || 0) + 1,
      aiTokenCountThisMonth: (currentTokens || 0) + (addedTokens || 0),
      updatedAt: fsMod.serverTimestamp()
    });
  }

  async saveAiMessage(uid, msg) {
    if (this.mode === "local") {
      const data = this._readLocal(uid);
      data.aiMessages.push({ ...msg, id: uidGen("msg"), userId: uid, createdAtMs: Date.now() });
      this._writeLocal(uid, data);
      return;
    }
    const { fsMod } = this.firebaseModules;
    await fsMod.addDoc(fsMod.collection(this.db, "users", uid, "ai_messages"), {
      ...msg,
      userId: uid,
      createdAt: fsMod.serverTimestamp()
    });
  }

  async saveCampaign(uid, campaign, isEdit) {
    if (this.mode === "local") {
      const data = this._readLocal(uid);
      if (isEdit && campaign.id) {
        data.campaigns = data.campaigns.map((c) => (c.id === campaign.id ? { ...c, ...campaign, updatedAtMs: Date.now() } : c));
      } else {
        data.campaigns.unshift({ ...campaign, id: uidGen("cmp"), userId: uid, createdAtMs: Date.now(), updatedAtMs: Date.now() });
      }
      this._writeLocal(uid, data);
      return;
    }
    const { fsMod } = this.firebaseModules;
    const cleanFields = {
      title: String(campaign.title || "Untitled Campaign").slice(0, 140),
      objective: String(campaign.objective || "").slice(0, 500),
      status: campaign.status || "DRAFT",
      platforms: Array.isArray(campaign.platforms) ? campaign.platforms.slice(0, 10) : [],
      budgetAmount: Math.max(0, Number(campaign.budgetAmount) || 0),
      budgetCurrency: String(campaign.budgetCurrency || "INR").slice(0, 3).toUpperCase(),
      spentAmount: Math.max(0, Number(campaign.spentAmount) || 0),
      startDateEpoch: Math.max(0, Math.floor(Number(campaign.startDateEpoch) || 0)),
      endDateEpoch: Math.max(0, Math.floor(Number(campaign.endDateEpoch) || 0)),
      strategySummary: String(campaign.strategySummary || "").slice(0, 4000)
    };
    if (isEdit && campaign.id) {
      await fsMod.updateDoc(fsMod.doc(this.db, "users", uid, "campaigns", campaign.id), {
        ...cleanFields,
        updatedAt: fsMod.serverTimestamp()
      });
    } else {
      await fsMod.addDoc(fsMod.collection(this.db, "users", uid, "campaigns"), {
        ...cleanFields,
        userId: uid,
        businessId: campaign.businessId,
        createdAt: fsMod.serverTimestamp(),
        updatedAt: fsMod.serverTimestamp()
      });
    }
  }

  async updateCampaignStatus(uid, campaignId, status) {
    if (this.mode === "local") {
      const data = this._readLocal(uid);
      data.campaigns = data.campaigns.map((c) => (c.id === campaignId ? { ...c, status, updatedAtMs: Date.now() } : c));
      this._writeLocal(uid, data);
      return;
    }
    const { fsMod } = this.firebaseModules;
    await fsMod.updateDoc(fsMod.doc(this.db, "users", uid, "campaigns", campaignId), {
      status,
      updatedAt: fsMod.serverTimestamp()
    });
  }

  async createContentItem(uid, item) {
    // Enforce Approval Gate rule: never create directly as APPROVED/SCHEDULED/PUBLISHED
    const initialStatus = item.approvalStatus === "PENDING_APPROVAL" ? "PENDING_APPROVAL" : "DRAFT";
    const safeItem = {
      userId: uid,
      businessId: item.businessId,
      campaignId: item.campaignId || "",
      contentType: item.contentType || "SOCIAL_POST",
      platform: item.platform || "Instagram",
      title: item.title,
      body: item.body,
      hashtags: item.hashtags || "",
      approvalStatus: initialStatus,
      rejectionReason: "",
      scheduledEpochMillis: 0,
      scheduledTimeZone: item.scheduledTimeZone || "UTC",
      publishError: "",
      aiModule: item.aiModule || "GENERAL_ASSISTANT"
    };
    if (this.mode === "local") {
      const data = this._readLocal(uid);
      data.contentItems.unshift({ ...safeItem, id: uidGen("cnt"), createdAtMs: Date.now(), updatedAtMs: Date.now() });
      this._writeLocal(uid, data);
      return;
    }
    const { fsMod } = this.firebaseModules;
    await fsMod.addDoc(fsMod.collection(this.db, "users", uid, "content_items"), {
      ...safeItem,
      createdAt: fsMod.serverTimestamp(),
      updatedAt: fsMod.serverTimestamp()
    });
  }

  async editContentDraft(uid, contentId, { title, body, hashtags, platform, submitForApproval }) {
    const nextStatus = submitForApproval ? "PENDING_APPROVAL" : "DRAFT";
    if (this.mode === "local") {
      const data = this._readLocal(uid);
      data.contentItems = data.contentItems.map((c) =>
        c.id === contentId
          ? { ...c, title, body, hashtags, platform, approvalStatus: nextStatus, rejectionReason: "", updatedAtMs: Date.now() }
          : c
      );
      this._writeLocal(uid, data);
      return;
    }
    const { fsMod } = this.firebaseModules;
    await fsMod.updateDoc(fsMod.doc(this.db, "users", uid, "content_items", contentId), {
      title,
      body,
      hashtags,
      platform,
      approvalStatus: nextStatus,
      rejectionReason: "",
      updatedAt: fsMod.serverTimestamp()
    });
  }

  async decideApproval(uid, contentId, approve, reason = "") {
    const payload = {
      approvalStatus: approve ? "APPROVED" : "REJECTED",
      rejectionReason: approve ? "" : reason || "Needs revision"
    };
    if (this.mode === "local") {
      const data = this._readLocal(uid);
      data.contentItems = data.contentItems.map((c) =>
        c.id === contentId ? { ...c, ...payload, updatedAtMs: Date.now() } : c
      );
      this._writeLocal(uid, data);
      return;
    }
    const { fsMod } = this.firebaseModules;
    await fsMod.updateDoc(fsMod.doc(this.db, "users", uid, "content_items", contentId), {
      ...payload,
      updatedAt: fsMod.serverTimestamp()
    });
  }

  async scheduleApprovedContent(uid, contentId, scheduledEpochMillis, timeZone) {
    if (this.mode === "local") {
      const data = this._readLocal(uid);
      const target = data.contentItems.find((c) => c.id === contentId);
      if (!target || !["APPROVED", "SCHEDULED", "FAILED"].includes(target.approvalStatus)) {
        throw new Error("Approval gate: Only approved content can be scheduled.");
      }
      data.contentItems = data.contentItems.map((c) =>
        c.id === contentId
          ? { ...c, approvalStatus: "SCHEDULED", scheduledEpochMillis, scheduledTimeZone: timeZone, publishError: "", updatedAtMs: Date.now() }
          : c
      );
      this._writeLocal(uid, data);
      return;
    }
    const { fsMod } = this.firebaseModules;
    await fsMod.updateDoc(fsMod.doc(this.db, "users", uid, "content_items", contentId), {
      approvalStatus: "SCHEDULED",
      scheduledEpochMillis,
      scheduledTimeZone: timeZone,
      publishError: "",
      updatedAt: fsMod.serverTimestamp()
    });
  }

  async recordPublishAttempt(uid, contentId, succeeded, errorMessage) {
    const payload = {
      approvalStatus: succeeded ? "PUBLISHED" : "FAILED",
      publishError: succeeded ? "" : errorMessage
    };
    if (this.mode === "local") {
      const data = this._readLocal(uid);
      data.contentItems = data.contentItems.map((c) =>
        c.id === contentId ? { ...c, ...payload, updatedAtMs: Date.now() } : c
      );
      this._writeLocal(uid, data);
      return;
    }
    const { fsMod } = this.firebaseModules;
    await fsMod.updateDoc(fsMod.doc(this.db, "users", uid, "content_items", contentId), {
      ...payload,
      updatedAt: fsMod.serverTimestamp()
    });
  }

  async deleteContentItem(uid, contentId) {
    if (this.mode === "local") {
      const data = this._readLocal(uid);
      data.contentItems = data.contentItems.filter((c) => c.id !== contentId);
      this._writeLocal(uid, data);
      return;
    }
    const { fsMod } = this.firebaseModules;
    await fsMod.deleteDoc(fsMod.doc(this.db, "users", uid, "content_items", contentId));
  }

  async updateIntegrationState(uid, integrationId, status, accountLabel, permissionStatus, lastError) {
    if (this.mode === "local") {
      const data = this._readLocal(uid);
      data.integrations = data.integrations.map((i) =>
        i.id === integrationId
          ? { ...i, status, accountLabel, permissionStatus, lastError, updatedAtMs: Date.now() }
          : i
      );
      this._writeLocal(uid, data);
      return;
    }
    const { fsMod } = this.firebaseModules;
    await fsMod.updateDoc(fsMod.doc(this.db, "users", uid, "integrations", integrationId), {
      status,
      accountLabel,
      permissionStatus,
      lastError,
      updatedAt: fsMod.serverTimestamp()
    });
  }

  async addAnalyticsRecord(uid, record) {
    if (this.mode === "local") {
      const data = this._readLocal(uid);
      data.analytics.unshift({ ...record, id: uidGen("anl"), userId: uid, createdAtMs: Date.now(), updatedAtMs: Date.now() });
      this._writeLocal(uid, data);
      return;
    }
    const { fsMod } = this.firebaseModules;
    await fsMod.addDoc(fsMod.collection(this.db, "users", uid, "analytics_records"), {
      ...record,
      userId: uid,
      createdAt: fsMod.serverTimestamp(),
      updatedAt: fsMod.serverTimestamp()
    });
  }
}
