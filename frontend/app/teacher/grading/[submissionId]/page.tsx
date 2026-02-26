"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getTeacherSubmissionDetail,
  getSubmissionManualReview,
  saveGradingDraft,
  publishGrading,
} from "@/lib/api/client";
import { getAuthSession } from "@/lib/auth/session";
import type { GradingData, ManualReviewItem, TeacherSubmissionDetail, UserProfile } from "@/lib/api/types";
import { SubmissionView } from "../_components/SubmissionView";
import { GradingForm } from "../_components/GradingForm";

type Toast = {
  type: "ok" | "error";
  message: string;
};

export default function GradingPage({ params }: { params: { submissionId: string } }) {
  const { submissionId } = params;
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [submission, setSubmission] = useState<TeacherSubmissionDetail | null>(null);
  const [existingReview, setExistingReview] = useState<ManualReviewItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    const session = getAuthSession();
    if (!session || session.user.role !== "teacher") {
      setToast({ type: "error", message: "需要教师权限才能访问此页面" });
      return;
    }
    setCurrentUser(session.user);
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    let cancelled = false;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [submissionData, reviewData] = await Promise.all([
          getTeacherSubmissionDetail(submissionId),
          getSubmissionManualReview(submissionId),
        ]);

        if (cancelled) return;

        setSubmission(submissionData);
        if (reviewData.exists && reviewData.review) {
          setExistingReview(reviewData.review);
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "加载数据失败";
          setToast({ type: "error", message: `加载失败：${message}` });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [currentUser, submissionId]);

  const handleSubmit = async (data: GradingData) => {
    setIsSubmitting(true);
    setToast(null);
    try {
      const result = await saveGradingDraft(submissionId, data);
      setExistingReview(result);
      setToast({ type: "ok", message: "草稿保存成功" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存失败";
      setToast({ type: "error", message: `保存失败：${message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setToast(null);
    try {
      const result = await publishGrading(submissionId);
      setExistingReview(result);
      setToast({ type: "ok", message: "批改已发布给学生" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "发布失败";
      setToast({ type: "error", message: `发布失败：${message}` });
    } finally {
      setIsPublishing(false);
    }
  };

  if (!currentUser) {
    return (
      <main className="mx-auto min-h-screen max-w-4xl p-6">
        <section className="poster-shell p-6">
          <div className="paper-card p-5">
            <h1 className="poster-title text-2xl font-bold">需要教师登录</h1>
            <p className="mt-2 text-sm text-slate-700">请先登录教师账号</p>
            <Link className="btn-ink mt-4 inline-block text-sm" href="/login/teacher">
              前往登录
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="mx-auto min-h-screen max-w-7xl p-6">
        <div className="flex items-center justify-center">
          <p className="text-slate-700">加载中...</p>
        </div>
      </main>
    );
  }

  if (!submission) {
    return (
      <main className="mx-auto min-h-screen max-w-4xl p-6">
        <section className="poster-shell p-6">
          <div className="paper-card p-5">
            <h1 className="poster-title text-2xl font-bold">未找到提交</h1>
            <p className="mt-2 text-sm text-slate-700">该提交不存在或您无权访问</p>
            <Link className="btn-ink mt-4 inline-block text-sm" href="/teacher">
              返回教师主页
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">批改作文</h1>
          <p className="mt-1 text-sm text-slate-700">
            任务：{submission.assignment_title} · 班级：{submission.class_name}
          </p>
        </div>
        <Link
          className="btn-ink text-sm"
          href={`/teacher/assignments/${submission.assignment_id}`}
        >
          返回任务详情
        </Link>
      </div>

      {/* Toast */}
      {toast ? (
        <div
          className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
            toast.type === "ok"
              ? "border-emerald-700/35 bg-emerald-50 text-emerald-900"
              : "border-rose-700/35 bg-rose-50 text-rose-900"
          }`}
        >
          {toast.message}
        </div>
      ) : null}

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        {/* Left: Submission Content */}
        <SubmissionView submission={submission} />

        {/* Right: Grading Form */}
        <GradingForm
          submissionId={submissionId}
          existingReview={existingReview}
          onSubmit={handleSubmit}
          onPublish={handlePublish}
          isSubmitting={isSubmitting}
          isPublishing={isPublishing}
        />
      </div>
    </main>
  );
}
