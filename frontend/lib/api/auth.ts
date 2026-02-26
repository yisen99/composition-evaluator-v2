/**
 * Auth API functions for unified login flow
 */

import type { LoginResponse, SendCodeResponse } from "@/lib/api/types";
import { buildApiPath } from "@/lib/api/client";

/**
 * Send verification code to phone number
 * @param phone - Phone number (11 digits, starts with 1)
 * @returns Promise with request_id and expires_in
 */
export async function sendVerificationCode(phone: string): Promise<SendCodeResponse> {
  const response = await fetch(buildApiPath("/api/v1/auth/send-code"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone,
      role_hint: "student", // Default to student, backend will determine actual role
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || "Failed to send verification code");
  }

  return response.json();
}

/**
 * Login with phone and verification code
 * @param phone - Phone number (11 digits, starts with 1)
 * @param code - Verification code (4 digits)
 * @returns Promise with access_token, refresh_token, user, and next_action
 */
export async function loginWithCode(
  phone: string,
  code: string
): Promise<LoginResponse & { next_action: string }> {
  const response = await fetch(buildApiPath("/api/v1/auth/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone,
      code,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || "Login failed");
  }

  return response.json();
}
