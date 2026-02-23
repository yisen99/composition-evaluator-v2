export type AuthRole = "teacher" | "student";

export function defaultWorkspaceByRole(role: AuthRole): string {
  return role === "teacher" ? "/teacher/tasks" : "/student";
}

export function sanitizeNextPath(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }
  if (!raw.startsWith("/")) {
    return null;
  }
  if (raw.startsWith("//")) {
    return null;
  }
  if (raw.includes("://")) {
    return null;
  }
  return raw;
}

export function resolveRoleAwareRedirectPath(role: AuthRole, rawNext: string | null | undefined): string {
  const safeNext = sanitizeNextPath(rawNext);
  const fallback = defaultWorkspaceByRole(role);
  if (!safeNext) {
    return fallback;
  }

  if (role === "teacher" && safeNext.startsWith("/teacher")) {
    return safeNext;
  }
  if (role === "student" && safeNext.startsWith("/student")) {
    return safeNext;
  }

  return fallback;
}

export function withNextPath(basePath: string, rawNext: string | null | undefined): string {
  const safeNext = sanitizeNextPath(rawNext);
  if (!safeNext) {
    return basePath;
  }

  const separator = basePath.includes("?") ? "&" : "?";
  return `${basePath}${separator}next=${encodeURIComponent(safeNext)}`;
}
