export default function LoginPage() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl p-6 md:p-10">
      <section className="poster-shell p-6 md:p-10">
        <div className="relative z-10 grid gap-6 md:grid-cols-2">
          <div>
            <span className="seal-chip">登录入口（占位）</span>
            <h1 className="poster-title mt-4 text-4xl font-bold">身份校验</h1>
            <p className="mt-3 text-sm text-slate-700">
              下一阶段将接入手机号 + 短信验证码。当前可直接进入老师/学生联调页面。
            </p>
          </div>
          <div className="paper-card flex flex-col gap-3 p-5">
            <a href="/teacher" className="btn-ink text-center text-sm">
              以老师身份继续
            </a>
            <a href="/student" className="btn-seal text-center text-sm">
              以学生身份继续
            </a>
            <a href="/" className="mt-2 text-center text-sm text-slate-700 underline">
              返回首页
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
