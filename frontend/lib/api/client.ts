import type {
  AccountRegisterRequest,
  AccountRegisterResponse,
  AuthRolesResponse,
  AssignmentCommunicationThreadsResponse,
  AssignmentGradingQueueResponse,
  AssignmentDetailResponse,
  AssignmentListItem,
  TeacherAssignmentBatchActionRequest,
  TeacherAssignmentBatchActionResponse,
  ClassListItem,
  CreateCompositionSubmissionRequest,
  CreateCompositionSubmissionResponse,
  CreateAssignmentRequest,
  CreateAssignmentResponse,
  CreateClassRequest,
  CreateClassResponse,
  HealthResponse,
  JoinClassRequest,
  JoinClassResponse,
  LoginRequest,
  LoginResponse,
  MarkManualFeedbackReadResponse,
  ManualReviewDraftRequest,
  ManualReviewItem,
  ManualReviewReplyItem,
  ManualReviewPublishRequest,
  ManualReviewSubmissionResponse,
  ReviewSummaryRequest,
  ReviewSummaryResponse,
  RefreshTokenRequest,
  RunSubmissionReviewRequest,
  RunSubmissionReviewResponse,
  SendCodeRequest,
  SendCodeResponse,
  StudentManualFeedbackItem,
  StudentProgressResponse,
  StudentSubmissionListItem,
  StudentMemoryResponse,
  SwitchRoleRequest,
  WechatAuthPayload,
  WechatAuthorizeResponse,
  WechatBindPhoneRequest,
  WechatBindSendCodeRequest,
  UxEventTrackRequest,
  UxEventTrackResponse,
  UxMetricsSummaryResponse
} from "@/lib/api/types";
import { getAccessToken } from "@/lib/auth/session";

export const API_PROXY_PREFIX = "/api/backend";
const API_ERROR_MESSAGES: Record<string, string> = {
  REGISTER_USER_ALREADY_EXISTS: "该邮箱或手机号已被注册，请更换后重试。",
  REGISTER_INVALID_PASSWORD: "密码不符合要求，请至少输入 8 位字符。",
  LOGIN_BAD_CREDENTIALS: "账号或密码错误，请检查后重试。",
  "Invalid email or password": "账号或密码错误，请检查后重试。",
  "Password should be at least 8 characters": "密码不符合要求，请至少输入 8 位字符。",
  "Teacher SMS signup is disabled": "当前手机号未绑定老师账号，请先使用邮箱密码登录。",
  "Casdoor OAuth is not configured": "微信登录尚未配置，请联系管理员。",
  "Wechat OAuth is not configured": "微信登录尚未配置，请联系管理员。",
  "Verification code requested too frequently": "验证码发送过于频繁，请稍后再试。",
  "Wechat account role mismatch": "该微信账号已绑定其他身份，请切换正确入口登录。",
  "Wechat bind ticket expired": "微信绑定已过期，请重新发起微信登录。",
  "Wechat bind ticket has been used": "该绑定票据已使用，请重新发起微信登录。",
  "Assignment due date has passed": "任务已截止，无法继续提交。",
  "Assignment is not open for submission": "当前任务未开放提交。",
  "Unsupported image file type": "图片格式不支持，请使用 jpg/jpeg/png/webp/gif。",
  "Unsupported document file type": "文档格式不支持，请使用 doc/docx/pdf/txt/md。",
  "Manual review draft not found": "尚未保存手工批改草稿，请先保存。",
  "Manual review is not published yet": "老师尚未发布手工批改，暂时不能回复。",
  "Role is not available for current account": "当前账号不具备该角色权限。"
};

type ErrorDetailItem = {
  msg?: string;
};

type ErrorDetailObject = {
  code?: unknown;
  reason?: unknown;
  msg?: unknown;
  message?: unknown;
};

export function buildApiPath(path: string): string {
  return `${API_PROXY_PREFIX}${path.startsWith("/") ? path : `/${path}`}`;
}

