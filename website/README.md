# MarketOS Web App (`marketosai.vercel.app`)

This `website/` folder is the full-featured **MarketOS** (*Plan. Create. Grow.*) web application matching the native Android app in `app/`, ready for static hosting on Vercel.

## Features Included
- **Authentication**: Firebase Google Sign-In (syncing with the same Cloud Firestore project `gen-lang-client-0933281863` / database `ai-studio-android-marketos-39516276-33b3-4d1c-af29-438871fb0c87`) plus an instant local browser session mode.
- **International Onboarding & Multi-Business Workspaces**: 20-country catalog, browser locale & optional geolocation suggestion, adapted address fields, separate Billing & Display currencies, and live USD FX rate conversion.
- **All 13 Sections**: Overview, AI Assistant (with image upload), Campaign Planner, Social Media, SEO Studio (with live HTML metadata inspection), Email Studio, Brand Studio, Ads Studio (with owner-approval safeguard), Content Calendar, Approvals Gate, Analytics (Actual vs Estimate), Integrations, and Settings.

## Deploy to `marketosai.vercel.app`
1. Push this repository to GitHub and import into [Vercel](https://vercel.com/new) with project name **`marketosai`** (root `vercel.json` serves `website/` automatically).
2. For Google Sign-In Cloud Sync on `marketosai.vercel.app`, add `marketosai.vercel.app` under **Firebase Console → Authentication → Settings → Authorized domains**.
3. Open **Settings → AI Engine** in the web app to enter your Gemini API key (stored locally in your browser) to run live AI orchestration.
