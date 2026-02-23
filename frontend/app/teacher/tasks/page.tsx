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
import { getAuthSession } from "@/lib/auth/session";
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
    <main className="mx-auto min-h-screen max-w-7xl p-6 md:p-10">
      <section className="poster-shell p-6 md:p-8">
        <div className="relative z-10 flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="seal-chip">教师任务中心</span>
              <h1 className="poster-title mt-3 text-3xl font-bold md:text-4xl">按优先级处理任务，而不是按页面深度找任务</h1>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-700">
              <Link className="underline" href="/teacher">
                前往班级与发布
              </Link>
              <span>
                {currentUser.display_name} · {currentUser.phone}
              </span>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="paper-card p-4">
              <p className="label">待老师回复任务</p>
              <p className="mt-2 text-2xl font-semibold">{summary.pendingReplyTasks}</p>
            </div>
            <div className="paper-card p-4">
              <p className="label">临近/已过截止</p>
              <p className="mt-2 text-2xl font-semibold">{summary.dueSoonTasks}</p>
            </div>
            <div className="paper-card p-4">
              <p className="label">有批改草稿</p>
              <p className="mt-2 text-2xl font-semibold">{summary.draftTasks}</p>
            </div>
            <div className="paper-card p-4">
              <p className="label">暂无学生提交</p>
              <p className="mt-2 text-2xl font-semibold">{summary.noSubmissionTasks}</p>
            </div>
          </div>

          <div className="paper-card p-4">
            <p className="label">验收指标观测（近7天）</p>
            {uxMetrics ? (
              <div className="mt-3 grid gap-3 text-sm md:grid-cols-4">
                <div className="rounded-lg border border-slate-300/50 bg-white/70 p-3">
                  <p className="text-xs text-slate-700">埋点总量</p>
                  <p className="mt-1 text-xl font-semibold">{uxMetrics.total_events}</p>
                </div>
                <div className="rounded-lg border border-slate-300/50 bg-white/70 p-3">
                  <p className="text-xs text-slate-700">任务中心访问</p>
                  <p className="mt-1 text-xl font-semibold">{uxMetrics.teacher_task_center_view_count}</p>
                </div>
                <div className="rounded-lg border border-slate-300/50 bg-white/70 p-3">
                  <p className="text-xs text-slate-700">批处理执行次数</p>
                  <p className="mt-1 text-xl font-semibold">{uxMetrics.teacher_batch_action_count}</p>
                </div>
                <div className="rounded-lg border border-slate-300/50 bg-white/70 p-3">
                  <p className="text-xs text-slate-700">学生待办点击</p>
                  <p className="mt-1 text-xl font-semibold">{uxMetrics.student_todo_click_count}</p>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-600">当前暂无指标数据或埋点服务不可用。</p>
            )}
          </div>

          <div className="paper-card p-4">
            <p className="label">字段优先级（中国教师批改场景）</p>
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-lg border border-rose-700/30 bg-rose-50/80 p-3">
                <p className="font-semibold text-rose-900">P0：必须首屏可见</p>
                <p className="mt-1 text-rose-900">待老师回复、截止时间、未发布批改数、学生是否已读</p>
              </div>
              <div className="rounded-lg border border-amber-700/30 bg-amber-50/80 p-3">
                <p className="font-semibold text-amber-900">P1：辅助决策</p>
                <p className="mt-1 text-amber-900">总提交数、草稿数、最近互动时间、任务状态</p>
              </div>
              <div className="rounded-lg border border-slate-400/30 bg-white/80 p-3">
                <p className="font-semibold text-slate-800">P2：次级信息</p>
                <p className="mt-1 text-slate-700">任务ID、班级ID、技术字段，默认不抢焦点</p>
              </div>
            </div>
          </div>

          <div className="paper-card p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_220px_220px]">
              <input
                className="field"
                placeholder="搜索任务名或班级名"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
              <select className="field" value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)}>
                <option value="">全部班级</option>
                {classroomList.map((room) => (
                  <option key={room.class_id} value={room.class_id}>
                    {room.name}
                  </option>
                ))}
              </select>
              <select className="field" value={focus} onChange={(event) => setFocus(event.target.value as FocusFilter)}>
                <option value="all">全部任务</option>
                <option value="pending_reply">待老师回复</option>
                <option value="draft">有手工草稿</option>
                <option value="due_soon">临近/已过截止</option>
                <option value="no_submission">暂无提交</option>
                <option value="done">已完成闭环</option>
              </select>
            </div>
          </div>

          <div className="paper-card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <button className="btn-seal px-3 py-1 text-xs" onClick={toggleSelectAll} type="button">
                {selectedAll ? "取消全选" : "全选当前筛选"}
              </button>
              <button
                className="btn-ink px-3 py-1 text-xs"
                onClick={() => {
                  void runBatchAction("enter_workflow");
                }}
                type="button"
                disabled={batchRunning}
              >
                批量进入任务
              </button>
              <button
                className="btn-seal px-3 py-1 text-xs"
                onClick={() => {
                  void runBatchAction("publish_reminder");
                }}
                type="button"
                disabled={batchRunning}
              >
                批量发布提醒
              </button>
              <select
                className="field w-36 px-2 py-1 text-xs"
                value={batchStatusTarget}
                onChange={(event) => setBatchStatusTarget(event.target.value as TeacherAssignmentTargetStatus)}
                disabled={batchRunning}
              >
                <option value="closed">推进为已关闭</option>
                <option value="published">推进为进行中</option>
              </select>
              <button
                className="btn-seal px-3 py-1 text-xs"
                onClick={() => {
                  void runBatchAction("advance_status");
                }}
                type="button"
                disabled={batchRunning}
              >
                批量状态推进
              </button>
              <span className="text-xs text-slate-700">已选 {selectedAssignmentIds.length} 项</span>
              <span className="text-xs text-slate-600">跨任务批处理已启用：进入任务/发布提醒/状态推进。</span>
            </div>
            {batchToast ? (
              <p className={`mt-2 text-xs ${batchToast.type === "ok" ? "text-emerald-900" : "text-rose-900"}`}>
                {batchToast.message}
              </p>
            ) : null}
            {batchResult ? (
              <div className="mt-2 rounded-lg border border-slate-300/50 bg-white/70 px-3 py-2">
                <p className="text-xs text-slate-800">
                  最近执行：{batchActionLabel(batchResult.action)} · 成功 {batchResult.succeeded} · 失败 {batchResult.failed}
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-slate-700">
                  {batchResult.results.slice(0, 5).map((item) => (
                    <li key={`${item.assignment_id}-${item.status}`}>
                      {item.title || item.assignment_id}：{item.detail}
                      {typeof item.reminder_target_count === "number" ? `（提醒目标 ${item.reminder_target_count} 人）` : ""}
                      {item.before_status && item.after_status ? `（${item.before_status} -> ${item.after_status}）` : ""}
                    </li>
                  ))}
                  {batchResult.results.length > 5 ? <li>其余 {batchResult.results.length - 5} 项已省略显示。</li> : null}
                </ul>
              </div>
            ) : null}
          </div>

          {loading ? <p className="text-sm text-slate-700">正在汇总任务优先级数据...</p> : null}
          {error ? (
            <div className="rounded-xl border border-rose-700/35 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              加载失败：{error}
            </div>
          ) : null}

          <div className="paper-card overflow-hidden">
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead className="bg-white/65 text-left text-xs text-slate-700">
                  <tr>
                    <th className="px-3 py-3">选择</th>
                    <th className="px-3 py-3">任务</th>
                    <th className="px-3 py-3">班级</th>
                    <th className="px-3 py-3">截止</th>
                    <th className="px-3 py-3">提交</th>
                    <th className="px-3 py-3">待回复</th>
                    <th className="px-3 py-3">待发布</th>
                    <th className="px-3 py-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td className="px-3 py-5 text-slate-600" colSpan={8}>
                        当前筛选下暂无任务。
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr key={row.assignmentId} className="border-t border-slate-300/40 align-top">
                        <td className="px-3 py-3">
                          <input
                            checked={selectedAssignmentIds.includes(row.assignmentId)}
                            onChange={() => toggleSelectOne(row.assignmentId)}
                            type="checkbox"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-semibold text-slate-900">{row.title}</p>
                          <p className="mt-1 text-xs text-slate-600">任务ID：{row.assignmentId}</p>
                          {row.queueLoadFailed ? (
                            <p className="mt-1 text-xs text-amber-900">队列数据读取失败，展示为基础信息。</p>
                          ) : null}
                        </td>
                        <td className="px-3 py-3">
                          <p>{row.className}</p>
                        </td>
                        <td className="px-3 py-3">
                          <DueBadge dueAt={row.dueAt} />
                          <p className="mt-1 text-xs text-slate-600">{formatDateTime(row.dueAt)}</p>
                        </td>
                        <td className="px-3 py-3">{row.submissionsCount}</td>
                        <td className="px-3 py-3">
                          <span className={row.pendingTeacherReplyCount > 0 ? "font-semibold text-rose-800" : ""}>
                            {row.pendingTeacherReplyCount}
                          </span>
                          {row.lastInteractionAt ? (
                            <p className="mt-1 text-xs text-slate-600">最近互动：{formatDateTime(row.lastInteractionAt)}</p>
                          ) : null}
                        </td>
                        <td className="px-3 py-3">
                          <p>{row.unpublishedCount}</p>
                          {row.manualDraftCount > 0 ? <p className="text-xs text-amber-900">草稿 {row.manualDraftCount}</p> : null}
                        </td>
                        <td className="px-3 py-3">
                          <Link className="underline" href={`/teacher/assignments/${row.assignmentId}`}>
                            进入批改详情
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <ul className="space-y-2 p-3 md:hidden">
              {filteredRows.length === 0 ? (
                <li className="text-sm text-slate-600">当前筛选下暂无任务。</li>
              ) : (
                filteredRows.map((row) => (
                  <li key={row.assignmentId} className="rounded-lg border border-slate-300/50 bg-white/70 p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <label className="flex items-center gap-2">
                        <input
                          checked={selectedAssignmentIds.includes(row.assignmentId)}
                          onChange={() => toggleSelectOne(row.assignmentId)}
                          type="checkbox"
                        />
                        <span className="font-semibold">{row.title}</span>
                      </label>
                      <DueBadge dueAt={row.dueAt} />
                    </div>
                    <p className="mt-1 text-xs text-slate-700">班级：{row.className}</p>
                    <p className="mt-1 text-xs text-slate-700">
                      提交 {row.submissionsCount} · 待回复 {row.pendingTeacherReplyCount} · 待发布 {row.unpublishedCount}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">截止：{formatDateTime(row.dueAt)}</p>
                    <Link className="mt-2 inline-block text-xs underline" href={`/teacher/assignments/${row.assignmentId}`}>
                      进入批改详情
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
