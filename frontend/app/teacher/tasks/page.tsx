"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  executeTeacherAssignmentBatchAction,
  getAssignmentGradingQueue,
  getUxMetricsSummary,
  listAssignments,
  listClasses
} from "@/lib/api/client";
import { trackUxEventSafe } from "@/lib/analytics/tracker";
import { clearAuthSession, getAuthSession } from "@/lib/auth/session";
import type {
  AssignmentListItem,
  AssignmentGradingQueueResponse,
  ClassListItem,
  TeacherAssignmentBatchAction,
  TeacherAssignmentBatchActionResponse,
  TeacherAssignmentTargetStatus,
  UxMetricsSummaryResponse,
  UserProfile
} from "@/lib/api/types";

type FocusFilter = "all" | "pending_reply" | "draft" | "due_soon" | "no_submission" | "done";

type TaskCenterRow = {
  assignmentId: string;
  title: string;
  classId: string;
  className: string;
  dueAt: string | null;
  status: string;
  submissionsCount: number;
  manualDraftCount: number;
  manualPublishedCount: number;
  unpublishedCount: number;
  pendingTeacherReplyCount: number;
  lastInteractionAt: string | null;
  queueLoadFailed: boolean;
};

const DUE_SOON_HOURS = 72;

function batchActionLabel(action: TeacherAssignmentBatchAction): string {
  if (action === "enter_workflow") {
    return "批量进入任务";
  }
  if (action === "publish_reminder") {
    return "批量发布提醒";
  }
  return "批量状态推进";
}

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

function isDueSoon(dueAt: string | null): boolean {
  const dueMillis = toMillis(dueAt);
  if (!dueMillis) {
    return false;
  }
  const diff = dueMillis - Date.now();
  return diff >= 0 && diff <= DUE_SOON_HOURS * 3600 * 1000;
}

function isOverdue(dueAt: string | null): boolean {
  const dueMillis = toMillis(dueAt);
  return dueMillis !== null && dueMillis < Date.now();
}

function buildRow(
  assignment: AssignmentListItem,
  classMap: Map<string, ClassListItem>,
  queue: AssignmentGradingQueueResponse | null
): TaskCenterRow {
  const pendingTeacherReplyCount = queue?.items.filter((item) => item.pending_teacher_reply).length ?? 0;
  const manualPublishedCount = queue?.manual_published_count ?? 0;
  const manualDraftCount = queue?.manual_draft_count ?? 0;
  const submissionsCount = queue?.total_submissions ?? 0;
  const unpublishedCount = Math.max(0, submissionsCount - manualPublishedCount);

  const lastInteractionAt =
    queue?.items
      .map((item) => item.last_reply_at)
      .filter((item): item is string => Boolean(item))
      .sort((a, b) => toMillis(b)! - toMillis(a)!)[0] ?? null;

  return {
    assignmentId: assignment.assignment_id,
    title: assignment.title,
    classId: assignment.class_id,
    className: classMap.get(assignment.class_id)?.name || "未命名班级",
    dueAt: assignment.due_at ?? null,
    status: assignment.status,
    submissionsCount,
    manualDraftCount,
    manualPublishedCount,
    unpublishedCount,
    pendingTeacherReplyCount,
    lastInteractionAt,
    queueLoadFailed: queue === null,
  };
}

function DueBadge({ dueAt }: { dueAt: string | null }) {
  if (!dueAt) {
    return <span className="rounded-full border border-slate-300/70 bg-white/70 px-2 py-1 text-xs text-slate-600">未设置</span>;
  }
  if (isOverdue(dueAt)) {
    return <span className="rounded-full border border-rose-600/45 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-800">已截止</span>;
  }
  if (isDueSoon(dueAt)) {
    return (
      <span className="rounded-full border border-amber-600/45 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900">
        {DUE_SOON_HOURS}小时内截止
      </span>
    );
  }
  return <span className="rounded-full border border-emerald-700/35 bg-emerald-50 px-2 py-1 text-xs text-emerald-900">进行中</span>;
}

