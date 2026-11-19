// Google sign-in using Google Identity Services (runs entirely in the browser).
// Castle never sees your Google password. Google gives the app a short-lived
// access token (about 1 hour) that only allows the permissions listed below.

// Read-only calendar access for step 1. Write access is added in step 2.
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';
const TOKEN_KEY = 'castle.google.token';

type StoredToken = { accessToken: string; expiresAt: number };

declare global {
  interface Window {
    google?: any;
  }
}

// A Google OAuth client ID is public by design (it is sent to every browser); it is not a secret.
// Only test users added in Google Cloud can sign in with it.
const DEFAULT_CLIENT_ID = '408913322138-e2sp4v8cvge22cr5qkh865dcsad8gu8m.apps.googleusercontent.com';
export const clientId: string | undefined = import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID;

// The token is kept on this device only and ignored once it expires.
function readStored(): StoredToken | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as StoredToken;
    // Treat a token as expired a minute early to avoid failed requests.
    return t.expiresAt - 60_000 > Date.now() ? t : null;
  } catch {
    return null;
  }
}

export function currentToken(): string | null {
  return readStored()?.accessToken ?? null;
}

export function forgetToken() {
  try {
    const t = readStored();
    localStorage.removeItem(TOKEN_KEY);
    if (t && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(t.accessToken, () => {});
  } catch {
    /* ignore */
  }
}

function waitForGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (window.google?.accounts?.oauth2) return resolve();
      if (Date.now() - started > 10_000) return reject(new Error('Google sign-in did not load. Check your connection.'));
      setTimeout(tick, 100);
    };
    tick();
  });
}

// Asks Google for a token. Must be called from a tap or click so the popup is allowed.
export async function signIn(): Promise<string> {
  if (!clientId) throw new Error('Castle is missing its Google client ID. See the README setup steps.');
  await waitForGis();
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      // An empty prompt skips the consent screen after the first time.
      prompt: '',
      callback: (resp: any) => {
        if (resp.error) return reject(new Error(resp.error_description || resp.error));
        const token: StoredToken = {
          accessToken: resp.access_token,
          expiresAt: Date.now() + Number(resp.expires_in) * 1000,
        };
        try {
          localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
        } catch {
          /* storage blocked: token still works for this session */
        }
        resolve(token.accessToken);
      },
      error_callback: (err: any) => reject(new Error(err?.message || 'Sign-in was cancelled.')),
    });
    client.requestAccessToken();
  });
}

export class AuthExpired extends Error {}

export async function googleGet<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) {
    forgetToken();
    throw new AuthExpired('Your Google session expired.');
  }
  if (!res.ok) throw new Error(`Google returned ${res.status}`);
  return res.json() as Promise<T>;
}
