import { AUTH_ROLE_COOKIE_KEY, AUTH_SESSION_KEY } from "@/lib/auth/constants";
import { clearAuthSession, getAuthSession, saveAuthSession } from "@/lib/auth/session";
import type { LoginResponse } from "@/lib/api/types";

function buildSession(role: "teacher" | "student"): LoginResponse {
  return {
    access_token: "access-token",
    refresh_token: "refresh-token",
    user: {
      id: "user-1",
      role,
      phone: "13800138000",
      display_name: role === "teacher" ? "王老师" : "小明"
    }
  };
}

describe("auth session storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.cookie = `${AUTH_ROLE_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
  });

  it("saves localStorage and role cookie", () => {
    saveAuthSession(buildSession("teacher"));

    const raw = window.localStorage.getItem(AUTH_SESSION_KEY);
    expect(raw).toContain("\"role\":\"teacher\"");
    expect(document.cookie).toContain(`${AUTH_ROLE_COOKIE_KEY}=teacher`);
  });

  it("hydrates session and refreshes role cookie", () => {
    window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(buildSession("student")));

    const session = getAuthSession();

    expect(session?.user.role).toBe("student");
    expect(document.cookie).toContain(`${AUTH_ROLE_COOKIE_KEY}=student`);
  });

  it("clears both localStorage and role cookie", () => {
    saveAuthSession(buildSession("teacher"));
    clearAuthSession();

    expect(window.localStorage.getItem(AUTH_SESSION_KEY)).toBeNull();
    expect(document.cookie).not.toContain(`${AUTH_ROLE_COOKIE_KEY}=teacher`);
  });
});
