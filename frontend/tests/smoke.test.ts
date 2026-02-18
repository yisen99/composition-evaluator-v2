import { describe, expect, it, vi } from "vitest";
import { buildApiPath, checkHealth } from "@/lib/api/client";

describe("frontend smoke", () => {
  it("builds proxy api path", () => {
    expect(buildApiPath("/api/v1/health")).toBe("/api/backend/api/v1/health");
    expect(buildApiPath("api/v1/health")).toBe("/api/backend/api/v1/health");
  });

  it("calls health endpoint via proxy path", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok", service: "composition-evaluator-backend" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );

    vi.stubGlobal("fetch", mockFetch);

    const data = await checkHealth();
    expect(data.status).toBe("ok");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/backend/api/v1/health",
      expect.objectContaining({ headers: expect.objectContaining({ "Content-Type": "application/json" }) })
    );

    vi.unstubAllGlobals();
  });
});
