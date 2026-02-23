import type { Metadata } from "next";
import { TopNav } from "@/components/top-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Composition Evaluator",
  description: "Chinese composition evaluation platform"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <TopNav />
        <div className="pt-16">{children}</div>
      </body>
    </html>
  );
}
