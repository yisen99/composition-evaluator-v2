# 前端迁移计划：AI Studio → Next.js

## 项目概述
将 AI Studio 创建的 React + Vite 前端迁移到当前的 Next.js 14 项目中，保留后端 API 对接。

## 技术栈对比

| 维度 | AI Studio | 当前项目 | 迁移策略 |
|------|-----------|----------|----------|
| 框架 | React 19 + Vite | Next.js 14 | 改造为 Next.js App Router |
| 路由 | React Router v7 | App Router | 重写路由配置 |
| 状态 | useState + localStorage | React Hooks | 保持，增加 Cookie 管理 |
| UI | Tailwind + Lucide | Tailwind + 自定义 | 迁移 Lucide Icons |
| API | mock + Gemini | 真实后端 | 对接 backend API |

## 迁移步骤

### Phase 1: 准备工作

#### 1.1 依赖安装
```bash
cd frontend
npm install lucide-react motion recharts clsx tailwind-merge
```

#### 1.2 创建工具函数
创建 `frontend/lib/utils.ts`:
```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### Phase 2: 组件迁移

#### 2.1 迁移 Sidebar 组件
- 源文件: `frontend/app/teacher/tasks/page.tsx` (左侧导航布局参考)
- 目标: `frontend/app/components/Sidebar.tsx`
- 改造点:
  - 使用 Next.js Link 替代 React Router Link
  - 添加服务端用户状态检查

#### 2.2 迁移 LoginPage
- 源文件: `frontend/app/login/_components/role-auth-page.tsx`
- 目标: `frontend/app/login/page.tsx`
- 改造点:
  - 对接 `/api/v1/auth/send-code` 和 `/api/v1/auth/login`
  - 保留手机号/密码/微信三种登录方式
  - 添加角色选择（教师/学生）

#### 2.3 迁移 TeacherDashboard
- 源文件: `frontend/app/teacher/tasks/page.tsx`
- 目标: `frontend/app/teacher/page.tsx`
- 改造点:
  - 对接 `/api/v1/teacher/tasks`
  - 保留 P0/P1/P2 优先级卡片

#### 2.4 迁移 StudentDashboard
- 源文件: `frontend/app/student/page.tsx`
- 目标: `frontend/app/student/page.tsx`
- 改造点:
  - 对接 `/api/v1/student/dashboard`
  - 保留成长概览和待回复卡片

### Phase 3: API 对接

#### 3.1 创建 API 客户端
更新 `frontend/lib/api/client.ts`:
```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const authApi = {
  sendCode: (phone: string, role: 'teacher' | 'student') =>
    fetch(`${API_BASE}/auth/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, role_hint: role }),
    }),

  login: (phone: string, code: string, displayName?: string) =>
    fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code, display_name: displayName }),
    }),

  passwordLogin: (email: string, password: string) =>
    fetch(`${API_BASE}/auth/password-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),
};

export const teacherApi = {
  getTasks: (teacherId: string) =>
    fetch(`${API_BASE}/teacher/tasks?teacher_id=${teacherId}`),

  getSubmissions: (taskId: string) =>
    fetch(`${API_BASE}/tasks/${taskId}/submissions`),
};

export const studentApi = {
  getDashboard: (studentId: string) =>
    fetch(`${API_BASE}/student/dashboard?student_id=${studentId}`),
};
```

#### 3.2 Session 管理
创建 `frontend/lib/auth/session.ts`:
```typescript
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'session_token';

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE);
  return token?.value;
}

