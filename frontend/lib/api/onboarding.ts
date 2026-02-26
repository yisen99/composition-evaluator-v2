/**
 * Onboarding API functions
 */

import type { StudentOnboardingRequest, StudentOnboardingResponse } from "@/lib/api/types";
import { apiRequest } from "@/lib/api/client";

/**
 * Complete student onboarding by submitting required profile information
 * @param data - Student onboarding data
 * @returns Promise with onboarding completion status and next action
 */
export function completeStudentOnboarding(
  data: StudentOnboardingRequest
): Promise<StudentOnboardingResponse> {
  return apiRequest<StudentOnboardingResponse>("/api/v1/onboarding/student", {
    method: "POST",
    body: JSON.stringify(data)
  });
}
