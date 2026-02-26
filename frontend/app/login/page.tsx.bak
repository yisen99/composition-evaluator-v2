import { withNextPath } from "@/lib/auth/redirect";

type LoginEntryPageProps = {
  searchParams?: {
    next?: string | string[];
  };
};

export default function LoginEntryPage({ searchParams }: LoginEntryPageProps) {
  const rawNext = searchParams?.next;
  const next = Array.isArray(rawNext) ? rawNext[0] : rawNext ?? null;
  const teacherLoginPath = withNextPath("/login/teacher", next);
  const studentLoginPath = withNextPath("/login/student", next);

  return (
    <main className="mx-auto min-h-screen max-w-6xl p-6 md:p-10">
      <section className="poster-shell p-6 md:p-10">
        <div className="relative z-10 flex flex-col gap-8">
          <div className="space-y-3">
            <span className="seal-chip">身份入口</span>
            <h1 className="poster-title text-4xl font-bold md:text-5xl">选择登录身份</h1>
            <p className="max-w-2xl text-base text-slate-700 md:text-lg">
              从这里开始按身份分流。先选角色，再完成注册/登录，最后自动进入对应工作台。
            </p>
          </div>

          <div className="paper-card p-5">
            <p className="label">统一流程</p>
            <div className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
              <p className="rounded-lg border border-slate-300/50 bg-white/70 px-3 py-2">第 1 步：选择老师或学生</p>
              <p className="rounded-lg border border-slate-300/50 bg-white/70 px-3 py-2">第 2 步：在对应页面注册或登录</p>
              <p className="rounded-lg border border-slate-300/50 bg-white/70 px-3 py-2">第 3 步：进入对应工作台继续操作</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="paper-card p-6">
              <p className="label">老师入口</p>
              <h2 className="mt-2 text-3xl font-semibold">我是老师</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p>1. 使用邮箱密码注册/登录</p>
                <p>2. 默认进入任务中心，按优先级处理待办</p>
                <p>3. 在任务详情页批改，必要时再去班级与发布页建班出题</p>
              </div>
              <a className="btn-ink mt-4 inline-block text-sm" href={teacherLoginPath}>
                进入老师登录
              </a>
            </div>
            <div className="paper-card p-6">
              <p className="label">学生入口</p>
              <h2 className="mt-2 text-3xl font-semibold">我是学生</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p>1. 使用账号密码或短信快捷登录</p>
                <p>2. 进入学生工作台输入班级码</p>
                <p>3. 选择任务并提交作文</p>
              </div>
              <a className="btn-seal mt-4 inline-block text-sm" href={studentLoginPath}>
                进入学生登录
              </a>
            </div>
          </div>

          <div className="paper-card p-5">
            <p className="label">常见问题</p>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p>Q: 我是老师，能用短信登录吗？</p>
                <p>A: 可以，但仅限已绑定手机号的老师账号；首次仍建议使用邮箱密码登录。</p>
                <p>Q: 不确定选哪一个入口怎么办？</p>
                <p>A: 按当前实际身份选择；进入后会按权限自动限制页面操作。</p>
              </div>
            </div>

          <div className="flex flex-wrap gap-4">
            <a className="text-sm text-slate-700 underline" href="/">
              返回首页
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
