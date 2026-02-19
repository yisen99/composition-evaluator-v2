import { describe, expect, it } from "vitest";
import type { AssignmentListItem } from "@/lib/api/types";
import { buildAssignmentSubmissionGuard } from "@/lib/submission/assignment-guard";

function buildAssignment(overrides: Partial<AssignmentListItem>): AssignmentListItem {
  return {
    assignment_id: "asg-1",
    class_id: "class-1",
    title: "我的校园",
    prompt: "写校园生活。",
    status: "published",
    due_at: null,
    ...overrides
  };
}

describe("assignment submission guard", () => {
  it("allows published assignment with future due time", () => {
    const assignment = buildAssignment({ due_at: "2099-01-01T00:00:00Z" });
    const guard = buildAssignmentSubmissionGuard(assignment, new Date("2026-02-19T00:00:00Z"));

    expect(guard.allowed).toBe(true);
    expect(guard.reason).toBeNull();
  });

  it("blocks non-published assignment", () => {
    const assignment = buildAssignment({ status: "draft", due_at: "2099-01-01T00:00:00Z" });
    const guard = buildAssignmentSubmissionGuard(assignment, new Date("2026-02-19T00:00:00Z"));

    expect(guard.allowed).toBe(false);
    expect(guard.reason).toBe("当前任务未开放提交。");
  });

  it("blocks overdue assignment", () => {
    const assignment = buildAssignment({ due_at: "2025-01-01T00:00:00Z" });
    const guard = buildAssignmentSubmissionGuard(assignment, new Date("2026-02-19T00:00:00Z"));

    expect(guard.allowed).toBe(false);
    expect(guard.reason).toBe("任务已截止，无法继续提交。");
  });
});
