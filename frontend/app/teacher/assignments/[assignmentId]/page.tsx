"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  createReviewSummary,
  getAssignmentGradingQueue,
  getAssignmentDetail,
  getManualReviewForSubmission,
  getStudentMemory,
  publishManualReview,
  runSubmissionReview,
  saveManualReviewDraft,
} from "@/lib/api/client";
import { clearAuthSession, getAuthSession } from "@/lib/auth/session";
import type {
  AssignmentGradingQueueItem,
  AssignmentDetailResponse,
  ManualReviewDraftRequest,
  ManualReviewItem,
  ReviewAgentName,
  ReviewSummaryResponse,
  StudentMemoryResponse,
  UserProfile
} from "@/lib/api/types";

type ManualDraftForm = {
  structureScore: string;
  languageScore: string;
  valueScore: string;
  summaryFeedback: string;
  suggestionsText: string;
  strengths: string;
  nextGoal: string;
};

function emptyManualDraftForm(): ManualDraftForm {
  return {
    structureScore: "80",
    languageScore: "80",
    valueScore: "80",
    summaryFeedback: "",
    suggestionsText: "补充一个具体场景细节。\n结尾增加一句反思。",
    strengths: "",
    nextGoal: ""
  };
}

function applyManualReviewToForm(review: ManualReviewItem): ManualDraftForm {
  return {
    structureScore: String(review.structure_score),
    languageScore: String(review.language_score),
    valueScore: String(review.value_score),
    summaryFeedback: review.summary_feedback,
    suggestionsText: review.actionable_suggestions.join("\n"),
    strengths: review.strengths || "",
    nextGoal: review.next_goal || ""
  };
}

