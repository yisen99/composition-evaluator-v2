import { withNextPath } from "@/lib/auth/redirect";
import type { AuthRole } from "@/lib/auth/session";

function normalizeRole(rawRole: string | null | undefined): AuthRole | null {
  if (rawRole === "teacher" || rawRole === "student") {
    return rawRole;
  }
  return null;
}

export function requiredRoleForPath(pathname: string): AuthRole | null {
  if (pathname === "/teacher" || pathname.startsWith("/teacher/")) {
    return "teacher";
  }
  if (pathname === "/student" || pathname.startsWith("/student/")) {
    return "student";
  }
  return null;
}

export function resolveRouteGuardRedirect(pathAndQuery: string, roleFromCookie: string | null | undefined): string | null {
  const pathname = pathAndQuery.split("?")[0] ?? pathAndQuery;
  const requiredRole = requiredRoleForPath(pathname);
  if (!requiredRole) {
    return null;
  }

  const currentRole = normalizeRole(roleFromCookie);
  if (currentRole === requiredRole) {
    return null;
  }

  return withNextPath(requiredRole === "teacher" ? "/login/teacher" : "/login/student", pathAndQuery);
}
