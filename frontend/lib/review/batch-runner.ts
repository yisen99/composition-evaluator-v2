export type BatchExecutionProgress = {
  total: number;
  completed: number;
  succeeded: number;
  failed: number;
  currentId: string | null;
};

export type BatchExecutionResult = {
  total: number;
  succeededIds: string[];
  failedIds: string[];
  failureMessages: Record<string, string>;
  cancelled: boolean;
};

type BatchRunnerParams = {
  ids: string[];
  worker: (id: string) => Promise<void>;
  onProgress?: (progress: BatchExecutionProgress) => void;
  isCancelled?: () => boolean;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Unknown batch execution error";
}

export async function executeBatchWithProgress({
  ids,
  worker,
  onProgress,
  isCancelled
}: BatchRunnerParams): Promise<BatchExecutionResult> {
  const total = ids.length;
  let completed = 0;
  let succeeded = 0;
  let failed = 0;
  let cancelled = false;
  const succeededIds: string[] = [];
  const failedIds: string[] = [];
  const failureMessages: Record<string, string> = {};

  onProgress?.({
    total,
    completed,
    succeeded,
    failed,
    currentId: null
  });

  for (const id of ids) {
    if (isCancelled?.()) {
      cancelled = true;
      break;
    }

    onProgress?.({
      total,
      completed,
      succeeded,
      failed,
      currentId: id
    });

    try {
      await worker(id);
      succeeded += 1;
      succeededIds.push(id);
    } catch (error) {
      failed += 1;
      failedIds.push(id);
      failureMessages[id] = toErrorMessage(error);
    } finally {
      completed += 1;
      onProgress?.({
        total,
        completed,
        succeeded,
        failed,
        currentId: id
      });
    }
  }

  onProgress?.({
    total,
    completed,
    succeeded,
    failed,
    currentId: null
  });

  return {
    total,
    succeededIds,
    failedIds,
    failureMessages,
    cancelled
  };
}
