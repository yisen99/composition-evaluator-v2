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
    <main className="mx-auto min-h-screen max-w-5xl p-6 md:p-10">
      <section className="poster-shell p-6 md:p-10">
        <div className="relative z-10 flex flex-col gap-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="seal-chip">语文写作 · 学院海报风</span>
            <button className="btn-ink text-sm" onClick={onCheckHealth}>
              后端状态：{status}
            </button>
          </div>

          <div className="space-y-4">
            <h1 className="poster-title text-4xl font-bold md:text-5xl">作文批改协同台</h1>
            <p className="max-w-2xl text-base text-slate-700 md:text-lg">
              老师发布任务、学生提交作文、AI 辅助批改与长期成长记录，一体化联调入口。
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <a className="paper-card p-5" href="/teacher">
              <p className="label">Teacher</p>
              <h2 className="mt-2 text-2xl font-semibold">建班与发布任务</h2>
              <p className="mt-2 text-sm text-slate-700">创建班级、生成班级码、发布作文任务。</p>
            </a>
            <a className="paper-card p-5" href="/student">
              <p className="label">Student</p>
              <h2 className="mt-2 text-2xl font-semibold">输入班级码加入</h2>
              <p className="mt-2 text-sm text-slate-700">学生输入班级码，完成加入班级联调验证。</p>
            </a>
            <a className="paper-card p-5" href="/login">
              <p className="label">Auth</p>
              <h2 className="mt-2 text-2xl font-semibold">登录占位页</h2>
              <p className="mt-2 text-sm text-slate-700">账号密码登录 + 学生短信快捷登录入口。</p>
            </a>
          </div>
        </div>
      </section>
      <div className="mx-auto mt-6 max-w-3xl text-center text-xs text-slate-600">
        已接入账号密码登录，短信模式仅用于学生侧联调。
      </div>
    </main>
  );
}
