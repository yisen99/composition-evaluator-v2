import { describe, expect, it, vi } from "vitest";
import { executeBatchWithProgress } from "@/lib/review/batch-runner";

describe("executeBatchWithProgress", () => {
  it("runs ids in order and reports all success", async () => {
    const calls: string[] = [];
    const result = await executeBatchWithProgress({
      ids: ["a", "b", "c"],
      worker: async (id) => {
        calls.push(id);
      }
    });

    expect(calls).toEqual(["a", "b", "c"]);
    expect(result.succeededIds).toEqual(["a", "b", "c"]);
    expect(result.failedIds).toEqual([]);
    expect(result.failureMessages).toEqual({});
    expect(result.cancelled).toBe(false);
  });

  it("continues execution when some ids fail and collects errors", async () => {
    const result = await executeBatchWithProgress({
      ids: ["a", "b", "c"],
      worker: async (id) => {
        if (id === "b") {
          throw new Error("boom");
        }
      }
    });

    expect(result.succeededIds).toEqual(["a", "c"]);
    expect(result.failedIds).toEqual(["b"]);
    expect(result.failureMessages.b).toBe("boom");
    expect(result.cancelled).toBe(false);
  });

  it("emits progress updates including start and completion", async () => {
    const onProgress = vi.fn();
    await executeBatchWithProgress({
      ids: ["a", "b"],
      worker: async () => {},
      onProgress
    });

    expect(onProgress).toHaveBeenCalled();
    const first = onProgress.mock.calls[0][0];
    const last = onProgress.mock.calls[onProgress.mock.calls.length - 1][0];

    expect(first).toMatchObject({ total: 2, completed: 0, succeeded: 0, failed: 0, currentId: null });
    expect(last).toMatchObject({ total: 2, completed: 2, succeeded: 2, failed: 0, currentId: null });
  });

  it("stops processing remaining ids when cancellation is requested", async () => {
    const calls: string[] = [];
    let cancelled = false;

    const result = await executeBatchWithProgress({
      ids: ["a", "b", "c"],
      worker: async (id) => {
        calls.push(id);
        if (id === "a") {
          cancelled = true;
        }
      },
      isCancelled: () => cancelled
    });

    expect(calls).toEqual(["a"]);
    expect(result.succeededIds).toEqual(["a"]);
    expect(result.failedIds).toEqual([]);
    expect(result.cancelled).toBe(true);
  });
});
