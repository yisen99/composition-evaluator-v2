# Task 2 完成报告: 手机验证码登录 API (自动注册)

**日期**: 2026-02-24
**状态**: ✅ 已完成并验证
**耗时**: 约 1.5 小时

---

## 📋 执行摘要

成功实现手机验证码登录的自动注册功能,新用户登录时自动创建学生账号并返回 `next_action` 指引前端进入 onboarding 流程。

---

## ✅ 完成的工作

### 1. 更新 Schema 定义

**文件**: [backend/app/schemas/auth.py](../backend/app/schemas/auth.py)

**变更**:
- 添加 `NextAction` 类型别名,包含 4 种可能的下一步操作
- 更新 `UserProfile`,添加 `active_role` 字段
- 更新 `LoginResponse`,添加 `next_action` 字段

```python
NextAction = Literal[
    "onboarding_student",
    "onboarding_teacher", 
    "redirect_to_student_workbench",
    "redirect_to_teacher_workbench",
]

class UserProfile(BaseModel):
    id: str
    role: UserRole
    active_role: UserRole  # 新增
    available_roles: list[UserRole]
    phone: str
    display_name: str

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: UserProfile
    next_action: NextAction  # 新增
```

### 2. 实现 `determine_next_action` 函数

**文件**: [backend/app/api/v1/endpoints/auth.py](../backend/app/api/v1/endpoints/auth.py)

**位置**: 第 53-66 行

```python
def determine_next_action(account: AuthAccount) -> str:
    """确定登录后的下一步操作
    
    逻辑:
    1. 如果 onboarding 未完成 → 返回 onboarding_{role}
    2. 如果 onboarding 已完成 → 返回 redirect_to_{role}_workbench
    """
    if not account.onboarding_completed:
        if "teacher" in account.roles and account.active_role == "teacher":
            return "onboarding_teacher"
        else:
            return "onboarding_student"
    else:
        return f"redirect_to_{account.active_role}_workbench"
```

**测试结果**:
- ✅ 未完成 onboarding 的学生 → `onboarding_student`
- ✅ 未完成 onboarding 的教师 → `onboarding_teacher`
- ✅ 已完成 onboarding 的学生 → `redirect_to_student_workbench`
- ✅ 已完成 onboarding 的教师 → `redirect_to_teacher_workbench`

### 3. 修改 `_ensure_auth_account_for_sms_user` 函数

**文件**: [backend/app/api/v1/endpoints/auth.py](../backend/app/api/v1/endpoints/auth.py)

**位置**: 第 107-120 行

**变更**: 创建 `AuthAccount` 时使用双角色系统字段

```python
account = AuthAccount(
    # ... 原有字段 ...
    roles=[user.role],  # 双角色: JSONB 数组
    active_role=user.role,  # 当前活跃角色
    onboarding_completed=False,  # 强制首登信息补全
)
```

### 4. 修改 `_issue_login_response` 函数

**文件**: [backend/app/api/v1/endpoints/auth.py](../backend/app/api/v1/endpoints/auth.py)

**位置**: 第 157-195 行

**变更**: 添加 `next_action` 到响应

```python
# 调用 determine_next_action 获取下一步操作
next_action = determine_next_action(account)

return LoginResponse(
    access_token=access_token,
    refresh_token=refresh_token,
    user=UserProfile(...),
    next_action=next_action,  # 新增
)
```

---

## 📊 验证结果

### 代码验证

| 检查项 | 状态 | 详情 |
|--------|------|------|
| Python 语法 | ✅ | `py_compile` 通过 |
| 模块导入 | ✅ | `from app.api.v1.endpoints.auth import determine_next_action` 成功 |
| 函数存在 | ✅ | `callable(determine_next_action)` 返回 True |
| Schema 字段 | ✅ | `LoginResponse` 包含 `next_action` 字段 |
| 逻辑测试 | ✅ | 4 个测试用例全部通过 |

### API 验证

**健康检查**:
```bash
$ curl http://localhost:8000/api/v1/health
{
  "status": "ok",
  "service": "composition-evaluator-backend"
}
```

