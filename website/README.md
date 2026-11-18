# MarketOS Public Landing Page (Vercel Ready)

This `website/` folder contains the standalone, zero-build-step static landing page for **MarketOS** (*Plan. Create. Grow.*), kept separate from the Android Kotlin project in `app/`.

## Deploy to Vercel

### Option 1: Deploy directly from GitHub
1. Push this repository to GitHub (via AI Studio's Push to GitHub option).
2. In [Vercel](https://vercel.com/new), import the repository.
3. The root `vercel.json` is already configured with `"outputDirectory": "website"` and `"framework": null`, so clicking **Deploy** publishes the landing page immediately at a public `https://*.vercel.app` URL.

### Option 2: Deploy only the `website/` folder via Vercel CLI
```bash
cd website
npx vercel --prod
```
