# Castle

Thomas's personal assistant: calendar, email triage, drafted replies and a gym plan, as an app for phone, PC and Mac.

Live app: https://fudgegrass.github.io/Castle/

## How it works

- Castle is a static web app hosted on GitHub Pages. There is no server.
- It signs in with Google in the browser and reads Google Calendar directly from your device.
- GitHub only stores the app's code. Your calendar, mail and gym data never touch GitHub.
- Every change merged into `main` is rebuilt and published automatically (see `.github/workflows/deploy.yml`).

## One-time setup

1. **Make the repo public** (GitHub Pages is free for public repos): Settings > General > Danger Zone > Change visibility.
2. **Turn on Pages**: Settings > Pages > Build and deployment > Source: **GitHub Actions**.
3. **Create a Google sign-in client** at https://console.cloud.google.com:
   1. Create a project called Castle.
   2. APIs & Services > Library: enable **Google Calendar API**.
   3. Google Auth Platform > Branding: app name Castle, your email as support and developer contact.
   4. Audience: user type **External**, then add your own Gmail address under **Test users**.
   5. Data Access: add the scope `.../auth/calendar.readonly`.
   6. Clients > Create client: type **Web application**, Authorized JavaScript origins `https://fudgegrass.github.io` (and `http://localhost:5173` for local testing). No redirect URI is needed.
   7. Copy the **Client ID** (ends in `.apps.googleusercontent.com`).
4. **Give the client ID to GitHub**: Settings > Secrets and variables > Actions > Variables > New repository variable, name `GOOGLE_CLIENT_ID`, value = the client ID.
5. Re-run the "Publish Castle" workflow from the Actions tab, then open the live app.

## Install it

- **Android**: open the link in Chrome, menu > Add to Home screen (or Install app).
- **PC or Mac**: open the link in Chrome or Edge, click the install icon in the address bar.

## Local development

```
npm install
echo "VITE_GOOGLE_CLIENT_ID=your-client-id" > .env.local
npm run dev
```