export async function setSession(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
```

### Phase 4: 样式迁移

#### 4.1 保留 Tailwind 配置
AI Studio 使用 Tailwind CSS v4，当前使用 v3。保持当前 v3 配置。

#### 4.2 迁移 Lucide Icons
```tsx
import { BookOpen, UserCircle, LogOut } from 'lucide-react';
```

#### 4.3 迁移 Motion 动画
```tsx
import { motion } from 'motion/react';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
```

### Phase 5: 功能适配

#### 5.1 Gemini AI 集成
AI Studio 已集成 Gemini AI 批改功能。需要：
1. 创建 `frontend/lib/ai/gemini.ts`（从 AI Studio 迁移）
2. 添加 API 路由 `frontend/app/api/ai/correct/route.ts`
3. 在批改页面调用 Gemini API

#### 5.2 长期记忆功能
AI Studio 有学生画像功能，需要：
1. 在 User 模型添加 `long_term_memory` 字段
2. 创建 API 更新记忆
3. 在批改时显示和使用记忆

## 文件结构

### 新增文件
```
frontend/
├── app/
│   ├── components/
│   │   ├── Sidebar.tsx           # 从 AI Studio 迁移
│   │   ├── TaskCard.tsx          # 从 AI Studio 迁移
│   │   └── SubmissionCard.tsx    # 从 AI Studio 迁移
│   ├── teacher/
│   │   ├── page.tsx              # 重写（基于 AI Studio）
│   │   ├── tasks/[taskId]/page.tsx
│   │   └── corrections/[submissionId]/page.tsx
│   └── student/
│       ├── page.tsx              # 重写（基于 AI Studio）
│       └── growth/page.tsx
├── lib/
│   ├── utils.ts                  # 新增
│   ├── api/
│   │   └── client.ts             # 更新
│   ├── ai/
│   │   └── gemini.ts             # 从 AI Studio 迁移
│   └── auth/
│       └── session.ts            # 更新
```

### 保留文件
- `frontend/app/globals.css` - 保留现有样式
- `frontend/app/login/_components/` - 保留角色选择组件
- `frontend/lib/api/types.ts` - 更新类型定义

## API 对接清单

### 认证 API
- [ ] POST /api/v1/auth/send-code
- [ ] POST /api/v1/auth/login
- [ ] POST /api/v1/auth/password-login
- [ ] POST /api/v1/auth/refresh
- [ ] GET /api/v1/auth/wechat/authorize
- [ ] GET /api/v1/auth/wechat/callback

### 教师 API
- [ ] GET /api/v1/teacher/tasks
- [ ] GET /api/v1/tasks/{id}/submissions
- [ ] POST /api/v1/submissions/{id}/feedback
- [ ] POST /api/v1/submissions/{id}/threads

### 学生 API
- [ ] GET /api/v1/student/dashboard
- [ ] GET /api/v1/student/{id}/growth
- [ ] POST /api/v1/submissions
- [ ] GET /api/v1/submissions/{id}

## 测试计划

### 1. 单元测试
- [ ] 组件渲染测试
- [ ] API 客户端测试
- [ ] 工具函数测试

### 2. 集成测试
- [ ] 登录流程
- [ ] 教师任务管理
- [ ] 学生提交作文
- [ ] 批改反馈

### 3. E2E 测试
- [ ] 完整的用户旅程

## 风险与缓解

### 风险 1: 路由不兼容
**缓解**: 创建路由映射表，逐步迁移

### 风险 2: 状态管理差异
**缓解**: 使用 React Context + Cookies 统一管理

### 风险 3: 样式冲突
**缓解**: 使用 CSS Modules 或 Tailwind @apply

## 时间估算

| 阶段 | 工作量 | 预计时间 |
|------|--------|----------|
| Phase 1: 准备 | 2h | 1天 |
| Phase 2: 组件迁移 | 8h | 2天 |
| Phase 3: API 对接 | 6h | 1.5天 |
| Phase 4: 样式迁移 | 4h | 1天 |
| Phase 5: 功能适配 | 6h | 1.5天 |
| 测试 & 修复 | 4h | 1天 |
| **总计** | **30h** | **7-8天** |

## 下一步

是否开始执行迁移？
1. 从 Phase 1 开始
2. 还是先创建一个最小原型验证可行性？
