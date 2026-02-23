<<<<<<< HEAD
# Composition Evaluator

一个独立的语文作文批改网站骨架项目，采用前后端分离架构：

- Frontend: Next.js + TypeScript + Tailwind
- Backend: FastAPI + SQLAlchemy + Celery
- Infra: PostgreSQL + Redis + Docker Compose

## 项目结构

- `frontend/` 前端应用
- `backend/` 后端服务
- `infra/` 基础设施编排
- `docker-compose.yml` 根目录开发编排

## 快速开始

```bash
cp .env.example .env
docker compose up --build
```

启动后：

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Health: http://localhost:8000/api/v1/health

## 数据库迁移

后端启动时会自动执行 Alembic 迁移（`upgrade head`）。不再使用 `create_all` 自动建表。

常用命令：

```bash
make db-upgrade          # 执行迁移到最新
make db-downgrade        # 回滚一个版本
make db-stamp-head       # 仅标记当前版本为 head
make db-verify-rollback  # 升级->回滚->再升级 的完整验证
```

## 核心占位 API

- `GET /api/v1/health`
- `POST /api/v1/auth/send-code`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register` (成熟账号方案，FastAPI Users)
- `POST /api/v1/auth/jwt/login`
- `POST /api/v1/auth/password-login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/wechat/authorize`
- `GET /api/v1/auth/wechat/callback`
- `POST /api/v1/auth/wechat/send-bind-code`
- `POST /api/v1/auth/wechat/bind-phone`

## 认证方案

项目已接入 GitHub 成熟后端方案 [fastapi-users](https://github.com/fastapi-users/fastapi-users)：

- 账号注册（邮箱+密码）
- 统一 token 校验（`fastapi-users` 鉴权依赖）
- 支持 `AUTH_TOKEN_STRATEGY=jwt|redis`（推荐 `redis`，便于 token 吊销）
- 登录后返回 `access_token + refresh_token`，可调用 `/api/v1/auth/refresh` 轮换
- 短信验证码发送带冷却时间限制（`AUTH_CODE_RESEND_COOLDOWN_SECONDS`）
- 角色授权（teacher/student）与业务接口联动
- 保留短信验证码链路用于学生侧调试（老师账号使用邮箱密码）
- Casdoor 统一社交登录（接入微信）+ 强制手机号绑定（绑定前不签发业务 token）

### Casdoor 配置

后端保持 `/api/v1/auth/wechat/*` 接口不变，但 OAuth 提供方改为 Casdoor。需要在 `.env` 配置：

- `CASDOOR_ENDPOINT`
- `CASDOOR_CLIENT_ID`
- `CASDOOR_CLIENT_SECRET`
- `CASDOOR_REDIRECT_URI`（建议配置为前端回调页 `http://127.0.0.1:3000/login/wechat/callback`）
- 可选：`CASDOOR_SCOPE`、`CASDOOR_AUTHORIZE_PATH`、`CASDOOR_TOKEN_PATH`、`CASDOOR_USERINFO_PATH`
=======
<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/4e1d1a33-4c8b-487b-8ec9-5ff1390659eb

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
>>>>>>> ffacc7a2805e24f19272c1774b3a46855ac4c104
