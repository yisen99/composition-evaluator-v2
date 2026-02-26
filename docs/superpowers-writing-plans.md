# Superpowers Writing Plans - 统一登录与双角色系统重构

**项目**: Composition Evaluator v2.0
**日期**: 2026-02-24
**Author**: Superpowers Writing Plans Skill
**Status**: 实施计划

---

# 统一登录与双角色系统重构实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**目标**: 构建统一登录、双角色系统、AI 辅助批改的作文平台

**架构**: FastAPI + Next.js 15 + PostgreSQL + Redis + Claude 3.7

**Tech Stack**: Python 3.11, TypeScript 5.0, SQLAlchemy 2.0, Zustand 4.0, React Query 5.0

---

## Task 1: 数据库迁移 - 双角色系统

**Files**:
- Modify: `backend/app/models/auth_account.py`
- Create: `alembic/versions/2026_02_24_dual_role_system.py`
- Create: `backend/tests/models/test_auth_account_migration.py`

**Step 1: Write the failing test**

```python
# tests/models/test_auth_account_migration.py
import pytest
from sqlalchemy import text
from app.db.session import db_session

def test_dual_role_migration(db_session):
    """测试双角色系统迁移"""
    # 迁移前: 旧表结构
    result = db_session.execute(text("SELECT COUNT(*) FROM auth_accounts"))
    old_count = result.scalar()

    # 执行迁移
    # ... migration code ...

    # 迁移后: 新表结构
    result = db_session.execute(text("""
        SELECT COUNT(*) FROM auth_accounts
        WHERE roles IS NOT NULL
        AND active_role IS NOT NULL
    """))
    new_count = result.scalar()

    assert new_count == old_count, "所有记录都应该成功迁移"

    # 验证数据正确性
    result = db_session.execute(text("""
        SELECT id, roles, active_role
        FROM auth_accounts
        LIMIT 1
    """))
    row = result.fetchone()

    assert row.roles is not None, "roles 字段应该存在"
    assert row.active_role is not None, "active_role 字段应该存在"
    assert isinstance(row.roles, list), "roles 应该是列表"
```

**Step 2: Run test to verify it fails**

```bash
cd backend
pytest tests/models/test_auth_account_migration.py -v
# Expected: FAIL - "roles field does not exist"
```

**Step 3: Write minimal implementation**

```python
# alembic/versions/2026_02_24_dual_role_system.py
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

def upgrade():
    # 1. 添加新字段
    op.add_column('auth_accounts',
        sa.Column('roles', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.add_column('auth_accounts',
        sa.Column('active_role', sa.String(20), server_default='student', nullable=False))
    op.add_column('auth_accounts',
        sa.Column('onboarding_completed', sa.Boolean(), server_default='false', nullable=False))

    # 2. 迁移现有数据
    op.execute("""
        UPDATE auth_accounts
        SET roles = JSON_BUILD_ARRAY(role),
            active_role = role
        WHERE role IS NOT NULL
    """)

    # 3. 添加约束
    op.create_check_constraint(
        'chk_roles_valid',
        'auth_accounts',
        "roles <@ ARRAY['student', 'teacher', 'admin']::VARCHAR[]"
    )

    # 4. 设置 NOT NULL
    op.alter_column('auth_accounts', 'roles', nullable=False)

    # 5. 删除旧字段
    op.drop_column('auth_accounts', 'role')

def downgrade():
    # 回滚
    op.add_column('auth_accounts',
        sa.Column('role', sa.String(20), nullable=True))

    op.execute("""
        UPDATE auth_accounts
        SET role = active_role
    """)

    op.alter_column('auth_accounts', 'role', nullable=False)

    op.drop_column('auth_accounts', 'roles')
    op.drop_column('auth_accounts', 'active_role')
    op.drop_column('auth_accounts', 'onboarding_completed')
```

```python
# backend/app/models/auth_account.py
from typing import List
from sqlalchemy import JSON, Boolean, String

class AuthAccount(Base):
    __tablename__ = "auth_accounts"

    # ... 其他字段 ...

    # 双角色系统
    roles: Mapped[List[str]] = mapped_column(JSON, default=["student"], nullable=False)
    active_role: Mapped[str] = mapped_column(String(20), default="student", nullable=False)
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
```

**Step 4: Run test to verify it passes**

```bash
cd backend
# 运行迁移
alembic upgrade head

# 运行测试
pytest tests/models/test_auth_account_migration.py -v
# Expected: PASS
```

