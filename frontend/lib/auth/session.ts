import type { LoginResponse } from "@/lib/api/types";
import { AUTH_ROLE_COOKIE_KEY, AUTH_ROLE_COOKIE_MAX_AGE_SECONDS, AUTH_SESSION_KEY } from "@/lib/auth/constants";

export type AuthSession = LoginResponse;
export type AuthRole = AuthSession["user"]["role"];

function setAuthRoleCookie(role: AuthRole): void {
  document.cookie = `${AUTH_ROLE_COOKIE_KEY}=${role}; Path=/; Max-Age=${AUTH_ROLE_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

function clearAuthRoleCookie(): void {
  document.cookie = `${AUTH_ROLE_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
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
    setAuthRoleCookie(session.user.role);
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
  setAuthRoleCookie(session.user.role);
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(AUTH_SESSION_KEY);
  clearAuthRoleCookie();
}

export function getAccessToken(): string | null {
  return getAuthSession()?.access_token ?? null;
}
