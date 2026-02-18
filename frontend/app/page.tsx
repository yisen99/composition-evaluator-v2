"use client";

import { useState } from "react";
import { checkHealth } from "@/lib/api/client";

export default function HomePage() {
  const [status, setStatus] = useState("未检测");

  const onCheckHealth = async () => {
    try {
      const data = await checkHealth();
      setStatus(`${data.status} (${data.service})`);
    } catch {
      setStatus("检测失败");
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
      <h1 className="text-3xl font-bold">作文批改平台骨架</h1>
      <p>当前状态：{status}</p>
      <div className="flex gap-3">
        <button className="rounded bg-blue-600 px-4 py-2 text-white" onClick={onCheckHealth}>
          检查后端健康状态
        </button>
        <a href="/login" className="rounded border px-4 py-2">
          前往登录
        </a>
      </div>
    </main>
  );
}
