import { AUTH_EXPIRES_AT_COOKIE_KEY, AUTH_ROLE_COOKIE_KEY, AUTH_SESSION_KEY } from "@/lib/auth/constants";
import { clearAuthSession, getAuthSession, saveAuthSession } from "@/lib/auth/session";
import type { LoginResponse } from "@/lib/api/types";

function buildJwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.signature`;
}

function buildSession(role: "teacher" | "student", accessToken?: string): LoginResponse {
  return {
    access_token: accessToken ?? "access-token",
    refresh_token: "refresh-token",
    user: {
      id: "user-1",
      role,
      available_roles: [role],
      last_active_role: role,
      phone: "13800138000",
      display_name: role === "teacher" ? "王老师" : "小明"
    }
  };
}

describe("auth session storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.cookie = `${AUTH_ROLE_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
    document.cookie = `${AUTH_EXPIRES_AT_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
  });

  it("saves localStorage and role cookie", () => {
    saveAuthSession(buildSession("teacher"));

    const raw = window.localStorage.getItem(AUTH_SESSION_KEY);
    expect(raw).toContain("\"role\":\"teacher\"");
    expect(document.cookie).toContain(`${AUTH_ROLE_COOKIE_KEY}=teacher`);
  });

  it("hydrates session and refreshes role cookie", () => {
    const futureToken = buildJwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
    window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(buildSession("student", futureToken)));

    const session = getAuthSession();

    expect(session?.user.role).toBe("student");
    expect(document.cookie).toContain(`${AUTH_ROLE_COOKIE_KEY}=student`);
    expect(document.cookie).toContain(`${AUTH_EXPIRES_AT_COOKIE_KEY}=`);
  });

  it("backfills role fields for legacy session payloads", () => {
    const futureToken = buildJwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
    window.localStorage.setItem(
      AUTH_SESSION_KEY,
      JSON.stringify({
        access_token: futureToken,
        refresh_token: "refresh-token",
        user: {
          id: "user-legacy",
          role: "student",
          phone: "13800138001",
          display_name: "旧版学生"
        }
      })
    );

    const session = getAuthSession();

    expect(session?.user.available_roles).toEqual(["student"]);
    expect(session?.user.last_active_role).toBe("student");
  });

  it("invalidates expired session token and clears storage", () => {
    const expiredToken = buildJwt({ exp: Math.floor(Date.now() / 1000) - 60 });
    window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(buildSession("teacher", expiredToken)));

    const session = getAuthSession();

    expect(session).toBeNull();
    expect(window.localStorage.getItem(AUTH_SESSION_KEY)).toBeNull();
    expect(document.cookie).not.toContain(`${AUTH_ROLE_COOKIE_KEY}=teacher`);
  });

  it("clears both localStorage and role cookie", () => {
    saveAuthSession(buildSession("teacher"));
    clearAuthSession();

    expect(window.localStorage.getItem(AUTH_SESSION_KEY)).toBeNull();
    expect(document.cookie).not.toContain(`${AUTH_ROLE_COOKIE_KEY}=teacher`);
  });
});
