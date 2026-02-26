import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UnifiedLoginForm } from "@/app/login/_components/UnifiedLoginForm";

const { pushMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("@/lib/api/client", () => ({
  sendVerificationCode: vi.fn(),
  loginWithCode: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  saveAuthSession: vi.fn(),
}));

describe("UnifiedLoginForm", () => {
  it("renders without recursive state updates", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<UnifiedLoginForm />)).not.toThrow();
    expect(screen.getByLabelText("手机号")).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});
