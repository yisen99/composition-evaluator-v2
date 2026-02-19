"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login, loginWithPassword, registerAccount, sendCode } from "@/lib/api/client";
import { saveAuthSession } from "@/lib/auth/session";

type Toast = {
  type: "ok" | "error";
  message: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"sms" | "password">("password");
  const [roleHint, setRoleHint] = useState<"teacher" | "student">("teacher");
  const [phone, setPhone] = useState("13800138000");
  const [displayName, setDisplayName] = useState("王老师");
  const [code, setCode] = useState("123456");
  const [email, setEmail] = useState("teacher@example.com");
  const [password, setPassword] = useState("SecurePass123!");
  const [accountRole, setAccountRole] = useState<"teacher" | "student">("teacher");
  const [registering, setRegistering] = useState(false);
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

  const onRegisterAccount = async () => {
    setRegistering(true);
    setToast(null);
    try {
      await registerAccount({
        email: email.trim(),
        password: password.trim(),
        role: accountRole,
        display_name: displayName.trim(),
        phone: phone.trim() || undefined
      });
      setToast({ type: "ok", message: "账号注册成功，可直接密码登录。" });
    } catch (error) {
      setToast({ type: "error", message: `注册失败：${(error as Error).message}` });
    } finally {
      setRegistering(false);
    }
  };

  const onPasswordLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoggingIn(true);
    setToast(null);
    try {
      const session = await loginWithPassword(email.trim(), password.trim());
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
              集成 GitHub 成熟后端方案（FastAPI Users）：支持账号注册、密码登录与 JWT 授权；同时保留短信登录。
            </p>
            <div className="mt-4 rounded-xl border border-amber-700/30 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              当前开发环境固定验证码：123456
            </div>
            <div className="mt-4 flex gap-2">
              <button
                className={`rounded-md px-3 py-1 text-sm ${mode === "password" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-800"}`}
                onClick={() => setMode("password")}
                type="button"
              >
                账号密码
              </button>
              <button
                className={`rounded-md px-3 py-1 text-sm ${mode === "sms" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-800"}`}
                onClick={() => setMode("sms")}
                type="button"
              >
                短信验证码
              </button>
            </div>
          </div>

          {mode === "password" ? (
            <form className="paper-card flex flex-col gap-3 p-5" onSubmit={onPasswordLogin}>
              <div>
                <p className="label">Role</p>
                <select
                  className="field mt-1"
                  value={accountRole}
                  onChange={(event) => setAccountRole(event.target.value as "teacher" | "student")}
                >
                  <option value="teacher">老师</option>
                  <option value="student">学生</option>
                </select>
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
                <p className="label">Email</p>
                <input className="field mt-1" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <div>
                <p className="label">Password</p>
                <input
                  className="field mt-1"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <div>
                <p className="label">Phone (Optional)</p>
                <input className="field mt-1" value={phone} onChange={(event) => setPhone(event.target.value)} />
              </div>
              <button className="btn-ink text-sm" type="button" onClick={onRegisterAccount} disabled={registering}>
                {registering ? "注册中..." : "先注册账号"}
              </button>
              <button className="btn-seal text-sm" type="submit" disabled={loggingIn}>
                {loggingIn ? "登录中..." : "密码登录并进入工作台"}
              </button>
              <a href="/" className="mt-2 text-center text-sm text-slate-700 underline">
                返回首页
              </a>
            </form>
          ) : (
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
          )}
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
