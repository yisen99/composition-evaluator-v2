import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TopNav } from "@/components/top-nav";

const {
  getAuthSessionMock,
  saveAuthSessionMock,
  clearAuthSessionMock,
  switchAuthRoleMock,
  usePathnameMock,
} = vi.hoisted(() => ({
  getAuthSessionMock: vi.fn(),
  saveAuthSessionMock: vi.fn(),
  clearAuthSessionMock: vi.fn(),
  switchAuthRoleMock: vi.fn(),
  usePathnameMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

vi.mock("@/lib/auth/session", () => ({
  getAuthSession: () => getAuthSessionMock(),
  saveAuthSession: (...args: unknown[]) => saveAuthSessionMock(...args),
  clearAuthSession: (...args: unknown[]) => clearAuthSessionMock(...args),
}));

vi.mock("@/lib/api/client", () => ({
  switchAuthRole: (...args: unknown[]) => switchAuthRoleMock(...args),
}));

vi.mock("@/lib/auth/redirect", () => ({
  defaultWorkspaceByRole: (role: "teacher" | "student") => (role === "teacher" ? "#/teacher/tasks" : "#/student"),
}));

function buildSession(role: "teacher" | "student", availableRoles: Array<"teacher" | "student">) {
  return {
    access_token: "access-token",
    refresh_token: "refresh-token",
    user: {
      id: "user-1",
      role,
      available_roles: availableRoles,
      last_active_role: role,
      phone: "13800138000",
      display_name: role === "teacher" ? "王老师" : "小明",
    },
  };
}

describe("TopNav role switch", () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue("/student");
    getAuthSessionMock.mockReset();
    saveAuthSessionMock.mockReset();
    clearAuthSessionMock.mockReset();
    switchAuthRoleMock.mockReset();
    vi.stubGlobal("alert", vi.fn());
  });

  it("shows switch entry when account has dual roles", () => {
    getAuthSessionMock.mockReturnValue(buildSession("student", ["student", "teacher"]));

    render(<TopNav />);

    expect(screen.getByRole("button", { name: "切换到老师" })).toBeInTheDocument();
  });

  it("hides switch entry when account has single role", () => {
    getAuthSessionMock.mockReturnValue(buildSession("student", ["student"]));

    render(<TopNav />);

    expect(screen.queryByRole("button", { name: /切换到/ })).not.toBeInTheDocument();
  });

  it("switches role and persists updated session", async () => {
    getAuthSessionMock.mockReturnValue(buildSession("student", ["student", "teacher"]));
    switchAuthRoleMock.mockResolvedValue(buildSession("teacher", ["student", "teacher"]));

    render(<TopNav />);

    fireEvent.click(screen.getByRole("button", { name: "切换到老师" }));

    await waitFor(() => {
      expect(switchAuthRoleMock).toHaveBeenCalledWith({ target_role: "teacher" });
      expect(saveAuthSessionMock).toHaveBeenCalledTimes(1);
    });
  });
});
