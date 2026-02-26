# 技术方案决策总结

**项目**: 统一登录与双角色系统重构
**日期**: 2026-02-24
**状态**: 技术方案确认

---

## 🎯 核心技术决策

### 1. 数据库迁移策略: 停机迁移 (选项 B)

**选择理由**:
- 迁移窗口: 选择用户活跃度低的时间段(如凌晨 2-4 点)
- 预计停机时间: 30 分钟
- 风险控制: 完整的备份 + 回滚脚本

**实施步骤**:
1. **备份**: `pg_dump` 全量备份
2. **锁定**: 维护模式,暂停写入
3. **迁移**: 执行 Alembic 迁移脚本
4. **验证**: 数据完整性检查
5. **回滚**: 如有问题,立即回滚
6. **解锁**: 恢复服务

**回滚计划**:
- 保留旧字段 `role` 作为备份
- 如果迁移失败,删除新字段,恢复旧字段
- 预计回滚时间: 10 分钟

---

### 2. 首登信息补全存储: 扩展 `users` 表 (选项 A)

**选择理由**:
- 简单直接,无需额外 JOIN
- 查询性能好
- 数据集中,易于维护

**数据模型**:
```python
class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    auth_account_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("auth_accounts.id"))

    # 学生信息
    real_name: Mapped[str | None] = mapped_column(String(100))
    grade: Mapped[str | None] = mapped_column(String(20))  # 一年级~高三
    city: Mapped[str | None] = mapped_column(String(100))  # 城市
    gender: Mapped[str | None] = mapped_column(String(20))  # male, female, other

    # 教师信息
    school_name: Mapped[str | None] = mapped_column(String(200))
    subject: Mapped[str | None] = mapped_column(String(50))  # 语文、数学等

    # 共同信息
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    bio: Mapped[str | None] = mapped_column(Text)
```

**验证逻辑**:
- 学生: `real_name`, `grade`, `city`, `gender` 必填
- 教师: `real_name` 必填,`school_name`, `subject` 可选
- 所有用户: 密码必填(首登时设置)

---

### 3. AI 批改建议: 同一模型的多个 Agent + Redis 缓存 (选项 A 修正)

**重要修正**: 使用**同一个大模型**的不同 Agent,而非多个大模型!

**架构设计**:

```
┌─────────────┐
│   前端      │
└──────┬──────┘
       │
┌──────▼──────┐
│ FastAPI     │
└──────┬──────┘
       │
┌──────▼──────┐
│ AI Service   │
└──────┬──────┘
       │
       ├─────────────┬──────────────┬──────────────┐
       │             │              │              │
┌──────▼──────┐ ┌───▼────┐ ┌──────▼──────┐ ┌─────▼─────┐
│ Agent 1     │ │ Agent 2│ │  Agent 3    │ │  Redis    │
│ 内容分析    │ │ 评分   │ │ 评语生成    │ │  (缓存)   │
│(同一模型)   │ │(同一模型)│(同一模型)   │ │           │
└─────────────┘ └────────┘ └─────────────┘ └───────────┘
       │             │              │
       └─────────────┴──────────────┘
                     │
              ┌──────▼──────┐
              │ 聚合器       │
              │ 综合结果    │
              └─────────────┘
```

**选择的大模型**: **Claude 3.7 Sonnet** (推荐)

**理由**:
- ✅ 强大的内容理解和生成能力
- ✅ 支持长上下文(200K tokens)
- ✅ 比多模型方案成本更低
- ✅ 响应速度快(单个模型 vs 多个模型)
- ✅ 结果一致性好(同一模型)

**三个 Agent 设计**:

**Agent 1: 内容分析专家**
```
角色: 内容分析专家
任务: 分析作文的结构、描写、逻辑
输入: 作文标题 + 内容 + 学生历史
输出: JSON 格式的分析结果
{
  "structure": {"score": 8, "strengths": [], "weaknesses": []},
  "description": {"score": 9, "strengths": [], "weaknesses": []},
  "logic": {"score": 7, "strengths": [], "weaknesses": []}
}
```

**Agent 2: 评分专家**
```
角色: 评分专家
任务: 根据年级标准和内容分析,给出合理分数
输入: 作文内容 + Agent 1 的分析 + 学生历史
输出: 整数分数(0-100)
{
  "score": 85,
  "reasoning": "基于三年级水平,内容完整,描写生动..."
}
```

