# Castle

A personal assistant: calendar, email triage, drafted replies and a gym plan, as an app for phone, PC and Mac.

Live app: https://fudgegrass.github.io/Castle/

## How it works

- Castle is a static web app hosted on GitHub Pages. There is no server.
- It signs in with Google in the browser and reads Google Calendar directly from your device.
- GitHub only stores the app's code. Your calendar, mail and gym data never touch GitHub.
- Every change merged into `main` is rebuilt and published automatically (see `.github/workflows/deploy.yml`).

## One-time setup

1. **Keep the repo private with GitHub Pro** (Pages on a private repo needs Pro): https://github.com/settings/billing > upgrade to Pro.
2. **Turn on Pages**: Settings > Pages > Build and deployment > Source: **GitHub Actions**.
3. **Google sign-in** is already set up (Google Cloud project "My Project 61901", OAuth client "Castle web app", your account as the only test user). The client ID is in `src/google.ts`.
4. Merge the pull request. The "Publish Castle" workflow runs and the app goes live.

## Install it

- **Android**: open the link in Chrome, menu > Add to Home screen (or Install app).
- **PC or Mac**: open the link in Chrome or Edge, click the install icon in the address bar.

## Local development

```
npm install
echo "VITE_GOOGLE_CLIENT_ID=your-client-id" > .env.local
npm run dev
```
