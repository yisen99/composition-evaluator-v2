import type {
  HealthResponse,
  LoginRequest,
  LoginResponse,
  SendCodeRequest,
  SendCodeResponse
} from "@/lib/api/types";

export const API_PROXY_PREFIX = "/api/backend";

export function buildApiPath(path: string): string {
  return `${API_PROXY_PREFIX}${path.startsWith("/") ? path : `/${path}`}`;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildApiPath(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export function checkHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>("/api/v1/health");
}

export function sendCode(payload: SendCodeRequest): Promise<SendCodeResponse> {
  return apiRequest<SendCodeResponse>("/api/v1/auth/send-code", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function login(payload: LoginRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
