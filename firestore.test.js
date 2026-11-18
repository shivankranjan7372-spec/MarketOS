const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("@firebase/rules-unit-testing");
const { test, before, after, beforeEach } = require("node:test");
const fs = require("node:fs");

let testEnv;
const PROJECT_ID = process.env.GCP_PROJECT || "demo-no-project";
const ALICE_UID = "alice_123";
const BOB_UID = "bob_456";
const BIZ_ID = "biz_main";

const [emulatorHost, emulatorPortStr] = (
  process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8085"
).split(":");
const emulatorPort = parseInt(emulatorPortStr, 10);

function nowPast(offsetMs = 1000) {
  return new Date(Date.now() - offsetMs);
}

function validUserProfile(uid, ts) {
  return {
    userId: uid,
    displayName: "Alice Founder",
    email: "alice@example.com",
    subscriptionTier: "STARTER",
    activeBusinessId: "",
    aiGenerationsThisMonth: 0,
    aiTokenCountThisMonth: 0,
    createdAt: ts,
    updatedAt: ts,
  };
}

function validBusiness(uid, ts) {
  return {
    userId: uid,
    name: "Aarav Textiles",
    industry: "Clothing & Apparel",
    countryCode: "IN",
    countryName: "India",
    stateRegion: "Maharashtra",
    city: "Mumbai",
    postalCode: "400001",
    address: "12 MG Road",
    websiteUrl: "https://aaravtextiles.in",
    billingCurrency: "INR",
    displayCurrency: "INR",
    language: "English",
    timeZone: "Asia/Kolkata",
    dateFormat: "dd/MM/yyyy",
    numberFormat: "en-IN",
    brandVoice: "Warm, festive, craft-focused",
    targetAudience: "Urban Indian shoppers 22-40",
    brandGuidelines: "Highlight handloom heritage",
    visualDirection: "Rich jewel tones and natural light",
    createdAt: ts,
    updatedAt: ts,
  };
}

before(async () => {
  const rules = fs.readFileSync("./firestore.rules", "utf8");
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: emulatorHost,
      port: emulatorPort,
    },
  });
});