**发送验证码**:
```bash
$ curl -X POST http://localhost:8000/api/v1/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{"phone":"13900000999","role_hint":"student"}'
{
  "request_id": "6d3791d7-6660-4491-9e90-87e3231c8519",
  "expires_in": 300
}
```

**路由数量**: 11 个认证相关路由

---

## 🔄 自动注册流程

### 新用户登录流程

```
1. 用户输入手机号
   ↓
2. 前端调用 POST /api/v1/auth/send-code
   {"phone": "13900000001", "role_hint": "student"}
   ↓
3. 后端发送验证码,返回 request_id
   {"request_id": "xxx", "expires_in": 300}
   ↓
4. 用户输入验证码
   ↓
5. 前端调用 POST /api/v1/auth/login
   {"phone": "13900000001", "code": "1234"}
   ↓
6. 后端验证验证码,发现用户不存在
   ↓
7. 自动创建 AuthAccount:
   - roles: ["student"]
   - active_role: "student"
   - onboarding_completed: false
   ↓
8. 自动创建 User:
   - id: <uuid>
   - role: "student"
   - phone: "13900000001"
   ↓
9. 调用 determine_next_action(account)
   返回: "onboarding_student"
   ↓
10. 返回登录响应:
    {
      "access_token": "xxx",
      "refresh_token": "yyy",
      "user": {...},
      "next_action": "onboarding_student"  ← 关键字段
    }
    ↓
11. 前端根据 next_action 导航到 /onboarding/student
```

### 已注册用户流程

```
1-5. 同上...
   ↓
6. 后端验证验证码,找到已有 AuthAccount
   - roles: ["student"]
   - active_role: "student"
   - onboarding_completed: true
   ↓
7. 调用 determine_next_action(account)
   返回: "redirect_to_student_workbench"
   ↓
8. 返回登录响应:
    {
      "access_token": "xxx",
      "refresh_token": "yyy",
      "user": {...},
      "next_action": "redirect_to_student_workbench"  ← 关键字段
    }
    ↓
9. 前端根据 next_action 导航到 /student/workbench
```

---

## 📁 修改的文件

### 已修改
- `backend/app/schemas/auth.py` - 更新 Schema 定义
- `backend/app/api/v1/endpoints/auth.py` - 实现自动注册逻辑

### 新增(用于测试)
- `backend/tests/api/test_auth_login_auto_register.py` - 测试用例

---

## 🎯 下一步

根据 [Superpowers Writing Plans](superpowers-writing-plans.md),接下来是:

**Task 3: 统一登录页面组件**
- 预计耗时: 2-3 小时
- 主要工作:
  - 创建 `frontend/app/(auth)/login/page.tsx`
  - 实现 `UnifiedLoginForm.tsx` 组件
  - 根据 `next_action` 自动导航到对应页面

---

## ⚠️ 注意事项

1. **教师注册限制**: 
   - 新用户无法通过短信注册为教师
   - 返回 403 错误: "Teacher SMS signup is disabled"
   - 教师角色只能通过管理员后台添加

2. **Onboarding 强制执行**:
   - 所有新用户的 `onboarding_completed = false`
   - 前端必须根据 `next_action` 引导用户完成信息补全

3. **向后兼容**:
   - 保留了 `user.role` 字段(映射到 `active_role`)
   - 现有的 password-login, switch-role 等功能自动获得 `next_action` 支持

---

## ✅ 验收标准

根据 Superpowers TDD 标准,Task 2 已满足:

- [x] **RED**: 编写失败的测试用例
- [x] **GREEN**: 实现最小可行代码
- [x] **REFACTOR**: 代码审查和优化(通过子代理完成)
- [x] **语法验证**: Python 语法检查通过
- [x] **导入验证**: 模块可以正常导入
- [x] **逻辑验证**: 单元测试通过
- [x] **API 验证**: 健康检查和发送验证码 API 正常

---

**报告生成时间**: 2026-02-24 00:45
**执行者**: Claude Code + Superpowers Subagent-Driven Development
