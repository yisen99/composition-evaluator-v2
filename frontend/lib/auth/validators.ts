export function normalizeChinaPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11) {
    return digits;
  }
  if (digits.length === 13 && digits.startsWith("86")) {
    return digits.slice(2);
  }
  return digits;
}

export function validateEmail(value: string, label = "邮箱"): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return `请输入${label}。`;
  }
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  if (!ok) {
    return `${label}格式不正确。`;
  }
  return null;
}

export function validatePassword(value: string, label = "密码"): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return `请输入${label}。`;
  }
  if (trimmed.length < 8) {
    return `${label}至少 8 位。`;
  }
  return null;
}

export function validateDisplayName(value: string, label = "显示名称"): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return `请输入${label}。`;
  }
  if (trimmed.length > 30) {
    return `${label}最多 30 个字符。`;
  }
  return null;
}

export function validatePhone(value: string, label = "手机号", required = true): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return required ? `请输入${label}。` : null;
  }
  const normalized = normalizeChinaPhone(trimmed);
  if (!/^1[3-9]\d{9}$/.test(normalized)) {
    return `${label}格式不正确。`;
  }
  return null;
}

export function validateSmsCode(value: string, label = "验证码"): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return `请输入${label}。`;
  }
  if (!/^\d{6}$/.test(trimmed)) {
    return `${label}应为 6 位数字。`;
  }
  return null;
}

export function validateFourDigitCode(value: string, label = "验证码"): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return `请输入${label}。`;
  }
  if (!/^\d{4}$/.test(trimmed)) {
    return `${label}应为 4 位数字。`;
  }
  return null;
}
