"use client";

import { type FormEvent, useEffect, useState } from "react";
import { joinClass } from "@/lib/api/client";
import { clearAuthSession, getAuthSession } from "@/lib/auth/session";
import type { UserProfile } from "@/lib/api/types";

export default function StudentPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [studentName, setStudentName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [result, setResult] = useState<{ class_id: string; class_name: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const session = getAuthSession();
    setCurrentUser(session?.user ?? null);
    setStudentName(session?.user.display_name ?? "");
  }, []);

  const onJoinClass = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const joined = await joinClass({
        join_code: joinCode.trim().toUpperCase(),
        student_name: studentName.trim() || undefined
      });
      setResult(joined);
    } catch (joinError) {
      setError((joinError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!currentUser || currentUser.role !== "student") {
    return (
      <main className="mx-auto min-h-screen max-w-4xl p-6 md:p-10">
        <section className="poster-shell p-6 md:p-8">
          <div className="relative z-10 paper-card p-5">
            <h1 className="poster-title text-3xl font-bold">学生页面需要学生登录</h1>
            <p className="mt-2 text-sm text-slate-700">请先登录为学生账号，再输入班级码加入班级。</p>
            <a className="btn-seal mt-4 inline-block text-sm" href="/login">
              前往登录
            </a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl p-6 md:p-10">
      <section className="poster-shell p-6 md:p-8">
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="seal-chip">学生入口 · 班级码加入</span>
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

          <form className="paper-card space-y-4 p-5" onSubmit={onJoinClass}>
            <h1 className="poster-title text-3xl font-bold">输入班级码，加入课堂</h1>

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

            <button className="btn-seal w-full text-sm" type="submit" disabled={busy}>
              {busy ? "加入中..." : "加入班级"}
            </button>
          </form>

          {result ? (
            <div className="rounded-xl border border-emerald-700/35 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              加入成功：{result.class_name}（Class ID: {result.class_id}）
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-rose-700/35 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              加入失败：{error}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
