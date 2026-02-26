"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { completeStudentOnboarding } from "@/lib/api/onboarding";

type Toast = {
  type: "ok" | "error";
  message: string;
};

type OnboardingStep = 1 | 2 | 3;

interface OnboardingFormData {
  real_name: string;
  gender: "male" | "female" | "other" | "";
  grade: string;
  city: string;
  password: string;
  confirmPassword: string;
}

const GRADE_OPTIONS = [
  "一年级",
  "二年级",
  "三年级",
  "四年级",
  "五年级",
  "六年级",
  "初一",
  "初二",
  "初三",
  "高一",
  "高二",
  "高三",
];

const GENDER_OPTIONS = [
  { value: "male", label: "男" },
  { value: "female", label: "女" },
  { value: "other", label: "其他" },
];

export function StudentOnboardingWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof OnboardingFormData, string>>>({});
  const [formData, setFormData] = useState<OnboardingFormData>({
    real_name: "",
    gender: "",
    grade: "",
    city: "",
    password: "",
    confirmPassword: "",
  });

  // Focus management for step transitions
  const step1InputRef = useRef<HTMLInputElement>(null);
  const step2InputRef = useRef<HTMLSelectElement>(null);
  const step3InputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus first input when step changes
    if (currentStep === 1 && step1InputRef.current) {
      step1InputRef.current.focus();
    } else if (currentStep === 2 && step2InputRef.current) {
      step2InputRef.current.focus();
    } else if (currentStep === 3 && step3InputRef.current) {
      step3InputRef.current.focus();
    }
  }, [currentStep]);

  const steps = [
    { number: 1, title: "基本信息" },
    { number: 2, title: "年级和城市" },
    { number: 3, title: "设置密码" },
  ];

  const setFieldError = (field: keyof OnboardingFormData, message: string | null) => {
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

  const validateStep1 = (): boolean => {
    let isValid = true;

    if (!formData.real_name.trim()) {
      setFieldError("real_name", "请输入真实姓名");
      isValid = false;
    } else if (formData.real_name.trim().length < 2) {
      setFieldError("real_name", "姓名至少需要2个字符");
      isValid = false;
    } else {
      setFieldError("real_name", null);
    }

    if (!formData.gender) {
      setFieldError("gender", "请选择性别");
      isValid = false;
    } else {
      setFieldError("gender", null);
    }

    return isValid;
  };

  const validateStep2 = (): boolean => {
    let isValid = true;

    if (!formData.grade) {
      setFieldError("grade", "请选择年级");
      isValid = false;
    } else {
      setFieldError("grade", null);
    }

    if (!formData.city.trim()) {
      setFieldError("city", "请输入城市");
      isValid = false;
    } else if (formData.city.trim().length < 2) {
      setFieldError("city", "城市名称至少需要2个字符");
      isValid = false;
    } else {
      setFieldError("city", null);
    }

    return isValid;
  };

  const validateStep3 = (): boolean => {
    let isValid = true;

    if (!formData.password) {
      setFieldError("password", "请输入密码");
      isValid = false;
    } else if (formData.password.length < 8) {
      setFieldError("password", "密码至少需要8位字符");
      isValid = false;
    } else {
      setFieldError("password", null);
    }

    if (!formData.confirmPassword) {
      setFieldError("confirmPassword", "请确认密码");
      isValid = false;
    } else if (formData.password !== formData.confirmPassword) {
      setFieldError("confirmPassword", "两次输入的密码不一致");
      isValid = false;
    } else {
      setFieldError("confirmPassword", null);
    }

    return isValid;
  };

  const handleNext = () => {
    setToast(null);

    if (currentStep === 1 && !validateStep1()) {
      setToast({ type: "error", message: "请完善基本信息后再继续" });
      return;
    }

    if (currentStep === 2 && !validateStep2()) {
      setToast({ type: "error", message: "请完善年级和城市信息后再继续" });
      return;
    }

    if (currentStep === 3 && !validateStep3()) {
      return;
    }

    if (currentStep < 3) {
      setCurrentStep((prev) => (prev + 1) as OnboardingStep);
    }
  };

  const handlePrevious = () => {
    setToast(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as OnboardingStep);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateStep1() || !validateStep2() || !validateStep3()) {
      setToast({ type: "error", message: "请完善所有必填信息后再提交" });
      return;
    }

    setIsSubmitting(true);
    setToast(null);

    try {
      const response = await completeStudentOnboarding({
        real_name: formData.real_name.trim(),
        gender: formData.gender as "male" | "female" | "other",
        grade: formData.grade,
        city: formData.city.trim(),
        password: formData.password,
      });

      if (response.next_action === "redirect_to_student_workbench") {
        setToast({ type: "ok", message: "信息提交成功！" });
        setTimeout(() => {
          router.push("/student/workbench");
        }, 500);
      }
    } catch (error) {
      const message = (error as Error).message;
      setToast({ type: "error", message: `提交失败：${message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = <K extends keyof OnboardingFormData>(field: K, value: OnboardingFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFieldError(field, null);
  };

  const renderStepIndicator = () => (
    <div className="mb-8 flex items-center justify-center gap-3">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
              currentStep === step.number
                ? "bg-seal-500/10 border border-seal-500/30 text-seal-500"
                : currentStep > step.number
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-700"
                : "bg-slate-100 border border-slate-200 text-slate-500"
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                currentStep === step.number
                  ? "bg-seal-500 text-white"
                  : currentStep > step.number
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-300 text-slate-600"
              }`}
            >
              {currentStep > step.number ? "✓" : step.number}
            </span>
            <span>{step.title}</span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`mx-3 h-0.5 w-8 ${
                currentStep > step.number ? "bg-emerald-500" : "bg-slate-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderInlineToast = () => {
    if (!toast) {
      return null;
    }
    return (
      <div
        className={`mb-6 rounded-xl border px-4 py-3 text-sm font-semibold shadow-sm ${
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

  const renderStep1 = () => (
    <div className="space-y-5">
      <div>
        <label className="label mb-2 block" htmlFor="real_name">
          真实姓名 <span className="text-rose-600">*</span>
        </label>
        <input
          ref={step1InputRef}
          id="real_name"
          type="text"
          className={`field ${fieldErrors.real_name ? "border-rose-500" : ""}`}
          placeholder="请输入你的真实姓名"
          value={formData.real_name}
          onChange={(e) => updateField("real_name", e.target.value)}
          autoComplete="name"
          aria-required="true"
          aria-invalid={Boolean(fieldErrors.real_name)}
          aria-describedby={fieldErrors.real_name ? "real_name-error" : undefined}
        />
        {fieldErrors.real_name && (
          <p id="real_name-error" className="mt-1 text-sm text-rose-600">
            {fieldErrors.real_name}
          </p>
        )}
      </div>

      <div>
        <label className="label mb-2 block" htmlFor="gender">
          性别 <span className="text-rose-600">*</span>
        </label>
        <div className="grid grid-cols-3 gap-3" role="group" aria-label="性别选择">
          {GENDER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
                formData.gender === option.value
                  ? "border-seal-500 bg-seal-500/10 text-seal-500"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
              onClick={() => updateField("gender", option.value as "male" | "female" | "other")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  updateField("gender", option.value as "male" | "female" | "other");
                }
              }}
              aria-pressed={formData.gender === option.value}
              aria-label={`选择${option.label}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {fieldErrors.gender && (
          <p id="gender-error" className="mt-1 text-sm text-rose-600" role="alert">
            {fieldErrors.gender}
          </p>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-5">
      <div>
        <label className="label mb-2 block" htmlFor="grade">
          年级 <span className="text-rose-600">*</span>
        </label>
        <select
          ref={step2InputRef}
          id="grade"
          className={`field ${fieldErrors.grade ? "border-rose-500" : ""}`}
          value={formData.grade}
          onChange={(e) => updateField("grade", e.target.value)}
          aria-required="true"
          aria-invalid={Boolean(fieldErrors.grade)}
          aria-describedby={fieldErrors.grade ? "grade-error" : undefined}
        >
          <option value="">请选择年级</option>
          {GRADE_OPTIONS.map((grade) => (
            <option key={grade} value={grade}>
              {grade}
            </option>
          ))}
        </select>
        {fieldErrors.grade && (
          <p id="grade-error" className="mt-1 text-sm text-rose-600">
            {fieldErrors.grade}
          </p>
        )}
      </div>

      <div>
        <label className="label mb-2 block" htmlFor="city">
          城市 <span className="text-rose-600">*</span>
        </label>
        <input
          id="city"
          type="text"
          className={`field ${fieldErrors.city ? "border-rose-500" : ""}`}
          placeholder="例如: 北京"
          value={formData.city}
          onChange={(e) => updateField("city", e.target.value)}
          autoComplete="address-level2"
          aria-required="true"
          aria-invalid={Boolean(fieldErrors.city)}
          aria-describedby={fieldErrors.city ? "city-error" : undefined}
        />
        {fieldErrors.city && (
          <p id="city-error" className="mt-1 text-sm text-rose-600">
            {fieldErrors.city}
          </p>
        )}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-5">
      <div>
        <label className="label mb-2 block" htmlFor="password">
          密码 <span className="text-rose-600">*</span>
        </label>
        <input
          ref={step3InputRef}
          id="password"
          type="password"
          className={`field ${fieldErrors.password ? "border-rose-500" : ""}`}
          placeholder="至少8位字符"
          value={formData.password}
          onChange={(e) => updateField("password", e.target.value)}
          autoComplete="new-password"
          aria-required="true"
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={fieldErrors.password ? "password-error" : "password-hint"}
        />
        <p id="password-hint" className="mt-1 text-xs text-slate-500">
          密码至少需要8位字符，建议使用字母、数字和符号的组合
        </p>
        {fieldErrors.password && (
          <p id="password-error" className="mt-1 text-sm text-rose-600">
            {fieldErrors.password}
          </p>
        )}
      </div>

      <div>
        <label className="label mb-2 block" htmlFor="confirmPassword">
          确认密码 <span className="text-rose-600">*</span>
        </label>
        <input
          id="confirmPassword"
          type="password"
          className={`field ${fieldErrors.confirmPassword ? "border-rose-500" : ""}`}
          placeholder="再次输入密码"
          value={formData.confirmPassword}
          onChange={(e) => updateField("confirmPassword", e.target.value)}
          autoComplete="new-password"
          aria-required="true"
          aria-invalid={Boolean(fieldErrors.confirmPassword)}
          aria-describedby={fieldErrors.confirmPassword ? "confirmPassword-error" : undefined}
        />
        {fieldErrors.confirmPassword && (
          <p id="confirmPassword-error" className="mt-1 text-sm text-rose-600">
            {fieldErrors.confirmPassword}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="poster-shell min-h-screen bg-white/90 backdrop-blur-sm">
      <div className="relative px-6 py-10 md:px-10 md:py-16">
        <div className="mx-auto max-w-lg">
          <div className="mb-8 text-center">
            <h1 className="poster-title mb-3 text-3xl font-bold">欢迎加入!</h1>
            <p className="text-slate-600">请完善你的信息，开启作文学习之旅</p>
          </div>

          {renderStepIndicator()}

          {renderInlineToast()}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="paper-card bg-white p-6 shadow-sm">
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
            </div>

            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                className={`btn-ink flex-1 ${currentStep === 1 ? "invisible" : ""}`}
                onClick={handlePrevious}
                disabled={currentStep === 1 || isSubmitting}
                aria-label="返回上一步"
              >
                上一步
              </button>

              {currentStep < 3 ? (
                <button
                  type="button"
                  className="btn-seal flex-1"
                  onClick={handleNext}
                  disabled={isSubmitting}
                  aria-label="进入下一步"
                >
                  下一步
                </button>
              ) : (
                <button
                  type="submit"
                  className="btn-seal flex-1"
                  disabled={isSubmitting}
                  aria-label="完成并提交"
                >
                  {isSubmitting ? "提交中..." : "完成"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