function extractErrorDetail(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const detail = (payload as { detail?: unknown }).detail;
  if (typeof detail === "string") {
    return detail;
  }

  if (typeof detail === "object" && detail && !Array.isArray(detail)) {
    const detailObject = detail as ErrorDetailObject;
    if (typeof detailObject.code === "string" && detailObject.code) {
      return detailObject.code;
    }
    if (typeof detailObject.reason === "string" && detailObject.reason) {
      return detailObject.reason;
    }
    if (typeof detailObject.msg === "string" && detailObject.msg) {
      return detailObject.msg;
    }
    if (typeof detailObject.message === "string" && detailObject.message) {
      return detailObject.message;
    }
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => (typeof item === "object" && item ? (item as ErrorDetailItem).msg : undefined))
      .filter((item): item is string => Boolean(item));
    if (messages.length > 0) {
      return messages.join("; ");
    }
  }

  const message = (payload as { message?: unknown }).message;
  return typeof message === "string" ? message : undefined;
}

function toDisplayErrorMessage(status: number, detail?: string): string {
  if (detail?.startsWith("File is too large")) {
    return "文件过大，请控制在 10MB 内后重试。";
  }
  if (detail?.includes("valid email address")) {
    return "邮箱格式不正确，请检查后重试。";
  }
  if (detail && API_ERROR_MESSAGES[detail]) {
    return API_ERROR_MESSAGES[detail];
  }
  if (detail) {
    return detail;
  }
  return `API request failed: ${status}`;
}

async function createApiError(response: Response): Promise<Error> {
  let detail: string | undefined;
  const contentType = response.headers.get("Content-Type") || "";

  if (contentType.includes("application/json")) {
    try {
      const payload = (await response.json()) as unknown;
      detail = extractErrorDetail(payload);
    } catch {
      detail = undefined;
    }
  } else {
    try {
      const text = await response.text();
      detail = text || undefined;
    } catch {
      detail = undefined;
    }
  }

  return new Error(toDisplayErrorMessage(response.status, detail));
}

async function apiRequest<T>(path: string, init?: RequestInit, withAuth = true): Promise<T> {
  const authToken = withAuth ? getAccessToken() : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (init?.headers) {
    Object.assign(headers, init.headers as Record<string, string>);
  }
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let response: Response;
  try {
    response = await fetch(buildApiPath(path), {
      ...init,
      headers
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    throw new Error(`网络连接异常，请稍后重试。${message ? ` (${message})` : ""}`);
  }

  if (!response.ok) {
    throw await createApiError(response);
  }

  return (await response.json()) as T;
}

async function apiFormRequest<T>(path: string, formData: FormData): Promise<T> {
  const authToken = getAccessToken();
  const headers: Record<string, string> = {};
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let response: Response;
  try {
    response = await fetch(buildApiPath(path), {
      method: "POST",
      headers,
      body: formData
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    throw new Error(`网络连接异常，请稍后重试。${message ? ` (${message})` : ""}`);
  }

  if (!response.ok) {
    throw await createApiError(response);
  }

  return (await response.json()) as T;
}

export function checkHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>("/api/v1/health", undefined, false);
}

export function sendCode(payload: SendCodeRequest): Promise<SendCodeResponse> {
  return apiRequest<SendCodeResponse>("/api/v1/auth/send-code", {
    method: "POST",
    body: JSON.stringify(payload)
  }, false);
}

export function login(payload: LoginRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  }, false);
}

export function refreshLogin(payload: RefreshTokenRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify(payload)
  }, false);
}

export function getAuthRoles(): Promise<AuthRolesResponse> {
  return apiRequest<AuthRolesResponse>("/api/v1/auth/roles", {
    method: "GET"
  });
}

export function switchAuthRole(payload: SwitchRoleRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/api/v1/auth/switch-role", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function registerAccount(payload: AccountRegisterRequest): Promise<AccountRegisterResponse> {
  return apiRequest<AccountRegisterResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  }, false);
}