**Step 5: Commit**

```bash
git add alembic/versions/2026_02_24_dual_role_system.py
git add backend/app/models/auth_account.py
git add tests/models/test_auth_account_migration.py
git commit -m "feat(backend): add dual role system with database migration"
```

**Estimated**: 2-3 hours

---

## Task 2: 手机验证码登录 API(自动注册)

**Files**:
- Modify: `backend/app/api/v1/endpoints/auth.py`
- Create: `backend/app/schemas/auth.py`
- Create: `backend/tests/api/test_auth_login.py`

**Step 1: Write the failing test**

```python
# tests/api/test_auth_login.py
from fastapi.testclient import TestClient

def test_login_with_code_auto_registers_new_user(client: TestClient, db_session):
    """测试验证码登录自动注册新用户"""
    # 发送验证码
    response = client.post("/api/v1/auth/send-code", json={"phone": "13800138000"})
    assert response.status_code == 200
    code = get_verification_code_from_mock("13800138000")  # mock 函数

    # 使用验证码登录(用户不存在)
    response = client.post("/api/v1/auth/login", json={
        "phone": "13800138000",
        "code": code
    })

    assert response.status_code == 200
    data = response.json()
    assert data["user"]["roles"] == ["student"]
    assert data["user"]["onboarding_completed"] == False
    assert data["next_action"] == "onboarding_student"
```

**Step 2: Run test to verify it fails**

```bash
cd backend
pytest tests/api/test_auth_login.py::test_login_with_code_auto_registers_new_user -v
# Expected: FAIL - "User not found"
```

**Step 3: Write minimal implementation**

```python
# backend/app/api/v1/endpoints/auth.py
@router.post("/login", response_model=LoginResponse)
def login_with_code(
    payload: LoginRequest,
    db: Session = Depends(get_db)
):
    """验证码登录(自动注册)"""
    # 验证验证码
    if not verify_code(payload.phone, payload.code):
        raise HTTPException(status_code=400, detail="Invalid verification code")

    # 查找或创建用户
    user = db.query(AuthAccount).filter(AuthAccount.phone == payload.phone).first()

    if not user:
        # 自动注册
        user = AuthAccount(
            phone=payload.phone,
            roles=["student"],
            active_role="student",
            onboarding_completed=False,
            display_name=payload.phone  # 临时显示名
        )
        db.add(user)
        db.commit()

    # 确定 next_action
    next_action = determine_next_action(user)

    # 生成 token
    access_token = create_access_token(user.id)

    return {
        "access_token": access_token,
        "user": user_to_dict(user),
        "next_action": next_action
    }

def determine_next_action(user: AuthAccount) -> str:
    """确定登录后的下一步操作"""
    if not user.onboarding_completed:
        if "teacher" in user.roles:
            return "onboarding_teacher"
        else:
            return "onboarding_student"
    else:
        return f"redirect_to_{user.active_role}_workbench"
```

**Step 4-5**: (继续 TDD 循环)

**Estimated**: 3-4 hours

---

## Task 3: 统一登录页面组件

**Files**:
- Create: `frontend/app/(auth)/login/page.tsx`
- Create: `frontend/app/(auth)/login/_components/UnifiedLoginForm.tsx`
- Create: `frontend/app/(auth)/login/_components/UnifiedLoginForm.test.tsx`

**Step 1: Write the failing test**

```typescript
// UnifiedLoginForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UnifiedLoginForm } from './UnifiedLoginForm';

describe('UnifiedLoginForm', () => {
  it('should login with phone and code', async () => {
    const mockLogin = jest.fn().mockResolvedValue({
      access_token: 'xxx',
      user: { roles: ['student'], onboarding_completed: false }
    });

    render(<UnifiedLoginForm onLogin={mockLogin} />);

    // 输入手机号
    const phoneInput = screen.getByLabelText('手机号');
    await userEvent.type(phoneInput, '13800138000');

    // 点击"获取验证码"
    const sendCodeBtn = screen.getByText('获取验证码');
    await userEvent.click(sendCodeBtn);

    // 输入验证码
    const codeInput = screen.getByLabelText('验证码');
    await userEvent.type(codeInput, '1234');

    // 自动提交
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        phone: '13800138000',
        code: '1234'
      });
    });
  });
});
```

**Step 2-5**: (TDD 循环)

**Estimated**: 2-3 hours

---

