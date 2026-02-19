"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  createReviewSummary,
  getAssignmentDetail,
  getStudentMemory,
  runSubmissionReview
} from "@/lib/api/client";
import { clearAuthSession, getAuthSession } from "@/lib/auth/session";
import type {
  AssignmentDetailResponse,
  ReviewAgentName,
  ReviewSummaryResponse,
  StudentMemoryResponse,
  UserProfile
} from "@/lib/api/types";

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
  const [agentBySubmission, setAgentBySubmission] = useState<Record<string, ReviewAgentName>>({});
  const [reviewingSubmissionId, setReviewingSubmissionId] = useState("");
  const [memoryLoadingStudentId, setMemoryLoadingStudentId] = useState("");
  const [selectedMemoryStudentId, setSelectedMemoryStudentId] = useState("");
  const [memoryData, setMemoryData] = useState<StudentMemoryResponse | null>(null);
  const [summaryBySubmissionId, setSummaryBySubmissionId] = useState<Record<string, ReviewSummaryResponse>>({});
  const [summarizingSubmissionId, setSummarizingSubmissionId] = useState("");
  const [toast, setToast] = useState<{ type: "ok" | "error"; message: string } | null>(null);

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

  const loadDetail = async () => {
    if (!assignmentId) {
      return;
    }
    const payload = await getAssignmentDetail(assignmentId);
    setDetail(payload);
  };

  const runReview = async (submissionId: string) => {
    const agentName = agentBySubmission[submissionId] ?? "value";
    setReviewingSubmissionId(submissionId);
    setToast(null);
    try {
      const response = await runSubmissionReview({
        submission_id: submissionId,
        agent_name: agentName
      });
      await loadDetail();
      setToast({
        type: "ok",
        message: `批改完成：${response.agent_name} · 得分 ${response.score}（review: ${response.review_id}）`
      });
    } catch (reviewError) {
      setToast({ type: "error", message: `批改失败：${(reviewError as Error).message}` });
    } finally {
      setReviewingSubmissionId("");
    }
  };

  const loadStudentMemory = async (studentId: string) => {
    setMemoryLoadingStudentId(studentId);
    setToast(null);
    try {
      const response = await getStudentMemory(studentId);
      setSelectedMemoryStudentId(studentId);
      setMemoryData(response);
    } catch (memoryError) {
      setToast({ type: "error", message: `记忆加载失败：${(memoryError as Error).message}` });
    } finally {
      setMemoryLoadingStudentId("");
    }
  };

  const generateSummary = async (submissionId: string) => {
    setSummarizingSubmissionId(submissionId);
    setToast(null);
    try {
      const payload = await createReviewSummary({ submission_id: submissionId });
      setSummaryBySubmissionId((prev) => ({ ...prev, [submissionId]: payload }));
      await loadDetail();
      setToast({
        type: "ok",
        message: `汇总报告已生成，总分 ${payload.total_score}`
      });
    } catch (summaryError) {
      setToast({ type: "error", message: `汇总失败：${(summaryError as Error).message}` });
    } finally {
      setSummarizingSubmissionId("");
    }
  };

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
                        {submission.latest_review_score !== null && submission.latest_review_score !== undefined ? (
                          <div className="mt-2 rounded-md border border-emerald-700/25 bg-emerald-50 px-2 py-2 text-xs text-emerald-900">
                            <p>
                              最近批改：{submission.latest_agent_name} · 得分 {submission.latest_review_score}
                            </p>
                            {submission.latest_review_feedback ? <p className="mt-1">{submission.latest_review_feedback}</p> : null}
                            {submission.latest_memory_note ? <p className="mt-1">长期记忆：{submission.latest_memory_note}</p> : null}
                          </div>
                        ) : null}
                        {submission.text_excerpt ? <p className="mt-2">{submission.text_excerpt}</p> : null}
                        {submission.file_url ? (
                          <p className="mt-2 text-xs">
                            文件地址：
                            <a className="underline" href={submission.file_url} target="_blank" rel="noreferrer">
                              {submission.file_url}
                            </a>
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <select
                            className="field w-44 text-xs"
                            value={agentBySubmission[submission.submission_id] ?? "value"}
                            onChange={(event) =>
                              setAgentBySubmission((prev) => ({
                                ...prev,
                                [submission.submission_id]: event.target.value as ReviewAgentName
                              }))
                            }
                          >
                            <option value="value">立意 Agent</option>
                            <option value="structure">结构 Agent</option>
                            <option value="language">语言 Agent</option>
                          </select>
                          <button
                            className="btn-ink px-3 py-1 text-xs"
                            onClick={() => {
                              void runReview(submission.submission_id);
                            }}
                            type="button"
                            disabled={reviewingSubmissionId === submission.submission_id}
                          >
                            {reviewingSubmissionId === submission.submission_id ? "批改中..." : "调用 Agent 批改"}
                          </button>
                          <button
                            className="btn-seal px-3 py-1 text-xs"
                            onClick={() => {
                              void loadStudentMemory(submission.student_id);
                            }}
                            type="button"
                            disabled={memoryLoadingStudentId === submission.student_id}
                          >
                            {memoryLoadingStudentId === submission.student_id ? "加载中..." : "查看长期记忆"}
                          </button>
                          <button
                            className="btn-seal px-3 py-1 text-xs"
                            onClick={() => {
                              void generateSummary(submission.submission_id);
                            }}
                            type="button"
                            disabled={summarizingSubmissionId === submission.submission_id}
                          >
                            {summarizingSubmissionId === submission.submission_id ? "汇总中..." : "生成多 Agent 汇总"}
                          </button>
                        </div>
                        {summaryBySubmissionId[submission.submission_id] ? (
                          <div className="mt-3 rounded-md border border-slate-300/50 bg-slate-50 px-3 py-3 text-xs">
                            <p className="font-semibold">
                              汇总总分：{summaryBySubmissionId[submission.submission_id].total_score}
                            </p>
                            <p>
                              雷达：结构 {summaryBySubmissionId[submission.submission_id].radar.structure} · 语言{" "}
                              {summaryBySubmissionId[submission.submission_id].radar.language} · 立意{" "}
                              {summaryBySubmissionId[submission.submission_id].radar.value}
                            </p>
                            <ul className="mt-2 list-disc pl-4">
                              {summaryBySubmissionId[submission.submission_id].actionable_suggestions.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div className="paper-card p-5">
                <p className="label">学生长期记忆面板</p>
                <p className="mt-2 text-sm text-slate-700">
                  当前学生：{selectedMemoryStudentId || "未选择"} {memoryData ? `· 共 ${memoryData.total} 条` : ""}
                </p>
                <ul className="mt-3 space-y-2">
                  {!memoryData || memoryData.items.length === 0 ? (
                    <li className="text-sm text-slate-600">请选择学生查看，或先运行一次 Agent 批改生成记忆。</li>
                  ) : (
                    memoryData.items.map((item) => (
                      <li
                        key={item.note_id}
                        className="rounded-lg border border-slate-300/50 bg-white/60 px-3 py-3 text-sm text-slate-800"
                      >
                        <p className="font-semibold">{item.agent_name}</p>
                        <p className="text-xs text-slate-600">note: {item.note_id}</p>
                        <p className="mt-1">{item.note}</p>
                        <p className="mt-1 text-xs text-slate-600">{item.tags}</p>
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
