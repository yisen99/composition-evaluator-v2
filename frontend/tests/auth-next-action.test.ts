import { describe, expect, it } from "vitest";
import { resolveNextActionPath } from "@/lib/auth/next-action";

describe("resolveNextActionPath", () => {
  it("maps legacy student workbench action to current student workspace", () => {
    expect(resolveNextActionPath("redirect_to_student_workbench")).toBe("/student");
  });

  it("maps legacy teacher workbench action to current teacher workspace", () => {
    expect(resolveNextActionPath("redirect_to_teacher_workbench")).toBe("/teacher/tasks");
  });

  it("maps legacy onboarding teacher action to current teacher workspace", () => {
    expect(resolveNextActionPath("onboarding_teacher")).toBe("/teacher/tasks");
  });

  it("keeps onboarding student action as onboarding route", () => {
    expect(resolveNextActionPath("onboarding_student")).toBe("/onboarding/student");
  });

  it("falls back to home for unknown action", () => {
    expect(resolveNextActionPath("unknown_action")).toBe("/");
  });
});
