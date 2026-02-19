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
    <main className="mx-auto min-h-screen max-w-6xl p-6 md:p-10">
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
              首页按身份分流，老师与学生从各自入口一步一步进入，不再混用登录路径。
            </p>
          </div>

          <div className="paper-card p-5">
            <p className="label">统一起点</p>
            <div className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
              <p className="rounded-lg border border-slate-300/50 bg-white/70 px-3 py-2">1. 先选择身份（老师/学生）</p>
              <p className="rounded-lg border border-slate-300/50 bg-white/70 px-3 py-2">2. 在对应入口完成注册或登录</p>
              <p className="rounded-lg border border-slate-300/50 bg-white/70 px-3 py-2">3. 自动进入对应工作台</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="paper-card p-6">
              <p className="label">Teacher Path</p>
              <h2 className="mt-2 text-3xl font-semibold">老师操作路径</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p>第 1 步：老师账号注册/登录</p>
                <p>第 2 步：创建班级并生成班级码</p>
                <p>第 3 步：发布作文任务并查看批改详情</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <a className="btn-ink text-sm" href="/login/teacher">
                  进入第 1 步（老师登录）
                </a>
                <a className="text-sm text-slate-700 underline" href="/teacher">
                  已登录，直达教师工作台
                </a>
              </div>
            </div>

            <div className="paper-card p-6">
              <p className="label">Student Path</p>
              <h2 className="mt-2 text-3xl font-semibold">学生操作路径</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p>第 1 步：学生账号注册/登录（支持短信快捷）</p>
                <p>第 2 步：输入班级码加入班级</p>
                <p>第 3 步：选择任务并提交作文</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <a className="btn-seal text-sm" href="/login/student">
                  进入第 1 步（学生登录）
                </a>
                <a className="text-sm text-slate-700 underline" href="/student">
                  已登录，直达学生工作台
                </a>
              </div>
            </div>
          </div>

          <div className="paper-card p-5">
            <p className="label">不确定身份</p>
            <p className="mt-2 text-sm text-slate-700">如果你不确定走哪条路径，可先进入身份选择页再决定。</p>
            <a className="mt-3 inline-block text-sm underline" href="/login">
              前往身份选择页
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
