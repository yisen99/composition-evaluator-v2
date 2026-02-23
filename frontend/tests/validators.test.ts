import { describe, expect, it } from "vitest";
import {
  normalizeChinaPhone,
  validateDisplayName,
  validateEmail,
  validatePassword,
  validatePhone,
  validateSmsCode
} from "@/lib/auth/validators";

describe("auth validators", () => {
  it("normalizes china phone", () => {
    expect(normalizeChinaPhone("138-0013-8000")).toBe("13800138000");
    expect(normalizeChinaPhone("+86 13800138000")).toBe("13800138000");
  });

  it("validates email", () => {
    expect(validateEmail("")).toBe("请输入邮箱。");
    expect(validateEmail("bad-email")).toBe("邮箱格式不正确。");
    expect(validateEmail("a@example.com")).toBeNull();
  });

  it("validates password", () => {
    expect(validatePassword("")).toBe("请输入密码。");
    expect(validatePassword("1234567")).toBe("密码至少 8 位。");
    expect(validatePassword("SecurePass123!")).toBeNull();
  });

  it("validates display name", () => {
    expect(validateDisplayName("")).toBe("请输入显示名称。");
    expect(validateDisplayName("a".repeat(31))).toBe("显示名称最多 30 个字符。");
    expect(validateDisplayName("王老师")).toBeNull();
  });

  it("validates phone", () => {
    expect(validatePhone("")).toBe("请输入手机号。");
    expect(validatePhone("10086")).toBe("手机号格式不正确。");
    expect(validatePhone("13800138000")).toBeNull();
    expect(validatePhone("", "手机号", false)).toBeNull();
  });

  it("validates sms code", () => {
    expect(validateSmsCode("")).toBe("请输入验证码。");
    expect(validateSmsCode("1234")).toBe("验证码应为 6 位数字。");
    expect(validateSmsCode("123456")).toBeNull();
  });
});
