"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { clearAuthSession, getAuthSession } from "@/lib/auth/session";
import type { UserProfile } from "@/lib/api/types";

type NavLink = {
  href: string;
  label: string;
};

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const syncSession = () => {
      setUser(getAuthSession()?.user ?? null);
    };
    syncSession();
    window.addEventListener("focus", syncSession);
    window.addEventListener("storage", syncSession);
    return () => {
      window.removeEventListener("focus", syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, [pathname]);

  const links = useMemo<NavLink[]>(() => {
    const common: NavLink[] = [{ href: "/", label: "首页" }];
    if (!user) {
      return [
        ...common,
        { href: "/login", label: "身份选择" },
        { href: "/login/teacher", label: "老师登录" },
        { href: "/login/student", label: "学生登录" },
      ];
    }
    if (user.role === "teacher") {
      return [
        ...common,
        { href: "/teacher/tasks", label: "任务中心" },
        { href: "/teacher", label: "班级与发布" },
      ];
    }
    return [
      ...common,
      { href: "/student", label: "学生工作台" },
      { href: "/student/feedback", label: "批改反馈" },
      { href: "/student/progress", label: "成长轨迹" },
    ];
  }, [user]);

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-[rgba(27,43,42,0.14)] bg-[rgba(246,240,228,0.85)] backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-3 md:px-8">
        <Link className="poster-title shrink-0 text-sm font-bold tracking-[0.08em] md:text-lg" href="/">
          作文批改协同台
        </Link>

        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap">
          {links.map((item) => (
            <Link
              key={item.href}
              className={`top-nav-link ${isActivePath(pathname, item.href) ? "top-nav-link-active" : ""}`}
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="shrink-0 flex items-center gap-2 text-xs text-slate-700 md:gap-3 md:text-sm">
          {user ? (
            <>
              <span className="hidden md:inline">
                {user.display_name} · {user.role === "teacher" ? "老师" : "学生"}
              </span>
              <button
                className="rounded-md border border-slate-400/50 px-2 py-1 text-xs transition hover:bg-slate-100"
                onClick={() => {
                  clearAuthSession();
                  window.location.href = user.role === "teacher" ? "/login/teacher" : "/login/student";
                }}
                type="button"
              >
                退出
              </button>
            </>
          ) : (
            <Link className="rounded-md border border-slate-400/50 px-2 py-1 text-xs transition hover:bg-slate-100" href="/login">
              登录
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
