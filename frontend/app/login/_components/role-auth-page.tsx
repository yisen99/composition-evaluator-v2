"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getWechatAuthorizeUrl, login, loginWithPassword, registerAccount, sendCode } from "@/lib/api/client";
import { clearAuthSession, getAuthSession, saveAuthSession } from "@/lib/auth/session";
import { defaultWorkspaceByRole, resolveRoleAwareRedirectPath, withNextPath } from "@/lib/auth/redirect";
import { validateDisplayName, validateEmail, validatePassword, validatePhone, validateSmsCode } from "@/lib/auth/validators";

type Toast = {
  type: "ok" | "error";
  message: string;
};

type AuthRole = "teacher" | "student";

type RoleAuthPageProps = {
  role: AuthRole;
  allowSms: boolean;
  requestedNext?: string | null;
};

type RoleAuthField =
  | "smsPhone"
  | "smsCode"
  | "loginEmail"
  | "loginPassword"
  | "registerDisplayName"
  | "registerEmail"
  | "registerPassword"
  | "confirmPassword"
  | "registerPhone";

const SMS_RESEND_SECONDS = 60;

export function RoleAuthPage({ role, allowSms, requestedNext = null }: RoleAuthPageProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"sms" | "password">("sms");
  const [passwordMode, setPasswordMode] = useState<"login" | "register">("login");

  const [smsPhone, setSmsPhone] = useState("");
  const [smsDisplayName, setSmsDisplayName] = useState("");
  const [code, setCode] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registerDisplayName, setRegisterDisplayName] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");

  const [registering, setRegistering] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [wechatRedirecting, setWechatRedirecting] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [activeRole, setActiveRole] = useState<AuthRole | null>(null);
  const [activeRoles, setActiveRoles] = useState<AuthRole[]>([]);
  const [activeDisplayName, setActiveDisplayName] = useState("");
  const [smsCooldownSeconds, setSmsCooldownSeconds] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<RoleAuthField, string>>>({});

  const roleLabel = role === "teacher" ? "老师" : "学生";
  const oppositeRoleLabel = role === "teacher" ? "学生" : "老师";
  const oppositeRolePath = role === "teacher" ? "/login/student" : "/login/teacher";
  const workspacePath = resolveRoleAwareRedirectPath(role, requestedNext);
  const activeWorkspacePath = activeRole ? defaultWorkspaceByRole(activeRole) : "/student";
  const activeRoleLabel = activeRole === "teacher" ? "老师" : "学生";
  const oppositeRoleLinkPath = withNextPath(oppositeRolePath, requestedNext);
  const canUseCurrentRolePage = activeRoles.includes(role);
  const isRoleMismatch = Boolean(activeRole && activeRole !== role && !canUseCurrentRolePage);
  const smsTip = useMemo(() => {
    if (!allowSms) {
      return "当前页面仅支持账号密码登录。";
    }
    if (role === "teacher") {
      return "支持账号密码登录；短信验证码仅限已绑定手机号的老师账号。";
    }
    return "支持账号密码登录，也可用短信验证码快捷登录。";
  }, [allowSms, role]);

  const setFieldError = (field: RoleAuthField, message: string | null) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (message) {
        next[field] = message;
      } else {
        delete next[field];
      }
      return next;
    });
  };

  const validateSmsPhoneField = (): boolean => {
    const message = validatePhone(smsPhone, "手机号");
    setFieldError("smsPhone", message);
    return !message;
  };

  const validateSmsCodeField = (): boolean => {
    const message = validateSmsCode(code, "验证码");
    setFieldError("smsCode", message);
    return !message;
  };

  const validateLoginEmailField = (): boolean => {
    const message = validateEmail(loginEmail, "邮箱");
    setFieldError("loginEmail", message);
    return !message;
  };

  const validateLoginPasswordField = (): boolean => {
    const message = validatePassword(loginPassword, "密码");
    setFieldError("loginPassword", message);
    return !message;
  };

  const validateRegisterDisplayNameField = (): boolean => {
    const message = validateDisplayName(registerDisplayName, "显示名称");
    setFieldError("registerDisplayName", message);
    return !message;
  };

  const validateRegisterEmailField = (): boolean => {
    const message = validateEmail(registerEmail, "邮箱");
    setFieldError("registerEmail", message);
    return !message;
  };

  const validateRegisterPasswordField = (): boolean => {
    const message = validatePassword(registerPassword, "密码");
    setFieldError("registerPassword", message);
    return !message;
  };

  const validateConfirmPasswordField = (): boolean => {
    const message = registerPassword === confirmPassword ? null : "两次输入的密码不一致。";
    setFieldError("confirmPassword", message);
    return !message;
  };

  const validateRegisterPhoneField = (): boolean => {
    const message = validatePhone(registerPhone, "手机号", false);
    setFieldError("registerPhone", message);
    return !message;
  };

  const validateSmsForm = (): boolean => {
    const okPhone = validateSmsPhoneField();
    const okCode = validateSmsCodeField();
    return okPhone && okCode;
  };

  const validatePasswordLoginForm = (): boolean => {
    const okEmail = validateLoginEmailField();
    const okPassword = validateLoginPasswordField();
    return okEmail && okPassword;
  };

  const validateRegisterForm = (): boolean => {
    const okDisplayName = validateRegisterDisplayNameField();
    const okEmail = validateRegisterEmailField();
    const okPassword = validateRegisterPasswordField();
    const okConfirmPassword = validateConfirmPasswordField();
    const okPhone = validateRegisterPhoneField();
    return okDisplayName && okEmail && okPassword && okConfirmPassword && okPhone;
  };

  const normalizeRegisterErrorMessage = (raw: string): string => {
    if (raw.includes("REGISTER_USER_ALREADY_EXISTS")) {
      return "该邮箱或手机号已被注册，请更换后重试。";
    }
    if (raw.includes("REGISTER_INVALID_PASSWORD")) {
      return "密码不符合要求，请至少输入 8 位字符。";
    }
    return raw;
  };

  const applyRegisterServerError = (message: string) => {
    if (message.includes("邮箱")) {
      setFieldError("registerEmail", message);
    }
    if (message.includes("手机号")) {
      setFieldError("registerPhone", message);
    }
    if (message.includes("密码")) {
      setFieldError("registerPassword", message);
    }
    if (message.includes("已被注册")) {
      setFieldError("registerEmail", "该邮箱或手机号已被注册。");
      if (registerPhone.trim()) {
        setFieldError("registerPhone", "该邮箱或手机号已被注册。");
      }
    }
  };

  useEffect(() => {
    const session = getAuthSession();
    if (!session) {
      return;
    }
    setActiveRole(session.user.role);
    setActiveRoles(session.user.available_roles);
    setActiveDisplayName(session.user.display_name);
  }, []);

  useEffect(() => {
    if (smsCooldownSeconds <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setSmsCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [smsCooldownSeconds]);

  useEffect(() => {
    setFieldErrors({});
  }, [mode, passwordMode]);

  const onLogoutCurrentSession = () => {
    clearAuthSession();
    setActiveRole(null);
    setActiveRoles([]);
    setActiveDisplayName("");
    setToast({ type: "ok", message: "已退出当前账号，请继续完成登录。" });
  };

  const onSendCode = async () => {
    if (!validateSmsPhoneField()) {
      setToast({ type: "error", message: "请先修正手机号格式。" });
      return;
    }
    if (smsCooldownSeconds > 0) {
      return;
    }

    setSendingCode(true);
    setToast(null);
    try {
      await sendCode({
        phone: smsPhone.trim(),
        role_hint: role
      });
      setSmsCooldownSeconds(SMS_RESEND_SECONDS);
      setToast({ type: "ok", message: "验证码已发送，请查收短信后填写。" });
    } catch (error) {
      setToast({ type: "error", message: `发送失败：${(error as Error).message}` });
    } finally {
      setSendingCode(false);
    }
  };

  const onSmsLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateSmsForm()) {
      setToast({ type: "error", message: "请修正手机号或验证码格式后重试。" });
      return;
    }
    setLoggingIn(true);
    setToast(null);
    try {
      const session = await login({
        phone: smsPhone.trim(),
        code: code.trim(),
        display_name: smsDisplayName.trim()
      });
      saveAuthSession(session);
      const target = resolveRoleAwareRedirectPath(session.user.role, requestedNext);
      router.push(target);
    } catch (error) {
      setToast({ type: "error", message: `登录失败：${(error as Error).message}` });
    } finally {
      setLoggingIn(false);
    }
  };

  const onRegisterAccount = async () => {
    if (!validateRegisterForm()) {
      setToast({ type: "error", message: "请修正注册信息中的错误后重试。" });
      return;
    }

    setRegistering(true);
    setToast(null);
    try {
      await registerAccount({
        email: registerEmail.trim(),
        password: registerPassword.trim(),
        role,
        display_name: registerDisplayName.trim(),
        phone: registerPhone.trim() || undefined
      });
      const session = await loginWithPassword(registerEmail.trim(), registerPassword.trim());
      saveAuthSession(session);
      const target = resolveRoleAwareRedirectPath(session.user.role, requestedNext);
      router.push(target);
    } catch (error) {
      const message = normalizeRegisterErrorMessage((error as Error).message);
      applyRegisterServerError(message);
      setToast({ type: "error", message: `注册失败：${message}` });
    } finally {
      setRegistering(false);
    }
  };

  const onPasswordLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validatePasswordLoginForm()) {
      setToast({ type: "error", message: "请修正邮箱或密码格式后重试。" });
      return;
    }
    setLoggingIn(true);
    setToast(null);
    try {
      const session = await loginWithPassword(loginEmail.trim(), loginPassword.trim());
      saveAuthSession(session);
      const target = resolveRoleAwareRedirectPath(session.user.role, requestedNext);
      router.push(target);
    } catch (error) {
      setToast({ type: "error", message: `登录失败：${(error as Error).message}` });
    } finally {
      setLoggingIn(false);
    }
  };

  const onWechatLogin = async () => {
    setWechatRedirecting(true);
    setToast(null);
    try {
      const response = await getWechatAuthorizeUrl(role, requestedNext);
      window.location.href = response.authorization_url;
    } catch (error) {
      setToast({ type: "error", message: `微信登录发起失败：${(error as Error).message}` });
      setWechatRedirecting(false);
    }
  };

  const renderInlineToast = () => {
    if (!toast) {
      return null;
    }
    return (
      <div
        className={`rounded-xl border px-4 py-3 text-sm font-semibold shadow-sm ${
          toast.type === "ok"
            ? "border-emerald-700/35 bg-emerald-50 text-emerald-900"
            : "border-rose-700/50 bg-rose-50 text-rose-900"
        }`}
        role="alert"
        aria-live="polite"
      >
        {toast.message}
      </div>
    );
  };

  return (
    <main className="mx-auto min-h-screen max-w-5xl p-4 md:p-10">
      <section className="mx-auto max-w-3xl overflow-hidden rounded-[32px] border border-slate-200 bg-white/90 shadow-[0_24px_64px_rgba(30,41,59,0.14)] backdrop-blur-sm">
        <div className="border-b border-slate-200/80 px-6 py-5 text-center text-lg font-semibold text-slate-800 md:px-10">
          语文作文批改协同台
        </div>
        <div className="space-y-5 bg-slate-50/60 px-6 py-8 md:px-10 md:py-10">
        {activeRole ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              activeRole === role
                ? "border-emerald-700/35 bg-emerald-50 text-emerald-900"
                : "border-amber-700/35 bg-amber-50 text-amber-900"
            }`}
          >
            {activeRole === role ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p>
                  当前已登录为{roleLabel}账号：{activeDisplayName}。可以直接进入工作台。
                </p>
                <div className="flex gap-3">
                  <a className="underline" href={workspacePath}>
                    直接进入工作台
                  </a>
                  <button className="underline" type="button" onClick={onLogoutCurrentSession}>
                    退出后换账号
                  </button>
                </div>
              </div>
            ) : canUseCurrentRolePage ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p>
                  当前活跃身份为{activeRoleLabel}，账号同时具备{roleLabel}权限。可在顶部导航切换角色后进入{roleLabel}工作台。
                </p>
                <div className="flex gap-3">
                  <a className="underline" href={activeWorkspacePath}>
                    返回当前工作台
                  </a>
                  <a className="underline" href="/">
                    返回首页切换
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p>当前登录身份为{activeRoleLabel}，与此页面不一致。请先退出后再切换登录。</p>
                <div className="flex gap-3">
                  <a className="underline" href={activeWorkspacePath}>
                    返回当前工作台
                  </a>
                  <button className="underline" type="button" onClick={onLogoutCurrentSession}>
                    退出当前账号
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}

        <div className="grid gap-6">
          <div className="text-center">
            <div className="mx-auto inline-flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-br from-indigo-600 to-blue-600 text-4xl text-white shadow-[0_14px_28px_rgba(59,130,246,0.3)]">
              书
            </div>
            <h1 className="mt-5 text-5xl font-bold tracking-tight text-slate-900">欢迎回来</h1>
            <p className="mt-2 text-lg text-slate-500">请登录您的语文作文协同台账号</p>
            <div className="mx-auto mt-4 max-w-xl rounded-xl border border-amber-700/30 bg-amber-50 px-4 py-3 text-xs text-amber-900 text-left">
              {smsTip}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 md:px-7 md:py-6">
            {allowSms ? (
              <div className="mb-4 flex flex-wrap items-center gap-5 border-b border-slate-200">
                <button
                  className={`pb-3 text-base font-semibold ${
                    mode === "sms" ? "border-b-4 border-indigo-600 text-indigo-600" : "text-slate-400"
                  }`}
                  onClick={() => setMode("sms")}
                  type="button"
                >
                  手机登录
                </button>
                <button
                  className={`pb-3 text-base font-semibold ${
                    mode === "password" ? "border-b-4 border-indigo-600 text-indigo-600" : "text-slate-400"
                  }`}
                  onClick={() => setMode("password")}
                  type="button"
                >
                  密码登录
                </button>
                <button
                  className="pb-3 text-base font-semibold text-slate-400 hover:text-indigo-600"
                  onClick={onWechatLogin}
                  type="button"
                  disabled={wechatRedirecting}
                >
                  {wechatRedirecting ? "跳转中..." : "微信登录"}
                </button>
              </div>
            ) : null}
          </div>

          {isRoleMismatch ? (
            <div className="rounded-2xl border border-amber-700/35 bg-amber-50 px-4 py-4 text-sm text-amber-900">
              {renderInlineToast()}
              <p>
                检测到你当前已登录为{activeRoleLabel}账号（{activeDisplayName || "未命名用户"}）。
              </p>
              <p className="mt-1">当前账号无{roleLabel}权限，请退出后使用正确入口登录。</p>
              <a className="btn-seal mt-3 inline-block text-center text-sm" href={activeWorkspacePath}>
                返回当前工作台
              </a>
              <button className="btn-ink text-sm" type="button" onClick={onLogoutCurrentSession}>
                退出当前账号并切换
              </button>
              <a href="/" className="block text-center text-sm text-slate-700 underline">
                返回首页
              </a>
            </div>
          ) : mode === "password" || !allowSms ? (
            <form className="rounded-2xl border border-slate-200 bg-white p-5" onSubmit={onPasswordLogin}>
              {renderInlineToast()}
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
                    <p className="label">登录邮箱</p>
                    <input
                      className="field mt-1"
                      type="email"
                      autoComplete="email"
                      placeholder={role === "teacher" ? "teacher@example.com" : "student@example.com"}
                      value={loginEmail}
                      onChange={(event) => {
                        setLoginEmail(event.target.value);
                        setFieldError("loginEmail", null);
                      }}
                      onBlur={validateLoginEmailField}
                      required
                    />
                    {fieldErrors.loginEmail ? <p className="mt-1 text-xs text-rose-700">{fieldErrors.loginEmail}</p> : null}
                  </div>
                  <div>
                    <p className="label">登录密码</p>
                    <input
                      className="field mt-1"
                      type="password"
                      autoComplete="current-password"
                      placeholder="请输入密码"
                      value={loginPassword}
                      onChange={(event) => {
                        setLoginPassword(event.target.value);
                        setFieldError("loginPassword", null);
                      }}
                      onBlur={validateLoginPasswordField}
                      required
                    />
                    {fieldErrors.loginPassword ? <p className="mt-1 text-xs text-rose-700">{fieldErrors.loginPassword}</p> : null}
                  </div>
                  <button className="btn-seal text-sm" type="submit" disabled={loggingIn}>
                    {loggingIn ? "登录中..." : "密码登录并进入工作台"}
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <p className="label">当前身份（固定）</p>
                    <input className="field mt-1" value={roleLabel} disabled />
                  </div>
                  <div>
                    <p className="label">显示名称</p>
                    <input
                      className="field mt-1"
                      placeholder={role === "teacher" ? "请输入老师姓名" : "请输入学生姓名"}
                      value={registerDisplayName}
                      onChange={(event) => {
                        setRegisterDisplayName(event.target.value);
                        setFieldError("registerDisplayName", null);
                      }}
                      onBlur={validateRegisterDisplayNameField}
                      required
                    />
                    {fieldErrors.registerDisplayName ? (
                      <p className="mt-1 text-xs text-rose-700">{fieldErrors.registerDisplayName}</p>
                    ) : null}
                  </div>
                  <div>
                    <p className="label">注册邮箱</p>
                    <input
                      className="field mt-1"
                      type="email"
                      autoComplete="email"
                      placeholder={role === "teacher" ? "teacher@example.com" : "student@example.com"}
                      value={registerEmail}
                      onChange={(event) => {
                        setRegisterEmail(event.target.value);
                        setFieldError("registerEmail", null);
                      }}
                      onBlur={validateRegisterEmailField}
                      required
                    />
                    {fieldErrors.registerEmail ? <p className="mt-1 text-xs text-rose-700">{fieldErrors.registerEmail}</p> : null}
                  </div>
                  <div>
                    <p className="label">设置密码</p>
                    <input
                      className="field mt-1"
                      type="password"
                      autoComplete="new-password"
                      placeholder="至少 8 位"
                      value={registerPassword}
                      onChange={(event) => {
                        setRegisterPassword(event.target.value);
                        setFieldError("registerPassword", null);
                      }}
                      onBlur={validateRegisterPasswordField}
                      required
                    />
                    {fieldErrors.registerPassword ? (
                      <p className="mt-1 text-xs text-rose-700">{fieldErrors.registerPassword}</p>
                    ) : null}
                  </div>
                  <div>
                    <p className="label">确认密码</p>
                    <input
                      className="field mt-1"
                      type="password"
                      autoComplete="new-password"
                      placeholder="再次输入密码"
                      value={confirmPassword}
                      onChange={(event) => {
                        setConfirmPassword(event.target.value);
                        setFieldError("confirmPassword", null);
                      }}
                      onBlur={validateConfirmPasswordField}
                      required
                    />
                    {fieldErrors.confirmPassword ? <p className="mt-1 text-xs text-rose-700">{fieldErrors.confirmPassword}</p> : null}
                  </div>
                  <div>
                    <p className="label">手机号（可选）</p>
                    <input
                      className="field mt-1"
                      placeholder="例如 13800138000"
                      value={registerPhone}
                      onChange={(event) => {
                        setRegisterPhone(event.target.value);
                        setFieldError("registerPhone", null);
                      }}
                      onBlur={validateRegisterPhoneField}
                    />
                    {fieldErrors.registerPhone ? <p className="mt-1 text-xs text-rose-700">{fieldErrors.registerPhone}</p> : null}
                  </div>
                  <button className="btn-ink text-sm" type="button" onClick={onRegisterAccount} disabled={registering}>
                    {registering ? "注册中..." : "提交注册"}
                  </button>
                </>
              )}

              <a href={oppositeRoleLinkPath} className="mt-1 text-center text-sm text-slate-700 underline">
                切换到{oppositeRoleLabel}登录
              </a>
              <a href="/" className="text-center text-sm text-slate-700 underline">
                返回首页
              </a>
            </form>
          ) : (
            <form className="rounded-2xl border border-slate-200 bg-white p-5" onSubmit={onSmsLogin}>
              {renderInlineToast()}
              <div>
                <p className="label">手机号</p>
                <input
                  className="field mt-1"
                  placeholder="请输入手机号"
                  value={smsPhone}
                  onChange={(event) => {
                    setSmsPhone(event.target.value);
                    setFieldError("smsPhone", null);
                  }}
                  onBlur={validateSmsPhoneField}
                  required
                />
                {fieldErrors.smsPhone ? <p className="mt-1 text-xs text-rose-700">{fieldErrors.smsPhone}</p> : null}
              </div>

              <div>
                <p className="label">显示名称（可选）</p>
                <input
                  className="field mt-1"
                  placeholder="可选，默认沿用历史昵称"
                  value={smsDisplayName}
                  onChange={(event) => setSmsDisplayName(event.target.value)}
                />
              </div>

              <div>
                <p className="label">短信验证码</p>
                <input
                  className="field mt-1"
                  placeholder="6 位验证码"
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value);
                    setFieldError("smsCode", null);
                  }}
                  onBlur={validateSmsCodeField}
                  required
                />
                {fieldErrors.smsCode ? <p className="mt-1 text-xs text-rose-700">{fieldErrors.smsCode}</p> : null}
              </div>

              <button
                className="h-12 rounded-xl border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
                type="button"
                onClick={onSendCode}
                disabled={sendingCode || smsCooldownSeconds > 0}
              >
                {sendingCode ? "发送中..." : smsCooldownSeconds > 0 ? `重新发送(${smsCooldownSeconds}s)` : "发送验证码"}
              </button>
              <button
                className="h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-lg font-semibold text-white shadow-[0_12px_26px_rgba(79,70,229,0.35)]"
                type="submit"
                disabled={loggingIn}
              >
                {loggingIn ? "登录中..." : "登录并进入工作台"}
              </button>
              <a href={oppositeRoleLinkPath} className="mt-1 text-center text-sm text-slate-700 underline">
                切换到{oppositeRoleLabel}登录
              </a>
              <a href="/" className="text-center text-sm text-slate-700 underline">
                返回首页
              </a>
            </form>
          )}
        </div>
        <p className="text-center text-sm text-slate-500">
          {mode === "sms" && role === "student" ? "未注册手机号验证后将自动创建账号" : "首次登录建议先使用邮箱密码模式"}
        </p>
        </div>
      </section>
    </main>
  );
}
