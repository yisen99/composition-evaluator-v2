"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  createCompositionSubmission,
  joinClass,
  listAssignments,
  listClasses,
  listMyManualFeedback,
  listMySubmissions
} from "@/lib/api/client";
import { trackUxEventSafe } from "@/lib/analytics/tracker";
import { clearAuthSession, getAuthSession } from "@/lib/auth/session";
import { buildAssignmentSubmissionGuard } from "@/lib/submission/assignment-guard";
import { validateSubmissionDraft } from "@/lib/submission/validation";
import type {
  AssignmentListItem,
  ClassListItem,
  StudentManualFeedbackItem,
  StudentSubmissionListItem,
  SubmissionContentType,
  UserProfile
} from "@/lib/api/types";

type Toast = {
  type: "ok" | "error";
  message: string;
};

function toMillis(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function sortByDueAt(assignmentList: AssignmentListItem[]): AssignmentListItem[] {
  return [...assignmentList].sort((a, b) => {
    const dueA = toMillis(a.due_at);
    const dueB = toMillis(b.due_at);
    if (dueA !== null && dueB !== null) {
      return dueA - dueB;
    }
    if (dueA !== null) {
      return -1;
    }
    if (dueB !== null) {
      return 1;
    }
    return a.assignment_id.localeCompare(b.assignment_id);
  });
}

export default function StudentPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [studentName, setStudentName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [result, setResult] = useState<{ class_id: string; class_name: string } | null>(null);
  const [classroomList, setClassroomList] = useState<ClassListItem[]>([]);
  const [assignmentList, setAssignmentList] = useState<AssignmentListItem[]>([]);
  const [submissionList, setSubmissionList] = useState<StudentSubmissionListItem[]>([]);
  const [manualFeedbackList, setManualFeedbackList] = useState<StudentManualFeedbackItem[]>([]);
  const [unreadTeacherReplyCount, setUnreadTeacherReplyCount] = useState(0);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [submissionType, setSubmissionType] = useState<SubmissionContentType>("text");
  const [textContent, setTextContent] = useState("今天我在校园里看到了第一朵迎春花。");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<"join" | "loading" | "submit" | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    const session = getAuthSession();
    setCurrentUser(session?.user ?? null);
    setStudentName(session?.user.display_name ?? "");
  }, []);

  const hydrateWorkspace = async () => {
    setBusy("loading");
    try {
      const [loadedClasses, loadedAssignments, loadedSubmissions, loadedManualFeedback] = await Promise.all([
        listClasses(),
        listAssignments(),
        listMySubmissions(),
        listMyManualFeedback()
      ]);
      setClassroomList(loadedClasses);
      setAssignmentList(loadedAssignments);
      setSubmissionList(loadedSubmissions);
      setManualFeedbackList(loadedManualFeedback);
      setUnreadTeacherReplyCount(
        loadedManualFeedback.reduce((sum, item) => sum + (item.unread_teacher_reply_count || 0), 0)
      );
      setSelectedClassId((prev) => prev || loadedClasses[0]?.class_id || "");
      trackUxEventSafe({
        event_name: "student_workspace_view",
        event_category: "page_view",
        page: "/student",
        properties: {
          class_count: loadedClasses.length,
          assignment_count: loadedAssignments.length,
          submission_count: loadedSubmissions.length,
          unread_reply_count: loadedManualFeedback.reduce((sum, item) => sum + (item.unread_teacher_reply_count || 0), 0)
        }
      });
    } catch (error) {
      setToast({ type: "error", message: `数据加载失败：${(error as Error).message}` });
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    if (!currentUser || currentUser.role !== "student") {
      return;
    }
    void hydrateWorkspace();
  }, [currentUser]);

  const sortedAssignments = useMemo(
    () => sortByDueAt(assignmentList),
    [assignmentList]
  );
  const submissionAssignmentIdSet = useMemo(
    () => new Set(submissionList.map((item) => item.assignment_id)),
    [submissionList]
  );
  const pendingSubmissionAssignments = useMemo(
    () =>
      sortedAssignments.filter((item) => {
        const guard = buildAssignmentSubmissionGuard(item);
        return guard.allowed && !submissionAssignmentIdSet.has(item.assignment_id);
      }),
    [sortedAssignments, submissionAssignmentIdSet]
  );
  const visibleAssignments = useMemo(
    () => sortedAssignments.filter((item) => !selectedClassId || item.class_id === selectedClassId),
    [selectedClassId, sortedAssignments]
  );
  const pendingVisibleAssignments = useMemo(
    () =>
      pendingSubmissionAssignments.filter(
        (item) => !selectedClassId || item.class_id === selectedClassId
      ),
    [pendingSubmissionAssignments, selectedClassId]
  );
  const selectedAssignment = useMemo(
    () => sortedAssignments.find((item) => item.assignment_id === selectedAssignmentId) ?? null,
    [selectedAssignmentId, sortedAssignments]
  );
  const selectedAssignmentAlreadySubmitted = useMemo(
    () =>
      Boolean(
        selectedAssignment &&
          submissionAssignmentIdSet.has(selectedAssignment.assignment_id)
      ),
    [selectedAssignment, submissionAssignmentIdSet]
  );
  const assignmentGuard = useMemo(
    () => buildAssignmentSubmissionGuard(selectedAssignment),
    [selectedAssignment]
  );
  const canSubmitSelectedAssignment = Boolean(selectedAssignment) && assignmentGuard.allowed && !selectedAssignmentAlreadySubmitted;

  useEffect(() => {
    if (pendingVisibleAssignments.length > 0) {
      const stillExists = pendingVisibleAssignments.some((item) => item.assignment_id === selectedAssignmentId);
      if (!stillExists) {
        setSelectedAssignmentId(pendingVisibleAssignments[0].assignment_id);
      }
      return;
    }
    if (visibleAssignments.length > 0) {
      const stillExists = visibleAssignments.some((item) => item.assignment_id === selectedAssignmentId);
      if (!stillExists) {
        setSelectedAssignmentId(visibleAssignments[0].assignment_id);
      }
      return;
    }
    if (selectedAssignmentId) {
      setSelectedAssignmentId("");
    }
  }, [pendingVisibleAssignments, selectedAssignmentId, visibleAssignments]);

  const selectedClassName = useMemo(
    () => classroomList.find((item) => item.class_id === selectedClassId)?.name ?? "未选择",
    [classroomList, selectedClassId]
  );
  const unreadFeedbackItems = useMemo(
    () => manualFeedbackList.filter((item) => (item.unread_teacher_reply_count || 0) > 0),
    [manualFeedbackList]
  );
  const averageManualScore = useMemo(() => {
    if (manualFeedbackList.length === 0) {
      return null;
    }
    const total = manualFeedbackList.reduce((sum, item) => sum + item.manual_total_score, 0);
    return (total / manualFeedbackList.length).toFixed(1);
  }, [manualFeedbackList]);
  const monthSubmissionCount = useMemo(() => {
    const now = new Date();
    return submissionList.filter((item) => {
      const createdAt = new Date(item.created_at);
      return createdAt.getFullYear() === now.getFullYear() && createdAt.getMonth() === now.getMonth();
    }).length;
  }, [submissionList]);

  const jumpToAssignmentSubmit = (assignment: AssignmentListItem) => {
    setSelectedClassId(assignment.class_id);
    setSelectedAssignmentId(assignment.assignment_id);
    trackUxEventSafe({
      event_name: "student_todo_card_click",
      event_category: "action",
      page: "/student",
      properties: {
        todo_type: "pending_submission",
        assignment_id: assignment.assignment_id
      }
    });
    document.getElementById("submit-composition")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const onJoinClass = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy("join");
    setToast(null);
    setResult(null);
    try {
      const joined = await joinClass({
        join_code: joinCode.trim().toUpperCase(),
        student_name: studentName.trim() || undefined
      });
      setResult(joined);
      setJoinCode("");
      setToast({ type: "ok", message: `加入成功：${joined.class_name}` });
      await hydrateWorkspace();
      setSelectedClassId(joined.class_id);
    } catch (joinError) {
      setToast({ type: "error", message: `加入失败：${(joinError as Error).message}` });
    } finally {
      setBusy(null);
    }
  };

  const onSubmitComposition = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedAssignment) {
      setToast({ type: "error", message: "请先选择一个待提交任务。" });
      return;
    }
    if (selectedAssignmentAlreadySubmitted) {
      setToast({ type: "error", message: "该任务已提交，请选择未提交任务。" });
      return;
    }
    if (!assignmentGuard.allowed) {
      setToast({ type: "error", message: assignmentGuard.reason || "当前任务不可提交。" });
      return;
    }
    const validationError = validateSubmissionDraft({
      submissionType,
      textContent,
      uploadFile
    });
    if (validationError) {
      setToast({ type: "error", message: validationError });
      return;
    }

    const payload: {
      assignment_id: string;
      content_type: SubmissionContentType;
      text_content?: string;
      file?: File;
    } = {
      assignment_id: selectedAssignment.assignment_id,
      content_type: submissionType
    };

    if (submissionType === "text") {
      const normalizedText = textContent.trim();
      payload.text_content = normalizedText;
    } else if (uploadFile) {
      payload.file = uploadFile;
    }

    setBusy("submit");
    setToast(null);
    try {
      const submitted = await createCompositionSubmission(payload);
      setToast({ type: "ok", message: `提交成功，提交编号：${submitted.submission_id}` });
      setUploadFile(null);
      await hydrateWorkspace();
    } catch (error) {
      setToast({ type: "error", message: `提交失败：${(error as Error).message}` });
    } finally {
      setBusy(null);
    }
  };

  if (!currentUser || currentUser.role !== "student") {
    return (
      <main className="mx-auto min-h-screen max-w-4xl p-6 md:p-10">
        <section className="poster-shell p-6 md:p-8">
          <div className="relative z-10 paper-card p-5">
            <h1 className="poster-title text-3xl font-bold">学生页面需要学生登录</h1>
            <p className="mt-2 text-sm text-slate-700">请先登录为学生账号，再输入班级码加入班级。</p>
            <a className="btn-seal mt-4 inline-block text-sm" href="/login/student?next=%2Fstudent">
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
            <Link className="block rounded-xl bg-indigo-50 px-4 py-3 font-semibold text-indigo-700" href="/student">
              我的工作台
            </Link>
            <Link className="block rounded-xl px-4 py-3 text-slate-600 transition hover:bg-slate-100" href="/student/progress">
              成长轨迹
            </Link>
            <Link className="block rounded-xl px-4 py-3 text-slate-600 transition hover:bg-slate-100" href="/student/feedback">
              批改反馈{unreadTeacherReplyCount > 0 ? ` (${unreadTeacherReplyCount})` : ""}
            </Link>
          </nav>
          <div className="mt-auto border-t border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-800">{currentUser.display_name}</p>
            <p className="text-sm text-slate-500">学生</p>
            <button
              className="mt-3 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
              onClick={() => {
                clearAuthSession();
                window.location.href = "/login/student";
              }}
              type="button"
            >
              退出登录
            </button>
          </div>
        </aside>

        <section className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white/90 px-5 py-5 shadow-[0_16px_42px_rgba(15,23,42,0.1)] md:px-8">
            <h1 className="text-5xl font-bold tracking-tight text-slate-900">你好，{currentUser.display_name}</h1>
            <p className="mt-2 text-2xl text-slate-500">今天有 {pendingSubmissionAssignments.length} 个任务待完成</p>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-4xl font-bold text-slate-900">待提交任务</h2>
                  <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">优先处理</span>
                </div>
                {pendingSubmissionAssignments.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 p-8 text-center text-2xl text-emerald-700">
                    所有任务已完成，太棒了！
                  </div>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {pendingSubmissionAssignments.slice(0, 4).map((item) => (
                      <li key={item.assignment_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-xl font-bold text-slate-900">{item.title}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {item.due_at
                                ? `截止 ${new Date(item.due_at).toLocaleString("zh-CN", { hour12: false })}`
                                : "未设置截止时间"}
                            </p>
                          </div>
                          <button
                            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                            onClick={() => jumpToAssignmentSubmit(item)}
                            type="button"
                          >
                            去提交
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-4xl font-bold text-slate-900">最近反馈</h2>
                <ul className="mt-4 space-y-3">
                  {manualFeedbackList.length === 0 ? (
                    <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      还没有老师发布的批改，先完成提交任务。
                    </li>
                  ) : (
                    manualFeedbackList.slice(0, 2).map((item) => (
                      <li key={item.submission_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="rounded-2xl bg-emerald-100 px-3 py-2 text-2xl font-bold text-emerald-700">
                              {item.manual_total_score}
                            </span>
                            <div>
                              <p className="text-xl font-bold text-slate-900">{item.assignment_title}</p>
                              <p className="text-sm text-slate-500">{item.summary_feedback}</p>
                            </div>
                          </div>
                          <Link className="text-sm font-semibold text-indigo-600 hover:underline" href="/student/feedback">
                            查看详情
                          </Link>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-blue-600 p-5 text-white shadow-[0_16px_34px_rgba(79,70,229,0.35)]">
                <h2 className="text-3xl font-bold">成长概览</h2>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl bg-white/10 px-4 py-4">
                    <p className="text-sm text-white/80">平均得分</p>
                    <p className="text-5xl font-bold">{averageManualScore ?? "--"}</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-4 py-4">
                    <p className="text-sm text-white/80">本月提交</p>
                    <p className="text-5xl font-bold">{monthSubmissionCount} 篇</p>
                  </div>
                  <Link className="inline-block text-sm font-semibold underline" href="/student/progress">
                    查看详细成长轨迹
                  </Link>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-3xl font-bold text-slate-900">待回复老师</h2>
                {unreadFeedbackItems.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">当前没有新的老师回复。</p>
                ) : (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xl font-bold text-slate-900">{unreadFeedbackItems[0].assignment_title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      有 {unreadFeedbackItems[0].unread_teacher_reply_count || 0} 条新回复，建议优先沟通。
                    </p>
                    <Link
                      className="mt-2 inline-block text-sm font-semibold text-indigo-600 hover:underline"
                      href="/student/feedback"
                      onClick={() =>
                        trackUxEventSafe({
                          event_name: "student_todo_card_click",
                          event_category: "action",
                          page: "/student",
                          properties: { todo_type: "pending_reply" }
                        })
                      }
                    >
                      去回复老师
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {result ? (
            <div className="rounded-xl border border-emerald-700/35 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              加入成功：{result.class_name}（班级编号：{result.class_id}）
            </div>
          ) : null}

          {toast ? (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                toast.type === "ok"
                  ? "border-emerald-700/35 bg-emerald-50 text-emerald-900"
                  : "border-rose-700/35 bg-rose-50 text-rose-900"
              }`}
            >
              {toast.message}
            </div>
          ) : null}

          {busy === "loading" ? <p className="text-sm text-slate-700">正在同步班级与任务列表...</p> : null}

          <div className="grid gap-4 xl:grid-cols-2">
            <form className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" id="join-class" onSubmit={onJoinClass}>
              <h3 className="text-3xl font-bold text-slate-900">加入班级</h3>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">学生姓名</p>
                  <input className="field rounded-xl border-slate-300 bg-white" value={studentName} onChange={(event) => setStudentName(event.target.value)} />
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">班级码</p>
                  <input
                    className="field rounded-xl border-slate-300 bg-white uppercase tracking-[0.2em]"
                    value={joinCode}
                    onChange={(event) => setJoinCode(event.target.value)}
                    placeholder="例如 ABC123"
                  />
                </div>
                <button className="h-12 w-full rounded-xl bg-indigo-600 text-sm font-semibold text-white" type="submit" disabled={busy === "join"}>
                  {busy === "join" ? "加入中..." : "加入班级"}
                </button>
              </div>
            </form>

            <form className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" id="submit-composition" onSubmit={onSubmitComposition}>
              <h3 className="text-3xl font-bold text-slate-900">提交作文</h3>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">已加入班级</p>
                  <select
                    className="field rounded-xl border-slate-300 bg-white"
                    value={selectedClassId}
                    onChange={(event) => setSelectedClassId(event.target.value)}
                  >
                    <option value="">请选择班级</option>
                    {classroomList.map((room) => (
                      <option key={room.class_id} value={room.class_id}>
                        {room.name} · {room.join_code}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">待提交任务</p>
                  <select
                    className="field rounded-xl border-slate-300 bg-white"
                    value={selectedAssignmentId}
                    onChange={(event) => setSelectedAssignmentId(event.target.value)}
                  >
                    {pendingVisibleAssignments.length === 0 ? (
                      <option value="">当前班级暂无待提交任务</option>
                    ) : (
                      <option value="">请选择任务</option>
                    )}
                    {pendingVisibleAssignments.map((item) => {
                      const guard = buildAssignmentSubmissionGuard(item);
                      return (
                        <option key={item.assignment_id} value={item.assignment_id}>
                          {item.title}
                          {guard.overdue ? "（已截止）" : item.status !== "published" ? "（未发布）" : ""}
                        </option>
                      );
                    })}
                  </select>
                  <p className="mt-2 text-xs text-slate-500">
                    {selectedAssignment
                      ? `截止时间：${selectedAssignment.due_at ? new Date(selectedAssignment.due_at).toLocaleString("zh-CN", { hour12: false }) : "未设置"}`
                      : "请选择任务后查看截止时间。"}
                  </p>
                  {!assignmentGuard.allowed && assignmentGuard.reason ? (
                    <p className="mt-1 text-xs text-rose-700">{assignmentGuard.reason}</p>
                  ) : null}
                  {selectedAssignmentAlreadySubmitted ? (
                    <p className="mt-1 text-xs text-rose-700">该任务已提交，请选择未提交任务。</p>
                  ) : null}
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">提交格式</p>
                  <select
                    className="field rounded-xl border-slate-300 bg-white"
                    value={submissionType}
                    onChange={(event) => {
                      setSubmissionType(event.target.value as SubmissionContentType);
                      setUploadFile(null);
                    }}
                  >
                    <option value="text">文本（text）</option>
                    <option value="image">图片（image）</option>
                    <option value="document">文档（document）</option>
                  </select>
                </div>

                {submissionType === "text" ? (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">正文内容</p>
                    <textarea
                      className="field min-h-28 rounded-xl border-slate-300 bg-white"
                      value={textContent}
                      onChange={(event) => setTextContent(event.target.value)}
                    />
                  </div>
                ) : (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">上传文件</p>
                    <input
                      className="field rounded-xl border-slate-300 bg-white"
                      type="file"
                      accept={submissionType === "image" ? "image/*" : ".doc,.docx,.pdf,.txt,.md"}
                      onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      支持 10MB 以内文件；图片支持 jpg/jpeg/png/webp/gif，文档支持 doc/docx/pdf/txt/md。
                    </p>
                  </div>
                )}

                <button
                  className="h-12 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-sm font-semibold text-white"
                  type="submit"
                  disabled={busy === "submit" || !canSubmitSelectedAssignment}
                >
                  {busy === "submit" ? "提交中..." : canSubmitSelectedAssignment ? "提交作文" : "暂无可提交任务"}
                </button>
              </div>
            </form>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" id="joined-classes">
              <p className="text-sm font-semibold text-slate-700">已加入班级</p>
              <ul className="mt-3 space-y-2 text-sm">
                {classroomList.length === 0 ? (
                  <li className="text-slate-500">你还没有加入任何班级。</li>
                ) : (
                  classroomList.map((room) => (
                    <li key={room.class_id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="font-semibold">{room.name}</p>
                      <p className="text-xs text-slate-500">学段：{room.grade_band === "primary" ? "小学" : "初中"}</p>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" id="visible-tasks">
              <p className="text-sm font-semibold text-slate-700">当前班级待提交任务</p>
              <p className="mt-2 text-xs text-slate-500">当前选中班级：{selectedClassName}</p>
              <ul className="mt-3 space-y-2 text-sm">
                {pendingVisibleAssignments.length === 0 ? (
                  <li className="text-slate-500">当前班级暂无待提交任务。</li>
                ) : (
                  pendingVisibleAssignments.slice(0, 6).map((item) => {
                    const guard = buildAssignmentSubmissionGuard(item);
                    return (
                      <li key={item.assignment_id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="font-semibold">
                          {item.title}
                          {guard.overdue ? "（已截止）" : item.status !== "published" ? "（未发布）" : ""}
                        </p>
                        <p className="text-xs text-slate-500">
                          截止：{item.due_at ? new Date(item.due_at).toLocaleString("zh-CN", { hour12: false }) : "未设置"}
                        </p>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" id="my-submissions">
              <p className="text-sm font-semibold text-slate-700">我的最近提交</p>
              <ul className="mt-3 space-y-2 text-sm">
                {submissionList.length === 0 ? (
                  <li className="text-slate-500">暂无提交记录。</li>
                ) : (
                  submissionList.slice(0, 8).map((item) => (
                    <li key={item.submission_id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="font-semibold">{item.assignment_title}</p>
                      <p className="text-xs text-slate-500">
                        班级：{item.class_name} · 状态：{item.status}
                      </p>
                      <p className="text-xs text-slate-500">
                        提交时间：{new Date(item.created_at).toLocaleString("zh-CN", { hour12: false })}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
