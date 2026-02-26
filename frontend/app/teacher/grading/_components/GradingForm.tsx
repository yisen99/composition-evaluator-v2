"use client";

import { type FormEvent, useEffect, useState } from "react";
import type { ManualReviewItem } from "@/lib/api/types";
import { useAutoSaveDraft } from "@/hooks/useAutoSaveDraft";

interface GradingFormProps {
  submissionId: string;
  existingReview?: ManualReviewItem | null;
  onSubmit: (data: {
    structure_score: number;
    language_score: number;
    value_score: number;
    summary_feedback: string;
    actionable_suggestions: string[];
    strengths?: string;
    next_goal?: string;
  }) => Promise<void>;
  onPublish: () => Promise<void>;
  isSubmitting: boolean;
  isPublishing: boolean;
  enableAutoSave?: boolean; // 是否启用自动保存
}

export function GradingForm({
  submissionId,
  existingReview,
  onSubmit,
  onPublish,
  isSubmitting,
  isPublishing,
  enableAutoSave = true, // 默认启用自动保存
}: GradingFormProps) {
  const [structureScore, setStructureScore] = useState(existingReview?.structure_score ?? 70);
  const [languageScore, setLanguageScore] = useState(existingReview?.language_score ?? 70);
  const [valueScore, setValueScore] = useState(existingReview?.value_score ?? 70);
  const [feedback, setFeedback] = useState(existingReview?.summary_feedback ?? "");
  const [strengths, setStrengths] = useState(existingReview?.strengths ?? "");
  const [nextGoal, setNextGoal] = useState(existingReview?.next_goal ?? "");
  const [suggestionsInput, setSuggestionsInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>(existingReview?.actionable_suggestions ?? []);

  const totalScore = Math.round((structureScore + languageScore + valueScore) / 3);

  // 自动保存 hook
  const { status: autoSaveStatus, triggerAutoSave, saveImmediately } = useAutoSaveDraft({
    submissionId,
    isEnabled: enableAutoSave,
    delay: 30000, // 30 秒防抖
    onSave: async (data) => {
      await onSubmit(data);
    },
  });

  // 构建当前表单数据
  const getCurrentFormData = () => ({
    structure_score: structureScore,
    language_score: languageScore,
    value_score: valueScore,
    summary_feedback: feedback,
    actionable_suggestions: suggestions,
    strengths: strengths || undefined,
    next_goal: nextGoal || undefined,
  });

  // 监听表单变化,触发自动保存
  useEffect(() => {
    if (!enableAutoSave) return;

    // 跳过初始化时的自动保存
    if (!existingReview && !autoSaveStatus.lastSavedAt) return;

    // 触发自动保存(30 秒防抖)
    triggerAutoSave(getCurrentFormData());
  }, [structureScore, languageScore, valueScore, feedback, strengths, nextGoal, suggestions]);

  // 格式化最后保存时间
  const formatLastSavedTime = () => {
    if (!autoSaveStatus.lastSavedAt) return null;
    const now = new Date();
    const diff = Math.floor((now.getTime() - autoSaveStatus.lastSavedAt.getTime()) / 1000);

    if (diff < 60) return "刚刚";
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
    return autoSaveStatus.lastSavedAt.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleAddSuggestion = () => {
    const trimmed = suggestionsInput.trim();
    if (trimmed && !suggestions.includes(trimmed)) {
      setSuggestions((prev) => [...prev, trimmed]);
      setSuggestionsInput("");
    }
  };

  const handleRemoveSuggestion = (index: number) => {
    setSuggestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // 使用立即保存而不是普通提交
    await saveImmediately(getCurrentFormData());
  };

  const isDraft = existingReview?.status === "draft";

  // 自动保存状态指示器
  const AutoSaveIndicator = () => {
    if (!enableAutoSave) return null;

    if (autoSaveStatus.isSaving) {
      return (
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
          <span>正在保存...</span>
        </div>
      );
    }

    if (autoSaveStatus.error) {
      return (
        <div className="flex items-center gap-2 text-xs text-rose-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>保存失败: {autoSaveStatus.error}</span>
        </div>
      );
    }

    if (autoSaveStatus.hasUnsavedChanges) {
      return (
        <div className="flex items-center gap-2 text-xs text-amber-600">
          <div className="h-2 w-2 rounded-full bg-amber-500" />
          <span>有未保存的更改...</span>
        </div>
      );
    }

    if (autoSaveStatus.lastSavedAt) {
      return (
        <div className="flex items-center gap-2 text-xs text-emerald-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>已保存 {formatLastSavedTime()}</span>
        </div>
      );
    }

    return null;
  };

  return (
    <form className="paper-card space-y-5 p-6" onSubmit={handleSubmit}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">批改表单</h2>
        <div className="flex items-center gap-3">
          <AutoSaveIndicator />
          {existingReview && (
            <span className={`seal-chip text-xs ${isDraft ? "bg-amber-50" : "bg-emerald-50"}`}>
              {isDraft ? "草稿" : "已发布"}
            </span>
          )}
        </div>
      </div>

      {/* Score Display */}
      <div className="rounded-lg bg-slate-50 p-4">
        <div className="mb-3 text-center">
          <p className="text-sm text-slate-700">总分</p>
          <p className="text-4xl font-bold text-emerald-700">{totalScore}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">结构分</label>
            <input
              type="range"
              min="0"
              max="100"
              value={structureScore}
              onChange={(e) => setStructureScore(Number(e.target.value))}
              className="w-full"
              disabled={isSubmitting}
            />
            <div className="mt-1 text-center text-sm font-medium text-slate-700">{structureScore}</div>
          </div>
          <div>
            <label className="label">语言分</label>
            <input
              type="range"
              min="0"
              max="100"
              value={languageScore}
              onChange={(e) => setLanguageScore(Number(e.target.value))}
              className="w-full"
              disabled={isSubmitting}
            />
            <div className="mt-1 text-center text-sm font-medium text-slate-700">{languageScore}</div>
          </div>
          <div>
            <label className="label">立意分</label>
            <input
              type="range"
              min="0"
              max="100"
              value={valueScore}
              onChange={(e) => setValueScore(Number(e.target.value))}
              className="w-full"
              disabled={isSubmitting}
            />
            <div className="mt-1 text-center text-sm font-medium text-slate-700">{valueScore}</div>
          </div>
        </div>
      </div>

      {/* Overall Feedback */}
      <div>
        <label htmlFor="feedback" className="label">
          总体评语 <span className="text-rose-600">*</span>
        </label>
        <textarea
          id="feedback"
          className="field min-h-32"
          placeholder="请输入对这篇作文的总体评价，包括鼓励性反馈和建设性意见..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          required
          disabled={isSubmitting}
        />
      </div>

      {/* Strengths */}
      <div>
        <label htmlFor="strengths" className="label">
          优点亮点
        </label>
        <textarea
          id="strengths"
          className="field min-h-20"
          placeholder="这篇作文的优点是什么？有哪些亮点值得表扬？"
          value={strengths}
          onChange={(e) => setStrengths(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      {/* Next Goal */}
      <div>
        <label htmlFor="nextGoal" className="label">
          下次目标
        </label>
        <textarea
          id="nextGoal"
          className="field min-h-20"
          placeholder="建议学生在下次写作中重点关注和改进的方面..."
          value={nextGoal}
          onChange={(e) => setNextGoal(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      {/* Actionable Suggestions */}
      <div>
        <label className="label">
          改进建议
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            className="field flex-1"
            placeholder="输入建议后按回车或点击添加"
            value={suggestionsInput}
            onChange={(e) => setSuggestionsInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddSuggestion();
              }
            }}
            disabled={isSubmitting}
          />
          <button
            type="button"
            className="btn-ink px-4 text-sm"
            onClick={handleAddSuggestion}
            disabled={isSubmitting || !suggestionsInput.trim()}
          >
            添加
          </button>
        </div>
        {suggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <span
                key={index}
                className="flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-sm"
              >
                {suggestion}
                <button
                  type="button"
                  className="ml-1 text-slate-500 hover:text-rose-600"
                  onClick={() => handleRemoveSuggestion(index)}
                  disabled={isSubmitting}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" className="btn-ink flex-1 text-sm" disabled={isSubmitting}>
          {isSubmitting ? "保存中..." : existingReview ? "更新草稿" : "保存草稿"}
        </button>
        {existingReview && (
          <button
            type="button"
            className="btn-seal flex-1 text-sm"
            onClick={onPublish}
            disabled={isPublishing || isDraft === false}
          >
            {isPublishing ? "发布中..." : "发布批改"}
          </button>
        )}
      </div>

      {isDraft && (
        <p className="text-xs text-slate-600">
          注意：草稿保存后不会发送给学生，点击“发布批改”后学生才能看到。
        </p>
      )}
    </form>
  );
}
