"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getAssignmentGradingQueue,
  listAssignments,
  listClasses,
} from "@/lib/api/client";
import { trackUxEventSafe } from "@/lib/analytics/tracker";
import { clearAuthSession, getAuthSession } from "@/lib/auth/session";
import type {
  AssignmentGradingQueueItem,
  AssignmentGradingQueueResponse,
  AssignmentListItem,
  ClassListItem,
  UserProfile,
} from "@/lib/api/types";

type TaskCenterRow = {
  assignmentId: string;
  title: string;
  classId: string;
  className: string;
  dueAt: string | null;
  status: string;
  totalSubmissions: number;
  ungradedSubmissions: number;
  pendingTeacherReplyCount: number;
};

type PendingInboxItem = {
  submissionId: string;
  assignmentId: string;
  assignmentTitle: string;
  className: string;
  studentName: string;
  submittedAt: string;
  manualStatus: AssignmentGradingQueueItem["manual_status"];
  pendingTeacherReply: boolean;
};

function toMillis(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "未设置";
  }
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function isOverdue(dueAt: string | null): boolean {
  const dueMillis = toMillis(dueAt);
  return dueMillis !== null && dueMillis < Date.now();
}

function buildRow(
  assignment: AssignmentListItem,
  classMap: Map<string, ClassListItem>,
  queue: AssignmentGradingQueueResponse | null,
): TaskCenterRow {
  const ungradedSubmissions =
    queue?.items.filter((item) => item.manual_status !== "published").length ?? 0;

  return {
    assignmentId: assignment.assignment_id,
    title: assignment.title,
    classId: assignment.class_id,
    className: classMap.get(assignment.class_id)?.name || "未命名班级",
    dueAt: assignment.due_at ?? null,
    status: assignment.status,
    totalSubmissions: queue?.total_submissions ?? 0,
    ungradedSubmissions,
    pendingTeacherReplyCount:
      queue?.items.filter((item) => item.pending_teacher_reply).length ?? 0,
  };
}

function toInboxItem(
  assignment: AssignmentListItem,
  classMap: Map<string, ClassListItem>,
  queueItem: AssignmentGradingQueueItem,
): PendingInboxItem {
  return {
    submissionId: queueItem.submission_id,
    assignmentId: assignment.assignment_id,
    assignmentTitle: assignment.title,
    className: classMap.get(assignment.class_id)?.name || "未命名班级",
    studentName: queueItem.student_name,
    submittedAt: queueItem.submitted_at,
    manualStatus: queueItem.manual_status,
    pendingTeacherReply: queueItem.pending_teacher_reply,
  };
}

function manualStatusLabel(status: AssignmentGradingQueueItem["manual_status"]): string {
  if (status === "draft") {
    return "草稿待发布";
  }
  if (status === "published") {
    return "已发布";
  }
  return "未批改";
}

function DueBadge({ dueAt }: { dueAt: string | null }) {
  if (!dueAt) {
    return (
      <span className="rounded-full border border-slate-300/70 bg-white px-2 py-1 text-xs text-slate-600">
        未设置
      </span>
    );
  }
  if (isOverdue(dueAt)) {
    return (
      <span className="rounded-full border border-rose-600/45 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-800">
        已截止
      </span>
    );
  }
  return (
    <span className="rounded-full border border-emerald-700/35 bg-emerald-50 px-2 py-1 text-xs text-emerald-900">
      进行中
    </span>
  );
}

