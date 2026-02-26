import { defaultWorkspaceByRole } from "@/lib/auth/redirect";

export function resolveNextActionPath(nextAction: string | null | undefined): string {
  if (nextAction === "onboarding_student") {
    return "/onboarding/student";
  }
  if (nextAction === "onboarding_teacher") {
    return defaultWorkspaceByRole("teacher");
  }
  if (nextAction === "redirect_to_student_workbench" || nextAction === "redirect_to_student_workspace") {
    return defaultWorkspaceByRole("student");
  }
  if (nextAction === "redirect_to_teacher_workbench" || nextAction === "redirect_to_teacher_workspace") {
    return defaultWorkspaceByRole("teacher");
  }
  return "/";
}
