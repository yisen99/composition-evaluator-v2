"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { StudentOnboardingWizard } from "./_components/StudentOnboardingWizard";

export default function StudentOnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    const session = getAuthSession();

    // Redirect to login if not authenticated
    if (!session) {
      router.push("/login?next=/onboarding/student");
      return;
    }

    // Redirect if not a student
    if (session.user.role !== "student") {
      router.push("/teacher/tasks");
      return;
    }
  }, [router]);

  return <StudentOnboardingWizard />;
}