export function getWechatAuthorizeUrl(role: "teacher" | "student", nextPath?: string | null): Promise<WechatAuthorizeResponse> {
  const query = new URLSearchParams({ role });
  if (nextPath) {
    query.set("next", nextPath);
  }
  return apiRequest<WechatAuthorizeResponse>(`/api/v1/auth/wechat/authorize?${query.toString()}`, {
    method: "GET"
  }, false);
}

export function wechatCallback(code: string, state: string): Promise<WechatAuthPayload> {
  const query = new URLSearchParams({ code, state });
  return apiRequest<WechatAuthPayload>(`/api/v1/auth/wechat/callback?${query.toString()}`, {
    method: "GET"
  }, false);
}

export function sendWechatBindCode(payload: WechatBindSendCodeRequest): Promise<SendCodeResponse> {
  return apiRequest<SendCodeResponse>("/api/v1/auth/wechat/send-bind-code", {
    method: "POST",
    body: JSON.stringify(payload)
  }, false);
}

export function bindWechatPhone(payload: WechatBindPhoneRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/api/v1/auth/wechat/bind-phone", {
    method: "POST",
    body: JSON.stringify(payload)
  }, false);
}

export async function loginWithPassword(email: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>(
    "/api/v1/auth/password-login",
    {
      method: "POST",
      body: JSON.stringify({ email, password })
    },
    false
  );
}

