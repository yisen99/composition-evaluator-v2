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

## 核心占位 API

- `GET /api/v1/health`
- `POST /api/v1/auth/send-code`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register` (成熟账号方案，FastAPI Users)
- `POST /api/v1/auth/jwt/login`
- `GET /api/v1/auth/me`

## 认证方案

项目已接入 GitHub 成熟后端方案 [fastapi-users](https://github.com/fastapi-users/fastapi-users)：

- 账号注册（邮箱+密码）
- JWT 登录与授权校验
- 角色授权（teacher/student）与业务接口联动
- 保留短信验证码链路用于学生侧调试（老师账号使用邮箱密码）
