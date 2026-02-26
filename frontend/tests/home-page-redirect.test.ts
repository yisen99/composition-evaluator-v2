import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import { redirect } from "next/navigation";
import HomePage from "@/app/page";

describe("home page", () => {
  it("redirects root path to login entry", () => {
    HomePage();
    expect(redirect).toHaveBeenCalledWith("/login");
  });
});
