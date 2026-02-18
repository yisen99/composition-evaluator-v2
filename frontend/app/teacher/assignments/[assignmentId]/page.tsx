"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getAssignmentDetail } from "@/lib/api/client";
import { clearAuthSession, getAuthSession } from "@/lib/auth/session";
import type { AssignmentDetailResponse, UserProfile } from "@/lib/api/types";

export default function TeacherAssignmentDetailPage() {
  const params = useParams<{ assignmentId: string }>();
  const assignmentId = useMemo(() => {
    const value = params?.assignmentId;
    return Array.isArray(value) ? value[0] : value;
  }, [params?.assignmentId]);

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [detail, setDetail] = useState<AssignmentDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const session = getAuthSession();
    setCurrentUser(session?.user ?? null);
  }, []);

  useEffect(() => {
    if (!assignmentId || !currentUser || currentUser.role !== "teacher") {
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await getAssignmentDetail(assignmentId);
        if (!cancelled) {
          setDetail(payload);
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
  }, [assignmentId, currentUser]);

  if (!currentUser || currentUser.role !== "teacher") {
    return (
      <main className="mx-auto min-h-screen max-w-4xl p-6 md:p-10">
        <section className="poster-shell p-6 md:p-8">
          <div className="relative z-10 paper-card p-5">
            <h1 className="poster-title text-3xl font-bold">任务详情页需要教师登录</h1>
            <p className="mt-2 text-sm text-slate-700">请先登录教师账号后查看任务详情。</p>
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
            <span className="seal-chip">任务详情 · 批改预留视图</span>
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

          <div className="flex items-center justify-between text-sm">
            <Link className="underline" href="/teacher">
              返回教师工作台
            </Link>
            <p className="text-slate-700">Assignment ID: {assignmentId}</p>
          </div>

          {loading ? <p className="text-sm text-slate-700">任务详情加载中...</p> : null}
          {error ? (
            <div className="rounded-xl border border-rose-700/35 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              加载失败：{error}
            </div>
          ) : null}

          {detail ? (
            <>
              <div className="paper-card p-5">
                <h1 className="poster-title text-3xl font-bold">{detail.title}</h1>
                <div className="mt-3 space-y-1 text-sm text-slate-700">
                  <p>班级 ID：{detail.class_id}</p>
                  <p>状态：{detail.status}</p>
                  <p>截止时间：{detail.due_at || "未设置"}</p>
                </div>
                <div className="mt-4 rounded-lg border border-slate-300/50 bg-white/60 p-3 text-sm text-slate-800">
                  {detail.prompt}
                </div>
              </div>

              <div className="paper-card p-5">
                <p className="label">提交概况</p>
                <p className="mt-2 text-sm">提交总数：{detail.submissions_count}</p>
                <ul className="mt-3 space-y-2">
                  {detail.submissions.length === 0 ? (
                    <li className="text-sm text-slate-600">暂无学生提交，后续可接入 Agent 批改流程。</li>
                  ) : (
                    detail.submissions.map((submission) => (
                      <li
                        key={submission.submission_id}
                        className="rounded-lg border border-slate-300/50 bg-white/60 px-3 py-3 text-sm text-slate-800"
                      >
                        <p className="font-semibold">
                          {submission.student_name} · {submission.content_type}
                        </p>
                        <p className="text-xs text-slate-600">Submission ID: {submission.submission_id}</p>
                        {submission.text_excerpt ? <p className="mt-2">{submission.text_excerpt}</p> : null}
                        {submission.file_url ? (
                          <p className="mt-2 text-xs">
                            文件地址：
                            <a className="underline" href={submission.file_url} target="_blank" rel="noreferrer">
                              {submission.file_url}
                            </a>
                          </p>
                        ) : null}
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
