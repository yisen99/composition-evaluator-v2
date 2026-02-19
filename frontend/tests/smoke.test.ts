import { describe, expect, it, vi } from "vitest";
import {
  buildApiPath,
  checkHealth,
  login,
  loginWithPassword,
  registerAccount,
  createReviewSummary,
  createCompositionSubmission,
  createAssignment,
  createClass,
  getAssignmentGradingQueue,
  getManualReviewForSubmission,
  getMyProgress,
  listMyManualFeedback,
  listMySubmissions,
  publishManualReview,
  saveManualReviewDraft,
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

  it("creates review summary via proxy api", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          submission_id: "sub-1",
          assignment_id: "asg-1",
          class_id: "class-1",
          student_id: "student-1",
          total_score: 85,
          radar: { structure: 84, language: 86, value: 85 },
          items: [
            { agent_name: "structure", score: 84, feedback: "结构较清晰。" },
            { agent_name: "language", score: 86, feedback: "语言较准确。" },
            { agent_name: "value", score: 85, feedback: "立意较完整。" }
          ],
          actionable_suggestions: ["补充细节描写。", "结尾增加反思。"],
          rewrite_paragraph: "清晨的冷风掠过操场，我把围巾拉紧，忽然看见跑道旁的银杏叶一片片旋落。"
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", mockFetch);

    const data = await createReviewSummary({ submission_id: "sub-1" });
    expect(data.total_score).toBe(85);
    expect(data.items).toHaveLength(3);
    expect(data.rewrite_paragraph.length).toBeGreaterThan(10);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/backend/api/v1/reviews/summary",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ submission_id: "sub-1" })
      })
    );

    vi.unstubAllGlobals();
  });

  it("gets manual review for submission via proxy api", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          submission_id: "sub-1",
          exists: true,
          review: {
            review_id: "mr-1",
            submission_id: "sub-1",
            assignment_id: "asg-1",
            class_id: "class-1",
            student_id: "student-1",
            teacher_id: "teacher-1",
            structure_score: 86,
            language_score: 88,
            value_score: 90,
            total_score: 88,
            summary_feedback: "结构清楚，细节可再加强。",
            actionable_suggestions: ["补充动作细节。", "结尾增加反思。"],
            status: "draft",
            version: 1,
            created_at: "2026-02-19T02:00:00Z",
            updated_at: "2026-02-19T02:00:00Z",
            published_at: null
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", mockFetch);

    const data = await getManualReviewForSubmission("sub-1");
    expect(data.exists).toBe(true);
    expect(data.review?.total_score).toBe(88);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/backend/api/v1/manual-reviews/submission/sub-1",
      expect.objectContaining({ method: "GET" })
    );

    vi.unstubAllGlobals();
  });

  it("saves manual review draft via proxy api", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          review_id: "mr-1",
          submission_id: "sub-1",
          assignment_id: "asg-1",
          class_id: "class-1",
          student_id: "student-1",
          teacher_id: "teacher-1",
          structure_score: 86,
          language_score: 88,
          value_score: 90,
          total_score: 88,
          summary_feedback: "结构清楚，细节可再加强。",
          actionable_suggestions: ["补充动作细节。", "结尾增加反思。"],
          status: "draft",
          version: 1,
          created_at: "2026-02-19T02:00:00Z",
          updated_at: "2026-02-19T02:00:00Z",
          published_at: null
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", mockFetch);

    const payload = {
      submission_id: "sub-1",
      structure_score: 86,
      language_score: 88,
      value_score: 90,
      summary_feedback: "结构清楚，细节可再加强。",
      actionable_suggestions: ["补充动作细节。", "结尾增加反思。"]
    };
    const data = await saveManualReviewDraft(payload);
    expect(data.status).toBe("draft");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/backend/api/v1/manual-reviews/draft",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload)
      })
    );

    vi.unstubAllGlobals();
  });

  it("publishes manual review via proxy api", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          review_id: "mr-1",
          submission_id: "sub-1",
          assignment_id: "asg-1",
          class_id: "class-1",
          student_id: "student-1",
          teacher_id: "teacher-1",
          structure_score: 86,
          language_score: 88,
          value_score: 90,
          total_score: 88,
          summary_feedback: "结构清楚，细节可再加强。",
          actionable_suggestions: ["补充动作细节。", "结尾增加反思。"],
          status: "published",
          version: 2,
          created_at: "2026-02-19T02:00:00Z",
          updated_at: "2026-02-19T02:10:00Z",
          published_at: "2026-02-19T02:10:00Z"
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", mockFetch);

    const data = await publishManualReview({ submission_id: "sub-1" });
    expect(data.status).toBe("published");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/backend/api/v1/manual-reviews/publish",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ submission_id: "sub-1" })
      })
    );

    vi.unstubAllGlobals();
  });

  it("gets assignment grading queue via proxy api", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          assignment_id: "asg-1",
          class_id: "class-1",
          total_submissions: 1,
          manual_draft_count: 0,
          manual_published_count: 1,
          items: [
            {
              submission_id: "sub-1",
              student_id: "student-1",
              student_name: "小明",
              content_type: "text",
              submitted_at: "2026-02-19T01:00:00Z",
              manual_status: "published",
              manual_total_score: 88,
              manual_updated_at: "2026-02-19T02:10:00Z",
              manual_published_at: "2026-02-19T02:10:00Z"
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", mockFetch);

    const data = await getAssignmentGradingQueue("asg-1");
    expect(data.total_submissions).toBe(1);
    expect(data.items[0].manual_status).toBe("published");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/backend/api/v1/assignments/asg-1/grading-queue",
      expect.objectContaining({ method: "GET" })
    );

    vi.unstubAllGlobals();
  });

  it("gets student progress via proxy api", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          student_id: "student-1",
          total_submissions: 2,
          latest_score: 86,
          average_score: 83,
          best_score: 86,
          score_delta_from_first: 6,
          trajectory: [
            { index: 1, submitted_at: "2026-02-18T01:00:00Z", total_score: 80 },
            { index: 2, submitted_at: "2026-02-19T01:00:00Z", total_score: 86 }
          ],
          submissions: []
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", mockFetch);

    const data = await getMyProgress();
    expect(data.total_submissions).toBe(2);
    expect(data.latest_score).toBe(86);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/backend/api/v1/students/me/progress",
      expect.objectContaining({ method: "GET" })
    );

    vi.unstubAllGlobals();
  });

  it("lists student submissions via proxy api", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            submission_id: "sub-1",
            assignment_id: "asg-1",
            assignment_title: "我的校园",
            class_id: "class-1",
            class_name: "三年级一班",
            content_type: "text",
            status: "submitted",
            created_at: "2026-02-19T00:00:00Z",
            text_excerpt: "操场上有风，树叶在阳光下发亮。"
          }
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", mockFetch);

    const data = await listMySubmissions();
    expect(data).toHaveLength(1);
    expect(data[0].submission_id).toBe("sub-1");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/backend/api/v1/submissions/me",
      expect.objectContaining({ method: "GET" })
    );

    vi.unstubAllGlobals();
  });

  it("lists published manual feedback via proxy api", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            submission_id: "sub-1",
            assignment_id: "asg-1",
            assignment_title: "我的校园",
            class_id: "class-1",
            class_name: "三年级一班",
            content_type: "text",
            created_at: "2026-02-19T00:00:00Z",
            manual_total_score: 88,
            structure_score: 86,
            language_score: 88,
            value_score: 90,
            summary_feedback: "结构清楚，细节可再加强。",
            actionable_suggestions: ["补充动作细节。", "结尾增加反思。"],
            strengths: "开头切题快。",
            next_goal: "练习过渡句。",
            manual_published_at: "2026-02-19T02:10:00Z"
          }
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", mockFetch);

    const data = await listMyManualFeedback();
    expect(data).toHaveLength(1);
    expect(data[0].manual_total_score).toBe(88);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/backend/api/v1/submissions/me/manual-feedback",
      expect.objectContaining({ method: "GET" })
    );

    vi.unstubAllGlobals();
  });

  it("registers account via mature auth backend", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "user-1",
          email: "teacher@example.com",
          role: "teacher",
          display_name: "账号老师",
          phone: "13800138000",
          is_active: true,
          is_superuser: false,
          is_verified: false
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", mockFetch);

    const payload = {
      email: "teacher@example.com",
      password: "SecurePass123!",
      role: "teacher" as const,
      display_name: "账号老师",
      phone: "13800138000"
    };
    const data = await registerAccount(payload);
    expect(data.id).toBe("user-1");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/backend/api/v1/auth/register",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload)
      })
    );

    vi.unstubAllGlobals();
  });

  it("maps register duplicate error to friendly chinese message", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "REGISTER_USER_ALREADY_EXISTS" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      registerAccount({
        email: "teacher@example.com",
        password: "SecurePass123!",
        role: "teacher",
        display_name: "账号老师",
        phone: "13800138000"
      })
    ).rejects.toThrow("该邮箱或手机号已被注册，请更换后重试。");

    vi.unstubAllGlobals();
  });

  it("maps teacher sms disabled error to friendly chinese message", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "Teacher SMS signup is disabled" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      login({
        phone: "13800138000",
        code: "123456",
        display_name: "王老师"
      })
    ).rejects.toThrow("老师账号不支持短信注册，请使用邮箱密码注册/登录。");

    vi.unstubAllGlobals();
  });

  it("maps overdue submission error to friendly chinese message", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "Assignment due date has passed" }), {
        status: 409,
        headers: { "Content-Type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      createCompositionSubmission({
        assignment_id: "asg-1",
        content_type: "text",
        text_content: "测试"
      })
    ).rejects.toThrow("任务已截止，无法继续提交。");

    vi.unstubAllGlobals();
  });

  it("maps file too large error to friendly chinese message", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "File is too large. Max bytes: 10485760" }), {
        status: 413,
        headers: { "Content-Type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      createCompositionSubmission({
        assignment_id: "asg-1",
        content_type: "document",
        file: new File(["x"], "essay.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })
      })
    ).rejects.toThrow("文件过大，请控制在 10MB 内后重试。");

    vi.unstubAllGlobals();
  });

  it("logs in with password via mature auth backend", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "jwt-token", token_type: "bearer" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "user-1",
            email: "teacher@example.com",
            role: "teacher",
            display_name: "账号老师",
            phone: "13800138000",
            is_active: true,
            is_superuser: false,
            is_verified: false
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );
    vi.stubGlobal("fetch", mockFetch);

    const data = await loginWithPassword("teacher@example.com", "SecurePass123!");
    expect(data.access_token).toBe("jwt-token");
    expect(data.user.role).toBe("teacher");
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      "/api/backend/api/v1/auth/jwt/login",
      expect.objectContaining({
        method: "POST"
      })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "/api/backend/api/v1/auth/me",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer jwt-token" })
      })
    );

    vi.unstubAllGlobals();
  });
});
