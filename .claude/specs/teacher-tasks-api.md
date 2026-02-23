# 教师任务管理 API 规格

## 概述
实现教师任务管理相关的 API 端点，包括任务列表、任务详情、提交管理等。

## API 端点

### 1. 获取教师任务列表

**端点**: `GET /api/v1/teacher/tasks`

**查询参数**:
- `teacher_id` (string, required): 教师用户 ID
- `status` (string, optional): 筛选状态 (`published` | `draft` | `archived`)
- `page` (integer, optional): 页码，默认 1
- `limit` (integer, optional): 每页数量，默认 20

**响应示例**:
```json
{
  "tasks": [
    {
      "id": "uuid-1",
      "title": "描写春天的作文",
      "description": "请观察春天的事物，写一篇描写春天的作文",
      "status": "published",
      "created_at": "2025-02-20T10:00:00Z",
      "deadline": "2025-02-25T23:59:59Z",
      "submission_count": 15,
      "total_students": 30,
      "priority": "high"
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20
}
```

### 2. 获取任务详情

**端点**: `GET /api/v1/teacher/tasks/{task_id}`

**路径参数**:
- `task_id` (string, required): 任务 ID

**响应示例**:
```json
{
  "id": "uuid-1",
  "title": "描写春天的作文",
  "description": "请观察春天的事物，写一篇描写春天的作文",
  "status": "published",
  "created_at": "2025-02-20T10:00:00Z",
  "updated_at": "2025-02-20T10:00:00Z",
  "deadline": "2025-02-25T23:59:59Z",
  "submission_count": 15,
  "total_students": 30,
  "attachments": [],
  "requirements": {
    "min_words": 300,
    "max_words": 800,
    "submission_types": ["text", "image", "document"]
  }
}
```

### 3. 创建新任务

**端点**: `POST /api/v1/teacher/tasks`

**请求体**:
```json
{
  "title": "描写春天的作文",
  "description": "请观察春天的事物，写一篇描写春天的作文",
  "deadline": "2025-02-25T23:59:59Z",
  "requirements": {
    "min_words": 300,
    "max_words": 800
  },
  "class_ids": ["class-uuid-1", "class-uuid-2"]
}
```

**响应**: 返回创建的任务对象（同获取任务详情）

### 4. 更新任务

**端点**: `PUT /api/v1/teacher/tasks/{task_id}`

**请求体**: 同创建任务（所有字段可选）

**响应**: 返回更新后的任务对象

### 5. 发布/归档任务

**端点**: `PATCH /api/v1/teacher/tasks/{task_id}/status`

**请求体**:
```json
{
  "status": "published"
}
```

**可选状态**: `published` | `draft` | `archived`

### 6. 获取任务提交列表

**端点**: `GET /api/v1/teacher/tasks/{task_id}/submissions`

**查询参数**:
- `status` (string, optional): 筛选提交状态 (`pending` | `submitted` | `corrected`)
- `needs_reply` (boolean, optional): 仅显示待回复的提交

**响应示例**:
```json
{
  "submissions": [
    {
      "id": "submission-uuid-1",
      "task_id": "uuid-1",
      "student_id": "student-uuid-1",
      "student_name": "张三",
      "status": "submitted",
      "submitted_at": "2025-02-22T15:30:00Z",
      "score": null,
      "teacher_feedback": null,
      "unread_teacher_messages": 0
    }
  ],
  "total": 15,
  "pending_correction": 10
}
```

### 7. 获取提交详情

**端点**: `GET /api/v1/submissions/{submission_id}`

**响应示例**:
```json
{
  "id": "submission-uuid-1",
  "task_id": "uuid-1",
  "task_title": "描写春天的作文",
  "student_id": "student-uuid-1",
  "student_name": "张三",
  "content": "春天来了...",
  "status": "submitted",
  "submitted_at": "2025-02-22T15:30:00Z",
  "score": null,
  "teacher_feedback": null,
  "agent_style": "peach",
  "word_count": 450,
  "threads": [
    {
      "id": "thread-uuid-1",
      "sender_id": "student-uuid-1",
      "sender_name": "张三",
      "sender_role": "student",
      "message": "老师，我这次作文写得怎么样？",
      "created_at": "2025-02-22T16:00:00Z",
      "read_at": null
    }
  ]
}
```

### 8. 提交批改反馈

**端点**: `POST /api/v1/submissions/{submission_id}/feedback`

**请求体**:
```json
{
  "score": 85,
  "teacher_feedback": "文章结构清晰，描写生动...",
  "status": "corrected",
  "agent_style": "peach"
}
```

**响应**: 返回更新后的提交对象

### 9. 发送沟通消息

**端点**: `POST /api/v1/submissions/{submission_id}/threads`

**请求体**:
```json
{
  "sender_id": "teacher-uuid-1",
  "message": "你的作文写得很好，继续加油！"
}
```

**响应**: 返回创建的消息对象

### 10. 批量操作

**端点**: `POST /api/v1/teacher/tasks/batch`

**请求体**:
```json
{
  "action": "remind",
  "task_ids": ["uuid-1", "uuid-2"],
  "message": "请及时提交作业"
}
```

**可选操作**:
- `remind`: 批量提醒
- `archive`: 批量归档
- `delete`: 批量删除（需确认）

## 数据模型

### Task (任务)
```python
class Task(Base):
    __tablename__ = "tasks"

    id: UUID
    title: str
    description: str
    teacher_id: UUID
    status: str  # published, draft, archived
    deadline: datetime
    created_at: datetime
    updated_at: datetime

    # 关系
    submissions: List[Submission]
    task_classes: List[TaskClass]
```

### Submission (提交)
```python
class Submission(Base):
    __tablename__ = "submissions"

    id: UUID
    task_id: UUID
    student_id: UUID
    content: str
    status: str  # pending, submitted, corrected
    submitted_at: datetime
    score: Optional[int]
    teacher_feedback: Optional[str]
    agent_style: Optional[str]

    # 关系
    task: Task
    student: User
    threads: List[SubmissionThread]
```

### SubmissionThread (沟通记录)
```python
class SubmissionThread(Base):
    __tablename__ = "submission_threads"

    id: UUID
    submission_id: UUID
    sender_id: UUID
    sender_role: str  # teacher, student
    message: str
    created_at: datetime
    read_at: Optional[datetime]
```

## 认证要求

所有端点都需要 Bearer Token 认证：
```http
Authorization: Bearer <access_token>
```

## 错误响应

```json
{
  "detail": "错误消息"
}
```

常见 HTTP 状态码：
- 400: 请求参数错误
- 401: 未认证
- 403: 权限不足
- 404: 资源不存在
- 422: 数据验证错误
