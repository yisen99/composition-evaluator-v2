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
  const [passwordMode, setPasswordMode] = useState<"login" | "register">("login");

  const [smsPhone, setSmsPhone] = useState("13800138000");
  const [smsDisplayName, setSmsDisplayName] = useState("小明");
  const [code, setCode] = useState("");

  const [loginEmail, setLoginEmail] = useState("teacher@example.com");
  const [loginPassword, setLoginPassword] = useState("SecurePass123!");

  const [registerEmail, setRegisterEmail] = useState("teacher@example.com");
  const [registerPassword, setRegisterPassword] = useState("SecurePass123!");
  const [confirmPassword, setConfirmPassword] = useState("SecurePass123!");
  const [accountRole, setAccountRole] = useState<"teacher" | "student">("teacher");
  const [registerDisplayName, setRegisterDisplayName] = useState("王老师");
  const [registerPhone, setRegisterPhone] = useState("");

  const [registering, setRegistering] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const onSendCode = async () => {
    setSendingCode(true);
    setToast(null);
    try {
      await sendCode({
        phone: smsPhone.trim(),
        role_hint: "student"
      });
      setToast({ type: "ok", message: "验证码已发送，请查收短信后填写。" });
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
        phone: smsPhone.trim(),
        code: code.trim(),
        display_name: smsDisplayName.trim()
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
    if (registerPassword !== confirmPassword) {
      setToast({ type: "error", message: "两次输入的密码不一致。" });
      return;
    }

    setRegistering(true);
    setToast(null);
    try {
      await registerAccount({
        email: registerEmail.trim(),
        password: registerPassword.trim(),
        role: accountRole,
        display_name: registerDisplayName.trim(),
        phone: registerPhone.trim() || undefined
      });
      setLoginEmail(registerEmail.trim());
      setLoginPassword(registerPassword.trim());
      setPasswordMode("login");
      setToast({ type: "ok", message: "账号注册成功，请用邮箱密码登录。" });
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
      const session = await loginWithPassword(loginEmail.trim(), loginPassword.trim());
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
              账号模式字段严格对齐真实接口：注册使用 `email/password/role/display_name/phone`，登录使用 `username(email)+password`。
            </p>
            <div className="mt-4 rounded-xl border border-amber-700/30 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              短信模式仅用于学生快捷登录；老师请使用账号密码登录。
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
              <div className="flex gap-2">
                <button
                  className={`rounded-md px-3 py-1 text-sm ${passwordMode === "login" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-800"}`}
                  onClick={() => setPasswordMode("login")}
                  type="button"
                >
                  账号登录
                </button>
                <button
                  className={`rounded-md px-3 py-1 text-sm ${passwordMode === "register" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-800"}`}
                  onClick={() => setPasswordMode("register")}
                  type="button"
                >
                  账号注册
                </button>
              </div>

              {passwordMode === "login" ? (
                <>
                  <div>
                    <p className="label">Email (username)</p>
                    <input
                      className="field mt-1"
                      type="email"
                      value={loginEmail}
                      onChange={(event) => setLoginEmail(event.target.value)}
                    />
                  </div>
                  <div>
                    <p className="label">Password</p>
                    <input
                      className="field mt-1"
                      type="password"
                      value={loginPassword}
                      onChange={(event) => setLoginPassword(event.target.value)}
                    />
                  </div>
                  <button className="btn-seal text-sm" type="submit" disabled={loggingIn}>
                    {loggingIn ? "登录中..." : "密码登录并进入工作台"}
                  </button>
                </>
              ) : (
                <>
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
                      value={registerDisplayName}
                      onChange={(event) => setRegisterDisplayName(event.target.value)}
                    />
                  </div>
                  <div>
                    <p className="label">Email</p>
                    <input
                      className="field mt-1"
                      type="email"
                      value={registerEmail}
                      onChange={(event) => setRegisterEmail(event.target.value)}
                    />
                  </div>
                  <div>
                    <p className="label">Password</p>
                    <input
                      className="field mt-1"
                      type="password"
                      value={registerPassword}
                      onChange={(event) => setRegisterPassword(event.target.value)}
                    />
                  </div>
                  <div>
                    <p className="label">Confirm Password</p>
                    <input
                      className="field mt-1"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                  </div>
                  <div>
                    <p className="label">Phone (Optional)</p>
                    <input
                      className="field mt-1"
                      value={registerPhone}
                      onChange={(event) => setRegisterPhone(event.target.value)}
                    />
                  </div>
                  <button className="btn-ink text-sm" type="button" onClick={onRegisterAccount} disabled={registering}>
                    {registering ? "注册中..." : "提交注册"}
                  </button>
                </>
              )}
              <a href="/" className="mt-2 text-center text-sm text-slate-700 underline">
                返回首页
              </a>
            </form>
          ) : (
            <form className="paper-card flex flex-col gap-3 p-5" onSubmit={onLogin}>
              <div>
                <p className="label">Phone</p>
                <input className="field mt-1" value={smsPhone} onChange={(event) => setSmsPhone(event.target.value)} />
              </div>

              <div>
                <p className="label">Display Name</p>
                <input
                  className="field mt-1"
                  value={smsDisplayName}
                  onChange={(event) => setSmsDisplayName(event.target.value)}
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
