# 多 AI 协作系统配置

## 项目架构

```
┌─────────────────────────────────────────────────────────┐
│         Claude Code (Project Manager)                    │
│  - 任务分解与分配                                         │
│  - 代码审查与整合                                         │
│  - 质量控制与冲突解决                                     │
│  - 维护项目规范和 API 契约                               │
└────────────┬────────────────┬───────────────────────────┘
             │                │
    ┌────────▼────────┐  ┌───▼─────────────┐
    │  Gemini AI      │  │  OpenAI Codex   │
    │  Frontend Dev   │  │  Backend Dev    │
    │                 │  │                 │
    │ - React/Next.js │  │ - FastAPI       │
    │ - UI 组件        │  │ - 数据库模型    │
    │ - 页面逻辑       │  │ - API 端点      │
    │ - 样式实现       │  │ - 业务逻辑      │
    └─────────────────┘  └─────────────────┘
             │                │
             └────────┬───────┘
                      ▼
           ┌──────────────────┐
           │  Shared Memory   │
           │  - .claude/specs │
           │  - .claude/memory│
           │  - API contracts │
           │  - Design docs   │
           └──────────────────┘
```

## 实现方案

### 方案 1: 使用 Claude Code 内置 Team 功能（推荐）✅

Claude Code 已经内置了多 agent 协作功能！

#### 创建多 Agent 团队

```bash
# 在项目中创建多 agent 团队
cd /Users/ethan/Desktop/vibe-coding/composition-evaluator

# Claude Code 会创建团队配置
```

#### 团队配置

创建 `.claude/agents/config.yaml`:

```yaml
team_name: "composition-evaluator-dev"

agents:
  project_manager:
    role: "Claude Code (当前会话)"
    responsibilities:
      - 任务分解和分配
      - 代码审查
      - 整合前端和后端代码
      - 确保 API 契约一致性
      - 冲突解决

  frontend_developer:
    role: "Gemini AI Studio"
    responsibilities:
      - 实现前端组件
      - 页面路由
      - UI/UX 实现
      - 对接后端 API
    tools:
      - gemini_cli
      - react_devtools
    focus:
      - frontend/**
      - app/**

  backend_developer:
    role: "OpenAI Codex"
    responsibilities:
      - 实现后端 API
      - 数据库模型
      - 业务逻辑
      - 安全性实现
    tools:
      - codex_cli
      - fastapi
    focus:
      - backend/**
      - backend/app/**

shared_memory:
  specs: ".claude/specs"
  memory: ".claude/memory"
  api_contracts: ".claude/memory/api-contract.md"
  design_docs: ".claude/design"
```

### 方案 2: 使用 GitHub + AI 编程助手（最简单）

#### 工作流程

1. **GitHub Issues 作为任务管理**
   - 创建 issue 描述任务
   - 使用标签标记: `frontend`, `backend`, `urgent`

2. **分支策略**
   ```
   main (生产)
   ├── develop (开发)
   │   ├── feature/frontend-xxx (Gemini 工作)
   │   └── feature/backend-xxx (Codex 工作)
   ```

3. **协作流程**
   ```
   Claude Code (PM):
   1. 在 GitHub 创建 issue
   2. 分配给不同的 AI

   Gemini (Frontend):
   1. 拉取 feature/frontend-xxx 分支
   2. 实现前端功能
   3. 推送并创建 PR

   Codex (Backend):
   1. 拉取 feature/backend-xxx 分支
   2. 实现后端 API
   3. 推送并创建 PR

   Claude Code (PM):
   1. 审查两个 PR
   2. 确保 API 契约匹配
   3. 合并到 develop
   ```

### 方案 3: 使用本地多 AI 工具链（高级）

#### 安装工具

```bash
# 1. Claude Code (已安装)
# 当前会话就是 Claude Code

# 2. Gemini CLI (用于前端)
npm install -g @google-ai/generativelanguage-cli

# 3. OpenAI Codex (用于后端)
# 通过 VS Code Cursor 或 GitHub Copilot 访问

# 4. 任务编排器
npm install -g @composiohq/agent-orchestrator
```

#### 配置文件

创建 `agent-orchestrator.yaml`:

```yaml
port: 3000

defaults:
  runtime: tmux
  notifiers: [desktop]

projects:
  composition-evaluator:
    repo: yisen99/composition-evaluator
    path: ~/Desktop/vibe-coding/composition-evaluator
    defaultBranch: main
    sessionPrefix: ce

    agents:
      # Gemini 负责前端
      frontend-specialist:
        agent: gemini-cli
        focus: frontend/**
        rules: |
          使用 Next.js 14 App Router
          遵循 React 最佳实践
          使用 Tailwind CSS
          对接后端 API（参考 .claude/memory/api-contract.md）
          创建可复用组件

      # Codex 负责后端
      backend-specialist:
        agent: codex
        focus: backend/**
        rules: |
          使用 FastAPI 框架
          遵循 Python 最佳实践
          实现完整的 API 端点
          添加数据验证和错误处理
          遵循 API 契约（.claude/memory/api-contract.md）

      # Claude Code 作为项目经理
      project-manager:
        agent: claude-code
        role: coordinator
        rules: |
          审查所有代码变更
          确保前端和后端 API 对接
          维护 API 契约文档
          解决冲突
          运行测试
          合并代码
```

