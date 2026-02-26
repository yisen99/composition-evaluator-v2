import { useEffect, useRef, useState } from "react";

interface GradingFormData {
  structure_score: number;
  language_score: number;
  value_score: number;
  summary_feedback: string;
  actionable_suggestions: string[];
  strengths?: string;
  next_goal?: string;
}

interface UseAutoSaveDraftOptions {
  submissionId: string;
  isEnabled: boolean;
  delay?: number; // 默认 30 秒
  onSave: (data: GradingFormData) => Promise<void>;
}

interface AutoSaveStatus {
  isSaving: boolean;
  lastSavedAt: Date | null;
  hasUnsavedChanges: boolean;
  error: string | null;
}

export function useAutoSaveDraft({
  submissionId,
  isEnabled,
  delay = 30000,
  onSave,
}: UseAutoSaveDraftOptions) {
  const [status, setStatus] = useState<AutoSaveStatus>({
    isSaving: false,
    lastSavedAt: null,
    hasUnsavedChanges: false,
    error: null,
  });

  const draftDataRef = useRef<GradingFormData | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // 清理定时器
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // 保存草稿函数
  const saveDraft = async (data: GradingFormData) => {
    if (!isMountedRef.current || !isEnabled) return;

    setStatus((prev) => ({ ...prev, isSaving: true, error: null }));

    try {
      await onSave(data);

      if (isMountedRef.current) {
        setStatus((prev) => ({
          ...prev,
          isSaving: false,
          lastSavedAt: new Date(),
          hasUnsavedChanges: false,
          error: null,
        }));
      }
    } catch (error) {
      if (isMountedRef.current) {
        const errorMessage = error instanceof Error ? error.message : "保存失败";
        setStatus((prev) => ({
          ...prev,
          isSaving: false,
          error: errorMessage,
          hasUnsavedChanges: true,
        }));
      }
    }
  };

  // 触发自动保存(带防抖)
  const triggerAutoSave = (data: GradingFormData) => {
    draftDataRef.current = data;

    if (!isEnabled) return;

    setStatus((prev) => ({ ...prev, hasUnsavedChanges: true }));

    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 设置新的定时器
    timeoutRef.current = setTimeout(() => {
      if (draftDataRef.current && isMountedRef.current) {
        void saveDraft(draftDataRef.current);
      }
    }, delay);
  };

  // 立即保存(用于手动保存)
  const saveImmediately = async (data: GradingFormData) => {
    draftDataRef.current = data;

    // 取消待处理的自动保存
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    await saveDraft(data);
  };

  // 取消待处理的自动保存
  const cancelPendingSave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setStatus((prev) => ({ ...prev, hasUnsavedChanges: false }));
  };

  return {
    status,
    triggerAutoSave,
    saveImmediately,
    cancelPendingSave,
  };
}