## Task 4: 首登信息补全 - 学生向导

**Files**:
- Create: `frontend/app/(auth)/onboarding/student/page.tsx`
- Create: `frontend/app/(auth)/onboarding/_components/StudentOnboardingWizard.tsx`
- Create: `frontend/app/(auth)/onboarding/_components/BasicInfoStep.tsx`
- Create: `frontend/app/(auth)/onboarding/_components/GradeCityStep.tsx`
- Create: `frontend/app/(auth)/onboarding/_components/PasswordSetupStep.tsx`

**Step 1-5**: (完整 TDD 循环)

**Estimated**: 4-5 hours

---

## Task 5: AI 服务集成 - 单模型多 Agent

**Files**:
- Create: `backend/app/services/ai_service.py`
- Create: `backend/app/services/ai_agents.py`
- Create: `backend/tests/services/test_ai_service.py`

**Step 1: Write the failing test**

```python
# tests/services/test_ai_service.py
import pytest
from app.services.ai_service import AIServiceManager

@pytest.mark.asyncio
async def test_ai_service_get_suggestions():
    """测试 AI 服务获取批改建议"""
    ai_service = AIServiceManager()

    result = await ai_service.get_grading_suggestions(
        submission_id="test-submission",
        content="春天来了,花儿开了...",
        title="春天的景色"
    )

    assert result is not None
    assert "score" in result
    assert "feedback" in result
    assert "analysis" in result
    assert 0 <= result["score"] <= 100
```

**Step 2: Run test to verify it fails**

```bash
cd backend
pytest tests/services/test_ai_service.py -v
# Expected: FAIL - "AIServiceManager not found"
```

**Step 3: Write minimal implementation**

```python
# backend/app/services/ai_agents.py
from anthropic import Anthropic
from typing import Dict, Any
import json

class ContentAnalysisAgent:
    """内容分析专家 Agent"""

    def __init__(self):
        self.client = Anthropic(api_key=settings.CLAUDE_API_KEY)

    async def analyze(self, content: str, title: str, student_history: Dict) -> Dict:
        prompt = f"""
        你是内容分析专家。请分析以下作文:

        标题: {title}
        内容: {content}
        学生历史: {student_history}

        请分析:
        1. 文章结构(开头、中间、结尾)
        2. 描写手法(语言、细节、修辞)
        3. 逻辑连贯性

        返回 JSON 格式:
        {{
          "structure": {{"score": 8, "comments": "..." }},
          "description": {{"score": 9, "comments": "..." }},
          "logic": {{"score": 7, "comments": "..." }}
        }}
        """

        response = await self.client.messages.create(
            model="claude-3-7-sonnet-20250219",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        )

        return json.loads(response.content[0].text)


class ScoringAgent:
    """评分专家 Agent"""

    def __init__(self):
        self.client = Anthropic(api_key=settings.CLAUDE_API_KEY)

    async def score(self, content: str, analysis: Dict, student_history: Dict) -> int:
        prompt = f"""
        你是评分专家。请给以下作文打分(0-100分):

        作文内容: {content}
        内容分析: {analysis}
        学生历史: {student_history}

        考虑年级水平和历史表现,给出合理分数。
        只返回一个数字。
        """

        response = await self.client.messages.create(
            model="claude-3-7-sonnet-20250219",
            max_tokens=10,
            messages=[{"role": "user", "content": prompt}]
        )

        score_text = response.content[0].text.strip()
        return int(score_text)


class FeedbackAgent:
    """评语生成专家 Agent"""

    def __init__(self):
        self.client = Anthropic(api_key=settings.CLAUDE_API_KEY)

    async def generate_feedback(self, content: str, analysis: Dict, score: int, student_history: Dict) -> Dict:
        prompt = f"""
        你是评语生成专家。请为以下作文生成评语:

        作文内容: {content}
        内容分析: {analysis}
        分数: {score}
        学生历史: {student_history}

        生成结构化的评语(鼓励性、建设性)。

        返回 JSON 格式:
        {{
          "strengths": ["描写生动", "词汇丰富"],
          "suggestions": ["补充细节", "加强结构"],
          "encouragement": "继续加油!"
        }}
        """

        response = await self.client.messages.create(
            model="claude-3-7-sonnet-20250219",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        )

        return json.loads(response.content[0].text)


# backend/app/services/ai_service.py
from app.services.ai_agents import ContentAnalysisAgent, ScoringAgent, FeedbackAgent
import redis
import json

class AIServiceManager:
    def __init__(self):
        self.content_agent = ContentAnalysisAgent()
        self.scoring_agent = ScoringAgent()
        self.feedback_agent = FeedbackAgent()
        self.redis = redis.Redis(host=settings.REDIS_HOST, port=6379, db=0)

    async def get_grading_suggestions(
        self,
        submission_id: str,
        content: str,
        title: str,
        student_history: Dict
    ) -> Dict:
        # 检查缓存
        cache_key = f"ai_suggestion:{submission_id}"
        cached = self.redis.get(cache_key)
        if cached:
            return json.loads(cached)

        # 并行调用三个 Agent
        import asyncio
        analysis, score, feedback = await asyncio.gather(
            self.content_agent.analyze(content, title, student_history),
            self.scoring_agent.score(content, {}, student_history),
            self.feedback_agent.generate_feedback(content, {}, score, student_history)
        )

        result = {
            "score": score,
            "feedback": feedback,
            "analysis": analysis,
            "confidence": 0.85  # 单模型,置信度固定高值
        }

        # 缓存 24 小时
        self.redis.setex(cache_key, 86400, json.dumps(result))

        return result
```

