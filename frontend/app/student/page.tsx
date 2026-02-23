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
import { getAuthSession } from "@/lib/auth/session";
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

  const visibleAssignments = useMemo(
    () => assignmentList.filter((item) => !selectedClassId || item.class_id === selectedClassId),
    [assignmentList, selectedClassId]
  );
  const selectedAssignment = useMemo(
    () => visibleAssignments.find((item) => item.assignment_id === selectedAssignmentId) ?? null,
    [selectedAssignmentId, visibleAssignments]
  );
  const assignmentGuard = useMemo(
    () => buildAssignmentSubmissionGuard(selectedAssignment),
    [selectedAssignment]
  );

  useEffect(() => {
    if (visibleAssignments.length === 0) {
      setSelectedAssignmentId("");
      return;
    }
    const stillExists = visibleAssignments.some((item) => item.assignment_id === selectedAssignmentId);
    if (!stillExists) {
      setSelectedAssignmentId(visibleAssignments[0].assignment_id);
    }
  }, [selectedAssignmentId, visibleAssignments]);

  const selectedClassName = useMemo(
    () => classroomList.find((item) => item.class_id === selectedClassId)?.name ?? "未选择",
    [classroomList, selectedClassId]
  );

  const submissionAssignmentIdSet = useMemo(
    () => new Set(submissionList.map((item) => item.assignment_id)),
    [submissionList]
  );
  const pendingSubmissionAssignments = useMemo(
    () =>
      assignmentList.filter((item) => {
        const guard = buildAssignmentSubmissionGuard(item);
        return guard.allowed && !submissionAssignmentIdSet.has(item.assignment_id);
      }),
    [assignmentList, submissionAssignmentIdSet]
  );
  const unreadFeedbackItems = useMemo(
    () => manualFeedbackList.filter((item) => (item.unread_teacher_reply_count || 0) > 0),
    [manualFeedbackList]
  );

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
      assignment_id: selectedAssignmentId,
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
    <main className="mx-auto min-h-screen max-w-6xl p-6 md:p-10">
      <section className="poster-shell p-6 md:p-8">
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="seal-chip">学生工作台 · 入班与作文提交</span>
            <div className="flex items-center gap-3 text-sm text-slate-700">
              <Link className="underline" href="/student/progress">
                成长轨迹
              </Link>
              <Link className="underline" href="/student/feedback">
                手工批改结果{unreadTeacherReplyCount > 0 ? `（${unreadTeacherReplyCount} 条新回复）` : ""}
              </Link>
              <span>
                {currentUser.display_name} · {currentUser.phone}
              </span>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="paper-card p-4">
              <p className="label">已加入班级</p>
              <p className="mt-2 text-2xl font-semibold">{classroomList.length}</p>
            </div>
            <div className="paper-card p-4">
              <p className="label">可见任务</p>
              <p className="mt-2 text-2xl font-semibold">{visibleAssignments.length}</p>
            </div>
            <div className="paper-card p-4">
              <p className="label">历史提交</p>
              <p className="mt-2 text-2xl font-semibold">{submissionList.length}</p>
            </div>
            <div className="paper-card p-4">
              <p className="label">老师新回复</p>
              <p className="mt-2 text-2xl font-semibold">{unreadTeacherReplyCount}</p>
            </div>
          </div>

          <div className="paper-card p-4">
            <p className="label">待办优先（先做最重要的）</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-amber-700/35 bg-amber-50/80 p-3">
                <p className="text-xs font-semibold text-amber-900">待提交任务</p>
                <p className="mt-1 text-2xl font-semibold text-amber-950">{pendingSubmissionAssignments.length}</p>
                <p className="mt-1 text-xs text-amber-900">
                  {pendingSubmissionAssignments.length > 0 ? "建议先提交最近截止任务。" : "当前暂无待提交任务。"}
                </p>
                {pendingSubmissionAssignments.length > 0 ? (
                  <button
                    className="btn-seal mt-2 px-3 py-1 text-xs"
                    onClick={() => jumpToAssignmentSubmit(pendingSubmissionAssignments[0])}
                    type="button"
                  >
                    一键去提交
                  </button>
                ) : null}
              </div>
              <div className="rounded-lg border border-rose-700/35 bg-rose-50/80 p-3">
                <p className="text-xs font-semibold text-rose-900">未读反馈</p>
                <p className="mt-1 text-2xl font-semibold text-rose-950">{unreadTeacherReplyCount}</p>
                <p className="mt-1 text-xs text-rose-900">进入反馈页，优先查看老师刚发布的内容。</p>
                <Link
                  className="btn-ink mt-2 inline-block px-3 py-1 text-xs"
                  href="/student/feedback"
                  onClick={() =>
                    trackUxEventSafe({
                      event_name: "student_todo_card_click",
                      event_category: "action",
                      page: "/student",
                      properties: { todo_type: "unread_feedback" }
                    })
                  }
                >
                  去看反馈
                </Link>
              </div>
              <div className="rounded-lg border border-emerald-700/35 bg-emerald-50/80 p-3">
                <p className="text-xs font-semibold text-emerald-900">待回复老师</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-950">{unreadFeedbackItems.length}</p>
                <p className="mt-1 text-xs text-emerald-900">收到新回复后，建议当天完成追问或确认。</p>
                <Link
                  className="btn-seal mt-2 inline-block px-3 py-1 text-xs"
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
            </div>
            {pendingSubmissionAssignments.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-slate-700">
                {pendingSubmissionAssignments.slice(0, 3).map((item) => (
                  <li key={item.assignment_id}>
                    {item.title}
                    {item.due_at
                      ? `（截止 ${new Date(item.due_at).toLocaleString("zh-CN", { hour12: false })}）`
                      : "（未设置截止时间）"}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="paper-card p-4">
            <p className="label">快捷导航</p>
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              <a className="rounded-full border border-slate-300/60 bg-white/70 px-3 py-1" href="#join-class">
                加入班级
              </a>
              <a className="rounded-full border border-slate-300/60 bg-white/70 px-3 py-1" href="#submit-composition">
                提交作文
              </a>
              <a className="rounded-full border border-slate-300/60 bg-white/70 px-3 py-1" href="#visible-tasks">
                查看任务
              </a>
              <a className="rounded-full border border-slate-300/60 bg-white/70 px-3 py-1" href="#my-submissions">
                查看提交
              </a>
              <Link className="rounded-full border border-emerald-700/35 bg-emerald-50 px-3 py-1" href="/student/feedback">
                去看批改反馈{unreadTeacherReplyCount > 0 ? ` (${unreadTeacherReplyCount})` : ""}
              </Link>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <form className="paper-card space-y-4 p-5" id="join-class" onSubmit={onJoinClass}>
              <h1 className="poster-title text-3xl font-bold">1) 输入班级码加入课堂</h1>

              <div>
                <p className="label">学生姓名</p>
                <input className="field mt-1" value={studentName} onChange={(event) => setStudentName(event.target.value)} />
              </div>

              <div>
                <p className="label">班级码</p>
                <input
                  className="field mt-1 uppercase tracking-[0.2em]"
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value)}
                  placeholder="例如 ABC123"
                />
              </div>

              <button className="btn-seal w-full text-sm" type="submit" disabled={busy === "join"}>
                {busy === "join" ? "加入中..." : "加入班级"}
              </button>
            </form>

            <form className="paper-card space-y-4 p-5" id="submit-composition" onSubmit={onSubmitComposition}>
              <h2 className="poster-title text-3xl font-bold">2) 提交作文</h2>

              <div>
                <p className="label">已加入班级</p>
                <select
                  className="field mt-1"
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
                <p className="label">可见任务</p>
                <select
                  className="field mt-1"
                  value={selectedAssignmentId}
                  onChange={(event) => setSelectedAssignmentId(event.target.value)}
                >
                  <option value="">请选择任务</option>
                  {visibleAssignments.map((item) => {
                    const guard = buildAssignmentSubmissionGuard(item);
                    return (
                      <option key={item.assignment_id} value={item.assignment_id}>
                        {item.title}
                        {guard.overdue ? "（已截止）" : item.status !== "published" ? "（未发布）" : ""}
                      </option>
                    );
                  })}
                </select>
                <p className="mt-2 text-xs text-slate-600">
                  {selectedAssignment
                    ? `截止时间：${selectedAssignment.due_at ? new Date(selectedAssignment.due_at).toLocaleString("zh-CN", { hour12: false }) : "未设置"}`
                    : "请选择任务后查看截止时间。"}
                </p>
                {!assignmentGuard.allowed && assignmentGuard.reason ? (
                  <p className="mt-1 text-xs text-rose-700">{assignmentGuard.reason}</p>
                ) : null}
              </div>

              <div>
                <p className="label">提交格式</p>
                <select
                  className="field mt-1"
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
                  <p className="label">正文内容</p>
                  <textarea
                    className="field mt-1 min-h-28"
                    value={textContent}
                    onChange={(event) => setTextContent(event.target.value)}
                  />
                </div>
              ) : (
                <div>
                  <p className="label">上传文件</p>
                  <input
                    className="field mt-1"
                    type="file"
                    accept={submissionType === "image" ? "image/*" : ".doc,.docx,.pdf,.txt,.md"}
                    onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                  />
                  <p className="mt-2 text-xs text-slate-600">
                    支持 10MB 以内文件；图片仅支持 jpg/jpeg/png/webp/gif，文档支持 doc/docx/pdf/txt/md。
                  </p>
                </div>
              )}

              <button className="btn-ink w-full text-sm" type="submit" disabled={busy === "submit" || !assignmentGuard.allowed}>
                {busy === "submit" ? "提交中..." : "提交作文"}
              </button>
            </form>
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

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="paper-card p-4" id="joined-classes">
              <p className="label">已加入班级</p>
              <ul className="mt-2 space-y-2 text-sm">
                {classroomList.length === 0 ? (
                  <li className="text-slate-600">你还没有加入任何班级。</li>
                ) : (
                  classroomList.map((room) => (
                    <li key={room.class_id} className="rounded-lg border border-slate-300/50 bg-white/60 px-3 py-2">
                      <p className="font-semibold">{room.name}</p>
                      <p className="text-xs text-slate-700">学段：{room.grade_band === "primary" ? "小学" : "初中"}</p>
                      <p className="text-xs text-slate-700">班级编号：{room.class_id}</p>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className="paper-card p-4" id="visible-tasks">
              <p className="label">当前班级任务</p>
              <div className="mt-2 space-y-2 text-sm">
                <p>当前选中班级：{selectedClassName}</p>
                <ul className="space-y-2">
                  {visibleAssignments.length === 0 ? (
                    <li className="text-slate-600">当前班级暂无任务。</li>
                  ) : (
                    visibleAssignments.slice(0, 6).map((item) => {
                      const guard = buildAssignmentSubmissionGuard(item);
                      return (
                        <li key={item.assignment_id} className="rounded-lg border border-slate-300/50 bg-white/60 px-3 py-2">
                          <p className="font-semibold">
                            {item.title}
                            {guard.overdue ? "（已截止）" : item.status !== "published" ? "（未发布）" : ""}
                          </p>
                          <p className="text-xs text-slate-700">任务ID：{item.assignment_id}</p>
                          <p className="text-xs text-slate-700">状态：{item.status}</p>
                          <p className="text-xs text-slate-700">
                            截止：{item.due_at ? new Date(item.due_at).toLocaleString("zh-CN", { hour12: false }) : "未设置"}
                          </p>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            </div>
            <div className="paper-card p-4" id="my-submissions">
              <p className="label">我的最近提交</p>
              <ul className="mt-2 space-y-2 text-sm">
                {submissionList.length === 0 ? (
                  <li className="text-slate-600">暂无提交记录。</li>
                ) : (
                  submissionList.slice(0, 8).map((item) => (
                    <li key={item.submission_id} className="rounded-lg border border-slate-300/50 bg-white/60 px-3 py-2">
                      <p className="font-semibold">{item.assignment_title}</p>
                      <p className="text-xs text-slate-700">提交ID：{item.submission_id}</p>
                      <p className="text-xs text-slate-700">
                        班级：{item.class_name} · 类型：{item.content_type} · 状态：{item.status}
                      </p>
                      <p className="text-xs text-slate-700">
                        提交时间：{new Date(item.created_at).toLocaleString("zh-CN", { hour12: false })}
                      </p>
                      {item.text_excerpt ? <p className="mt-1 text-xs text-slate-700">摘要：{item.text_excerpt}</p> : null}
                      {item.file_url ? (
                        <p className="mt-1 text-xs text-slate-700">
                          文件：
                          <a className="underline" href={item.file_url} target="_blank" rel="noreferrer">
                            {item.file_name || "查看文件"}
                          </a>
                        </p>
                      ) : null}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
