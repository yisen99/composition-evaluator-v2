import { requiredRoleForPath, resolveRouteGuardRedirect } from "@/lib/auth/route-guard";

describe("route guard helpers", () => {
  it("resolves required role by pathname", () => {
    expect(requiredRoleForPath("/teacher")).toBe("teacher");
    expect(requiredRoleForPath("/teacher/assignments/1")).toBe("teacher");
    expect(requiredRoleForPath("/student")).toBe("student");
    expect(requiredRoleForPath("/student/progress")).toBe("student");
    expect(requiredRoleForPath("/login/teacher")).toBeNull();
  });

  it("allows access when cookie role matches protected route", () => {
    expect(resolveRouteGuardRedirect("/teacher", "teacher")).toBeNull();
    expect(resolveRouteGuardRedirect("/student/progress", "student")).toBeNull();
  });

  it("redirects unauthenticated access to role-specific login", () => {
    expect(resolveRouteGuardRedirect("/teacher/assignments/abc", null)).toBe(
      "/login/teacher?next=%2Fteacher%2Fassignments%2Fabc"
    );
    expect(resolveRouteGuardRedirect("/student", undefined)).toBe("/login/student?next=%2Fstudent");
  });

  it("redirects mismatched role to corresponding login", () => {
    expect(resolveRouteGuardRedirect("/teacher", "student")).toBe("/login/teacher?next=%2Fteacher");
    expect(resolveRouteGuardRedirect("/student/progress", "teacher")).toBe(
      "/login/student?next=%2Fstudent%2Fprogress"
    );
  });

  it("preserves query string in next parameter", () => {
    expect(resolveRouteGuardRedirect("/student?tab=todo", null)).toBe("/login/student?next=%2Fstudent%3Ftab%3Dtodo");
  });
});