export default function TeacherTasksPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [rows, setRows] = useState<TaskCenterRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [focus, setFocus] = useState<FocusFilter>("all");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [keyword, setKeyword] = useState("");
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<string[]>([]);
  const [classroomList, setClassroomList] = useState<ClassListItem[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchStatusTarget, setBatchStatusTarget] = useState<TeacherAssignmentTargetStatus>("closed");
  const [batchResult, setBatchResult] = useState<TeacherAssignmentBatchActionResponse | null>(null);
  const [batchToast, setBatchToast] = useState<{ type: "ok" | "error"; message: string } | null>(null);
  const [uxMetrics, setUxMetrics] = useState<UxMetricsSummaryResponse | null>(null);

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

        setClassroomList(classes);
        const classMap = new Map(classes.map((item) => [item.class_id, item]));
        const queueResults = await Promise.allSettled(
          assignments.map((item) => getAssignmentGradingQueue(item.assignment_id))
        );
        if (cancelled) {
          return;
        }

        const queueMap = new Map<string, AssignmentGradingQueueResponse | null>();
        assignments.forEach((assignment, index) => {
          const result = queueResults[index];
          if (result.status === "fulfilled") {
            queueMap.set(assignment.assignment_id, result.value);
          } else {
            queueMap.set(assignment.assignment_id, null);
          }
        });

        const mergedRows = assignments
          .map((assignment) => buildRow(assignment, classMap, queueMap.get(assignment.assignment_id) ?? null))
          .sort((a, b) => {
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
        setRows(mergedRows);
        trackUxEventSafe({
          event_name: "teacher_task_center_view",
          event_category: "page_view",
          page: "/teacher/tasks",
          properties: {
            assignment_count: mergedRows.length,
            pending_reply_count: mergedRows.filter((item) => item.pendingTeacherReplyCount > 0).length
          }
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

  useEffect(() => {
    if (!currentUser || currentUser.role !== "teacher") {
      return;
    }
    let cancelled = false;
    const loadMetrics = async () => {
      try {
        const payload = await getUxMetricsSummary(7);
        if (!cancelled) {
          setUxMetrics(payload);
        }
      } catch {
        if (!cancelled) {
          setUxMetrics(null);
        }
      }
    };
    void loadMetrics();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const filteredRows = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return rows.filter((row) => {
      if (selectedClassId && row.classId !== selectedClassId) {
        return false;
      }
      if (normalizedKeyword) {
        const haystack = `${row.title} ${row.className}`.toLowerCase();
        if (!haystack.includes(normalizedKeyword)) {
          return false;
        }
      }
      if (focus === "pending_reply") {
        return row.pendingTeacherReplyCount > 0;
      }
      if (focus === "draft") {
        return row.manualDraftCount > 0;
      }
      if (focus === "due_soon") {
        return isDueSoon(row.dueAt) || (isOverdue(row.dueAt) && row.unpublishedCount > 0);
      }
      if (focus === "no_submission") {
        return row.submissionsCount === 0;
      }
      if (focus === "done") {
        return row.submissionsCount > 0 && row.pendingTeacherReplyCount === 0 && row.unpublishedCount === 0;
      }
      return true;
    });
  }, [focus, keyword, rows, selectedClassId]);

  useEffect(() => {
    const visibleIdSet = new Set(filteredRows.map((item) => item.assignmentId));
    setSelectedAssignmentIds((prev) => prev.filter((id) => visibleIdSet.has(id)));
  }, [filteredRows]);

  const summary = useMemo(() => {
    const pendingReplyTasks = rows.filter((row) => row.pendingTeacherReplyCount > 0).length;
    const dueSoonTasks = rows.filter((row) => isDueSoon(row.dueAt) || (isOverdue(row.dueAt) && row.unpublishedCount > 0)).length;
    const noSubmissionTasks = rows.filter((row) => row.submissionsCount === 0).length;
    const draftTasks = rows.filter((row) => row.manualDraftCount > 0).length;
    return { pendingReplyTasks, dueSoonTasks, noSubmissionTasks, draftTasks };
  }, [rows]);

  const selectedAll = filteredRows.length > 0 && selectedAssignmentIds.length === filteredRows.length;

  const toggleSelectAll = () => {
    if (selectedAll) {
      setSelectedAssignmentIds([]);
      return;
    }
    setSelectedAssignmentIds(filteredRows.map((item) => item.assignmentId));
  };

  const toggleSelectOne = (assignmentId: string) => {
    setSelectedAssignmentIds((prev) =>
      prev.includes(assignmentId) ? prev.filter((item) => item !== assignmentId) : [...prev, assignmentId]
    );
  };

  const refreshRows = async () => {
    const [classes, assignments] = await Promise.all([listClasses(), listAssignments()]);
    setClassroomList(classes);
    const classMap = new Map(classes.map((item) => [item.class_id, item]));
    const queueResults = await Promise.allSettled(assignments.map((item) => getAssignmentGradingQueue(item.assignment_id)));
    const queueMap = new Map<string, AssignmentGradingQueueResponse | null>();
    assignments.forEach((assignment, index) => {
      const result = queueResults[index];
      queueMap.set(assignment.assignment_id, result.status === "fulfilled" ? result.value : null);
    });
    const mergedRows = assignments
      .map((assignment) => buildRow(assignment, classMap, queueMap.get(assignment.assignment_id) ?? null))
      .sort((a, b) => {
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
    setRows(mergedRows);
  };

  const runBatchAction = async (action: TeacherAssignmentBatchAction) => {
    if (selectedAssignmentIds.length === 0) {
      setBatchToast({ type: "error", message: "请先勾选至少 1 个任务。" });
      return;
    }
    setBatchRunning(true);
    setBatchResult(null);
    setBatchToast(null);
    try {
      const result = await executeTeacherAssignmentBatchAction({
        assignment_ids: selectedAssignmentIds,
        action,
        target_status: action === "advance_status" ? batchStatusTarget : undefined
      });
      setBatchResult(result);
      trackUxEventSafe({
        event_name: "teacher_task_batch_action_execute",
        event_category: "action",
        page: "/teacher/tasks",
        properties: {
          action,
          selected_count: selectedAssignmentIds.length,
          succeeded: result.succeeded,
          failed: result.failed
        }
      });

      if (action === "enter_workflow") {
        if (result.workflow_assignment_ids.length === 0) {
          setBatchToast({ type: "error", message: "所选任务都无法进入批处理工作流，请检查权限或任务状态。" });
          return;
        }
        const ids = result.workflow_assignment_ids.join(",");
        const firstId = result.workflow_assignment_ids[0];
        router.push(`/teacher/assignments/${firstId}?batch_ids=${encodeURIComponent(ids)}&batch_index=0`);
        return;
      }

      await refreshRows();
      try {
        setUxMetrics(await getUxMetricsSummary(7));
      } catch {
        setUxMetrics(null);
      }
      setBatchToast({
        type: result.failed > 0 ? "error" : "ok",
        message: `${batchActionLabel(action)}完成：成功 ${result.succeeded}，失败 ${result.failed}。`
      });
    } catch (batchError) {
      setBatchToast({ type: "error", message: `${batchActionLabel(action)}失败：${(batchError as Error).message}` });
    } finally {
      setBatchRunning(false);
    }
  };

  if (!currentUser || currentUser.role !== "teacher") {
    return (
      <main className="mx-auto min-h-screen max-w-4xl p-6 md:p-10">
        <section className="poster-shell p-6 md:p-8">
          <div className="relative z-10 paper-card p-5">
            <h1 className="poster-title text-3xl font-bold">任务中心需要教师登录</h1>
            <p className="mt-2 text-sm text-slate-700">请先登录老师账号后，查看按优先级排序的任务列表。</p>
            <a className="btn-ink mt-4 inline-block text-sm" href="/login/teacher?next=%2Fteacher%2Ftasks">
              前往登录
            </a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-[1500px] p-3 md:p-6">
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="flex h-fit flex-col rounded-3xl border border-slate-200 bg-white/90 shadow-[0_18px_48px_rgba(15,23,42,0.12)] lg:sticky lg:top-20">
          <div className="border-b border-slate-200 px-6 py-6">
            <p className="text-3xl font-bold text-indigo-600">作文协同台</p>
          </div>
          <nav className="space-y-2 p-4 text-base">
            <Link className="block rounded-xl bg-indigo-50 px-4 py-3 font-semibold text-indigo-700" href="/teacher/tasks">
              任务中心
            </Link>
            <Link className="block rounded-xl px-4 py-3 text-slate-600 transition hover:bg-slate-100" href="/teacher">
              班级管理
            </Link>
            <a className="block rounded-xl px-4 py-3 text-slate-600 transition hover:bg-slate-100" href="#metrics">
              运营看板
            </a>
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
                <h1 className="text-4xl font-bold tracking-tight text-slate-900">任务中心</h1>
                <p className="mt-1 text-lg text-slate-500">管理您的作文任务与批改进度</p>
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
              <p className="text-xs font-semibold text-slate-500">P0 临近截止</p>
              <p className="mt-2 text-4xl font-bold text-slate-900">{summary.dueSoonTasks}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">P1 待回复反馈</p>
              <p className="mt-2 text-4xl font-bold text-slate-900">{summary.pendingReplyTasks}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">P2 待批改</p>
              <p className="mt-2 text-4xl font-bold text-slate-900">{summary.draftTasks}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">无提交任务</p>
              <p className="mt-2 text-4xl font-bold text-slate-900">{summary.noSubmissionTasks}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[1fr_220px_220px]">
              <input
                className="field rounded-xl border-slate-300 bg-white"
                placeholder="搜索任务名或班级名"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
              <select
                className="field rounded-xl border-slate-300 bg-white"
                value={selectedClassId}
                onChange={(event) => setSelectedClassId(event.target.value)}
              >
                <option value="">全部班级</option>
                {classroomList.map((room) => (
                  <option key={room.class_id} value={room.class_id}>
                    {room.name}
                  </option>
                ))}
              </select>
              <select
                className="field rounded-xl border-slate-300 bg-white"
                value={focus}
                onChange={(event) => setFocus(event.target.value as FocusFilter)}
              >
                <option value="all">全部任务</option>
                <option value="pending_reply">待老师回复</option>
                <option value="draft">有手工草稿</option>
                <option value="due_soon">临近/已过截止</option>
                <option value="no_submission">暂无提交</option>
                <option value="done">已完成闭环</option>
              </select>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600"
                onClick={toggleSelectAll}
                type="button"
              >
                {selectedAll ? "取消全选" : "全选当前筛选"}
              </button>
              <button
                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                onClick={() => {
                  void runBatchAction("enter_workflow");
                }}
                type="button"
                disabled={batchRunning}
              >
                批量进入任务
              </button>
              <button
                className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white"
                onClick={() => {
                  void runBatchAction("publish_reminder");
                }}
                type="button"
                disabled={batchRunning}
              >
                批量提醒
              </button>
              <select
                className="field h-9 w-36 rounded-lg border-slate-300 bg-white px-2 py-1 text-xs"
                value={batchStatusTarget}
                onChange={(event) => setBatchStatusTarget(event.target.value as TeacherAssignmentTargetStatus)}
                disabled={batchRunning}
              >
                <option value="closed">推进为已关闭</option>
                <option value="published">推进为进行中</option>
              </select>
              <button
                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
                onClick={() => {
                  void runBatchAction("advance_status");
                }}
                type="button"
                disabled={batchRunning}
              >
                批量归档
              </button>
              <span className="text-xs text-slate-500">已选 {selectedAssignmentIds.length} 项</span>
            </div>
            {batchToast ? (
              <p className={`mt-2 text-xs ${batchToast.type === "ok" ? "text-emerald-700" : "text-rose-700"}`}>
                {batchToast.message}
              </p>
            ) : null}
            {batchResult ? (
              <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-700">
                  最近执行：{batchActionLabel(batchResult.action)}，成功 {batchResult.succeeded}，失败 {batchResult.failed}
                </p>
              </div>
            ) : null}
          </div>

          <div id="metrics" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-700">近 7 天数据</p>
            {uxMetrics ? (
              <div className="mt-3 grid gap-3 text-sm md:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">埋点总量</p>
                  <p className="mt-1 text-xl font-semibold">{uxMetrics.total_events}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">任务中心访问</p>
                  <p className="mt-1 text-xl font-semibold">{uxMetrics.teacher_task_center_view_count}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">批处理次数</p>
                  <p className="mt-1 text-xl font-semibold">{uxMetrics.teacher_batch_action_count}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">学生待办点击</p>
                  <p className="mt-1 text-xl font-semibold">{uxMetrics.student_todo_click_count}</p>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500">当前暂无指标数据或埋点服务不可用。</p>
            )}
          </div>

          {loading ? <p className="text-sm text-slate-600">正在汇总任务优先级数据...</p> : null}
          {error ? (
            <div className="rounded-xl border border-rose-700/35 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              加载失败：{error}
            </div>
          ) : null}

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-3xl font-bold text-slate-900">全部任务</h2>
              <p className="text-sm text-slate-500">当前筛选：{filteredRows.length} 项</p>
            </div>
            <ul className="divide-y divide-slate-200">
              {filteredRows.length === 0 ? (
                <li className="px-5 py-5 text-sm text-slate-500">当前筛选下暂无任务。</li>
              ) : (
                filteredRows.map((row) => (
                  <li key={row.assignmentId} className="px-5 py-4">
                    <div className="grid gap-3 md:grid-cols-[28px_1fr_220px_180px] md:items-center">
                      <input
                        checked={selectedAssignmentIds.includes(row.assignmentId)}
                        onChange={() => toggleSelectOne(row.assignmentId)}
                        type="checkbox"
                        className="h-4 w-4"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-2xl font-bold text-slate-900">{row.title}</p>
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                            {row.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{row.className}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          提交进度 {row.manualPublishedCount}/{row.submissionsCount} · 待回复 {row.pendingTeacherReplyCount}
                          {row.queueLoadFailed ? " · 队列信息读取失败" : ""}
                        </p>
                      </div>
                      <div className="text-sm">
                        <p className="text-xs text-slate-500">截止日期</p>
                        <p className="mt-1 font-semibold text-slate-900">{row.dueAt ? formatDateTime(row.dueAt) : "未设置"}</p>
                        <div className="mt-1">
                          <DueBadge dueAt={row.dueAt} />
                        </div>
                      </div>
                      <div className="text-sm md:text-right">
                        <Link className="font-semibold text-indigo-600 hover:underline" href={`/teacher/assignments/${row.assignmentId}`}>
                          进入批改详情
                        </Link>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
