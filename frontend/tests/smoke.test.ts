import { describe, expect, it, vi } from "vitest";
import {
  buildApiPath,
  checkHealth,
  createCompositionSubmission,
  createAssignment,
  createClass,
  getAssignmentDetail,
  getStudentMemory,
  joinClass,
  listAssignments,
  listClasses,
  runSubmissionReview
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

  it("lists classes via proxy api", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ class_id: "class-1", name: "三年级一班", grade_band: "primary", join_code: "ABC123" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", mockFetch);

    const data = await listClasses();
    expect(data).toHaveLength(1);
    expect(data[0].class_id).toBe("class-1");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/backend/api/v1/classes",
      expect.objectContaining({
        method: "GET"
      })
    );

    vi.unstubAllGlobals();
  });

  it("lists assignments via proxy api", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            assignment_id: "asg-1",
            class_id: "class-1",
            title: "我的家乡",
            prompt: "请写一篇介绍家乡景色与人情的作文。",
            due_at: "2026-03-01T23:59:59",
            status: "published"
          }
        ]),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      )
    );
    vi.stubGlobal("fetch", mockFetch);

    const data = await listAssignments();
    expect(data).toHaveLength(1);
    expect(data[0].assignment_id).toBe("asg-1");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/backend/api/v1/assignments",
      expect.objectContaining({
        method: "GET"
      })
    );

    vi.unstubAllGlobals();
  });

  it("gets assignment detail via proxy api", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          assignment_id: "asg-1",
          class_id: "class-1",
          teacher_id: "teacher-1",
          title: "我的家乡",
          prompt: "请写一篇介绍家乡景色与人情的作文。",
          due_at: "2026-03-01T23:59:59",
          status: "published",
          created_at: "2026-02-18T00:00:00Z",
          submissions_count: 1,
          submissions: [
            {
              submission_id: "sub-1",
              student_id: "student-1",
              student_name: "小明",
              content_type: "text",
              status: "submitted",
              created_at: "2026-02-18T01:00:00Z",
              text_excerpt: "今天我在校园里看到了第一朵迎春花。"
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", mockFetch);

    const data = await getAssignmentDetail("asg-1");

    expect(data.assignment_id).toBe("asg-1");
    expect(data.submissions_count).toBe(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/backend/api/v1/assignments/asg-1",
      expect.objectContaining({
        method: "GET"
      })
    );

    vi.unstubAllGlobals();
  });

  it("submits composition with form data via proxy api", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          submission_id: "sub-1",
          assignment_id: "asg-1",
          class_id: "class-1",
          student_id: "student-1",
          content_type: "text",
          status: "submitted",
          created_at: "2026-02-18T02:00:00Z"
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", mockFetch);

    const data = await createCompositionSubmission({
      assignment_id: "asg-1",
      content_type: "text",
      text_content: "今天我在校园里看到了第一朵迎春花。"
    });

    expect(data.submission_id).toBe("sub-1");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/backend/api/v1/submissions",
      expect.objectContaining({
        method: "POST",
        body: expect.any(FormData)
      })
    );

    vi.unstubAllGlobals();
  });

  it("runs submission review via proxy api", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          review_id: "review-1",
          submission_id: "sub-1",
          assignment_id: "asg-1",
          class_id: "class-1",
          student_id: "student-1",
          teacher_id: "teacher-1",
          agent_name: "value",
          score: 87,
          feedback: "立意评审建议补充具体事例。",
          memory_note_id: "note-1",
          status: "completed",
          created_at: "2026-02-18T02:30:00Z"
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", mockFetch);

    const data = await runSubmissionReview({
      submission_id: "sub-1",
      agent_name: "value"
    });

    expect(data.review_id).toBe("review-1");
    expect(data.score).toBe(87);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/backend/api/v1/reviews/run",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          submission_id: "sub-1",
          agent_name: "value"
        })
      })
    );

    vi.unstubAllGlobals();
  });

  it("gets student memory via proxy api", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          student_id: "student-1",
          total: 1,
          items: [
            {
              note_id: "note-1",
              student_id: "student-1",
              teacher_id: "teacher-1",
              class_id: "class-1",
              source_submission_id: "sub-1",
              source_review_id: "review-1",
              agent_name: "value",
              note: "立意基础良好，建议补强事例。",
              tags: "agent:value,score:87",
              status: "active",
              created_at: "2026-02-18T02:30:00Z"
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", mockFetch);

    const data = await getStudentMemory("student-1");
    expect(data.total).toBe(1);
    expect(data.items[0].note_id).toBe("note-1");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/backend/api/v1/students/student-1/memory",
      expect.objectContaining({
        method: "GET"
      })
    );

    vi.unstubAllGlobals();
  });
});