**Step 4-5**: (继续 TDD 循环)

**Estimated**: 5-6 hours

---

## Task 6: 教师批改页面 - 基础版

**Files**:
- Create: `frontend/app/(teacher)/grading/[submissionId]/page.tsx`
- Create: `frontend/app/(teacher)/grading/_components/GradingLayout.tsx`
- Create: `frontend/app/(teacher)/grading/_components/SubmissionViewer.tsx`
- Create: `frontend/app/(teacher)/grading/_components/GradingForm.tsx`

**Step 1-5**: (完整 TDD 循环)

**Estimated**: 5-6 hours

---

## Task 7: 自动保存功能(React Query)

**Files**:
- Create: `frontend/lib/hooks/useAutoSaveGrading.ts`
- Create: `frontend/lib/hooks/useAutoSaveGrading.test.ts`

**Step 1: Write the failing test**

```typescript
// useAutoSaveGrading.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { server } from '@mocks/msw/node';
import { rest } from 'msw';
import { useAutoSaveGrading } from './useAutoSaveGrading';

describe('useAutoSaveGrading', () => {
  it('should auto-save after 30 seconds', async () => {
    // Mock API
    server.use(
      rest.put('/api/v1/grading/records/:id'),
      (req, res, ctx) => {
        return res(ctx.status(200));
      })
    );

    const { result } = renderHook(() => useAutoSaveGrading('sub-123'));

    // 更新数据
    act(() => {
      result.current.updateGradingData({ score: 85 });
    });

    // 等待自动保存
    await waitFor(
      () => {
        expect(server.requests.put('/api/v1/grading/records/sub-123')).toHaveLength(1);
      },
      { timeout: 35000 }
    );
  });
});
```

**Step 2-5**: (继续 TDD 循环)

**Estimated**: 3-4 hours

---

## Task 8: 集成测试与代码审查

**Files**:
- Create: `frontend/tests/e2e/teacher-grading-workflow.spec.ts`
- Create: `backend/tests/integration/test_auth_flow.py`

**Step 1-5**: (完整测试流程)

**Estimated**: 4-5 hours

---

## 🎯 执行策略

### 推荐执行方式: Subagent-Driven Development

**理由**:
- 8 个任务相对独立
- 可以并行开发(前后端)
- 需要严格的 TDD 和代码审查

### 执行流程

```
1. Task 1 (数据库迁移) → 2-3 小时
2. Task 2 (登录 API) → 3-4 小时
3. Task 3 (登录页面) → 2-3 小时
4. Task 4 (信息补全) → 4-5 小时
5. Task 5 (AI 服务) → 5-6 小时
6. Task 6 (批改页面) → 5-6 小时
7. Task 7 (自动保存) → 3-4 小时
8. Task 8 (集成测试) → 4-5 小时

总计: 29-36 小时 (约 4-5 个工作日)
```

### 下一步

选择执行方式:

**A. Subagent-Driven (当前会话)**
- 我派遣独立子代理执行每个任务
- 两级代码审查(规范 + 质量)
- 快速迭代

**B. 执行 Plans (独立会话)**
- 新会话中使用 executing-plans
- 批量执行,人工检查点

**你选择哪个?** 🚀
