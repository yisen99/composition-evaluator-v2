import { describe, expect, it, vi } from "vitest";
import {
  buildApiPath,
  checkHealth,
  createAssignment,
  createClass,
  joinClass
} from "@/lib/api/client";

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

  it("creates class via proxy api", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ class_id: "class-1", join_code: "ABC123" }), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", mockFetch);

    const payload = {
      teacher_id: "teacher-1",
      teacher_name: "王老师",
      name: "三年级一班",
      grade_band: "primary" as const
    };
    const data = await createClass(payload);

    expect(data.class_id).toBe("class-1");
    expect(data.join_code).toBe("ABC123");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/backend/api/v1/classes",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload)
      })
    );

    vi.unstubAllGlobals();
  });

  it("joins class via proxy api", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ class_id: "class-1", class_name: "三年级一班" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", mockFetch);

    const payload = {
      student_id: "student-1",
      student_name: "小明",
      join_code: "ABC123"
    };
    const data = await joinClass(payload);

    expect(data.class_id).toBe("class-1");
    expect(data.class_name).toBe("三年级一班");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/backend/api/v1/classes/join",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload)
      })
    );

    vi.unstubAllGlobals();
  });

  it("creates assignment via proxy api", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ assignment_id: "asg-1", class_id: "class-1", status: "published" }), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", mockFetch);

    const payload = {
      class_id: "class-1",
      teacher_id: "teacher-1",
      title: "我的家乡",
      prompt: "请写一篇介绍家乡景色与人情的作文。",
      due_at: "2026-03-01T23:59:59"
    };
    const data = await createAssignment(payload);

    expect(data.assignment_id).toBe("asg-1");
    expect(data.status).toBe("published");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/backend/api/v1/assignments",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload)
      })
    );

    vi.unstubAllGlobals();
  });
});
