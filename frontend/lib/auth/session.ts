import type { LoginResponse } from "@/lib/api/types";
import {
  AUTH_EXPIRES_AT_COOKIE_KEY,
  AUTH_ROLE_COOKIE_KEY,
  AUTH_ROLE_COOKIE_MAX_AGE_SECONDS,
  AUTH_SESSION_KEY
} from "@/lib/auth/constants";

export type AuthSession = LoginResponse;
export type AuthRole = AuthSession["user"]["role"];
const FALLBACK_ACCESS_TOKEN_EXPIRE_MINUTES = Number(process.env.NEXT_PUBLIC_ACCESS_TOKEN_EXPIRE_MINUTES || "60");

function parseJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }
  try {
    const encodedPayload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = `${encodedPayload}${"=".repeat((4 - (encodedPayload.length % 4)) % 4)}`;
    const decoded = atob(padded);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readAccessTokenExp(session: AuthSession): number | null {
  const payload = parseJwtPayload(session.access_token);
  if (!payload) {
    return null;
  }
  const expValue = payload.exp;
  if (typeof expValue === "number" && Number.isFinite(expValue)) {
    return Math.floor(expValue);
  }
  if (typeof expValue === "string") {
    const parsed = Number(expValue);
    if (Number.isFinite(parsed)) {
      return Math.floor(parsed);
    }
  }
  return null;
}

function setAuthRoleCookie(role: AuthRole): void {
  document.cookie = `${AUTH_ROLE_COOKIE_KEY}=${role}; Path=/; Max-Age=${AUTH_ROLE_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

function clearAuthRoleCookie(): void {
  document.cookie = `${AUTH_ROLE_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function setAuthExpiresCookie(expAtSeconds: number): void {
  document.cookie = `${AUTH_EXPIRES_AT_COOKIE_KEY}=${expAtSeconds}; Path=/; Max-Age=${AUTH_ROLE_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

function clearAuthExpiresCookie(): void {
  document.cookie = `${AUTH_EXPIRES_AT_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function readAuthExpiresCookie(): number | null {
  const key = `${AUTH_EXPIRES_AT_COOKIE_KEY}=`;
  const cookie = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(key));
  if (!cookie) {
    return null;
  }
  const parsed = Number(cookie.slice(key.length));
  return Number.isFinite(parsed) ? Math.floor(parsed) : null;
}

function fallbackTokenExpFromNow(): number {
  return Math.floor(Date.now() / 1000) + Math.max(1, FALLBACK_ACCESS_TOKEN_EXPIRE_MINUTES) * 60;
}

function syncAuthCookies(session: AuthSession): void {
  setAuthRoleCookie(session.user.role);
  const tokenExp = readAccessTokenExp(session);
  if (tokenExp) {
    setAuthExpiresCookie(tokenExp);
  } else {
    const cookieExp = readAuthExpiresCookie();
    const now = Math.floor(Date.now() / 1000);
    if (cookieExp && cookieExp > now) {
      setAuthExpiresCookie(cookieExp);
    } else {
      setAuthExpiresCookie(fallbackTokenExpFromNow());
    }
  }
}

export function getAuthSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) {
    return null;
  }
  try {
    const session = JSON.parse(raw) as AuthSession;
    const tokenExp = readAccessTokenExp(session) ?? readAuthExpiresCookie();
    if (tokenExp && tokenExp <= Math.floor(Date.now() / 1000)) {
      clearAuthSession();
      return null;
    }
    syncAuthCookies(session);
    return session;
  } catch {
    return null;
  }
}

export function saveAuthSession(session: AuthSession): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  syncAuthCookies(session);
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(AUTH_SESSION_KEY);
  clearAuthRoleCookie();
  clearAuthExpiresCookie();
}

export function getAccessToken(): string | null {
  return getAuthSession()?.access_token ?? null;
}
