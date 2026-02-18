"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login, sendCode } from "@/lib/api/client";
import { saveAuthSession } from "@/lib/auth/session";

type Toast = {
  type: "ok" | "error";
  message: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [roleHint, setRoleHint] = useState<"teacher" | "student">("teacher");
  const [phone, setPhone] = useState("13800138000");
  const [displayName, setDisplayName] = useState("王老师");
  const [code, setCode] = useState("123456");
  const [sendingCode, setSendingCode] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const onSendCode = async () => {
    setSendingCode(true);
    setToast(null);
    try {
      await sendCode({
        phone: phone.trim(),
        role_hint: roleHint
      });
      setToast({ type: "ok", message: "验证码已发送（开发环境默认 123456）。" });
    } catch (error) {
      setToast({ type: "error", message: `发送失败：${(error as Error).message}` });
    } finally {
      setSendingCode(false);
    }
  };

  const onLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoggingIn(true);
    setToast(null);
    try {
      const session = await login({
        phone: phone.trim(),
        code: code.trim(),
        display_name: displayName.trim()
      });
      saveAuthSession(session);
      const target = session.user.role === "teacher" ? "/teacher" : "/student";
      router.push(target);
    } catch (error) {
      setToast({ type: "error", message: `登录失败：${(error as Error).message}` });
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-4xl p-6 md:p-10">
      <section className="poster-shell p-6 md:p-10">
        <div className="relative z-10 grid gap-6 md:grid-cols-2">
          <div>
            <span className="seal-chip">真实登录态</span>
            <h1 className="poster-title mt-4 text-4xl font-bold">身份校验</h1>
            <p className="mt-3 text-sm text-slate-700">
              输入手机号与身份，发送验证码并登录。登录成功后将自动进入对应工作台。
            </p>
            <div className="mt-4 rounded-xl border border-amber-700/30 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              当前开发环境固定验证码：123456
            </div>
          </div>

          <form className="paper-card flex flex-col gap-3 p-5" onSubmit={onLogin}>
            <div>
              <p className="label">Role</p>
              <select
                className="field mt-1"
                value={roleHint}
                onChange={(event) => setRoleHint(event.target.value as "teacher" | "student")}
              >
                <option value="teacher">老师</option>
                <option value="student">学生</option>
              </select>
            </div>

            <div>
              <p className="label">Phone</p>
              <input className="field mt-1" value={phone} onChange={(event) => setPhone(event.target.value)} />
            </div>

            <div>
              <p className="label">Display Name</p>
              <input
                className="field mt-1"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>

            <div>
              <p className="label">Code</p>
              <input className="field mt-1" value={code} onChange={(event) => setCode(event.target.value)} />
            </div>

            <button className="btn-ink text-sm" type="button" onClick={onSendCode} disabled={sendingCode}>
              {sendingCode ? "发送中..." : "发送验证码"}
            </button>
            <button className="btn-seal text-sm" type="submit" disabled={loggingIn}>
              {loggingIn ? "登录中..." : "登录并进入工作台"}
            </button>
            <a href="/" className="mt-2 text-center text-sm text-slate-700 underline">
              返回首页
            </a>
          </form>
        </div>

        {toast ? (
          <div
            className={`relative z-10 mt-5 rounded-xl border px-4 py-3 text-sm ${
              toast.type === "ok"
                ? "border-emerald-700/35 bg-emerald-50 text-emerald-900"
                : "border-rose-700/35 bg-rose-50 text-rose-900"
            }`}
          >
            {toast.message}
          </div>
        ) : null}
      </section>
    </main>
  );
}