after(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

beforeEach(async () => {
  if (testEnv) {
    await testEnv.clearFirestore();
  }
});

test("Unauthenticated user cannot read or write any MarketOS data", async () => {
  const unauthDb = testEnv.unauthenticatedContext().firestore();
  const ts = nowPast();
  await assertFails(unauthDb.collection("users").doc(ALICE_UID).get());
  await assertFails(
    unauthDb.collection("users").doc(ALICE_UID).set(validUserProfile(ALICE_UID, ts))
  );
  await assertFails(
    unauthDb.collection("users").doc(ALICE_UID).collection("businesses").get()
  );
});

test("User profile creation, update, and cross-user isolation", async () => {
  const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
  const bobDb = testEnv.authenticatedContext(BOB_UID).firestore();
  const ts = nowPast(5000);

  await assertSucceeds(
    aliceDb.collection("users").doc(ALICE_UID).set(validUserProfile(ALICE_UID, ts))
  );

  // Bob cannot read or overwrite Alice's profile
  await assertFails(bobDb.collection("users").doc(ALICE_UID).get());
  await assertFails(
    bobDb.collection("users").doc(ALICE_UID).update({ displayName: "Hijacked", updatedAt: nowPast() })
  );

  // Alice can update activeBusinessId and usage counters
  await assertSucceeds(
    aliceDb.collection("users").doc(ALICE_UID).update({
      activeBusinessId: BIZ_ID,
      updatedAt: nowPast(),
    })
  );

  // Reject ghost field / shadow update
  await assertFails(
    aliceDb.collection("users").doc(ALICE_UID).update({
      isAdmin: true,
      updatedAt: nowPast(),
    })
  );
});

test("Business workspace creation, billingCurrency immutability, and child entity parent check", async () => {
  const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
  const ts = nowPast(5000);

  // Creating campaign before parent business exists must fail
  await assertFails(
    aliceDb.collection("users").doc(ALICE_UID).collection("campaigns").doc("camp_1").set({
      userId: ALICE_UID,
      businessId: BIZ_ID,
      title: "Diwali Launch",
      objective: "Drive store visits",
      status: "DRAFT",
      platforms: ["Instagram"],
      budgetAmount: 5000,
      budgetCurrency: "INR",
      spentAmount: 0,
      startDateEpoch: 1763337600,
      endDateEpoch: 1763942400,
      strategySummary: "Festive reels and stories",
      createdAt: ts,
      updatedAt: ts,
    })
  );

  // Create business
  await assertSucceeds(
    aliceDb.collection("users").doc(ALICE_UID).collection("businesses").doc(BIZ_ID).set(
      validBusiness(ALICE_UID, ts)
    )
  );

  // Display currency can change, billingCurrency cannot silently change
  await assertSucceeds(
    aliceDb.collection("users").doc(ALICE_UID).collection("businesses").doc(BIZ_ID).update({
      displayCurrency: "USD",
      updatedAt: nowPast(),
    })
  );
  await assertFails(
    aliceDb.collection("users").doc(ALICE_UID).collection("businesses").doc(BIZ_ID).update({
      billingCurrency: "USD",
      updatedAt: nowPast(),
    })
  );

  // Now campaign creation succeeds
  await assertSucceeds(
    aliceDb.collection("users").doc(ALICE_UID).collection("campaigns").doc("camp_1").set({
      userId: ALICE_UID,
      businessId: BIZ_ID,
      title: "Diwali Launch",
      objective: "Drive store visits",
      status: "DRAFT",
      platforms: ["Instagram"],
      budgetAmount: 5000,
      budgetCurrency: "INR",
      spentAmount: 0,
      startDateEpoch: 1763337600,
      endDateEpoch: 1763942400,
      strategySummary: "Festive reels and stories",
      createdAt: ts,
      updatedAt: ts,
    })
  );
});

test("Content approval workflow gates scheduling and publishing strictly", async () => {
  const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
  const ts = nowPast(5000);

  await assertSucceeds(
    aliceDb.collection("users").doc(ALICE_UID).collection("businesses").doc(BIZ_ID).set(
      validBusiness(ALICE_UID, ts)
    )
  );

  const contentRef = aliceDb.collection("users").doc(ALICE_UID).collection("content_items").doc("post_1");

  // Cannot create directly as SCHEDULED
  await assertFails(
    contentRef.set({
      userId: ALICE_UID,
      businessId: BIZ_ID,
      campaignId: "",
      contentType: "SOCIAL_POST",
      platform: "Instagram",
      title: "Festive Drop",
      body: "Discover our festive collection.",
      hashtags: "#Diwali #Handloom",
      approvalStatus: "SCHEDULED",
      rejectionReason: "",
      scheduledEpochMillis: Date.now() + 86400000,
      scheduledTimeZone: "Asia/Kolkata",
      publishError: "",
      aiModule: "SOCIAL_MEDIA",
      createdAt: ts,
      updatedAt: ts,
    })
  );

  // Create as PENDING_APPROVAL succeeds
  await assertSucceeds(
    contentRef.set({
      userId: ALICE_UID,
      businessId: BIZ_ID,
      campaignId: "",
      contentType: "SOCIAL_POST",
      platform: "Instagram",
      title: "Festive Drop",
      body: "Discover our festive collection.",
      hashtags: "#Diwali #Handloom",
      approvalStatus: "PENDING_APPROVAL",
      rejectionReason: "",
      scheduledEpochMillis: 0,
      scheduledTimeZone: "Asia/Kolkata",
      publishError: "",
      aiModule: "SOCIAL_MEDIA",
      createdAt: ts,
      updatedAt: ts,
    })
  );

  // Cannot schedule while PENDING_APPROVAL
  await assertFails(
    contentRef.update({
      approvalStatus: "SCHEDULED",
      scheduledEpochMillis: Date.now() + 86400000,
      scheduledTimeZone: "Asia/Kolkata",
      publishError: "",
      updatedAt: nowPast(),
    })
  );

  // Owner approves
  await assertSucceeds(
    contentRef.update({
      approvalStatus: "APPROVED",
      rejectionReason: "",
      updatedAt: nowPast(),
    })
  );

  // Now scheduling succeeds
  await assertSucceeds(
    contentRef.update({
      approvalStatus: "SCHEDULED",
      scheduledEpochMillis: Date.now() + 86400000,
      scheduledTimeZone: "Asia/Kolkata",
      publishError: "",
      updatedAt: nowPast(),
    })
  );
});

test("Subcollection list queries succeed for owner and fail for other users", async () => {
  const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
  const bobDb = testEnv.authenticatedContext(BOB_UID).firestore();

  await assertSucceeds(
    aliceDb.collection("users").doc(ALICE_UID).collection("businesses").get()
  );
  await assertSucceeds(
    aliceDb.collection("users").doc(ALICE_UID).collection("content_items").where("businessId", "==", BIZ_ID).get()
  );
  await assertFails(
    bobDb.collection("users").doc(ALICE_UID).collection("content_items").get()
  );
});
