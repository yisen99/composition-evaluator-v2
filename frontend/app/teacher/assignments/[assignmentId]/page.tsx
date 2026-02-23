"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createManualReviewReplyForTeacher,
  getAssignmentCommunicationThreads,
  createReviewSummary,
  getAssignmentGradingQueue,
  getAssignmentDetail,
  getManualReviewForSubmission,
  getStudentMemory,
  listManualReviewRepliesForTeacher,
  publishManualReview,
  runSubmissionReview,
  saveManualReviewDraft,
} from "@/lib/api/client";
import { executeBatchWithProgress } from "@/lib/review/batch-runner";
import { clearAuthSession, getAuthSession } from "@/lib/auth/session";
import type {
  AssignmentGradingQueueItem,
  AssignmentCommunicationStudentItem,
  AssignmentDetailResponse,
  ManualReviewDraftRequest,
  ManualReviewItem,
  ManualReviewReplyItem,
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

type BatchActionKind = "review" | "summary" | "publish";

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

function batchActionLabel(action: BatchActionKind): string {
  if (action === "review") {
    return "Agent 批改";
  }
  if (action === "summary") {
    return "生成汇总";
  }
  return "发布手工批改";
}

function parseBatchAssignmentIds(raw: string | null): string[] {
  if (!raw) {
    return [];
  }
  const items = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return Array.from(new Set(items));
}

export default function TeacherAssignmentDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ assignmentId: string }>();
  const assignmentId = useMemo(() => {
    const value = params?.assignmentId;
    return Array.isArray(value) ? value[0] : value;
  }, [params?.assignmentId]);
  const loginPath = assignmentId
    ? `/login/teacher?next=${encodeURIComponent(`/teacher/assignments/${assignmentId}`)}`
    : "/login/teacher?next=%2Fteacher%2Ftasks";
  const workflowAssignmentIds = useMemo(
    () => parseBatchAssignmentIds(searchParams.get("batch_ids")),
    [searchParams]
  );
  const workflowIndex = useMemo(() => {
    if (!assignmentId || workflowAssignmentIds.length === 0) {
      return -1;
    }
    return workflowAssignmentIds.indexOf(assignmentId);
  }, [assignmentId, workflowAssignmentIds]);

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
  const [replyThreadBySubmissionId, setReplyThreadBySubmissionId] = useState<Record<string, ManualReviewReplyItem[]>>({});
  const [replyDraftBySubmissionId, setReplyDraftBySubmissionId] = useState<Record<string, string>>({});
  const [replyLoadingSubmissionId, setReplyLoadingSubmissionId] = useState("");
  const [replySubmittingSubmissionId, setReplySubmittingSubmissionId] = useState("");
  const [showOnlyPendingReplies, setShowOnlyPendingReplies] = useState(false);
  const [communicationItems, setCommunicationItems] = useState<AssignmentCommunicationStudentItem[]>([]);
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<string[]>([]);
  const [batchAgentName, setBatchAgentName] = useState<ReviewAgentName>("value");
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchAction, setBatchAction] = useState<BatchActionKind | null>(null);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchCompleted, setBatchCompleted] = useState(0);
  const [batchSucceeded, setBatchSucceeded] = useState(0);
  const [batchFailed, setBatchFailed] = useState(0);
  const [batchCurrentSubmissionId, setBatchCurrentSubmissionId] = useState<string | null>(null);
  const [batchFailedIds, setBatchFailedIds] = useState<string[]>([]);
  const [batchFailureMessages, setBatchFailureMessages] = useState<Record<string, string>>({});
  const [batchRetryContext, setBatchRetryContext] = useState<{ action: BatchActionKind; agentName: ReviewAgentName } | null>(null);
  const [batchCancelRequested, setBatchCancelRequested] = useState(false);
  const [batchWasCancelled, setBatchWasCancelled] = useState(false);
  const batchCancelRef = useRef({ cancelled: false });

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
        const [payload, queuePayload, communicationPayload] = await Promise.all([
          getAssignmentDetail(assignmentId),
          getAssignmentGradingQueue(assignmentId),
          getAssignmentCommunicationThreads(assignmentId)
        ]);
        if (!cancelled) {
          setDetail(payload);
          setCommunicationItems(communicationPayload.items);
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
    const [payload, queuePayload, communicationPayload] = await Promise.all([
      getAssignmentDetail(assignmentId),
      getAssignmentGradingQueue(assignmentId),
      getAssignmentCommunicationThreads(assignmentId)
    ]);
    setDetail(payload);
    setCommunicationItems(communicationPayload.items);
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

  const loadReplyThread = async (submissionId: string) => {
    setReplyLoadingSubmissionId(submissionId);
    setToast(null);
    try {
      const payload = await listManualReviewRepliesForTeacher(submissionId);
      setReplyThreadBySubmissionId((prev) => ({ ...prev, [submissionId]: payload }));
    } catch (replyError) {
      setToast({ type: "error", message: `加载批改回复失败：${(replyError as Error).message}` });
    } finally {
      setReplyLoadingSubmissionId("");
    }
  };

  const submitTeacherReply = async (submissionId: string) => {
    const content = (replyDraftBySubmissionId[submissionId] || "").trim();
    if (!content) {
      setToast({ type: "error", message: "请输入回复内容后再发送。" });
      return;
    }
    setReplySubmittingSubmissionId(submissionId);
    setToast(null);
    try {
      await createManualReviewReplyForTeacher(submissionId, content);
      setReplyDraftBySubmissionId((prev) => ({ ...prev, [submissionId]: "" }));
      const payload = await listManualReviewRepliesForTeacher(submissionId);
      setReplyThreadBySubmissionId((prev) => ({ ...prev, [submissionId]: payload }));
      setToast({ type: "ok", message: "批改回复已发送给学生。" });
    } catch (replyError) {
      setToast({ type: "error", message: `回复发送失败：${(replyError as Error).message}` });
    } finally {
      setReplySubmittingSubmissionId("");
    }
  };

  const rankedSubmissions = useMemo(() => {
    if (!detail) {
      return [];
    }
    return [...detail.submissions].sort((a, b) => {
      const aQueue = queueBySubmissionId[a.submission_id];
      const bQueue = queueBySubmissionId[b.submission_id];
      const pendingWeight =
        Number(Boolean(bQueue?.pending_teacher_reply)) - Number(Boolean(aQueue?.pending_teacher_reply));
      if (pendingWeight !== 0) {
        return pendingWeight;
      }
      const studentReplyWeight = (bQueue?.student_reply_count || 0) - (aQueue?.student_reply_count || 0);
      if (studentReplyWeight !== 0) {
        return studentReplyWeight;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [detail, queueBySubmissionId]);

  const visibleSubmissions = useMemo(() => {
    if (!showOnlyPendingReplies) {
      return rankedSubmissions;
    }
    return rankedSubmissions.filter((item) => queueBySubmissionId[item.submission_id]?.pending_teacher_reply);
  }, [queueBySubmissionId, rankedSubmissions, showOnlyPendingReplies]);

  const pendingReplyCount = useMemo(
    () => Object.values(queueBySubmissionId).filter((item) => item.pending_teacher_reply).length,
    [queueBySubmissionId]
  );

  const submissionNameById = useMemo(
    () =>
      Object.fromEntries(
        (detail?.submissions || []).map((item) => [item.submission_id, item.student_name])
      ) as Record<string, string>,
    [detail?.submissions]
  );

  const visibleSubmissionIds = useMemo(
    () => visibleSubmissions.map((item) => item.submission_id),
    [visibleSubmissions]
  );

  const allVisibleSelected = useMemo(
    () =>
      visibleSubmissionIds.length > 0 &&
      visibleSubmissionIds.every((submissionId) => selectedSubmissionIds.includes(submissionId)),
    [selectedSubmissionIds, visibleSubmissionIds]
  );

  const selectedVisibleCount = useMemo(
    () => visibleSubmissionIds.filter((submissionId) => selectedSubmissionIds.includes(submissionId)).length,
    [selectedSubmissionIds, visibleSubmissionIds]
  );

  useEffect(() => {
    const validSet = new Set((detail?.submissions || []).map((item) => item.submission_id));
    setSelectedSubmissionIds((prev) => prev.filter((submissionId) => validSet.has(submissionId)));
  }, [detail?.submissions]);

  const toggleSelectSubmission = (submissionId: string) => {
    setSelectedSubmissionIds((prev) =>
      prev.includes(submissionId)
        ? prev.filter((item) => item !== submissionId)
        : [...prev, submissionId]
    );
  };

  const toggleSelectVisibleSubmissions = () => {
    if (allVisibleSelected) {
      const visibleSet = new Set(visibleSubmissionIds);
      setSelectedSubmissionIds((prev) => prev.filter((submissionId) => !visibleSet.has(submissionId)));
      return;
    }
    setSelectedSubmissionIds((prev) => {
      const nextSet = new Set(prev);
      visibleSubmissionIds.forEach((submissionId) => nextSet.add(submissionId));
      return Array.from(nextSet);
    });
  };

  const executeBatchAction = async (
    action: BatchActionKind,
    targetSubmissionIds: string[],
    retryAgentName?: ReviewAgentName
  ) => {
    if (batchRunning) {
      return;
    }

    const deduplicated = Array.from(new Set(targetSubmissionIds));
    const rankedOrder = rankedSubmissions.map((item) => item.submission_id);
    const rankedSet = new Set(rankedOrder);
    const orderedSubmissionIds = [
      ...rankedOrder.filter((submissionId) => deduplicated.includes(submissionId)),
      ...deduplicated.filter((submissionId) => !rankedSet.has(submissionId))
    ];

    if (orderedSubmissionIds.length === 0) {
      setToast({ type: "error", message: "请先选择至少 1 篇学生提交。" });
      return;
    }

    const effectiveAgentName = retryAgentName ?? batchAgentName;
    batchCancelRef.current.cancelled = false;
    setBatchRunning(true);
    setBatchAction(action);
    setBatchTotal(orderedSubmissionIds.length);
    setBatchCompleted(0);
    setBatchSucceeded(0);
    setBatchFailed(0);
    setBatchCurrentSubmissionId(null);
    setBatchFailedIds([]);
    setBatchFailureMessages({});
    setBatchRetryContext(null);
    setBatchCancelRequested(false);
    setBatchWasCancelled(false);
    setToast(null);

    try {
      const result = await executeBatchWithProgress({
        ids: orderedSubmissionIds,
        isCancelled: () => batchCancelRef.current.cancelled,
        onProgress: (progress) => {
          setBatchTotal(progress.total);
          setBatchCompleted(progress.completed);
          setBatchSucceeded(progress.succeeded);
          setBatchFailed(progress.failed);
          setBatchCurrentSubmissionId(progress.currentId);

          if (action === "review") {
            setReviewingSubmissionId(progress.currentId || "");
          } else if (action === "summary") {
            setSummarizingSubmissionId(progress.currentId || "");
          } else {
            setManualPublishingSubmissionId(progress.currentId || "");
          }
        },
        worker: async (submissionId) => {
          if (action === "review") {
            await runSubmissionReview({
              submission_id: submissionId,
              agent_name: effectiveAgentName
            });
            return;
          }

          if (action === "summary") {
            const payload = await createReviewSummary({ submission_id: submissionId });
            setSummaryBySubmissionId((prev) => ({ ...prev, [submissionId]: payload }));
            return;
          }

          const existing = await getManualReviewForSubmission(submissionId);
          if (!existing.exists || !existing.review) {
            throw new Error("未找到手工批改草稿，请先保存草稿后再批量发布。");
          }
          if (existing.review.status === "published") {
            return;
          }
          await publishManualReview({ submission_id: submissionId });
        }
      });

      setBatchFailedIds(result.failedIds);
      setBatchFailureMessages(result.failureMessages);
      if (result.failedIds.length > 0) {
        setBatchRetryContext({
          action,
          agentName: effectiveAgentName
        });
      }
      setBatchWasCancelled(result.cancelled);

      await loadDetail();
      setToast({
        type: result.failedIds.length > 0 || result.cancelled ? "error" : "ok",
        message:
          result.cancelled
            ? `批量${batchActionLabel(action)}已中止：完成 ${result.succeededIds.length + result.failedIds.length}/${result.total}，成功 ${result.succeededIds.length}，失败 ${result.failedIds.length}。`
            : result.failedIds.length > 0
              ? `批量${batchActionLabel(action)}完成：成功 ${result.succeededIds.length}，失败 ${result.failedIds.length}。可点击“重试失败项”。`
              : `批量${batchActionLabel(action)}完成：共 ${result.succeededIds.length} 项。`
      });
    } catch (batchError) {
      setToast({ type: "error", message: `批量${batchActionLabel(action)}执行失败：${(batchError as Error).message}` });
    } finally {
      setBatchRunning(false);
      setBatchCurrentSubmissionId(null);
      setReviewingSubmissionId("");
      setSummarizingSubmissionId("");
      setManualPublishingSubmissionId("");
      setBatchCancelRequested(false);
    }
  };

  const retryFailedBatchAction = async () => {
    if (!batchRetryContext || batchFailedIds.length === 0 || batchRunning) {
      return;
    }
    await executeBatchAction(batchRetryContext.action, batchFailedIds, batchRetryContext.agentName);
  };

  const requestBatchCancel = () => {
    if (!batchRunning || batchCancelRequested) {
      return;
    }
    batchCancelRef.current.cancelled = true;
    setBatchCancelRequested(true);
    setToast({
      type: "error",
      message: "已请求中止批量执行，当前项完成后会停止后续任务。"
    });
  };

  const goToWorkflowStep = (nextIndex: number) => {
    if (workflowAssignmentIds.length === 0 || nextIndex < 0 || nextIndex >= workflowAssignmentIds.length) {
      return;
    }
    const nextAssignmentId = workflowAssignmentIds[nextIndex];
    const encodedIds = encodeURIComponent(workflowAssignmentIds.join(","));
    router.push(`/teacher/assignments/${nextAssignmentId}?batch_ids=${encodedIds}&batch_index=${nextIndex}`);
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
            <Link className="underline" href="/teacher/tasks">
              返回任务中心
            </Link>
            <p className="text-slate-700">Assignment ID: {assignmentId}</p>
          </div>

          {workflowAssignmentIds.length > 1 && workflowIndex >= 0 ? (
            <div className="rounded-xl border border-slate-300/60 bg-white/75 px-4 py-3 text-xs text-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p>
                  跨任务批处理工作流：第 {workflowIndex + 1}/{workflowAssignmentIds.length} 个任务
                </p>
                <div className="flex items-center gap-2">
                  <button
                    className="btn-seal px-3 py-1 text-xs"
                    onClick={() => {
                      goToWorkflowStep(workflowIndex - 1);
                    }}
                    type="button"
                    disabled={workflowIndex <= 0}
                  >
                    上一个任务
                  </button>
                  <button
                    className="btn-ink px-3 py-1 text-xs"
                    onClick={() => {
                      goToWorkflowStep(workflowIndex + 1);
                    }}
                    type="button"
                    disabled={workflowIndex >= workflowAssignmentIds.length - 1}
                  >
                    下一个任务
                  </button>
                </div>
              </div>
            </div>
          ) : null}

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
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="text-xs text-slate-700">待老师回复：{pendingReplyCount}</p>
                  <button
                    className="btn-seal px-3 py-1 text-xs"
                    onClick={() => {
                      setShowOnlyPendingReplies((prev) => !prev);
                    }}
                    type="button"
                  >
                    {showOnlyPendingReplies ? "显示全部提交" : "只看待回复"}
                  </button>
                </div>
                <div className="fixed inset-x-0 top-3 z-40 px-3 md:px-8">
                  <div className="mx-auto max-w-6xl pointer-events-none">
                    <div className="pointer-events-auto rounded-xl border border-slate-300/70 bg-white/90 px-3 py-3 shadow-lg backdrop-blur">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-800">批量操作条（吸顶）</p>
                    <p className="text-[11px] text-slate-700">
                      状态：
                      {batchRunning
                        ? batchCancelRequested
                          ? " 中止中（当前项完成后停止）"
                          : " 执行中"
                        : batchWasCancelled
                          ? " 已中止"
                          : batchAction
                            ? " 已完成"
                            : " 待执行"}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      className="btn-seal px-3 py-1 text-xs"
                      onClick={toggleSelectVisibleSubmissions}
                      type="button"
                      disabled={batchRunning || visibleSubmissionIds.length === 0}
                    >
                      {allVisibleSelected ? "取消勾选当前列表" : "勾选当前列表"}
                    </button>
                    <span className="text-xs text-slate-700">
                      已选 {selectedSubmissionIds.length} 项（当前列表已选 {selectedVisibleCount}/{visibleSubmissionIds.length}）
                    </span>
                    <select
                      className="field w-40 text-xs"
                      value={batchAgentName}
                      onChange={(event) => setBatchAgentName(event.target.value as ReviewAgentName)}
                      disabled={batchRunning}
                    >
                      <option value="value">立意 Agent</option>
                      <option value="structure">结构 Agent</option>
                      <option value="language">语言 Agent</option>
                    </select>
                    <button
                      className="btn-ink px-3 py-1 text-xs"
                      onClick={() => {
                        void executeBatchAction("review", selectedSubmissionIds);
                      }}
                      type="button"
                      disabled={batchRunning || selectedSubmissionIds.length === 0}
                    >
                      批量 Agent 批改
                    </button>
                    <button
                      className="btn-seal px-3 py-1 text-xs"
                      onClick={() => {
                        void executeBatchAction("summary", selectedSubmissionIds);
                      }}
                      type="button"
                      disabled={batchRunning || selectedSubmissionIds.length === 0}
                    >
                      批量生成汇总
                    </button>
                    <button
                      className="btn-seal px-3 py-1 text-xs"
                      onClick={() => {
                        void executeBatchAction("publish", selectedSubmissionIds);
                      }}
                      type="button"
                      disabled={batchRunning || selectedSubmissionIds.length === 0}
                    >
                      批量发布
                    </button>
                    {batchRunning ? (
                      <button
                        className="btn-ink px-3 py-1 text-xs"
                        onClick={requestBatchCancel}
                        type="button"
                        disabled={batchCancelRequested}
                      >
                        {batchCancelRequested ? "中止中..." : "中止执行"}
                      </button>
                    ) : null}
                    {batchFailedIds.length > 0 ? (
                      <button
                        className="btn-ink px-3 py-1 text-xs"
                        onClick={() => {
                          void retryFailedBatchAction();
                        }}
                        type="button"
                        disabled={batchRunning}
                      >
                        重试失败项（{batchFailedIds.length}）
                      </button>
                    ) : null}
                  </div>
                  {batchAction && batchTotal > 0 ? (
                    <div className="mt-3 rounded-md border border-slate-300/60 bg-white/80 px-3 py-2 text-xs text-slate-700">
                      <p>
                        当前批量：{batchActionLabel(batchAction)} · 进度 {batchCompleted}/{batchTotal} · 成功 {batchSucceeded} · 失败{" "}
                        {batchFailed}
                        {batchWasCancelled && !batchRunning ? " · 已中止" : ""}
                      </p>
                      <div className="mt-2 h-2 w-full rounded bg-slate-200">
                        <div
                          className="h-2 rounded bg-emerald-600/80 transition-all"
                          style={{ width: `${batchTotal > 0 ? Math.round((batchCompleted / batchTotal) * 100) : 0}%` }}
                        />
                      </div>
                      {batchCurrentSubmissionId ? (
                        <p className="mt-2">
                          正在处理：{submissionNameById[batchCurrentSubmissionId] || "未知学生"}（{batchCurrentSubmissionId}）
                        </p>
                      ) : null}
                      {batchFailedIds.length > 0 ? (
                        <ul className="mt-2 list-disc space-y-1 pl-4 text-rose-900">
                          {batchFailedIds.slice(0, 5).map((submissionId) => (
                            <li key={submissionId}>
                              {submissionNameById[submissionId] || submissionId}：{batchFailureMessages[submissionId]}
                            </li>
                          ))}
                          {batchFailedIds.length > 5 ? <li>其余 {batchFailedIds.length - 5} 项可点击重试失败项处理。</li> : null}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                    </div>
                  </div>
                </div>
                <div className="h-24 md:h-20" aria-hidden />
                <ul className="mt-3 space-y-2">
                  {visibleSubmissions.length === 0 ? (
                    <li className="text-sm text-slate-600">暂无学生提交，后续可接入 Agent 批改流程。</li>
                  ) : (
                    visibleSubmissions.map((submission) => {
                      const queueItem = queueBySubmissionId[submission.submission_id];
                      const isEditingManual = manualEditingSubmissionId === submission.submission_id;
                      const isManualLoading = manualLoadingSubmissionId === submission.submission_id;
                      const isManualSaving = manualSavingSubmissionId === submission.submission_id;
                      const isManualPublishing = manualPublishingSubmissionId === submission.submission_id;
                      const replyThread = replyThreadBySubmissionId[submission.submission_id];
                      const replyDraft = replyDraftBySubmissionId[submission.submission_id] || "";
                      const isReplyLoading = replyLoadingSubmissionId === submission.submission_id;
                      const isReplySubmitting = replySubmittingSubmissionId === submission.submission_id;

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
                          <div className="flex items-center justify-between gap-3">
                            <label className="flex items-center gap-2 font-semibold">
                              <input
                                type="checkbox"
                                checked={selectedSubmissionIds.includes(submission.submission_id)}
                                onChange={() => {
                                  toggleSelectSubmission(submission.submission_id);
                                }}
                                disabled={batchRunning}
                              />
                              <span>
                                {submission.student_name} · {submission.content_type}
                              </span>
                            </label>
                          </div>
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
                          {queueItem?.manual_status === "published" ? (
                            <p className="mt-1 text-xs text-slate-600">
                              批改沟通：学生 {queueItem.student_reply_count} · 老师 {queueItem.teacher_reply_count}
                              {queueItem.pending_teacher_reply ? " · 待老师回复" : ""}
                              {queueItem.last_reply_at ? ` · 最近互动 ${queueItem.last_reply_at}` : ""}
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
                              disabled={isManualLoading || batchRunning}
                            >
                              {isManualLoading ? "加载批改中..." : isEditingManual ? "继续编辑手工批改" : "手工批改"}
                            </button>
                            <select
                              className="field w-44 text-xs"
                              value={agentBySubmission[submission.submission_id] ?? "value"}
                              disabled={batchRunning}
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
                              disabled={reviewingSubmissionId === submission.submission_id || batchRunning}
                            >
                              {reviewingSubmissionId === submission.submission_id ? "批改中..." : "调用 Agent 批改"}
                            </button>
                            <button
                              className="btn-seal px-3 py-1 text-xs"
                              onClick={() => {
                                void loadStudentMemory(submission.student_id);
                              }}
                              type="button"
                              disabled={memoryLoadingStudentId === submission.student_id || batchRunning}
                            >
                              {memoryLoadingStudentId === submission.student_id ? "加载中..." : "查看长期记忆"}
                            </button>
                            <button
                              className="btn-seal px-3 py-1 text-xs"
                              onClick={() => {
                                void generateSummary(submission.submission_id);
                              }}
                              type="button"
                              disabled={summarizingSubmissionId === submission.submission_id || batchRunning}
                            >
                              {summarizingSubmissionId === submission.submission_id ? "汇总中..." : "生成多 Agent 汇总"}
                            </button>
                            <button
                              className="btn-seal px-3 py-1 text-xs"
                              onClick={() => {
                                void loadReplyThread(submission.submission_id);
                              }}
                              type="button"
                              disabled={isReplyLoading || batchRunning}
                            >
                              {isReplyLoading ? "加载回复中..." : "查看批改回复"}
                            </button>
                          </div>

                          {replyThread ? (
                            <div className="mt-3 rounded-md border border-slate-300/60 bg-slate-50/70 px-3 py-3">
                              <p className="text-xs font-semibold text-slate-800">批改回复沟通区</p>
                              <ul className="mt-2 space-y-1 text-xs text-slate-700">
                                {replyThread.length === 0 ? (
                                  <li>暂无回复记录。</li>
                                ) : (
                                  replyThread.map((reply) => (
                                    <li key={reply.reply_id} className="rounded bg-white px-2 py-1">
                                      <p className="font-semibold">
                                        {reply.author_role === "teacher" ? "老师" : "学生"} ·{" "}
                                        {new Date(reply.created_at).toLocaleString("zh-CN", { hour12: false })}
                                      </p>
                                      <p className="mt-1">{reply.content}</p>
                                    </li>
                                  ))
                                )}
                              </ul>
                              <div className="mt-2 flex flex-col gap-2">
                                <textarea
                                  className="field min-h-16 text-xs"
                                  value={replyDraft}
                                  onChange={(event) =>
                                    setReplyDraftBySubmissionId((prev) => ({
                                      ...prev,
                                      [submission.submission_id]: event.target.value
                                    }))
                                  }
                                  placeholder="给学生的后续指导，例如：下一稿重点完善第二段过渡。"
                                />
                                <button
                                  className="btn-ink w-fit px-3 py-1 text-xs"
                                  onClick={() => {
                                    void submitTeacherReply(submission.submission_id);
                                  }}
                                  type="button"
                                  disabled={isReplySubmitting || batchRunning}
                                >
                                  {isReplySubmitting ? "发送中..." : "发送教师回复"}
                                </button>
                              </div>
                            </div>
                          ) : null}

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
                                      disabled={isManualSaving || isManualPublishing || batchRunning}
                                    >
                                      {isManualSaving ? "保存中..." : "保存草稿"}
                                    </button>
                                    <button
                                      className="btn-ink px-3 py-1 text-xs"
                                      onClick={() => {
                                        void onPublishManualReview(submission.submission_id);
                                      }}
                                      type="button"
                                      disabled={isManualSaving || isManualPublishing || batchRunning}
                                    >
                                      {isManualPublishing ? "发布中..." : "发布给学生"}
                                    </button>
                                    <button
                                      className="underline text-xs"
                                      onClick={() => {
                                        setManualEditingSubmissionId("");
                                      }}
                                      type="button"
                                      disabled={isManualSaving || isManualPublishing || batchRunning}
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
                <p className="label">任务沟通面板（按学生）</p>
                <p className="mt-2 text-sm text-slate-700">
                  共 {communicationItems.length} 位学生有沟通线程，优先处理“待老师回复”项。
                </p>
                <ul className="mt-3 space-y-2">
                  {communicationItems.length === 0 ? (
                    <li className="text-sm text-slate-600">当前任务还没有沟通记录。</li>
                  ) : (
                    communicationItems.map((item) => (
                      <li
                        key={item.student_id}
                        className="rounded-lg border border-slate-300/50 bg-white/60 px-3 py-3 text-sm text-slate-800"
                      >
                        <p className="font-semibold">{item.student_name}</p>
                        <p className="mt-1 text-xs text-slate-700">
                          学生回复 {item.student_reply_count} · 老师回复 {item.teacher_reply_count} · 总消息 {item.reply_total_count}
                        </p>
                        <p className="mt-1 text-xs text-slate-700">
                          待老师回复 {item.pending_teacher_reply_count} · 学生未读老师回复 {item.unread_by_student_reply_count}
                        </p>
                        <p className="mt-1 text-xs text-slate-700">
                          最近发言：{item.latest_reply_role || "--"} · {item.latest_reply_at || "--"}
                        </p>
                        {item.latest_reply_content ? (
                          <p className="mt-1 rounded bg-white/80 px-2 py-1 text-xs text-slate-700">{item.latest_reply_content}</p>
                        ) : null}
                        {item.submission_ids.length > 0 ? (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <button
                              className="btn-seal px-3 py-1 text-xs"
                              onClick={() => {
                                void loadReplyThread(item.submission_ids[0]);
                              }}
                              type="button"
                            >
                              查看该生最近线程
                            </button>
                            <span className="text-xs text-slate-600">Submission: {item.submission_ids[0]}</span>
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
