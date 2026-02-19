"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { createCompositionSubmission, joinClass, listAssignments, listClasses } from "@/lib/api/client";
import { clearAuthSession, getAuthSession } from "@/lib/auth/session";
import type { AssignmentListItem, ClassListItem, SubmissionContentType, UserProfile } from "@/lib/api/types";

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
      const [loadedClasses, loadedAssignments] = await Promise.all([listClasses(), listAssignments()]);
      setClassroomList(loadedClasses);
      setAssignmentList(loadedAssignments);
      setSelectedClassId((prev) => prev || loadedClasses[0]?.class_id || "");
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
    if (!selectedAssignmentId) {
      setToast({ type: "error", message: "请先选择要提交的任务。" });
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
      if (!normalizedText) {
        setToast({ type: "error", message: "文本内容不能为空。" });
        return;
      }
      payload.text_content = normalizedText;
    } else if (!uploadFile) {
      setToast({ type: "error", message: "图片/文档提交需要先选择文件。" });
      return;
    } else {
      payload.file = uploadFile;
    }

    setBusy("submit");
    setToast(null);
    try {
      const submitted = await createCompositionSubmission(payload);
      setToast({ type: "ok", message: `提交成功，提交ID：${submitted.submission_id}` });
      setUploadFile(null);
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
              <span>
                {currentUser.display_name} · {currentUser.phone}
              </span>
              <button
                className="underline"
                onClick={() => {
                  clearAuthSession();
                  window.location.href = "/login/student";
                }}
                type="button"
              >
                退出登录
              </button>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <form className="paper-card space-y-4 p-5" onSubmit={onJoinClass}>
              <h1 className="poster-title text-3xl font-bold">1) 输入班级码加入课堂</h1>

              <div>
                <p className="label">Student Name</p>
                <input className="field mt-1" value={studentName} onChange={(event) => setStudentName(event.target.value)} />
              </div>

              <div>
                <p className="label">Join Code</p>
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

            <form className="paper-card space-y-4 p-5" onSubmit={onSubmitComposition}>
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
                  {visibleAssignments.map((item) => (
                    <option key={item.assignment_id} value={item.assignment_id}>
                      {item.title}
                    </option>
                  ))}
                </select>
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
                    accept={submissionType === "image" ? "image/*" : ".doc,.docx,.pdf,.txt"}
                    onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                  />
                </div>
              )}

              <button className="btn-ink w-full text-sm" type="submit" disabled={busy === "submit"}>
                {busy === "submit" ? "提交中..." : "提交作文"}
              </button>
            </form>
          </div>

          {result ? (
            <div className="rounded-xl border border-emerald-700/35 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              加入成功：{result.class_name}（Class ID: {result.class_id}）
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
            <div className="paper-card p-4">
              <p className="label">已加入班级</p>
              <ul className="mt-2 space-y-2 text-sm">
                {classroomList.length === 0 ? (
                  <li className="text-slate-600">你还没有加入任何班级。</li>
                ) : (
                  classroomList.map((room) => (
                    <li key={room.class_id} className="rounded-lg border border-slate-300/50 bg-white/60 px-3 py-2">
                      <p className="font-semibold">{room.name}</p>
                      <p className="text-xs text-slate-700">学段：{room.grade_band === "primary" ? "小学" : "初中"}</p>
                      <p className="text-xs text-slate-700">Class ID: {room.class_id}</p>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className="paper-card p-4">
              <p className="label">当前班级任务</p>
              <div className="mt-2 space-y-2 text-sm">
                <p>当前选中班级：{selectedClassName}</p>
                <ul className="space-y-2">
                  {visibleAssignments.length === 0 ? (
                    <li className="text-slate-600">当前班级暂无任务。</li>
                  ) : (
                    visibleAssignments.slice(0, 6).map((item) => (
                      <li key={item.assignment_id} className="rounded-lg border border-slate-300/50 bg-white/60 px-3 py-2">
                        <p className="font-semibold">{item.title}</p>
                        <p className="text-xs text-slate-700">任务ID：{item.assignment_id}</p>
                        <p className="text-xs text-slate-700">状态：{item.status}</p>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
