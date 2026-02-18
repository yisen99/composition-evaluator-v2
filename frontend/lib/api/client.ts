import type {
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
  SendCodeRequest,
  SendCodeResponse
} from "@/lib/api/types";
import { getAccessToken } from "@/lib/auth/session";

export const API_PROXY_PREFIX = "/api/backend";

export function buildApiPath(path: string): string {
  return `${API_PROXY_PREFIX}${path.startsWith("/") ? path : `/${path}`}`;
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
    throw new Error(`API request failed: ${response.status}`);
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
    throw new Error(`API request failed: ${response.status}`);
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