export function createClass(payload: CreateClassRequest): Promise<CreateClassResponse> {
  return apiRequest<CreateClassResponse>("/api/v1/classes", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function joinClass(payload: JoinClassRequest): Promise<JoinClassResponse> {
  return apiRequest<JoinClassResponse>("/api/v1/classes/join", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function createAssignment(payload: CreateAssignmentRequest): Promise<CreateAssignmentResponse> {
  return apiRequest<CreateAssignmentResponse>("/api/v1/assignments", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function listClasses(): Promise<ClassListItem[]> {
  return apiRequest<ClassListItem[]>("/api/v1/classes", {
    method: "GET"
  });
}

export function listAssignments(): Promise<AssignmentListItem[]> {
  return apiRequest<AssignmentListItem[]>("/api/v1/assignments", {
    method: "GET"
  });
}

export function executeTeacherAssignmentBatchAction(
  payload: TeacherAssignmentBatchActionRequest
): Promise<TeacherAssignmentBatchActionResponse> {
  return apiRequest<TeacherAssignmentBatchActionResponse>("/api/v1/assignments/batch/actions", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getAssignmentDetail(assignmentId: string): Promise<AssignmentDetailResponse> {
  return apiRequest<AssignmentDetailResponse>(`/api/v1/assignments/${assignmentId}`, {
    method: "GET"
  });
}

export function getAssignmentGradingQueue(assignmentId: string): Promise<AssignmentGradingQueueResponse> {
  return apiRequest<AssignmentGradingQueueResponse>(`/api/v1/assignments/${assignmentId}/grading-queue`, {
    method: "GET"
  });
}

export function getAssignmentCommunicationThreads(assignmentId: string): Promise<AssignmentCommunicationThreadsResponse> {
  return apiRequest<AssignmentCommunicationThreadsResponse>(`/api/v1/assignments/${assignmentId}/communication-threads`, {
    method: "GET"
  });
}

export function createCompositionSubmission(
  payload: CreateCompositionSubmissionRequest
): Promise<CreateCompositionSubmissionResponse> {
  const formData = new FormData();
  formData.append("assignment_id", payload.assignment_id);
  formData.append("content_type", payload.content_type);
  if (payload.text_content) {
    formData.append("text_content", payload.text_content);
  }
  if (payload.file) {
    formData.append("file", payload.file);
  }
  return apiFormRequest<CreateCompositionSubmissionResponse>("/api/v1/submissions", formData);
}

export function runSubmissionReview(payload: RunSubmissionReviewRequest): Promise<RunSubmissionReviewResponse> {
  return apiRequest<RunSubmissionReviewResponse>("/api/v1/reviews/run", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getStudentMemory(studentId: string): Promise<StudentMemoryResponse> {
  return apiRequest<StudentMemoryResponse>(`/api/v1/students/${studentId}/memory`, {
    method: "GET"
  });
}

export function createReviewSummary(payload: ReviewSummaryRequest): Promise<ReviewSummaryResponse> {
  return apiRequest<ReviewSummaryResponse>("/api/v1/reviews/summary", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getManualReviewForSubmission(submissionId: string): Promise<ManualReviewSubmissionResponse> {
  return apiRequest<ManualReviewSubmissionResponse>(`/api/v1/manual-reviews/submission/${submissionId}`, {
    method: "GET"
  });
}

export function saveManualReviewDraft(payload: ManualReviewDraftRequest): Promise<ManualReviewItem> {
  return apiRequest<ManualReviewItem>("/api/v1/manual-reviews/draft", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function publishManualReview(payload: ManualReviewPublishRequest): Promise<ManualReviewItem> {
  return apiRequest<ManualReviewItem>("/api/v1/manual-reviews/publish", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function listManualReviewRepliesForTeacher(submissionId: string): Promise<ManualReviewReplyItem[]> {
  return apiRequest<ManualReviewReplyItem[]>(`/api/v1/manual-reviews/submission/${submissionId}/replies`, {
    method: "GET"
  });
}

export function createManualReviewReplyForTeacher(submissionId: string, content: string): Promise<ManualReviewReplyItem> {
  return apiRequest<ManualReviewReplyItem>(`/api/v1/manual-reviews/submission/${submissionId}/replies`, {
    method: "POST",
    body: JSON.stringify({ content })
  });
}

export function getMyProgress(): Promise<StudentProgressResponse> {
  return apiRequest<StudentProgressResponse>("/api/v1/students/me/progress", {
    method: "GET"
  });
}

export function listMySubmissions(): Promise<StudentSubmissionListItem[]> {
  return apiRequest<StudentSubmissionListItem[]>("/api/v1/submissions/me", {
    method: "GET"
  });
}

export function listMyManualFeedback(): Promise<StudentManualFeedbackItem[]> {
  return apiRequest<StudentManualFeedbackItem[]>("/api/v1/submissions/me/manual-feedback", {
    method: "GET"
  });
}

export function listMyManualFeedbackReplies(submissionId: string): Promise<ManualReviewReplyItem[]> {
  return apiRequest<ManualReviewReplyItem[]>(`/api/v1/submissions/me/manual-feedback/replies?submission_id=${submissionId}`, {
    method: "GET"
  });
}

export function createMyManualFeedbackReply(submissionId: string, content: string): Promise<ManualReviewReplyItem> {
  return apiRequest<ManualReviewReplyItem>("/api/v1/submissions/me/manual-feedback/replies", {
    method: "POST",
    body: JSON.stringify({ submission_id: submissionId, content })
  });
}

export function markMyManualFeedbackRead(submissionIds: string[]): Promise<MarkManualFeedbackReadResponse> {
  return apiRequest<MarkManualFeedbackReadResponse>("/api/v1/submissions/me/manual-feedback/mark-read", {
    method: "POST",
    body: JSON.stringify({ submission_ids: submissionIds })
  });
}

export function trackUxEvent(payload: UxEventTrackRequest): Promise<UxEventTrackResponse> {
  return apiRequest<UxEventTrackResponse>("/api/v1/observability/events", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getUxMetricsSummary(days = 7): Promise<UxMetricsSummaryResponse> {
  return apiRequest<UxMetricsSummaryResponse>(`/api/v1/observability/summary?days=${days}`, {
    method: "GET"
  });
}
