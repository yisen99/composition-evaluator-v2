import type {
  AccountRegisterRequest,
  AccountRegisterResponse,
  AssignmentDetailResponse,
  AssignmentListItem,
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
  ReviewSummaryRequest,
  ReviewSummaryResponse,
  RunSubmissionReviewRequest,
  RunSubmissionReviewResponse,
  SendCodeRequest,
  SendCodeResponse,
  StudentProgressResponse,
  StudentMemoryResponse
} from "@/lib/api/types";
import { getAccessToken } from "@/lib/auth/session";

export const API_PROXY_PREFIX = "/api/backend";
const API_ERROR_MESSAGES: Record<string, string> = {
  REGISTER_USER_ALREADY_EXISTS: "该邮箱或手机号已被注册，请更换后重试。",
  LOGIN_BAD_CREDENTIALS: "账号或密码错误，请检查后重试。",
  "Teacher SMS signup is disabled": "老师账号不支持短信注册，请使用邮箱密码注册/登录。"
};

type ErrorDetailItem = {
  msg?: string;
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

  const response = await fetch(buildApiPath(path), {
    ...init,
    headers
  });

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

  const response = await fetch(buildApiPath(path), {
    method: "POST",
    headers,
    body: formData
  });

  if (!response.ok) {
    throw await createApiError(response);
  }

  return (await response.json()) as T;
}

async function apiRequestWithToken<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
  if (init?.headers) {
    Object.assign(headers, init.headers as Record<string, string>);
  }

  const response = await fetch(buildApiPath(path), {
    ...init,
    headers
  });
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

export function registerAccount(payload: AccountRegisterRequest): Promise<AccountRegisterResponse> {
  return apiRequest<AccountRegisterResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  }, false);
}

export async function loginWithPassword(email: string, password: string): Promise<LoginResponse> {
  const form = new URLSearchParams();
  form.set("username", email);
  form.set("password", password);

  const tokenPayload = await apiRequest<{ access_token: string; token_type: string }>(
    "/api/v1/auth/jwt/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString()
    },
    false
  );

  const profile = await apiRequestWithToken<AccountRegisterResponse>("/api/v1/auth/me", tokenPayload.access_token, {
    method: "GET"
  });

  return {
    access_token: tokenPayload.access_token,
    refresh_token: "",
    user: {
      id: profile.id,
      role: profile.role,
      phone: profile.phone || profile.email,
      display_name: profile.display_name
    }
  };
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

export function getAssignmentDetail(assignmentId: string): Promise<AssignmentDetailResponse> {
  return apiRequest<AssignmentDetailResponse>(`/api/v1/assignments/${assignmentId}`, {
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

export function getMyProgress(): Promise<StudentProgressResponse> {
  return apiRequest<StudentProgressResponse>("/api/v1/students/me/progress", {
    method: "GET"
  });
}
