"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { bindWechatPhone, sendWechatBindCode, wechatCallback } from "@/lib/api/client";
import type { WechatAuthPayload } from "@/lib/api/types";
import { resolveRoleAwareRedirectPath, withNextPath } from "@/lib/auth/redirect";
import { saveAuthSession } from "@/lib/auth/session";
import { validateDisplayName, validatePhone, validateSmsCode } from "@/lib/auth/validators";

type Toast = {
  type: "ok" | "error";
  message: string;
};

const SMS_RESEND_SECONDS = 60;

type WechatBindField = "displayName" | "phone" | "code";

function WechatCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const callbackError = searchParams.get("error");
  const callbackErrorDescription = searchParams.get("error_description");

  const [loading, setLoading] = useState(true);
  const [wechatPayload, setWechatPayload] = useState<WechatAuthPayload | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const [phone, setPhone] = useState("");
  const [codeValue, setCodeValue] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [binding, setBinding] = useState(false);
  const [smsCooldownSeconds, setSmsCooldownSeconds] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<WechatBindField, string>>>({});

  const roleLabel = wechatPayload?.role === "teacher" ? "老师" : "学生";
  const defaultLoginPath = wechatPayload?.role === "teacher" ? "/login/teacher" : "/login/student";
  const switchLoginPath = useMemo(() => withNextPath(defaultLoginPath, wechatPayload?.next_path), [defaultLoginPath, wechatPayload?.next_path]);

  const setFieldError = (field: WechatBindField, message: string | null) => {
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

  const validatePhoneField = (): boolean => {
    const message = validatePhone(phone, "手机号");
    setFieldError("phone", message);
    return !message;
  };

  const validateCodeField = (): boolean => {
    const message = validateSmsCode(codeValue, "验证码");
    setFieldError("code", message);
    return !message;
  };

  const validateDisplayNameField = (): boolean => {
    const message = displayName.trim() ? validateDisplayName(displayName, "显示名称") : null;
    setFieldError("displayName", message);
    return !message;
  };

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
    if (callbackError) {
      setToast({ type: "error", message: `微信授权失败：${callbackErrorDescription || callbackError}` });
      setLoading(false);
      return;
    }
    if (!code || !state) {
      setToast({ type: "error", message: "缺少微信回调参数，请返回登录页重试。" });
      setLoading(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        const payload = await wechatCallback(code, state);
        if (cancelled) {
          return;
        }
        setWechatPayload(payload);
        setDisplayName(payload.wechat_nickname || "");

        if (!payload.need_bind_phone && payload.access_token && payload.refresh_token && payload.user) {
          saveAuthSession({
            access_token: payload.access_token,
            refresh_token: payload.refresh_token,
            user: payload.user
          });
          const target = resolveRoleAwareRedirectPath(payload.user.role, payload.next_path);
          router.replace(target);
          return;
        }

        if (!payload.need_bind_phone) {
          setToast({ type: "error", message: "微信登录返回数据不完整，请重试。" });
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        setToast({ type: "error", message: `微信登录失败：${(error as Error).message}` });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [callbackError, callbackErrorDescription, code, router, state]);

  const onSendBindCode = async () => {
    if (!wechatPayload?.bind_ticket) {
      setToast({ type: "error", message: "绑定票据无效，请重新发起微信登录。" });
      return;
    }
    if (!validatePhoneField()) {
      setToast({ type: "error", message: "请先修正手机号格式。" });
      return;
    }
    if (smsCooldownSeconds > 0) {
      return;
    }
    setSendingCode(true);
    setToast(null);
    try {
      await sendWechatBindCode({ bind_ticket: wechatPayload.bind_ticket, phone: phone.trim() });
      setSmsCooldownSeconds(SMS_RESEND_SECONDS);
      setToast({ type: "ok", message: "验证码已发送，请查收短信。" });
    } catch (error) {
      setToast({ type: "error", message: `发送验证码失败：${(error as Error).message}` });
    } finally {
      setSendingCode(false);
    }
  };

  const onBindPhone = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!wechatPayload?.bind_ticket) {
      setToast({ type: "error", message: "绑定票据无效，请重新发起微信登录。" });
      return;
    }
    const okDisplayName = validateDisplayNameField();
    const okPhone = validatePhoneField();
    const okCode = validateCodeField();
    if (!okDisplayName || !okPhone || !okCode) {
      setToast({ type: "error", message: "请修正绑定信息中的错误后重试。" });
      return;
    }

    setBinding(true);
    setToast(null);
    try {
      const session = await bindWechatPhone({
        bind_ticket: wechatPayload.bind_ticket,
        phone: phone.trim(),
        code: codeValue.trim(),
        display_name: displayName.trim() || undefined
      });
      saveAuthSession(session);
      const target = resolveRoleAwareRedirectPath(session.user.role, wechatPayload.next_path);
      router.replace(target);
    } catch (error) {
      setToast({ type: "error", message: `手机号绑定失败：${(error as Error).message}` });
    } finally {
      setBinding(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-3xl p-6 md:p-10">
      <section className="poster-shell p-6 md:p-10">
        <div className="relative z-10 grid gap-6 md:grid-cols-2">
          <div>
            <span className="seal-chip">微信登录</span>
            <h1 className="poster-title mt-4 text-4xl font-bold">微信授权回调</h1>
            <p className="mt-3 text-sm text-slate-700">授权成功后，需绑定手机号完成账号校验，确保班级身份可追踪。</p>
            <div className="mt-4 grid gap-2 text-xs text-slate-700">
              <p className="rounded-lg border border-slate-300/50 bg-white/70 px-3 py-2">第 1 步：微信扫码授权</p>
              <p className="rounded-lg border border-slate-300/50 bg-white/70 px-3 py-2">第 2 步：短信验证码绑定手机号</p>
              <p className="rounded-lg border border-slate-300/50 bg-white/70 px-3 py-2">第 3 步：进入对应工作台</p>
            </div>
          </div>

          <div className="paper-card flex flex-col gap-3 p-5">
            {loading ? (
              <p className="text-sm text-slate-700">正在处理微信登录，请稍候...</p>
            ) : wechatPayload?.need_bind_phone ? (
              <form className="flex flex-col gap-3" onSubmit={onBindPhone}>
                <p className="text-sm text-slate-700">已识别{roleLabel}身份，请绑定手机号完成登录。</p>
                <div>
                  <p className="label">显示名称（可改）</p>
                  <input
                    className="field mt-1"
                    placeholder="请输入显示名称"
                    value={displayName}
                    onChange={(event) => {
                      setDisplayName(event.target.value);
                      setFieldError("displayName", null);
                    }}
                    onBlur={validateDisplayNameField}
                  />
                  {fieldErrors.displayName ? <p className="mt-1 text-xs text-rose-700">{fieldErrors.displayName}</p> : null}
                </div>
                <div>
                  <p className="label">手机号</p>
                  <input
                    className="field mt-1"
                    placeholder="请输入手机号"
                    value={phone}
                    onChange={(event) => {
                      setPhone(event.target.value);
                      setFieldError("phone", null);
                    }}
                    onBlur={validatePhoneField}
                    required
                  />
                  {fieldErrors.phone ? <p className="mt-1 text-xs text-rose-700">{fieldErrors.phone}</p> : null}
                </div>
                <div>
                  <p className="label">验证码</p>
                  <input
                    className="field mt-1"
                    placeholder="6 位验证码"
                    value={codeValue}
                    onChange={(event) => {
                      setCodeValue(event.target.value);
                      setFieldError("code", null);
                    }}
                    onBlur={validateCodeField}
                    required
                  />
                  {fieldErrors.code ? <p className="mt-1 text-xs text-rose-700">{fieldErrors.code}</p> : null}
                </div>
                <button
                  className="btn-ink text-sm"
                  type="button"
                  onClick={onSendBindCode}
                  disabled={sendingCode || smsCooldownSeconds > 0}
                >
                  {sendingCode ? "发送中..." : smsCooldownSeconds > 0 ? `重新发送(${smsCooldownSeconds}s)` : "发送绑定验证码"}
                </button>
                <button className="btn-seal text-sm" type="submit" disabled={binding}>
                  {binding ? "绑定中..." : "绑定手机号并登录"}
                </button>
                <a className="text-center text-sm text-slate-700 underline" href={switchLoginPath}>
                  返回{roleLabel}登录页
                </a>
              </form>
            ) : (
              <div className="text-sm text-slate-700">
                <p>微信登录未完成，请返回登录页重试。</p>
                <a className="mt-3 inline-block underline" href="/login">
                  返回登录入口
                </a>
              </div>
            )}
          </div>
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

export default function WechatCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto min-h-screen max-w-3xl p-6 md:p-10">
          <section className="poster-shell p-6 md:p-10">
            <p className="text-sm text-slate-700">正在处理微信回调，请稍候...</p>
          </section>
        </main>
      }
    >
      <WechatCallbackContent />
    </Suspense>
  );
}
