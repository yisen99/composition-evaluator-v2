"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { createAssignment, createClass } from "@/lib/api/client";
import { clearAuthSession, getAuthSession } from "@/lib/auth/session";
import type { CreateClassResponse, GradeBand, UserProfile } from "@/lib/api/types";

type Toast = {
  type: "ok" | "error";
  message: string;
};

export default function TeacherPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [className, setClassName] = useState("三年级一班");
  const [gradeBand, setGradeBand] = useState<GradeBand>("primary");
  const [classroomList, setClassroomList] = useState<Array<CreateClassResponse & { name: string }>>([]);
  const [selectedClassId, setSelectedClassId] = useState("");

  const [assignmentTitle, setAssignmentTitle] = useState("我的家乡");
  const [assignmentPrompt, setAssignmentPrompt] = useState("请写一篇介绍家乡景色与人情的作文，600字左右。");
  const [dueAt, setDueAt] = useState("");
  const [latestAssignmentId, setLatestAssignmentId] = useState("");

  const [busy, setBusy] = useState<"class" | "assignment" | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    const session = getAuthSession();
    setCurrentUser(session?.user ?? null);
  }, []);

  const selectedClassName = useMemo(
    () => classroomList.find((item) => item.class_id === selectedClassId)?.name ?? "",
    [classroomList, selectedClassId]
  );

  const onCreateClass = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy("class");
    setToast(null);
    try {
      const created = await createClass({
        name: className.trim(),
        grade_band: gradeBand
      });
      const row = { ...created, name: className.trim() };
      setClassroomList((prev) => [row, ...prev]);
      setSelectedClassId((prev) => (prev ? prev : created.class_id));
      setToast({ type: "ok", message: `建班成功，班级码：${created.join_code}` });
    } catch (error) {
      setToast({ type: "error", message: `建班失败：${(error as Error).message}` });
    } finally {
      setBusy(null);
    }
  };

  const onCreateAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedClassId) {
      setToast({ type: "error", message: "请先创建班级或选择班级。" });
      return;
    }
    setBusy("assignment");
    setToast(null);
    try {
      const payload = {
        class_id: selectedClassId,
        title: assignmentTitle.trim(),
        prompt: assignmentPrompt.trim(),
        due_at: dueAt ? new Date(dueAt).toISOString() : undefined
      };
      const created = await createAssignment(payload);
      setLatestAssignmentId(created.assignment_id);
      setToast({ type: "ok", message: `任务发布成功，任务ID：${created.assignment_id}` });
    } catch (error) {
      setToast({ type: "error", message: `发布失败：${(error as Error).message}` });
    } finally {
      setBusy(null);
    }
  };

  if (!currentUser || currentUser.role !== "teacher") {
    return (
      <main className="mx-auto min-h-screen max-w-4xl p-6 md:p-10">
        <section className="poster-shell p-6 md:p-8">
          <div className="relative z-10 paper-card p-5">
            <h1 className="poster-title text-3xl font-bold">老师页面需要教师登录</h1>
            <p className="mt-2 text-sm text-slate-700">请先登录为老师账号，再进行建班与任务发布操作。</p>
            <a className="btn-ink mt-4 inline-block text-sm" href="/login">
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
            <span className="seal-chip">教师工作台 · 建班与任务发布</span>
            <div className="flex items-center gap-3 text-sm text-slate-700">
              <span>
                {currentUser.display_name} · {currentUser.phone}
              </span>
              <button
                className="underline"
                onClick={() => {
                  clearAuthSession();
                  window.location.href = "/login";
                }}
                type="button"
              >
                退出登录
              </button>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <form className="paper-card space-y-4 p-5" onSubmit={onCreateClass}>
              <h2 className="poster-title text-2xl font-semibold">1) 建立班级</h2>

              <div>
                <p className="label">Class Name</p>
                <input className="field mt-1" value={className} onChange={(event) => setClassName(event.target.value)} />
              </div>

              <div>
                <p className="label">Grade Band</p>
                <select
                  className="field mt-1"
                  value={gradeBand}
                  onChange={(event) => setGradeBand(event.target.value as GradeBand)}
                >
                  <option value="primary">小学（primary）</option>
                  <option value="junior">初中（junior）</option>
                </select>
              </div>

              <button className="btn-ink w-full text-sm" type="submit" disabled={busy === "class"}>
                {busy === "class" ? "建班中..." : "创建班级并生成班级码"}
              </button>
            </form>

            <form className="paper-card space-y-4 p-5" onSubmit={onCreateAssignment}>
              <h2 className="poster-title text-2xl font-semibold">2) 发布作文任务</h2>

              <div>
                <p className="label">Target Class</p>
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
                <p className="label">Title</p>
                <input
                  className="field mt-1"
                  value={assignmentTitle}
                  onChange={(event) => setAssignmentTitle(event.target.value)}
                />
              </div>

              <div>
                <p className="label">Prompt</p>
                <textarea
                  className="field mt-1 min-h-28"
                  value={assignmentPrompt}
                  onChange={(event) => setAssignmentPrompt(event.target.value)}
                />
              </div>

              <div>
                <p className="label">Due At</p>
                <input
                  className="field mt-1"
                  type="datetime-local"
                  value={dueAt}
                  onChange={(event) => setDueAt(event.target.value)}
                />
              </div>

              <button className="btn-seal w-full text-sm" type="submit" disabled={busy === "assignment"}>
                {busy === "assignment" ? "发布中..." : "发布任务"}
              </button>
            </form>
          </div>

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

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="paper-card p-4">
              <p className="label">已创建班级</p>
              <ul className="mt-2 space-y-2 text-sm">
                {classroomList.length === 0 ? (
                  <li className="text-slate-600">暂无班级，请先创建班级。</li>
                ) : (
                  classroomList.map((room) => (
                    <li key={room.class_id} className="rounded-lg border border-slate-300/50 bg-white/60 px-3 py-2">
                      <p className="font-semibold">{room.name}</p>
                      <p className="text-xs text-slate-700">Class ID: {room.class_id}</p>
                      <p className="text-xs text-slate-700">Join Code: {room.join_code}</p>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className="paper-card p-4">
              <p className="label">最新发布结果</p>
              <div className="mt-2 space-y-2 text-sm">
                <p>当前选中班级：{selectedClassName || "未选择"}</p>
                <p>最新任务 ID：{latestAssignmentId || "尚未发布"}</p>
                <p className="text-slate-600">学生端登录后可输入班级码完成加入。</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
