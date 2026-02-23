import { describe, expect, it } from "vitest";
import {
  defaultWorkspaceByRole,
  resolveRoleAwareRedirectPath,
  sanitizeNextPath,
  withNextPath
} from "@/lib/auth/redirect";

describe("auth redirect helpers", () => {
  it("sanitizes unsafe next paths", () => {
    expect(sanitizeNextPath("https://evil.com")).toBeNull();
    expect(sanitizeNextPath("//evil.com")).toBeNull();
    expect(sanitizeNextPath("teacher")).toBeNull();
    expect(sanitizeNextPath("/teacher")).toBe("/teacher");
  });

  it("resolves role-aware redirect with fallback", () => {
    expect(resolveRoleAwareRedirectPath("teacher", "/teacher/assignments/1")).toBe("/teacher/assignments/1");
    expect(resolveRoleAwareRedirectPath("teacher", "/student")).toBe("/teacher/tasks");
    expect(resolveRoleAwareRedirectPath("student", "/teacher")).toBe("/student");
    expect(resolveRoleAwareRedirectPath("student", null)).toBe("/student");
  });

  it("builds link with safe next only", () => {
    expect(withNextPath("/login/teacher", "/teacher/assignments/1")).toBe(
      "/login/teacher?next=%2Fteacher%2Fassignments%2F1"
    );
    expect(withNextPath("/login/teacher", "https://evil.com")).toBe("/login/teacher");
  });

  it("returns default workspace by role", () => {
    expect(defaultWorkspaceByRole("teacher")).toBe("/teacher/tasks");
    expect(defaultWorkspaceByRole("student")).toBe("/student");
  });
});