export default function TeacherTasksPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [rows, setRows] = useState<TaskCenterRow[]>([]);
  const [pendingInbox, setPendingInbox] = useState<PendingInboxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const session = getAuthSession();
    setCurrentUser(session?.user ?? null);
  }, []);

  useEffect(() => {
    if (!currentUser || currentUser.role !== "teacher") {
      return;
    }

    let cancelled = false;
    const hydrate = async () => {
      setLoading(true);
      setError("");
      try {
        const [classes, assignments] = await Promise.all([listClasses(), listAssignments()]);
        if (cancelled) {
          return;
        }

        const classMap = new Map(classes.map((item) => [item.class_id, item]));
        const queueResults = await Promise.allSettled(
          assignments.map((item) => getAssignmentGradingQueue(item.assignment_id)),
        );
        if (cancelled) {
          return;
        }

        const queueMap = new Map<string, AssignmentGradingQueueResponse | null>();
        assignments.forEach((assignment, index) => {
          const result = queueResults[index];
          queueMap.set(
            assignment.assignment_id,
            result.status === "fulfilled" ? result.value : null,
          );
        });

        const mergedRows = assignments
          .map((assignment) => buildRow(assignment, classMap, queueMap.get(assignment.assignment_id) ?? null))
          .sort((a, b) => {
            if (b.ungradedSubmissions !== a.ungradedSubmissions) {
              return b.ungradedSubmissions - a.ungradedSubmissions;
            }
            const dueA = toMillis(a.dueAt);
            const dueB = toMillis(b.dueAt);
            if (dueA !== null && dueB !== null) {
              return dueA - dueB;
            }
            if (dueA !== null) {
              return -1;
            }
            if (dueB !== null) {
              return 1;
            }
            return b.assignmentId.localeCompare(a.assignmentId);
          });

        const pendingItems = assignments
          .flatMap((assignment) => {
            const queue = queueMap.get(assignment.assignment_id);
            if (!queue) {
              return [];
            }
            return queue.items
              .filter((item) => item.manual_status !== "published")
              .map((item) => toInboxItem(assignment, classMap, item));
          })
          .sort((a, b) => (toMillis(b.submittedAt) ?? 0) - (toMillis(a.submittedAt) ?? 0));

        setRows(mergedRows);
        setPendingInbox(pendingItems);

        trackUxEventSafe({
          event_name: "teacher_task_center_view",
          event_category: "page_view",
          page: "/teacher/tasks",
          properties: {
            assignment_count: mergedRows.length,
            ungraded_submission_count: pendingItems.length,
          },
        });
      } catch (hydrateError) {
        if (!cancelled) {
          setError((hydrateError as Error).message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const summary = useMemo(() => {
    const now = Date.now();
    const newIn24h = pendingInbox.filter((item) => {
      const submittedMillis = toMillis(item.submittedAt);
      if (!submittedMillis) {
        return false;
      }
      return now - submittedMillis <= 24 * 3600 * 1000;
    }).length;

    const assignmentsWithPending = rows.filter(
      (row) => row.ungradedSubmissions > 0,
    ).length;

    const overdueAssignments = rows.filter(
      (row) => row.ungradedSubmissions > 0 && isOverdue(row.dueAt),
    ).length;

    return {
      pendingSubmissions: pendingInbox.length,
      assignmentsWithPending,
      newIn24h,
      overdueAssignments,
    };
  }, [pendingInbox, rows]);

  if (!currentUser || currentUser.role !== "teacher") {
    return (
      <main className="mx-auto min-h-screen max-w-4xl p-6 md:p-10">
        <section className="poster-shell p-6 md:p-8">
          <div className="relative z-10 paper-card p-5">
            <h1 className="poster-title text-3xl font-bold">任务中心需要教师登录</h1>
            <p className="mt-2 text-sm text-slate-700">
              请先登录老师账号后，进入待批改收件箱。
            </p>
            <a className="btn-ink mt-4 inline-block text-sm" href="/login/teacher?next=%2Fteacher%2Ftasks">
              前往登录
            </a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-[1300px] p-3 md:p-6">
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="flex h-fit flex-col rounded-3xl border border-slate-200 bg-white/90 shadow-[0_18px_48px_rgba(15,23,42,0.12)] lg:sticky lg:top-20">
          <div className="border-b border-slate-200 px-6 py-6">
            <p className="text-3xl font-bold text-indigo-600">作文协同台</p>
            <p className="mt-1 text-sm text-slate-500">老师工作区</p>
          </div>
          <nav className="space-y-2 p-4 text-base">
            <Link className="block rounded-xl bg-indigo-50 px-4 py-3 font-semibold text-indigo-700" href="/teacher/tasks">
              待批改收件箱
            </Link>
            <Link className="block rounded-xl px-4 py-3 text-slate-600 transition hover:bg-slate-100" href="/teacher">
              班级与发布
            </Link>
          </nav>
          <div className="mt-auto border-t border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-800">{currentUser.display_name}</p>
            <p className="text-sm text-slate-500">教师</p>
            <button
              className="mt-3 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
              onClick={() => {
                clearAuthSession();
                window.location.href = "/login/teacher";
              }}
              type="button"
            >
              退出登录
            </button>
          </div>
        </aside>

        <section className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white/90 px-5 py-5 shadow-[0_16px_42px_rgba(15,23,42,0.1)] md:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-4xl font-bold tracking-tight text-slate-900">待批改收件箱</h1>
                <p className="mt-1 text-lg text-slate-500">优先处理学生新提交的未批改作文</p>
              </div>
              <Link
                className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(79,70,229,0.35)]"
                href="/teacher"
              >
                + 发布新任务
              </Link>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">未批改作文</p>
              <p className="mt-2 text-4xl font-bold text-slate-900">{summary.pendingSubmissions}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">有待批改任务</p>
              <p className="mt-2 text-4xl font-bold text-slate-900">{summary.assignmentsWithPending}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">24小时新提交</p>
              <p className="mt-2 text-4xl font-bold text-slate-900">{summary.newIn24h}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">已截止待处理任务</p>
              <p className="mt-2 text-4xl font-bold text-slate-900">{summary.overdueAssignments}</p>
            </div>
          </div>

          {loading ? <p className="text-sm text-slate-600">正在加载待批改收件箱...</p> : null}
          {error ? (
            <div className="rounded-xl border border-rose-700/35 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              加载失败：{error}
            </div>
          ) : null}

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-3xl font-bold text-slate-900">最新未批改作文</h2>
              <p className="text-sm text-slate-500">按提交时间倒序</p>
            </div>
            <ul className="divide-y divide-slate-200">
              {pendingInbox.length === 0 ? (
                <li className="px-5 py-5 text-sm text-slate-500">当前没有待批改作文。</li>
              ) : (
                pendingInbox.slice(0, 30).map((item) => (
                  <li key={item.submissionId} className="px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xl font-bold text-slate-900">{item.studentName}</p>
                          <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-700">
                            {manualStatusLabel(item.manualStatus)}
                          </span>
                          {item.pendingTeacherReply ? (
                            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                              学生有新回复
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {item.assignmentTitle} · {item.className}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          提交时间：{formatDateTime(item.submittedAt)} · Submission ID: {item.submissionId}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                          href={`/teacher/grading/${item.submissionId}`}
                        >
                          去批改
                        </Link>
                        <Link
                          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                          href={`/teacher/assignments/${item.assignmentId}`}
                        >
                          查看任务
                        </Link>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          <details className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <summary className="cursor-pointer text-lg font-semibold text-slate-900">
              任务概览（按待批改数量排序）
            </summary>
            <ul className="mt-3 space-y-2">
              {rows.length === 0 ? (
                <li className="text-sm text-slate-500">暂无任务。</li>
              ) : (
                rows.map((row) => (
                  <li key={row.assignmentId} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-slate-900">{row.title}</p>
                          <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">
                            {row.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{row.className}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          待批改 {row.ungradedSubmissions} / 总提交 {row.totalSubmissions} · 待回复 {row.pendingTeacherReplyCount}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">截止时间</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{formatDateTime(row.dueAt)}</p>
                        <div className="mt-1 flex justify-end">
                          <DueBadge dueAt={row.dueAt} />
                        </div>
                        <Link className="mt-2 inline-block text-sm font-semibold text-indigo-600 hover:underline" href={`/teacher/assignments/${row.assignmentId}`}>
                          进入任务详情
                        </Link>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </details>
        </section>
      </div>
    </main>
  );
}
