# 技术架构设计: 统一登录与双角色系统

**项目**: Composition Evaluator v2.0
**日期**: 2026-02-23
**作者**: Claude Code (BMAD Architect Agent)
**版本**: v2.0

---

## 📋 目录

1. [架构概览](#架构概览)
2. [数据库架构](#数据库架构)
3. [后端架构](#后端架构)
4. [前端架构](#前端架构)
5. [AI 服务架构](#ai-服务架构)
6. [安全架构](#安全架构)
7. [部署架构](#部署架构)
8. [数据迁移策略](#数据迁移策略)

---

## 架构概览

### 系统架构图

```mermaid
graph TB
    subgraph "前端层 Frontend"
        A[Next.js 15 App Router]
        B1[登录页面]
        B2[信息补全向导]
        B3[教师工作台]
        B4[学生工作台]
        B5[角色切换页面]
    end

    subgraph "API 网关层 API Gateway"
        C[FastAPI Backend]
        C1[认证中间件]
        C2[角色检查中间件]
        C3[速率限制]
    end

    subgraph "业务逻辑层 Business Logic"
        D1[认证服务 AuthService]
        D2[用户服务 UserService]
        D3[批改服务 GradingService]
        D4[作业服务 SubmissionService]
        D5[记忆服务 MemoryService]
    end

    subgraph "AI 服务层 AI Services"
        E1[Claude 内容分析]
        E2[GPT-4 评分]
        E3[Gemini 评语生成]
        E4[OCR 图片识别]
        E5[语音转文字 STT]
    end

    subgraph "数据层 Data Layer"
        F1[(PostgreSQL)]
        F2[(Redis 缓存)]
        F3[(S3 对象存储)]
    end

    A --> C
    C --> C1 --> C2 --> C3
    C --> D1
    C --> D2
    C --> D3
    C --> D4
    C --> D5

    D3 --> E1
    D3 --> E2
    D3 --> E3
    D4 --> E4
    D3 --> E5

    D1 --> F1
    D2 --> F1
    D3 --> F1
    D4 --> F1
    D5 --> F1

    D3 --> F2
    D4 --> F3
```

### 技术栈总览

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| **前端** | Next.js | 15.x | React 框架 |
| | TypeScript | 5.x | 类型安全 |
| | Ant Design | 5.x | UI 组件库 |
| | Zustand | 4.x | 状态管理 |
| | React Query | 5.x | 服务端状态 |
| **后端** | FastAPI | 0.104+ | Web 框架 |
| | SQLAlchemy | 2.x | ORM |
| | Alembic | 1.x | 数据库迁移 |
| | Celery | 5.x | 异步任务队列 |
| | Redis | 7.x | 缓存和消息队列 |
| **数据库** | PostgreSQL | 15+ | 主数据库 |
| **AI 服务** | Claude API | 3.0 | 内容分析 |
| | OpenAI API | 1.x | 评分 |
| | Gemini API | 1.x | 评语生成 |
| | OCR API | 自选 | 图片识别 |
| | STT API | 自选 | 语音转文字 |
| **存储** | AWS S3 | - | 对象存储 |
| **部署** | Docker | 24+ | 容器化 |
| | Nginx | 1.24+ | 反向代理 |

---

## 数据库架构

### 核心表设计

#### 1. auth_accounts - 认证账号表(重构)

```sql
-- 旧表结构
CREATE TABLE auth_accounts (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    role VARCHAR(20) DEFAULT 'student',  -- 旧字段,删除
    -- ...
);

-- 新表结构
CREATE TABLE auth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,

    -- 双角色系统
    roles JSONB NOT NULL DEFAULT '["student"]',  -- ["student"], ["teacher"], ["student", "teacher"]
    active_role VARCHAR(20) NOT NULL DEFAULT 'student',  -- 当前活跃角色

    -- 认证信息
    hashed_password VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    is_superuser BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,

    -- 首登信息补全
    onboarding_completed BOOLEAN DEFAULT FALSE,

    -- 基础信息
    display_name VARCHAR(100) NOT NULL,

    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,

    -- 索引
    CONSTRAINT chk_roles_valid CHECK (
        roles <@ ARRAY['student', 'teacher', 'admin']::VARCHAR[]
    ),
    CONSTRAINT chk_active_role_valid CHECK (
        active_role IN ('student', 'teacher', 'admin')
    )
);

-- 索引
CREATE INDEX idx_auth_accounts_phone ON auth_accounts(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_auth_accounts_email ON auth_accounts(email) WHERE email IS NOT NULL;
CREATE INDEX idx_auth_accounts_roles ON auth_accounts USING GIN(roles);
CREATE INDEX idx_auth_accounts_active_role ON auth_accounts(active_role);
```

**关键变更**:
- `role` → `roles` (JSON 数组)
- 新增 `active_role` (当前活跃角色)
- 新增 `onboarding_completed` (首登标记)

---

#### 2. users - 用户信息表(重构)

```sql
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_account_id UUID NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,

    -- 学生信息
    real_name VARCHAR(100),
    grade VARCHAR(20),  -- 一年级~高三
    city VARCHAR(100),  -- 城市
    gender VARCHAR(20),  -- male, female, other

    -- 教师信息
    school_name VARCHAR(200),
    subject VARCHAR(50),  -- 语文、数学等

    -- 共同信息
    avatar_url VARCHAR(500),
    bio TEXT,

    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- 索引
    CONSTRAINT chk_grade_valid CHECK (
        grade IN ('一年级', '二年级', '三年级', '四年级', '五年级', '六年级',
                 '七年级', '八年级', '九年级', '高一', '高二', '高三')
    ),
    CONSTRAINT chk_gender_valid CHECK (
        gender IN ('male', 'female', 'other')
    )
);

-- 索引
CREATE INDEX idx_users_auth_account_id ON users(auth_account_id);
CREATE INDEX idx_users_grade ON users(grade) WHERE grade IS NOT NULL;
CREATE INDEX idx_users_city ON users(city) WHERE city IS NOT NULL;
```

---

#### 3. student_long_term_memory - 学生长期记忆表(新增)

```sql
CREATE TABLE student_long_term_memory (
    student_id VARCHAR(36) PRIMARY KEY,

    -- 基础信息
    basic_info JSONB NOT NULL DEFAULT '{}',  -- {grade, city, gender}

    -- 作业统计
    stats JSONB NOT NULL DEFAULT '{}',  -- {total_submissions, average_score, submission_frequency}

    -- 写作特点(AI 分析)
    writing_characteristics JSONB NOT NULL DEFAULT '{}',
    -- {strengths: [], weaknesses: [], preferred_topics: [], writing_style: ""}

    -- 成长轨迹
    growth_trajectory JSONB NOT NULL DEFAULT '{}',
    -- {recent_scores: [], improvement_rate, streak}

    -- 历史作业(最近 20 次)
    submissions JSONB NOT NULL DEFAULT '[]',
    -- [{id, title, score, feedback, submitted_at}, ...]

    -- 更新时间
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- 外键
    CONSTRAINT fk_student FOREIGN KEY (student_id)
        REFERENCES users(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_student_long_term_memory_updated_at ON student_long_term_memory(updated_at);
```

**JSON 结构示例**:

```json
{
  "basic_info": {
    "grade": "三年级",
    "city": "上海",
    "gender": "male"
  },
  "stats": {
    "total_submissions": 15,
    "average_score": 82.5,
    "submission_frequency": 3.2  // 次/月
  },
  "writing_characteristics": {
    "strengths": ["描写生动", "词汇丰富"],
    "weaknesses": ["结构不够清晰", "细节不足"],
    "preferred_topics": ["写景", "叙事"],
    "writing_style": "朴实"
  },
  "growth_trajectory": {
    "recent_scores": [78, 82, 85, 80, 88],
    "improvement_rate": 12.8,  // %
    "streak": 5  // 连续提交次数
  },
  "submissions": [
    {
      "id": "sub-123",
      "title": "春天的景色",
      "score": 85,
      "feedback": "描写生动,但需要补充细节...",
      "submitted_at": "2024-02-20T10:30:00Z"
    }
    // ... 最近 20 次
  ]
}
```

---

#### 4. grading_records - 批改记录表(重构)

```sql
CREATE TABLE grading_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,

    -- AI 批改结果
    ai_suggestions JSONB,  -- {score, feedback, confidence, model_results}

    -- 教师批改
    score INTEGER,
    feedback TEXT,
    adopted_suggestions TEXT[],  -- 采纳的 AI 建议

    -- 语音评语
    voice_feedback_url VARCHAR(500),  -- S3 URL
    voice_feedback_transcript TEXT,  -- 语音转文字结果

    -- 状态
    status VARCHAR(20) NOT NULL DEFAULT 'draft',  -- draft, submitted, returned

    -- 版本(支持批改历史)
    version INTEGER DEFAULT 1,

    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,

    -- 约束
    CONSTRAINT chk_score_range CHECK (score >= 0 AND score <= 100),
    CONSTRAINT chk_status_valid CHECK (status IN ('draft', 'submitted', 'returned'))
);

-- 索引
CREATE INDEX idx_grading_records_submission ON grading_records(submission_id);
CREATE INDEX idx_grading_records_teacher ON grading_records(teacher_id);
CREATE INDEX idx_grading_records_status ON grading_records(status);
CREATE INDEX idx_grading_records_submitted_at ON grading_records(submitted_at);
```

---

#### 5. grading_history - 批改历史表(新增)

```sql
CREATE TABLE grading_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grading_record_id UUID NOT NULL REFERENCES grading_records(id) ON DELETE CASCADE,

    -- 变更记录
    changes JSONB NOT NULL,  -- {field: {old, new}, ...}
    change_type VARCHAR(20) NOT NULL,  -- created, updated, submitted

    -- 操作人
    changed_by UUID REFERENCES auth_accounts(id),

    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_grading_history_record ON grading_history(grading_record_id);
CREATE INDEX idx_grading_history_created_at ON grading_history(created_at);
```

---

#### 6. submissions - 作业提交表(扩展)

```sql
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,

    -- 作业内容
    content TEXT,  -- 文本内容
    content_type VARCHAR(20) NOT NULL DEFAULT 'text',  -- text, image, document, mixed

    -- 附件
    attachments JSONB DEFAULT '[]',  -- [{type, url, filename, size, ocr_text}, ...]

    -- 状态
    status VARCHAR(20) NOT NULL DEFAULT 'draft',  -- draft, submitted, graded, returned

    -- OCR 状态
    ocr_status VARCHAR(20) DEFAULT 'pending',  -- pending, processing, completed, failed
    ocr_text TEXT,  -- OCR 提取的文字

    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,

    -- 约束
    CONSTRAINT chk_content_type_valid CHECK (
        content_type IN ('text', 'image', 'document', 'mixed')
    ),
    CONSTRAINT chk_status_valid CHECK (
        status IN ('draft', 'submitted', 'graded', 'returned')
    )
);

-- 索引
CREATE INDEX idx_submissions_task ON submissions(task_id);
CREATE INDEX idx_submissions_student ON submissions(student_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at);
```

---

### ER 图

```mermaid
erDiagram
    auth_accounts ||--o| users : "has"
    auth_accounts ||--o{ grading_records : "creates"
    auth_accounts ||--o{ submissions : "submits"
    users ||--o| student_long_term_memory : "has"
    submissions ||--o| grading_records : "graded by"
    grading_records ||--o{ grading_history : "tracks"
    tasks ||--o{ submissions : "receives"
```

---

## 后端架构

### 项目结构

```
backend/
├── app/
│   ├── main.py                          # FastAPI 应用入口
│   ├── config.py                        # 配置管理
│   │
│   ├── api/                             # API 层
│   │   ├── v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── auth.py              # 认证相关端点
│   │   │   │   ├── users.py             # 用户管理端点
│   │   │   │   ├── grading.py           # 批改相关端点
│   │   │   │   ├── submissions.py       # 作业提交端点
│   │   │   │   ├── memory.py            # 长期记忆端点
│   │   │   │   └── admin.py             # 管理员端点
│   │   │   └── api.py                   # API 路由注册
│   │   └── deps.py                      # 依赖注入
│   │
│   ├── core/                            # 核心功能
│   │   ├── security.py                  # 安全相关(JWT, 密码哈希)
│   │   ├── auth.py                      # 认证中间件
│   │   ├── rbac.py                      # 角色权限控制
│   │   └── config.py                    # 配置设置
│   │
│   ├── models/                          # SQLAlchemy 模型
│   │   ├── auth_account.py              # 认证账号模型
│   │   ├── user.py                      # 用户模型
│   │   ├── submission.py                # 作业提交模型
│   │   ├── grading_record.py            # 批改记录模型
│   │   ├── grading_history.py           # 批改历史模型
│   │   ├── student_long_term_memory.py  # 长期记忆模型
│   │   └── __init__.py
│   │
│   ├── schemas/                         # Pydantic schemas
│   │   ├── auth.py                      # 认证相关 schemas
│   │   ├── user.py                      # 用户相关 schemas
│   │   ├── grading.py                   # 批改相关 schemas
│   │   ├── submission.py                # 作业提交相关 schemas
│   │   └── memory.py                    # 长期记忆相关 schemas
│   │
│   ├── services/                        # 业务逻辑层
│   │   ├── auth_service.py              # 认证服务
│   │   ├── user_service.py              # 用户服务
│   │   ├── grading_service.py           # 批改服务
│   │   ├── submission_service.py        # 作业服务
│   │   ├── memory_service.py            # 记忆服务
│   │   ├── ai_service.py                # AI 服务集成
│   │   ├── ocr_service.py               # OCR 服务
│   │   └── notification_service.py      # 通知服务
│   │
│   ├── workers/                         # Celery 异步任务
│   │   ├── ai_tasks.py                  # AI 相关任务
│   │   ├── ocr_tasks.py                 # OCR 相关任务
│   │   └── memory_tasks.py              # 记忆更新任务
│   │
│   └── utils/                           # 工具函数
│       ├── phone.py                     # 手机号工具
│       ├── verification_code.py         # 验证码工具
│       └── storage.py                   # 存储工具
│
├── tests/                               # 测试
│   ├── api/
│   ├── services/
│   └── models/
│
├── alembic/                             # 数据库迁移
│   └── versions/
│
├── requirements.txt                     # 依赖
└── pyproject.toml                       # 项目配置
```

---

### 核心 API 端点设计

#### 1. 认证相关 (`/api/v1/auth`)

```python
# 发送验证码
POST /api/v1/auth/send-code
Request: { "phone": "13800138000" }
Response: { "expires_in": 300, "resend_cooldown": 60 }

# 验证码登录(自动注册)
POST /api/v1/auth/login
Request: { "phone": "13800138000", "code": "1234" }
Response: {
  "access_token": "xxx",
  "refresh_token": "yyy",
  "user": {
    "id": "uuid",
    "roles": ["student"],
    "active_role": "student",
    "onboarding_completed": false
  },
  "next_action": "onboarding_student"  // onboarding_student | onboarding_teacher | redirect_workbench
}

# 切换角色
POST /api/v1/auth/switch-role
Request: { "role": "teacher" }
Response: {
  "active_role": "teacher",
  "redirect_to": "/teacher/workbench"
}

# 刷新 Token
POST /api/v1/auth/refresh
Request: { "refresh_token": "yyy" }
Response: { "access_token": "zzz" }

# 登出
POST /api/v1/auth/logout
Response: { "message": "登出成功" }
```

---

#### 2. 用户管理 (`/api/v1/users`)

```python
# 首登信息补全 - 学生
POST /api/v1/users/onboarding/student
Request: {
  "real_name": "张三",
  "grade": "三年级",
  "city": "上海",
  "gender": "male",
  "password": "Password123"
}
Response: {
  "user": { "id": "uuid", "onboarding_completed": true },
  "redirect_to": "/student/workbench"
}

# 首登信息补全 - 教师
POST /api/v1/users/onboarding/teacher
Request: {
  "real_name": "李老师",
  "password": "Password123",
  "school_name": "上海小学",
  "subject": "语文"
}
Response: {
  "user": { "id": "uuid", "onboarding_completed": true },
  "redirect_to": "/teacher/workbench"
}

# 获取当前用户信息
GET /api/v1/users/me
Response: {
  "id": "uuid",
  "roles": ["student", "teacher"],
  "active_role": "teacher",
  "real_name": "张三",
  "grade": "三年级",
  "city": "上海",
  ...
}
```

---

#### 3. 批改相关 (`/api/v1/grading`)

```python
# 获取待批改列表
GET /api/v1/grading/submissions?task_id=xxx&status=pending
Response: {
  "items": [
    {
      "id": "uuid",
      "student_name": "张三",
      "title": "春天的景色",
      "submitted_at": "2024-02-20T10:30:00Z",
      "status": "pending"
    }
  ],
  "total": 8,
  "page": 1,
  "page_size": 20
}

# 获取单个提交详情
GET /api/v1/grading/submissions/{submission_id}
Response: {
  "id": "uuid",
  "content": "春天来了,花儿开了...",
  "student": {
    "id": "uuid",
    "real_name": "张三",
    "grade": "三年级",
    "city": "上海"
  },
  "attachments": [...],
  "student_history": {
    "recent_scores": [78, 82, 85],
    "average_score": 81.7,
    "strengths": ["描写生动"],
    "weaknesses": ["结构不够清晰"]
  }
}

# 请求 AI 批改建议
POST /api/v1/grading/ai-suggest
Request: { "submission_id": "uuid", "models": ["claude", "gpt-4", "gemini"] }
Response: {
  "suggestion": {
    "score": 85,
    "feedback": "描写生动,但需要补充细节...",
    "confidence": 0.85,
    "model_results": {
      "claude": { "analysis": "..." },
      "gpt-4": { "score": 85 },
      "gemini": { "feedback": "..." }
    }
  },
  "cached": false
}

# 保存批改记录(自动保存)
PUT /api/v1/grading/records/{record_id}
Request: {
  "score": 90,
  "feedback": "很好的作文...",
  "voice_feedback_url": "s3://xxx"
}
Response: {
  "id": "uuid",
  "updated_at": "2024-02-20T11:00:00Z"
}

# 提交批改
POST /api/v1/grading/records/{record_id}/submit
Response: {
  "message": "批改已提交",
  "next_submission_id": "uuid"  // 下一个待批改
}

# 获取批改历史
GET /api/v1/grading/records/{record_id}/history
Response: {
  "history": [
    {
      "id": "uuid",
      "changes": { "score": { "old": 85, "new": 90 } },
      "changed_at": "2024-02-20T11:00:00Z"
    }
  ]
}
```

---

#### 4. 作业提交 (`/api/v1/submissions`)

```python
# 上传附件(图片/文档)
POST /api/v1/submissions/upload
Request: FormData { "file": <binary> }
Response: {
  "url": "s3://bucket/xxx.jpg",
  "filename": "photo.jpg",
  "size": 2048576,
  "ocr_status": "processing"
}

# 提交作业
POST /api/v1/submissions
Request: {
  "task_id": "uuid",
  "content": "春天来了...",
  "attachments": [
    { "type": "image", "url": "s3://xxx.jpg", "ocr_text": "识别的文字" }
  ]
}
Response: {
  "id": "uuid",
  "status": "submitted",
  "submitted_at": "2024-02-20T10:30:00Z"
}

# 获取我的提交列表
GET /api/v1/submissions/my?status=graded
Response: {
  "items": [...],
  "total": 15
}
```

---

#### 5. 长期记忆 (`/api/v1/memory`)

```python
# 获取学生长期记忆
GET /api/v1/memory/student/{student_id}
Response: {
  "basic_info": {...},
  "stats": {...},
  "writing_characteristics": {...},
  "growth_trajectory": {...},
  "submissions": [...]
}

# 更新长期记忆(内部调用,不暴露给前端)
POST /api/v1/memory/update
Request: {
  "student_id": "uuid",
  "submission_id": "uuid",
  "grading_record_id": "uuid"
}
Response: { "updated_at": "2024-02-20T11:00:00Z" }
```

---

#### 6. 管理员 (`/api/v1/admin`)

```python
# 指定教师权限
POST /api/v1/admin/assign-teacher
Request: { "phone": "13800138000" }
Response: {
  "message": "已指定教师权限",
  "user": {
    "id": "uuid",
    "phone": "13800138000",
    "roles": ["student", "teacher"]
  }
}

# 获取所有用户列表
GET /api/v1/admin/users?page=1&page_size=20
Response: {
  "items": [...],
  "total": 100
}
```

---

### 中间件设计

#### 1. 认证中间件 (`core/auth.py`)

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> AuthAccount:
    """获取当前登录用户"""
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        user = db.query(AuthAccount).filter(AuthAccount.id == user_id).first()
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")

        return user
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")

async def get_current_active_user(
    current_user: AuthAccount = Depends(get_current_user)
) -> AuthAccount:
    """获取当前活跃用户"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user
```

---

#### 2. 角色权限中间件 (`core/rbac.py`)

```python
from functools import wraps
from typing import List

def require_roles(*roles: str):
    """角色权限检查装饰器"""
    def decorator(func):
        @wraps(func)
        async def wrapper(
            *args,
            current_user: AuthAccount = Depends(get_current_active_user),
            **kwargs
        ):
            if current_user.active_role not in roles:
                raise HTTPException(
                    status_code=403,
                    detail=f"Permission denied. Required roles: {roles}, Current role: {current_user.active_role}"
                )
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator

# 使用示例
@router.get("/teacher/workbench")
@require_roles("teacher")
async def teacher_workbench(
    current_user: AuthAccount = Depends(get_current_active_user)
):
    return {"message": "Welcome to teacher workbench"}

@router.get("/student/workbench")
@require_roles("student")
async def student_workbench(
    current_user: AuthAccount = Depends(get_current_active_user)
):
    return {"message": "Welcome to student workbench"}
```

---

#### 3. 速率限制中间件 (`core/ratelimit.py`)

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

# 使用示例
@router.post("/api/v1/auth/send-code")
@limiter.limit("5/minute")  # 每分钟最多 5 次
async def send_code(
    request: Request,
    payload: SendCodeRequest,
    db: Session = Depends(get_db)
):
    ...
```

---

## 前端架构

### 项目结构

```
frontend/
├── app/                                  # Next.js App Router
│   ├── (auth)/                           # 认证相关页面组
│   │   ├── login/
│   │   │   └── page.tsx                  # 统一登录页面
│   │   ├── onboarding/
│   │   │   ├── student/
│   │   │   │   └── page.tsx              # 学生信息补全
│   │   │   └── teacher/
│   │   │       └── page.tsx              # 教师信息补全
│   │   └── layout.tsx                    # 认证布局(无导航)
│   │
│   ├── (student)/                        # 学生工作台页面组
│   │   ├── workbench/
│   │   │   └── page.tsx                  # 学生工作台首页
│   │   ├── submit/
│   │   │   └── [taskId]/
│   │   │       └── page.tsx              # 作业提交页面
│   │   ├── submissions/
│   │   │   └── page.tsx                  # 我的提交列表
│   │   └── layout.tsx                    # 学生布局
│   │
│   ├── (teacher)/                        # 教师工作台页面组
│   │   ├── workbench/
│   │   │   └── page.tsx                  # 教师工作台首页
│   │   ├── grading/
│   │   │   └── [submissionId]/
│   │   │       └── page.tsx              # 批改页面
│   │   ├── tasks/
│   │   │   └── page.tsx                  # 任务管理
│   │   └── layout.tsx                    # 教师布局
│   │
│   ├── role-switch/
│   │   └── page.tsx                      # 角色切换页面
│   │
│   ├── api/                              # API Routes (可选)
│   │
│   ├── layout.tsx                        # 根布局
│   ├── page.tsx                          # 首页
│   └── globals.css                       # 全局样式
│
├── components/                           # 共享组件
│   ├── ui/                               # Ant Design 组件封装
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── ...
│   │
│   ├── auth/                             # 认证相关组件
│   │   ├── UnifiedLoginPage.tsx          # 统一登录
│   │   ├── OnboardingWizard.tsx          # 信息补全向导
│   │   └── RoleSwitchPage.tsx            # 角色切换
│   │
│   ├── teacher/                          # 教师相关组件
│   │   ├── TeacherLayout.tsx             # 教师布局
│   │   ├── StudentListSidebar.tsx        # 学生列表
│   │   ├── SubmissionViewer.tsx          # 作文查看器
│   │   ├── StudentHistoryCard.tsx        # 学生历史卡片
│   │   ├── AISuggestionPanel.tsx         # AI 建议面板
│   │   ├── GradingForm.tsx               # 批改表单
│   │   └── VoiceInputButton.tsx          # 语音输入
│   │
│   ├── student/                          # 学生相关组件
│   │   ├── StudentLayout.tsx             # 学生布局
│   │   ├── TaskInfoCard.tsx              # 任务信息卡片
│   │   ├── ContentInput.tsx              # 内容输入
│   │   ├── AttachmentUpload.tsx          # 附件上传
│   │   └── AutoSaveIndicator.tsx         # 自动保存指示器
│   │
│   └── shared/                           # 共享组件
│       ├── Header.tsx                    # 顶部导航
│       ├── RoleSwitcher.tsx              # 角色切换器
│       └── LoadingSpinner.tsx            # 加载动画
│
├── lib/                                 # 工具库
│   ├── api/                             # API 客户端
│   │   ├── client.ts                    # Axios 客户端
│   │   ├── auth.ts                      # 认证 API
│   │   ├── grading.ts                   # 批改 API
│   │   ├── submissions.ts               # 提交 API
│   │   └── memory.ts                    # 记忆 API
│   │
│   ├── hooks/                           # 自定义 Hooks
│   │   ├── useAuth.ts                   # 认证 Hook
│   │   ├── useAutoSave.ts               # 自动保存 Hook
│   │   ├── useVoiceInput.ts             # 语音输入 Hook
│   │   └── useStudentHistory.ts         # 学生历史 Hook
│   │
│   ├── store/                           # Zustand 状态管理
│   │   ├── authStore.ts                 # 认证状态
│   │   ├── gradingStore.ts              # 批改状态
│   │   └── submissionStore.ts           # 提交状态
│   │
│   └── utils/                           # 工具函数
│       ├── phone.ts                     # 手机号验证
│       ├── storage.ts                   # 本地存储
│       └── format.ts                    # 格式化
│
├── styles/                             # 样式文件
│   └── theme.ts                         # Ant Design 主题
│
├── types/                              # TypeScript 类型
│   ├── auth.ts
│   ├── grading.ts
│   └── submission.ts
│
└── tests/                              # 测试
    ├── unit/
    └── e2e/
```

---

### 状态管理设计

#### Zustand Store 结构

```typescript
// lib/store/authStore.ts
interface AuthState {
  // 用户信息
  user: User | null;
  token: string | null;
  roles: string[];
  activeRole: string;
  onboardingCompleted: boolean;

  // Actions
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  switchRole: (role: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  roles: [],
  activeRole: 'student',
  onboardingCompleted: false,

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  switchRole: (role) => set({ activeRole: role }),
  logout: () => set({ user: null, token: null }),
}));

// lib/store/gradingStore.ts
interface GradingState {
  // 当前批改的学生
  currentStudentId: string | null;
  currentSubmission: Submission | null;

  // AI 建议
  aiSuggestions: AISuggestions | null;
  aiLoading: boolean;

  // 批改数据
  gradingData: {
    score: number | null;
    feedback: string | null;
    voiceFeedbackUrl: string | null;
  };

  // 学生列表
  studentList: Student[];
  currentStudentIndex: number;

  // Actions
  setCurrentStudent: (studentId: string) => void;
  loadAISuggestions: (submissionId: string) => Promise<void>;
  updateGradingData: (data: Partial<GradingData>) => void;
  submitGrading: () => Promise<void>;
  nextStudent: () => void;
}

export const useGradingStore = create<GradingState>((set, get) => ({
  // ... 实现
}));
```

---

### 自定义 Hooks 设计

```typescript
// lib/hooks/useAutoSave.ts
export function useAutoSave(
  submissionId: string,
  data: GradingData,
  onSave?: (data: GradingData) => void
) {
  const saveRef = useRef<Promise<void>>();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsSaving(true);
      const savePromise = updateGradingRecord(submissionId, data);
      saveRef.current = savePromise;

      try {
        await savePromise;
        onSave?.(data);
      } finally {
        setIsSaving(false);
      }
    }, 30000); // 30 秒自动保存

    return () => {
      clearTimeout(timer);
      if (saveRef.current) {
        saveRef.current.catch(console.error);
      }
    };
  }, [submissionId, data, onSave]);

  return { isSaving };
}

// lib/hooks/useVoiceInput.ts
export function useVoiceInput(onTranscript: (text: string) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>();

  const startRecording = useCallback(() => {
    if (!('webkitSpeechRecognition' in window)) {
      message.error('您的浏览器不支持语音输入');
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  }, [onTranscript]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  return { isRecording, startRecording, stopRecording };
}

// lib/hooks/useStudentHistory.ts
export function useStudentHistory(studentId: string) {
  const [history, setHistory] = useState<StudentHistory | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      try {
        const data = await getStudentHistory(studentId);
        setHistory(data);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [studentId]);

  return { history, loading };
}
```

---

## AI 服务架构

### 多模型协作设计

```python
# services/ai_service.py
from typing import List, Dict
from anthropic import Anthropic
from openai import OpenAI
import google.generativeai as genai

class AIServiceManager:
    def __init__(self):
        self.claude_client = Anthropic(api_key=settings.CLAUDE_API_KEY)
        self.openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
        genai.configure(api_key=settings.GEMINI_API_KEY)

    async def get_grading_suggestions(
        self,
        submission_id: str,
        models: List[str] = ["claude", "gpt-4", "gemini"]
    ) -> Dict:
        """
        获取 AI 批改建议(多模型协作)

        流程:
        1. Claude: 内容分析(结构、描写、逻辑)
        2. GPT-4: 评分(0-100)
        3. Gemini: 评语生成(优点、建议)
        4. 聚合: 综合三个模型的结果
        """

        # 获取提交内容
        submission = await get_submission(submission_id)
        student_history = await get_student_history(submission.student_id)

        # 并行调用多个 AI 模型
        results = await asyncio.gather(
            self._analyze_with_claude(submission, student_history),
            self._score_with_gpt4(submission, student_history),
            self._generate_feedback_with_gemini(submission, student_history),
            return_exceptions=True
        )

        # 聚合结果
        claude_analysis = results[0] if not isinstance(results[0], Exception) else None
        gpt4_score = results[1] if not isinstance(results[1], Exception) else None
        gemini_feedback = results[2] if not isinstance(results[2], Exception) else None

        # 计算置信度(基于模型一致性)
        confidence = self._calculate_confidence([
            claude_analysis, gpt4_score, gemini_feedback
        ])

        return {
            "score": gpt4_score,  # 使用 GPT-4 的分数
            "feedback": gemini_feedback,  # 使用 Gemini 的评语
            "analysis": claude_analysis,  # 使用 Claude 的分析
            "confidence": confidence,
            "model_results": {
                "claude": claude_analysis,
                "gpt-4": gpt4_score,
                "gemini": gemini_feedback
            }
        }

    async def _analyze_with_claude(self, submission, student_history):
        """Claude: 内容分析"""
        prompt = f"""
        分析以下学生作文,重点关注:
        1. 文章结构(开头、中间、结尾)
        2. 描写手法(语言、细节、修辞)
        3. 逻辑连贯性

        学生历史:
        - 年级: {student_history.grade}
        - 平均分: {student_history.average_score}
        - 擅长: {', '.join(student_history.strengths)}
        - 待改进: {', '.join(student_history.weaknesses)}

        作文标题: {submission.title}
        作文内容: {submission.content}

        请以 JSON 格式返回分析结果:
        {{
          "structure": {{"score": 8, "comments": "..."}},
          "description": {{"score": 9, "comments": "..."}},
          "logic": {{"score": 7, "comments": "..."}}
        }}
        """

        response = await self.claude_client.messages.create(
            model="claude-3-opus-20240229",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        )

        return json.loads(response.content[0].text)

    async def _score_with_gpt4(self, submission, student_history):
        """GPT-4: 评分"""
        prompt = f"""
        给以下作文打分(0-100分),考虑:
        1. 年级水平({student_history.grade})
        2. 学生历史表现(平均分{student_history.average_score})
        3. 作文完成度

        作文标题: {submission.title}
        作文内容: {submission.content}

        只返回一个数字分数。
        """

        response = await self.openai_client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=10,
            temperature=0
        )

        score_text = response.choices[0].message.content.strip()
        return int(score_text)

    async def _generate_feedback_with_gemini(self, submission, student_history):
        """Gemini: 评语生成"""
        prompt = f"""
        为以下作文生成评语,包含:
        1. 优点(2-3条)
        2. 建议(2-3条)

        学生历史: {student_history.grade},平均分{student_history.average_score}
        作文标题: {submission.title}
        作文内容: {submission.content}

        请以 JSON 格式返回:
        {{
          "strengths": ["描写生动", "词汇丰富"],
          "suggestions": ["补充细节", "加强结构"]
        }}
        """

        model = genai.GenerativeModel('gemini-pro')
        response = await model.generate_content_async(prompt)

        return json.loads(response.text)

    def _calculate_confidence(self, results: List) -> float:
        """计算置信度(基于模型一致性)"""
        # 如果 3 个模型都成功,置信度高
        # 如果只有 1-2 个模型成功,置信度中/低
        success_count = sum(1 for r in results if r is not None)

        if success_count == 3:
            return 0.85  # 高置信度
        elif success_count == 2:
            return 0.65  # 中置信度
        else:
            return 0.45  # 低置信度
```

---

### 异步任务设计 (Celery)

```python
# workers/ai_tasks.py
from celery import Celery

celery_app = Celery('tasks', broker=settings.REDIS_URL)

@celery_app.task
def update_student_long_term_memory(
    student_id: str,
    submission_id: str,
    grading_record_id: str
):
    """
    异步更新学生长期记忆

    流程:
    1. 获取最新的批改记录
    2. 更新 stats(总提交数、平均分)
    3. 调用 AI 分析写作特点
    4. 更新 growth_trajectory(成长轨迹)
    5. 保存到数据库
    """
    from app.services.memory_service import MemoryService

    memory_service = MemoryService()
    memory_service.update_memory(
        student_id=student_id,
        submission_id=submission_id,
        grading_record_id=grading_record_id
    )

# 调用方式
@router.post("/api/v1/grading/records/{record_id}/submit")
async def submit_grading(record_id: str):
    # ... 提交批改记录

    # 异步更新学生长期记忆
    update_student_long_term_memory.delay(
        student_id=submission.student_id,
        submission_id=submission_id,
        grading_record_id=record_id
    )

    return {"message": "批改已提交"}
```

---

## 安全架构

### 安全策略

#### 1. 认证安全

```python
# JWT Token 配置
class JWTSettings:
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7
    algorithm: str = "HS256"
    secret_key: str = settings.JWT_SECRET_KEY

# 密码策略
class PasswordPolicy:
    min_length: int = 8
    require_uppercase: bool = True
    require_lowercase: bool = True
    require_digit: bool = True
    require_special_char: bool = False  # 可选

# 验证码策略
class VerificationCodePolicy:
    length: int = 4
    expire_seconds: int = 300  # 5 分钟
    max_attempts_per_hour: int = 10
    cooldown_seconds: int = 60  # 60 秒冷却
```

---

#### 2. 数据安全

```python
# 敏感数据加密
from cryptography.fernet import Fernet

class DataEncryption:
    def encrypt(self, data: str) -> str:
        """加密敏感数据"""
        fernet = Fernet(settings.ENCRYPTION_KEY)
        return fernet.encrypt(data.encode()).decode()

    def decrypt(self, encrypted_data: str) -> str:
        """解密敏感数据"""
        fernet = Fernet(settings.ENCRYPTION_KEY)
        return fernet.decrypt(encrypted_data.encode()).decode()

# 使用示例
# 加密手机号(如果需要)
encrypted_phone = DataEncryption().encrypt("13800138000")
```

---

#### 3. API 安全

```python
# CORS 配置
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # 生产环境指定域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 速率限制
from slowapi import Limiter

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# SQL 注入防护(使用 SQLAlchemy ORM,自动防护)
# XSS 防护(前端使用 React,自动转义)
# CSRF 防护(使用 JWT,无 CSRF 风险)
```

---

## 部署架构

### Docker Compose 配置

```yaml
# docker-compose.yml
version: '3.8'

services:
  # PostgreSQL 数据库
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: composition_evaluator
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  # Redis 缓存
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # FastAPI 后端
  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@postgres:5432/composition_evaluator
      REDIS_URL: redis://redis:6379/0
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend:/app
      - uploads:/app/uploads

  # Celery Worker
  celery_worker:
    build: ./backend
    command: celery -A app.workers.celery_app worker --loglevel=info
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@postgres:5432/composition_evaluator
      REDIS_URL: redis://redis:6379/0
    depends_on:
      - postgres
      - redis

  # Next.js 前端
  frontend:
    build: ./frontend
    environment:
      NEXT_PUBLIC_API_URL: http://backend:8000
    ports:
      - "3000:3000"
    depends_on:
      - backend

  # Nginx 反向代理
  nginx:
    image: nginx:1.24-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs  # SSL 证书
    depends_on:
      - frontend
      - backend

volumes:
  postgres_data:
  redis_data:
  uploads:
```

---

## 数据迁移策略

### Alembic 迁移脚本

```python
# alembic/versions/2026_02_23_add_dual_role_system.py
"""add dual role system and long term memory

Revision ID: 2026_02_23_001
Create Date: 2026-02-23

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '2026_02_23_001'
down_revision = 'previous_version_id'  # 替换为实际的上一版本 ID


def upgrade():
    # 1. 添加新字段
    op.add_column('auth_accounts',
        sa.Column('roles', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.add_column('auth_accounts',
        sa.Column('active_role', sa.String(20), server_default='student', nullable=False))
    op.add_column('auth_accounts',
        sa.Column('onboarding_completed', sa.Boolean(), server_default='false', nullable=False))

    # 2. 迁移现有数据
    connection = op.get_bind()
    connection.execute("""
        UPDATE auth_accounts
        SET roles = JSON_BUILD_ARRAY(role),
            active_role = role
        WHERE role IS NOT NULL
    """)

    # 3. 添加约束
    op.create_check_constraint(
        'chk_auth_accounts_roles_valid',
        'auth_accounts',
        "roles <@ ARRAY['student', 'teacher', 'admin']::VARCHAR[]"
    )
    op.create_check_constraint(
        'chk_auth_accounts_active_role_valid',
        'auth_accounts',
        "active_role IN ('student', 'teacher', 'admin')"
    )

    # 4. 设置 NOT NULL(roles 列现在已经有数据了)
    op.alter_column('auth_accounts', 'roles',
                   nullable=False)

    # 5. 删除旧字段
    op.drop_column('auth_accounts', 'role')

    # 6. 创建新表
    op.create_table('student_long_term_memory',
        sa.Column('student_id', sa.String(36), primary_key=True),
        sa.Column('basic_info', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('stats', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('writing_characteristics', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('growth_trajectory', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('submissions', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ondelete='CASCADE')
    )

    op.create_table('grading_history',
        sa.Column('id', sa.UUID(), primary_key=True),
        sa.Column('grading_record_id', sa.UUID(), nullable=False),
        sa.Column('changes', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('change_type', sa.String(20), nullable=False),
        sa.Column('changed_by', sa.UUID()),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(['grading_record_id'], ['grading_records.id'], ondelete='CASCADE')
    )

    # 7. 创建索引
    op.create_index('idx_auth_accounts_roles', 'auth_accounts', ['roles'], postgresql_using='gin')
    op.create_index('idx_auth_accounts_active_role', 'auth_accounts', ['active_role'])


def downgrade():
    # 回滚操作
    op.add_column('auth_accounts',
        sa.Column('role', sa.String(20), nullable=True))

    connection = op.get_bind()
    connection.execute("""
        UPDATE auth_accounts
        SET role = active_role
    """)

    op.alter_column('auth_accounts', 'role', nullable=False)

    op.drop_column('auth_accounts', 'roles')
    op.drop_column('auth_accounts', 'active_role')
    op.drop_column('auth_accounts', 'onboarding_completed')

    op.drop_table('student_long_term_memory')
    op.drop_table('grading_history')
```

---

## 实施优先级

### Phase 1: 核心认证系统(Week 1)

1. ✅ 数据库迁移(双角色系统)
2. ✅ 统一登录 API
3. ✅ 首登信息补全 API
4. ✅ 角色切换 API
5. ✅ 前端登录页面

### Phase 2: 教师工作台(Week 2-3)

6. ✅ 批改页面布局
7. ✅ 学生列表侧边栏
8. ✅ 作文内容查看器
9. ✅ 批改表单
10. ✅ 自动保存功能

### Phase 3: AI 集成(Week 4)

11. ✅ AI 批改建议 API
12. ✅ AI 建议面板组件
13. ✅ 学生历史背景卡片
14. ✅ 语音输入按钮

### Phase 4: 学生工作台(Week 5)

15. ✅ 作业提交页面
16. ✅ 附件上传
17. ✅ OCR 集成
18. ✅ 学生长期记忆库

### Phase 5: 测试与发布(Week 6)

19. ✅ 功能测试
20. ✅ 性能测试
21. ✅ 安全测试
22. ✅ 灰度发布

---

**文档版本**: v1.0
**最后更新**: 2026-02-23
**下一步**: 使用 Superpowers brainstorming 讨论实施细节
