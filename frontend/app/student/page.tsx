"use client";

import { type FormEvent, useState } from "react";
import { joinClass } from "@/lib/api/client";

function makeId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function StudentPage() {
  const [studentId, setStudentId] = useState(() => makeId("student"));
  const [studentName, setStudentName] = useState("小明");
  const [joinCode, setJoinCode] = useState("");
  const [result, setResult] = useState<{ class_id: string; class_name: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onJoinClass = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const joined = await joinClass({
        join_code: joinCode.trim().toUpperCase(),
        student_id: studentId.trim(),
        student_name: studentName.trim()
      });
      setResult(joined);
    } catch (joinError) {
      setError((joinError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-4xl p-6 md:p-10">
      <section className="poster-shell p-6 md:p-8">
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="seal-chip">学生入口 · 班级码加入</span>
            <a className="text-sm text-slate-700 underline" href="/">
              返回首页
            </a>
          </div>

          <form className="paper-card space-y-4 p-5" onSubmit={onJoinClass}>
            <h1 className="poster-title text-3xl font-bold">输入班级码，加入课堂</h1>

            <div>
              <p className="label">Student ID</p>
              <input className="field mt-1" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
            </div>

            <div>
              <p className="label">Student Name</p>
              <input className="field mt-1" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
            </div>

            <div>
              <p className="label">Join Code</p>
              <input
                className="field mt-1 uppercase tracking-[0.2em]"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
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