**Agent 3: 评语生成专家**
```
角色: 评语生成专家
任务: 生成鼓励性、建设性的评语
输入: 作文内容 + Agent 1 的分析 + Agent 2 的分数 + 学生历史
输出: 结构化的评语
{
  "strengths": ["描写生动", "词汇丰富"],
  "suggestions": ["补充细节", "加强结构"],
  "encouragement": "继续加油!"
}
```

**Redis 缓存策略**:
- 缓存键: `ai_suggestion:{submission_id}`
- 缓存内容: 聚合后的完整建议
- 缓存时长: 24 小时
- 缓存更新: 批改提交后清除缓存

**成本对比**:
```
多模型方案 (Claude + GPT-4 + Gemini):
- 每次批改成本: ~$0.15
- 响应时间: 8-10 秒

单模型多 Agent 方案 (Claude 3.7):
- 每次批改成本: ~$0.03
- 响应时间: 3-5 秒

节省: 80% 成本,50% 时间
```

---

### 4. 前端状态管理: Zustand (选项 A)

**选择理由**:
- 轻量级,API 简单
- 学习曲线低
- 性能好(基于 Context 优化)
- 适合当前项目规模

**Store 设计**:

```typescript
// lib/store/authStore.ts
interface AuthState {
  user: User | null;
  token: string | null;
  roles: string[];
  activeRole: string;

  setUser: (user: User) => void;
  setToken: (token: string) => void;
  switchRole: (role: string) => void;
  logout: () => void;
}

// lib/store/gradingStore.ts
interface GradingState {
  currentStudentId: string | null;
  currentSubmission: Submission | null;
  aiSuggestions: AISuggestions | null;
  gradingData: GradingData;

  setCurrentStudent: (id: string) => void;
  loadAISuggestions: (id: string) => Promise<void>;
  updateGradingData: (data: Partial<GradingData>) => void;
  submitGrading: () => Promise<void>;
}

// lib/store/submissionStore.ts
interface SubmissionState {
  currentTask: Task | null;
  content: string;
  attachments: Attachment[];
  autoSaving: boolean;

  setContent: (content: string) => void;
  addAttachment: (file: File) => Promise<void>;
  saveDraft: () => Promise<void>;
  submit: () => Promise<void>;
}
```

---

### 5. 自动保存: React Query (选项 B)

**选择理由**:
- 内置防抖和自动重试
- 服务端状态管理最佳实践
- 减少 useState 复杂度

**实现方式**:

```typescript
// lib/hooks/useAutoSaveGrading.ts
import { useMutation } from '@tanstack/react-query';

export function useAutoSaveGrading(submissionId: string) {
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (data: GradingData) => {
      return await updateGradingRecord(submissionId, data);
    },
    onMutate: () => {
      // 乐观更新
    },
    onSuccess: () => {
      // 使查询失效
      queryClient.invalidateQueries(['grading', submissionId]);
    },
  });

  // 防抖保存
  const debouncedSave = useMemo(
    () => debounce((data: GradingData) => {
      saveMutation.mutate(data);
    }, 30000), // 30 秒防抖
    [saveMutation]
  );

  return {
    saveGrading: debouncedSave,
    isSaving: saveMutation.isPending,
  };
}
```

---

## 📊 技术栈总结

| 层级 | 技术选择 | 版本 |
|------|---------|------|
| **数据库** | PostgreSQL | 15+ |
| **缓存** | Redis | 7+ |
| **后端** | FastAPI | 0.104+ |
| **ORM** | SQLAlchemy | 2.x |
| **AI 模型** | Claude 3.7 Sonnet | 最新 |
| **前端** | Next.js | 15.x |
| **状态管理** | Zustand | 4.x |
| **服务端状态** | React Query | 5.x |
| **UI 组件** | Ant Design | 5.x |

---

## 🎯 下一步

现在技术方案已经明确,接下来:

**Superpowers Writing Plans** - 创建详细的原子任务分解
- 8 个原子任务
- 每个任务 2-5 分钟
- 完整的代码、测试、验证步骤

准备好开始了吗? 🚀