export default function TeacherAssignmentDetailPage() {
  const params = useParams<{ assignmentId: string }>();
  const assignmentId = useMemo(() => {
    const value = params?.assignmentId;
    return Array.isArray(value) ? value[0] : value;
  }, [params?.assignmentId]);
  const loginPath = assignmentId
    ? `/login/teacher?next=${encodeURIComponent(`/teacher/assignments/${assignmentId}`)}`
    : "/login/teacher?next=%2Fteacher";

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
  const [queueBySubmissionId, setQueueBySubmissionId] = useState<Record<string, AssignmentGradingQueueItem>>({});
  const [queueStats, setQueueStats] = useState({ total: 0, draft: 0, published: 0 });
  const [manualEditingSubmissionId, setManualEditingSubmissionId] = useState("");
  const [manualLoadingSubmissionId, setManualLoadingSubmissionId] = useState("");
  const [manualSavingSubmissionId, setManualSavingSubmissionId] = useState("");
  const [manualPublishingSubmissionId, setManualPublishingSubmissionId] = useState("");
  const [manualDraftForm, setManualDraftForm] = useState<ManualDraftForm>(emptyManualDraftForm());

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
        const [payload, queuePayload] = await Promise.all([
          getAssignmentDetail(assignmentId),
          getAssignmentGradingQueue(assignmentId)
        ]);
        if (!cancelled) {
          setDetail(payload);
          setQueueStats({
            total: queuePayload.total_submissions,
            draft: queuePayload.manual_draft_count,
            published: queuePayload.manual_published_count
          });
          setQueueBySubmissionId(
            Object.fromEntries(queuePayload.items.map((item) => [item.submission_id, item]))
          );
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
    const [payload, queuePayload] = await Promise.all([
      getAssignmentDetail(assignmentId),
      getAssignmentGradingQueue(assignmentId)
    ]);
    setDetail(payload);
    setQueueStats({
      total: queuePayload.total_submissions,
      draft: queuePayload.manual_draft_count,
      published: queuePayload.manual_published_count
    });
    setQueueBySubmissionId(
      Object.fromEntries(queuePayload.items.map((item) => [item.submission_id, item]))
    );
  };

  const parseScoreInput = (value: string): number => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return 0;
    }
    return Math.max(0, Math.min(100, Math.round(parsed)));
  };

  const buildManualDraftPayload = (submissionId: string): ManualReviewDraftRequest | null => {
    const suggestions = manualDraftForm.suggestionsText
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    if (suggestions.length < 2) {
      setToast({ type: "error", message: "手工批改至少需要 2 条可执行建议。" });
      return null;
    }
    if (!manualDraftForm.summaryFeedback.trim()) {
      setToast({ type: "error", message: "请填写总体评语后再保存。" });
      return null;
    }

    return {
      submission_id: submissionId,
      structure_score: parseScoreInput(manualDraftForm.structureScore),
      language_score: parseScoreInput(manualDraftForm.languageScore),
      value_score: parseScoreInput(manualDraftForm.valueScore),
      summary_feedback: manualDraftForm.summaryFeedback.trim(),
      actionable_suggestions: suggestions,
      strengths: manualDraftForm.strengths.trim() || undefined,
      next_goal: manualDraftForm.nextGoal.trim() || undefined
    };
  };

  const openManualEditor = async (submissionId: string) => {
    setManualEditingSubmissionId(submissionId);
    setManualLoadingSubmissionId(submissionId);
    setToast(null);
    try {
      const payload = await getManualReviewForSubmission(submissionId);
      if (payload.exists && payload.review) {
        setManualDraftForm(applyManualReviewToForm(payload.review));
      } else {
        setManualDraftForm(emptyManualDraftForm());
      }
    } catch (openError) {
      setToast({ type: "error", message: `加载手工批改失败：${(openError as Error).message}` });
    } finally {
      setManualLoadingSubmissionId("");
    }
  };

  const onSaveManualDraft = async (submissionId: string) => {
    const payload = buildManualDraftPayload(submissionId);
    if (!payload) {
      return;
    }
    setManualSavingSubmissionId(submissionId);
    setToast(null);
    try {
      const review = await saveManualReviewDraft(payload);
      setManualDraftForm(applyManualReviewToForm(review));
      await loadDetail();
      setToast({ type: "ok", message: `手工批改草稿已保存（v${review.version}）。` });
    } catch (saveError) {
      setToast({ type: "error", message: `保存失败：${(saveError as Error).message}` });
    } finally {
      setManualSavingSubmissionId("");
    }
  };

  const onPublishManualReview = async (submissionId: string) => {
    const payload = buildManualDraftPayload(submissionId);
    if (!payload) {
      return;
    }
    setManualPublishingSubmissionId(submissionId);
    setToast(null);
    try {
      await saveManualReviewDraft(payload);
      const review = await publishManualReview({ submission_id: submissionId });
      setManualDraftForm(applyManualReviewToForm(review));
      await loadDetail();
      setToast({ type: "ok", message: `手工批改已发布（总分 ${review.total_score}）。` });
    } catch (publishError) {
      setToast({ type: "error", message: `发布失败：${(publishError as Error).message}` });
    } finally {
      setManualPublishingSubmissionId("");
    }
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
            <a className="btn-ink mt-4 inline-block text-sm" href={loginPath}>
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
                  window.location.href = "/login/teacher";
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
                <p className="mt-1 text-xs text-slate-700">
                  手工批改：草稿 {queueStats.draft} · 已发布 {queueStats.published} · 队列 {queueStats.total}
                </p>
                <ul className="mt-3 space-y-2">
                  {detail.submissions.length === 0 ? (
                    <li className="text-sm text-slate-600">暂无学生提交，后续可接入 Agent 批改流程。</li>
                  ) : (
                    detail.submissions.map((submission) => {
                      const queueItem = queueBySubmissionId[submission.submission_id];
                      const isEditingManual = manualEditingSubmissionId === submission.submission_id;
                      const isManualLoading = manualLoadingSubmissionId === submission.submission_id;
                      const isManualSaving = manualSavingSubmissionId === submission.submission_id;
                      const isManualPublishing = manualPublishingSubmissionId === submission.submission_id;

                      const manualStatusText =
                        queueItem?.manual_status === "published"
                          ? `已发布（总分 ${queueItem.manual_total_score ?? "--"}）`
                          : queueItem?.manual_status === "draft"
                            ? "草稿中"
                            : "未开始";

                      return (
                        <li
                          key={submission.submission_id}
                          className="rounded-lg border border-slate-300/50 bg-white/60 px-3 py-3 text-sm text-slate-800"
                        >
                          <p className="font-semibold">
                            {submission.student_name} · {submission.content_type}
                          </p>
                          <p className="text-xs text-slate-600">Submission ID: {submission.submission_id}</p>
                          <p className="mt-1 text-xs text-slate-700">手工批改状态：{manualStatusText}</p>
                          {queueItem?.manual_updated_at ? (
                            <p className="mt-1 text-xs text-slate-600">最近更新：{queueItem.manual_updated_at}</p>
                          ) : null}
                          {queueItem?.manual_status === "published" ? (
                            <p className="mt-1 text-xs text-slate-600">
                              学生阅读：
                              {queueItem.manual_viewed
                                ? `已读（${queueItem.manual_view_count} 次）`
                                : "未读"}
                              {queueItem.manual_last_viewed_at ? ` · 最近阅读 ${queueItem.manual_last_viewed_at}` : ""}
                            </p>
                          ) : null}
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
                            <button
                              className="btn-seal px-3 py-1 text-xs"
                              onClick={() => {
                                void openManualEditor(submission.submission_id);
                              }}
                              type="button"
                              disabled={isManualLoading}
                            >
                              {isManualLoading ? "加载批改中..." : isEditingManual ? "继续编辑手工批改" : "手工批改"}
                            </button>
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

                          {isEditingManual ? (
                            <div className="mt-3 rounded-md border border-amber-700/30 bg-amber-50/60 px-3 py-3">
                              <p className="text-xs font-semibold text-amber-900">手工批改编辑区</p>
                              {isManualLoading ? (
                                <p className="mt-2 text-xs text-slate-700">正在加载手工批改草稿...</p>
                              ) : (
                                <>
                                  <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                                    <label className="text-xs text-slate-700">
                                      结构分（0-100）
                                      <input
                                        className="field mt-1 text-xs"
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={manualDraftForm.structureScore}
                                        onChange={(event) =>
                                          setManualDraftForm((prev) => ({ ...prev, structureScore: event.target.value }))
                                        }
                                      />
                                    </label>
                                    <label className="text-xs text-slate-700">
                                      语言分（0-100）
                                      <input
                                        className="field mt-1 text-xs"
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={manualDraftForm.languageScore}
                                        onChange={(event) =>
                                          setManualDraftForm((prev) => ({ ...prev, languageScore: event.target.value }))
                                        }
                                      />
                                    </label>
                                    <label className="text-xs text-slate-700">
                                      立意分（0-100）
                                      <input
                                        className="field mt-1 text-xs"
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={manualDraftForm.valueScore}
                                        onChange={(event) =>
                                          setManualDraftForm((prev) => ({ ...prev, valueScore: event.target.value }))
                                        }
                                      />
                                    </label>
                                  </div>
                                  <label className="mt-3 block text-xs text-slate-700">
                                    总体评语
                                    <textarea
                                      className="field mt-1 min-h-20 text-xs"
                                      value={manualDraftForm.summaryFeedback}
                                      onChange={(event) =>
                                        setManualDraftForm((prev) => ({ ...prev, summaryFeedback: event.target.value }))
                                      }
                                      placeholder="给出本次作文整体评价。"
                                    />
                                  </label>
                                  <label className="mt-3 block text-xs text-slate-700">
                                    可执行建议（每行一条，至少 2 条）
                                    <textarea
                                      className="field mt-1 min-h-24 text-xs"
                                      value={manualDraftForm.suggestionsText}
                                      onChange={(event) =>
                                        setManualDraftForm((prev) => ({ ...prev, suggestionsText: event.target.value }))
                                      }
                                      placeholder="补充一个场景细节。\n结尾增加一句反思。"
                                    />
                                  </label>
                                  <label className="mt-3 block text-xs text-slate-700">
                                    优点（可选）
                                    <textarea
                                      className="field mt-1 min-h-16 text-xs"
                                      value={manualDraftForm.strengths}
                                      onChange={(event) =>
                                        setManualDraftForm((prev) => ({ ...prev, strengths: event.target.value }))
                                      }
                                      placeholder="例如：开头切题快，描写具体。"
                                    />
                                  </label>
                                  <label className="mt-3 block text-xs text-slate-700">
                                    下阶段目标（可选）
                                    <textarea
                                      className="field mt-1 min-h-16 text-xs"
                                      value={manualDraftForm.nextGoal}
                                      onChange={(event) =>
                                        setManualDraftForm((prev) => ({ ...prev, nextGoal: event.target.value }))
                                      }
                                      placeholder="例如：下一篇重点练习过渡句。"
                                    />
                                  </label>
                                  <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <button
                                      className="btn-seal px-3 py-1 text-xs"
                                      onClick={() => {
                                        void onSaveManualDraft(submission.submission_id);
                                      }}
                                      type="button"
                                      disabled={isManualSaving || isManualPublishing}
                                    >
                                      {isManualSaving ? "保存中..." : "保存草稿"}
                                    </button>
                                    <button
                                      className="btn-ink px-3 py-1 text-xs"
                                      onClick={() => {
                                        void onPublishManualReview(submission.submission_id);
                                      }}
                                      type="button"
                                      disabled={isManualSaving || isManualPublishing}
                                    >
                                      {isManualPublishing ? "发布中..." : "发布给学生"}
                                    </button>
                                    <button
                                      className="underline text-xs"
                                      onClick={() => {
                                        setManualEditingSubmissionId("");
                                      }}
                                      type="button"
                                      disabled={isManualSaving || isManualPublishing}
                                    >
                                      收起
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ) : null}

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
                              <p className="mt-2 rounded-md bg-white/80 px-2 py-2 text-slate-700">
                                改写示例：{summaryBySubmissionId[submission.submission_id].rewrite_paragraph}
                              </p>
                            </div>
                          ) : null}
                        </li>
                      );
                    })
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