## 共享记忆库

### 目录结构

```
.claude/
├── specs/                    # 功能规格
│   ├── frontend-login.md     # 前端登录规格
│   ├── teacher-dashboard.md  # 教师仪表盘规格
│   └── api-contract.md       # API 契约
├── memory/                   # 共享记忆
│   ├── api-contract.md       # API 契约（已创建）
│   ├── decisions.md          # 技术决策记录
│   └── progress.md           # 项目进度
├── design/                   # 设计文档
│   ├── ui-components.md      # UI 组件设计
│   └── database-schema.md    # 数据库设计
└── agents/                   # AI 配置
    ├── config.yaml           # Agent 配置
    └── prompts/              # AI 提示词
        ├── frontend.md       # 前端 AI 提示词
        └── backend.md        # 后端 AI 提示词
```

### API 契约示例

`.claude/memory/api-contract.md` (已创建):

```markdown
# API 契约

## 认证端点

### POST /api/v1/auth/send-code
发送验证码

**请求:**
{
  "phone": "13800138000",
  "role_hint": "student"
}

**响应:**
{
  "request_id": "uuid",
  "expires_in": 300
}
```

## 工作流程示例

### 场景：实现教师仪表盘

#### 1. Claude Code (项目经理) 分配任务

```markdown
## 任务：实现教师仪表盘

### 前端任务（Gemini）
- 文件：frontend/app/teacher/page.tsx
- 参考：frontend/app/teacher/tasks/page.tsx (任务中心布局)
- API：
  - GET /api/v1/teacher/tasks
  - GET /api/v1/tasks/{id}/submissions
- 要求：
  - 使用 Tailwind CSS
  - 显示 P0/P1/P2 优先级卡片
  - 任务列表

### 后端任务（Codex）
- 文件：backend/app/api/v1/endpoints/teacher.py
- 要求：
  - 实现 GET /api/v1/teacher/tasks
  - 返回任务列表
  - 包含提交统计
```

#### 2. Gemini (前端) 实现

```bash
# Gemini 读取任务
# 读取 .claude/specs/teacher-dashboard.md
# 读取 .claude/memory/api-contract.md

# 生成前端代码
# 创建 frontend/app/teacher/page.tsx
```

#### 3. Codex (后端) 实现

```bash
# Codex 读取任务
# 读取 .claude/specs/teacher-dashboard.md
# 读取 .claude/memory/api-contract.md

# 生成后端代码
# 创建 backend/app/api/v1/endpoints/teacher.py
```

#### 4. Claude Code (项目经理) 审查和整合

```bash
# 检查 API 契约是否匹配
# 运行测试
# 合并代码
```

## 提示词模板

### 前端 AI 提示词

`.claude/agents/prompts/frontend.md`:

```markdown
你是一个前端开发专家，使用 Gemini AI。

## 项目信息
- 项目：composition-evaluator
- 框架：Next.js 14 + React 19 + TypeScript
- 样式：Tailwind CSS
- 图标：Lucide React

## 工作流程
1. 阅读 .claude/specs/ 中的任务规格
2. 阅读 .claude/memory/api-contract.md 了解 API
3. 实现前端组件
4. 确保响应式设计
5. 添加加载和错误状态

## 代码规范
- 使用 TypeScript 严格模式
- 组件命名：PascalCase
- 文件位置：frontend/app/
- 使用 'use client' 标记客户端组件
- 从 'lucide-react' 导入图标

## API 调用
使用 fetch 或 axios 调用后端 API
参考 .claude/memory/api-contract.md
```

### 后端 AI 提示词

`.claude/agents/prompts/backend.md`:

```markdown
你是一个后端开发专家，使用 OpenAI Codex。

## 项目信息
- 项目：composition-evaluator
- 框架：FastAPI + Python 3.14
- 数据库：SQLite + SQLAlchemy
- 认证：JWT + Refresh Token

## 工作流程
1. 阅读 .claude/specs/ 中的任务规格
2. 阅读 .claude/memory/api-contract.md 了解 API 契约
3. 实现 API 端点
4. 添加数据验证
5. 添加错误处理
6. 编写测试

## 代码规范
- 遵循 PEP 8
- 使用类型注解
- Pydantic 模型定义在 schemas/
- 业务逻辑在 services/
- API 端点在 api/v1/endpoints/

## 安全要求
- 输入验证
- SQL 注入防护
- XSS 防护
- 认证和授权
```

## 开始使用

### 选项 1: 使用 Claude Code Teams（推荐）

1. 我会创建多个 agent teammates
2. 每个 agent 专注于特定领域
3. 共享项目上下文

### 选项 2: 手动协调（最简单）

1. 创建 GitHub issues
2. 使用不同的 AI 工具
3. 我来整合结果

### 选项 3: 完全自动化

1. 安装 agent-orchestrator
2. 配置多个 AI
3. 自动化工作流

## 下一步

您想要：
1. **我创建 Claude Code Teams**（推荐，功能最强大）
2. **设置 GitHub + 多 AI 工作流**（最简单）
3. **安装 agent-orchestrator**（最自动化）
