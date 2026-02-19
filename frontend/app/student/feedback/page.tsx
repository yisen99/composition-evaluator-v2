"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listMyManualFeedback } from "@/lib/api/client";
import { clearAuthSession, getAuthSession } from "@/lib/auth/session";
import type { StudentManualFeedbackItem, UserProfile } from "@/lib/api/types";

export default function StudentFeedbackPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [items, setItems] = useState<StudentManualFeedbackItem[]>([]);
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
        const payload = await listMyManualFeedback();
        if (!cancelled) {
          setItems(payload);
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
            <h1 className="poster-title text-3xl font-bold">手工批改结果页需要学生登录</h1>
            <p className="mt-2 text-sm text-slate-700">请先登录学生账号后查看老师已发布的手工批改。</p>
            <a className="btn-seal mt-4 inline-block text-sm" href="/login/student?next=%2Fstudent%2Ffeedback">
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
            <span className="seal-chip">老师手工批改结果</span>
            <div className="flex items-center gap-3 text-sm text-slate-700">
              <Link className="underline" href="/student">
                返回学生工作台
              </Link>
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

          {loading ? <p className="text-sm text-slate-700">批改结果加载中...</p> : null}
          {error ? (
            <div className="rounded-xl border border-rose-700/35 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              加载失败：{error}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="paper-card p-4">
              <p className="label">已发布批改</p>
              <p className="mt-2 text-2xl font-semibold">{items.length}</p>
            </div>
            <div className="paper-card p-4">
              <p className="label">最近总分</p>
              <p className="mt-2 text-2xl font-semibold">{items[0]?.manual_total_score ?? "--"}</p>
            </div>
            <div className="paper-card p-4">
              <p className="label">最近发布时间</p>
              <p className="mt-2 text-sm font-semibold">
                {items[0]?.manual_published_at
                  ? new Date(items[0].manual_published_at).toLocaleString("zh-CN", { hour12: false })
                  : "--"}
              </p>
            </div>
          </div>

          <div className="paper-card p-5">
            <p className="label">批改详情</p>
            <ul className="mt-3 space-y-3">
              {items.length === 0 ? (
                <li className="text-sm text-slate-600">老师还没有发布手工批改结果，先去提交作文或等待老师批改。</li>
              ) : (
                items.map((item) => (
                  <li
                    key={item.submission_id}
                    className="rounded-lg border border-slate-300/50 bg-white/60 px-3 py-3 text-sm text-slate-800"
                  >
                    <p className="font-semibold">{item.assignment_title}</p>
                    <p className="text-xs text-slate-600">提交ID：{item.submission_id}</p>
                    <p className="text-xs text-slate-600">班级：{item.class_name}</p>
                    <p className="mt-1 text-xs text-slate-700">
                      总分 {item.manual_total_score} · 结构 {item.structure_score} · 语言 {item.language_score} · 立意 {item.value_score}
                    </p>
                    <div className="mt-2 grid gap-3 lg:grid-cols-2">
                      <div className="rounded-md border border-slate-200/70 bg-white/80 px-2 py-2">
                        <p className="text-xs font-semibold text-slate-800">老师手工批改</p>
                        <p className="mt-1 text-xs text-slate-800">总评：{item.summary_feedback}</p>
                        <ul className="mt-2 list-disc pl-5 text-xs text-slate-700">
                          {item.actionable_suggestions.map((suggestion) => (
                            <li key={`${item.submission_id}-${suggestion}`}>{suggestion}</li>
                          ))}
                        </ul>
                        {item.strengths ? <p className="mt-2 text-xs text-slate-700">优点：{item.strengths}</p> : null}
                        {item.next_goal ? <p className="mt-1 text-xs text-slate-700">下一目标：{item.next_goal}</p> : null}
                      </div>
                      <div className="rounded-md border border-emerald-700/25 bg-emerald-50/70 px-2 py-2">
                        <p className="text-xs font-semibold text-emerald-900">Agent 汇总</p>
                        {item.agent_summary ? (
                          <>
                            <p className="mt-1 text-xs text-emerald-900">
                              综合分：{item.agent_summary.total_score ?? "--"} · 结构 {item.agent_summary.radar.structure ?? "--"} ·
                              语言 {item.agent_summary.radar.language ?? "--"} · 立意 {item.agent_summary.radar.value ?? "--"}
                            </p>
                            <ul className="mt-2 space-y-1 text-xs text-emerald-950">
                              {item.agent_summary.items.map((agentItem) => (
                                <li key={`${item.submission_id}-${agentItem.agent_name}`}>
                                  {agentItem.agent_name}：{agentItem.score} · {agentItem.feedback}
                                </li>
                              ))}
                            </ul>
                          </>
                        ) : (
                          <p className="mt-1 text-xs text-emerald-900">当前暂无 Agent 批改记录。</p>
                        )}
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      发布时间：
                      {item.manual_published_at
                        ? new Date(item.manual_published_at).toLocaleString("zh-CN", { hour12: false })
                        : "--"}
                    </p>
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
