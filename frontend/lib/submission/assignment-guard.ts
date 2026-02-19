import type { AssignmentListItem } from "@/lib/api/types";

export type AssignmentSubmissionGuard = {
  allowed: boolean;
  reason: string | null;
  overdue: boolean;
};

function isOverdue(dueAt: string | null | undefined, now: Date): boolean {
  if (!dueAt) {
    return false;
  }
  const dueAtMs = new Date(dueAt).getTime();
  if (!Number.isFinite(dueAtMs)) {
    return false;
  }
  return dueAtMs < now.getTime();
}

export function buildAssignmentSubmissionGuard(
  assignment: AssignmentListItem | null | undefined,
  now: Date = new Date()
): AssignmentSubmissionGuard {
  if (!assignment) {
    return { allowed: false, reason: "请先选择要提交的任务。", overdue: false };
  }

  if (assignment.status !== "published") {
    return { allowed: false, reason: "当前任务未开放提交。", overdue: false };
  }

  if (isOverdue(assignment.due_at, now)) {
    return { allowed: false, reason: "任务已截止，无法继续提交。", overdue: true };
  }

  return { allowed: true, reason: null, overdue: false };
}
