"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMyProgress } from "@/lib/api/client";
import { clearAuthSession, getAuthSession } from "@/lib/auth/session";
import type { StudentProgressResponse, UserProfile } from "@/lib/api/types";

export default function StudentProgressPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [progress, setProgress] = useState<StudentProgressResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const session = getAuthSession();
    setCurrentUser(session?.user ?? null);
  }, []);

  useEffect(() => {
    if (!currentUser || currentUser.role !== "student") {
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await getMyProgress();
        if (!cancelled) {
          setProgress(payload);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError((loadError as Error).message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  if (!currentUser || currentUser.role !== "student") {
    return (
      <main className="mx-auto min-h-screen max-w-4xl p-6 md:p-10">
        <section className="poster-shell p-6 md:p-8">
          <div className="relative z-10 paper-card p-5">
            <h1 className="poster-title text-3xl font-bold">成长轨迹页需要学生登录</h1>
            <p className="mt-2 text-sm text-slate-700">请先登录学生账号后查看历史提交与成长记录。</p>
            <a className="btn-seal mt-4 inline-block text-sm" href="/login/student?next=%2Fstudent%2Fprogress">
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
            <span className="seal-chip">我的历史提交 · 成长轨迹</span>
            <div className="flex items-center gap-3 text-sm text-slate-700">
              <Link className="underline" href="/student">
                返回学生工作台
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

          {loading ? <p className="text-sm text-slate-700">成长数据加载中...</p> : null}
          {error ? (
            <div className="rounded-xl border border-rose-700/35 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              加载失败：{error}
            </div>
          ) : null}

          {progress ? (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="paper-card p-4">
                  <p className="label">提交次数</p>
                  <p className="mt-2 text-2xl font-semibold">{progress.total_submissions}</p>
                </div>
                <div className="paper-card p-4">
                  <p className="label">最近总分</p>
                  <p className="mt-2 text-2xl font-semibold">{progress.latest_score ?? "--"}</p>
                </div>
                <div className="paper-card p-4">
                  <p className="label">平均总分</p>
                  <p className="mt-2 text-2xl font-semibold">{progress.average_score ?? "--"}</p>
                </div>
                <div className="paper-card p-4">
                  <p className="label">较首次变化</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {progress.score_delta_from_first === null || progress.score_delta_from_first === undefined
                      ? "--"
                      : progress.score_delta_from_first > 0
                        ? `+${progress.score_delta_from_first}`
                        : progress.score_delta_from_first}
                  </p>
                </div>
              </div>

              <div className="paper-card p-5">
                <p className="label">成长轨迹（按时间）</p>
                <div className="mt-3 grid gap-2">
                  {progress.trajectory.length === 0 ? (
                    <p className="text-sm text-slate-600">暂无评分轨迹，请先提交并等待老师批改。</p>
                  ) : (
                    progress.trajectory.map((point) => (
                      <div key={`${point.index}-${point.submitted_at}`} className="flex items-center gap-3 text-sm">
                        <span className="w-8 text-right">{point.index}</span>
                        <div className="h-3 flex-1 rounded-full bg-slate-200">
                          <div
                            className="h-3 rounded-full bg-emerald-600/80"
                            style={{ width: `${Math.max(4, point.total_score ?? 0)}%` }}
                          />
                        </div>
                        <span className="w-12 text-right">{point.total_score ?? "--"}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="paper-card p-5">
                <p className="label">历史提交</p>
                <ul className="mt-3 space-y-2">
                  {progress.submissions.length === 0 ? (
                    <li className="text-sm text-slate-600">暂无提交记录。</li>
                  ) : (
                    progress.submissions.map((item) => (
                      <li
                        key={item.submission_id}
                        className="rounded-lg border border-slate-300/50 bg-white/60 px-3 py-3 text-sm text-slate-800"
                      >
                        <p className="font-semibold">{item.assignment_title}</p>
                        <p className="text-xs text-slate-600">提交ID：{item.submission_id}</p>
                        <p className="text-xs text-slate-600">班级：{item.class_name}</p>
                        <p className="text-xs text-slate-600">总分：{item.total_score ?? "--"}</p>
                        <p className="text-xs text-slate-600">
                          结构 {item.structure_score ?? "--"} · 语言 {item.language_score ?? "--"} · 立意 {item.value_score ?? "--"}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}
