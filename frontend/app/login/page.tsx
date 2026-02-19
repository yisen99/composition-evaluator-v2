export default function LoginEntryPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl p-6 md:p-10">
      <section className="poster-shell p-6 md:p-10">
        <div className="relative z-10 flex flex-col gap-8">
          <div className="space-y-3">
            <span className="seal-chip">身份入口</span>
            <h1 className="poster-title text-4xl font-bold md:text-5xl">选择登录身份</h1>
            <p className="max-w-2xl text-base text-slate-700 md:text-lg">
              老师与学生使用独立登录入口。老师使用账号密码；学生支持账号密码和短信快捷登录。
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <a className="paper-card p-6" href="/login/teacher">
              <p className="label">Teacher</p>
              <h2 className="mt-2 text-3xl font-semibold">老师登录/注册</h2>
              <p className="mt-2 text-sm text-slate-700">使用邮箱密码注册与登录，进入教师工作台。</p>
            </a>
            <a className="paper-card p-6" href="/login/student">
              <p className="label">Student</p>
              <h2 className="mt-2 text-3xl font-semibold">学生登录/注册</h2>
              <p className="mt-2 text-sm text-slate-700">支持邮箱密码与短信快捷登录，进入学生工作台。</p>
            </a>
          </div>

          <div>
            <a className="text-sm text-slate-700 underline" href="/">
              返回首页
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
