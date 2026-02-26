"use client";

import React, { type FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loginWithCode, sendVerificationCode } from "@/lib/api/auth";
import { resolveNextActionPath } from "@/lib/auth/next-action";
import { saveAuthSession } from "@/lib/auth/session";
import { normalizeChinaPhone, validatePhone } from "@/lib/auth/validators";

type Toast = {
  type: "ok" | "error";
  message: string;
};

interface LoginFormData {
  phone: string;
  code: string;
  isSendingCode: boolean;
  canResend: boolean;
  countdown: number;
  isLoggingIn: boolean;
}

const COUNTDOWN_SECONDS = 60;
const CODE_LENGTH = 4;

export function UnifiedLoginForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginFormData>({
    phone: "",
    code: "",
    isSendingCode: false,
    canResend: true,
    countdown: 0,
    isLoggingIn: false,
  });
  const [toast, setToast] = useState<Toast | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend button
  useEffect(() => {
    if (formData.countdown <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setFormData((prev) => {
        if (prev.countdown <= 1) {
          return { ...prev, countdown: 0, canResend: true };
        }
        return { ...prev, countdown: prev.countdown - 1 };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [formData.countdown]);

  const showToast = (type: "ok" | "error", message: string) => {
    setToast({ type, message });
    // Auto-dismiss success messages after 3 seconds
    if (type === "ok") {
      setTimeout(() => setToast(null), 3000);
    }
  };

  const validatePhoneField = (): boolean => {
    const error = validatePhone(formData.phone, "手机号");
    setPhoneError(error);
    return !error;
  };

  const handlePhoneChange = (value: string) => {
    // Only allow digits
    const digits = value.replace(/\D/g, "");
    // Limit to 11 digits
    const truncated = digits.slice(0, 11);
    setFormData((prev) => ({ ...prev, phone: truncated }));
    setPhoneError(null);
  };

  const handleSendCode = async () => {
    if (!validatePhoneField()) {
      showToast("error", "请先修正手机号格式");
      return;
    }

    if (!formData.canResend || formData.countdown > 0) {
      return;
    }

    setFormData((prev) => ({ ...prev, isSendingCode: true, canResend: false }));
    setToast(null);

    try {
      const normalizedPhone = normalizeChinaPhone(formData.phone);
      await sendVerificationCode(normalizedPhone);
      setFormData((prev) => ({ ...prev, countdown: COUNTDOWN_SECONDS }));
      showToast("ok", "验证码已发送，请查收短信");
    } catch (error) {
      const message = error instanceof Error ? error.message : "发送失败，请稍后重试";
      showToast("error", message);
      setFormData((prev) => ({ ...prev, canResend: true }));
    } finally {
      setFormData((prev) => ({ ...prev, isSendingCode: false }));
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    const digits = value.replace(/\D/g, "");
    // Limit to 1 digit per input
    const singleDigit = digits.slice(0, 1);

    const newCode = formData.code.split("");
    newCode[index] = singleDigit;
    const updatedCode = newCode.join("");

    setFormData((prev) => ({ ...prev, code: updatedCode }));

    // Auto-focus next input or auto-submit
    if (singleDigit && index < CODE_LENGTH - 1) {
      codeInputRefs.current[index + 1]?.focus();
    } else if (singleDigit && index === CODE_LENGTH - 1) {
      // Auto-submit when all 4 digits are entered
      setTimeout(() => {
        if (updatedCode.length === CODE_LENGTH) {
          handleLogin(null);
        }
      }, 100);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace to focus previous input
    if (e.key === "Backspace" && !formData.code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement> | null) => {
    if (event) {
      event.preventDefault();
    }

    if (!validatePhoneField()) {
      showToast("error", "请先修正手机号格式");
      return;
    }

    if (formData.code.length !== CODE_LENGTH) {
      showToast("error", `请输入 ${CODE_LENGTH} 位验证码`);
      return;
    }

    setFormData((prev) => ({ ...prev, isLoggingIn: true }));
    setToast(null);

    try {
      const normalizedPhone = normalizeChinaPhone(formData.phone);
      const response = await loginWithCode(normalizedPhone, formData.code);

      // Save session
      saveAuthSession({
        access_token: response.access_token,
        refresh_token: response.refresh_token,
        user: response.user,
      });

      showToast("ok", "登录成功");
      router.push(resolveNextActionPath(response.next_action));
    } catch (error) {
      const message = error instanceof Error ? error.message : "登录失败，请稍后重试";
      showToast("error", message);
      // Clear code on error
      setFormData((prev) => ({ ...prev, code: "" }));
      // Focus first code input
      codeInputRefs.current[0]?.focus();
    } finally {
      setFormData((prev) => ({ ...prev, isLoggingIn: false }));
    }
  };

  const renderToast = () => {
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
    <div className="mx-auto min-h-screen max-w-5xl p-4 md:p-10">
      <section className="mx-auto max-w-2xl overflow-hidden rounded-[32px] border border-slate-200 bg-white/90 shadow-[0_24px_64px_rgba(30,41,59,0.14)] backdrop-blur-sm">
        {/* Header */}
        <div className="border-b border-slate-200/80 px-6 py-5 text-center text-lg font-semibold text-slate-800 md:px-10">
          语文作文批改协同台
        </div>

        {/* Content */}
        <div className="space-y-6 bg-slate-50/60 px-6 py-8 md:px-10 md:py-10">
          {/* Toast */}
          {renderToast()}

          {/* Title */}
          <div className="text-center">
            <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-indigo-600 to-blue-600 text-3xl text-white shadow-[0_14px_28px_rgba(59,130,246,0.3)]">
              书
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900">欢迎回来</h1>
            <p className="mt-2 text-base text-slate-500">请输入手机号完成登录</p>
          </div>

          {/* Login Form */}
          <form className="space-y-5" onSubmit={handleLogin}>
            {/* Phone Input */}
            <div>
              <label className="label" htmlFor="phone">
                手机号
              </label>
              <input
                id="phone"
                className="field mt-1"
                type="tel"
                inputMode="numeric"
                placeholder="请输入 11 位手机号"
                value={formData.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                onBlur={validatePhoneField}
                maxLength={11}
                autoComplete="tel"
                required
              />
              {phoneError ? <p className="mt-1 text-xs text-rose-700">{phoneError}</p> : null}
            </div>

            {/* Verification Code Input */}
            <div>
              <label className="label" htmlFor="code">
                验证码
              </label>
              <div className="mt-1 grid grid-cols-4 gap-3">
                {Array.from({ length: CODE_LENGTH }).map((_, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      codeInputRefs.current[index] = el;
                    }}
                    className="field aspect-square text-center text-2xl font-semibold"
                    type="text"
                    inputMode="numeric"
                    placeholder="•"
                    value={formData.code[index] || ""}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    maxLength={1}
                    autoComplete="one-time-code"
                    required
                  />
                ))}
              </div>
            </div>

            {/* Send Code Button */}
            <button
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
              onClick={handleSendCode}
              disabled={formData.isSendingCode || !formData.canResend || formData.countdown > 0 || formData.phone.length !== 11}
            >
              {formData.isSendingCode
                ? "发送中..."
                : formData.countdown > 0
                  ? `重新发送 (${formData.countdown}s)`
                  : "发送验证码"}
            </button>

            {/* Login Button */}
            <button
              className="btn-seal h-12 w-full text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
              disabled={formData.isLoggingIn || formData.code.length !== CODE_LENGTH || formData.phone.length !== 11}
            >
              {formData.isLoggingIn ? "登录中..." : "登录"}
            </button>
          </form>

          {/* Footer Links */}
          <div className="flex flex-col gap-2 text-center">
            <a href="/" className="text-sm text-slate-700 underline hover:text-slate-900">
              返回首页
            </a>
            <p className="text-xs text-slate-500">
              未注册手机号验证后将自动创建账号
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
