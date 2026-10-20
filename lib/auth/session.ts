import crypto from 'crypto';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'soundpulse_oauth_session';
const STATE_COOKIE_NAME = 'soundpulse_oauth_state';
const ENCRYPTION_KEY = crypto
  .createHash('sha256')
  .update(process.env.SESSION_SECRET || 'soundpulse_default_session_secret_change_in_production')
  .digest();

export interface OAuthUser {
  id: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
  channelId?: string;
  channelTitle?: string;
}

export interface StoredSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // unix timestamp in ms
  user: OAuthUser;
  lastSyncedAt?: string;
}

// Encrypt payload using AES-256-GCM
export function encryptData(data: any): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const jsonStr = JSON.stringify(data);
  let encrypted = cipher.update(jsonStr, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

// Decrypt payload
export function decryptData<T = any>(encryptedStr: string): T | null {
  try {
    const parts = encryptedStr.split(':');
    if (parts.length !== 3) return null;
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (err) {
    return null;
  }
}

const isSecure =
  process.env.NODE_ENV === 'production' &&
  !process.env.APP_BASE_URL?.startsWith('http://localhost') &&
  !process.env.APP_BASE_URL?.startsWith('http://127.0.0.1');

// Set OAuth CSRF State Cookie
export async function createOAuthState(): Promise<string> {
  const state = crypto.randomBytes(32).toString('hex');
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  });
  return state;
}

// Verify OAuth CSRF State Cookie
export async function verifyOAuthState(stateToVerify: string): Promise<boolean> {
  const cookieStore = await cookies();
  const storedState = cookieStore.get(STATE_COOKIE_NAME)?.value;
  cookieStore.delete(STATE_COOKIE_NAME);
  if (!storedState || !stateToVerify) return false;
  return crypto.timingSafeEqual(Buffer.from(storedState), Buffer.from(stateToVerify));
}

// Save encrypted session in httpOnly cookie
export async function saveUserSession(session: StoredSession): Promise<void> {
  const encrypted = encryptData(session);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, encrypted, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });
}

// Get user session from httpOnly cookie
export async function getUserSession(): Promise<StoredSession | null> {
  const cookieStore = await cookies();
  const cookieVal = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!cookieVal) return null;
  return decryptData<StoredSession>(cookieVal);
}

// Clear user session cookie
export async function clearUserSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete(STATE_COOKIE_NAME);
}

// Refresh Google access token if expired
export async function getValidAccessToken(session: StoredSession): Promise<string | null> {
  const now = Date.now();
  // If token is still valid with 2 minutes buffer, return it
  if (session.expiresAt > now + 120 * 1000) {
    return session.accessToken;
  }

  // If expired and no refresh token, return null
  if (!session.refreshToken) {
    return null;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: session.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const newAccessToken = data.access_token;
    const expiresIn = data.expires_in || 3600;

    session.accessToken = newAccessToken;
    session.expiresAt = Date.now() + expiresIn * 1000;
    await saveUserSession(session);

    return newAccessToken;
  } catch (err) {
    console.warn('Failed to refresh token:', err);
    return null;
  }
}
