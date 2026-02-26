# Task 1: 数据库迁移 - 双角色系统

**状态**: 代码已生成,准备执行
**预计时间**: 2-3 小时

---

## 📋 已生成的文件

### 1. Alembic 迁移脚本
**文件**: `backend/alembic/versions/2026_02_24_0001_add_dual_role_system.py`

**功能**:
- ✅ 添加 `roles` (JSON 数组)
- ✅ 添加 `active_role` (当前活跃角色)
- ✅ 添加 `onboarding_completed` (首登完成标记)
- ✅ 迁移现有数据 (`role` → `roles`)
- ✅ 添加约束和索引
- ✅ 删除旧字段 `role`

### 2. 更新的模型文件
**文件**: `backend/app/models/auth_account.py`

**变更**:
- ❌ 删除: `role: Mapped[str]`
- ✅ 添加: `roles: Mapped[List[str]]`
- ✅ 添加: `active_role: Mapped[str]`
- ✅ 添加: `onboarding_completed: Mapped[bool]`

### 3. 测试文件
**文件**: `backend/tests/models/test_auth_account_migration.py`

**测试覆盖**:
- ✅ 迁移正确性测试
- ✅ 约束验证测试
- ✅ 默认值测试
- ✅ 数组功能测试
- ✅ 性能测试
- ✅ 向后兼容性测试

---

## 🚀 执行步骤

### Step 1: 备份数据库 (非常重要!)

```bash
# 进入后端目录
cd backend

# 创建备份
pg_dump -U postgres -d composition_evaluator > backup_$(date +%Y%m%d_%H%M%S).sql

# 或者使用 Docker
docker exec composition-evaluator-postgres-1 pg_dump -U postgres composition_evaluator > backup.sql
```

### Step 2: 检查迁移脚本

```bash
# 查看迁移脚本
cat alembic/versions/2026_02_24_0001_add_dual_role_system.py
```

### Step 3: 执行迁移

```bash
# 方案 A: 在开发环境测试
# 激活虚拟环境
source .venv/bin/activate

# 执行迁移
alembic upgrade head

# 查看迁移结果
python -c "
from app.db.session import db_session
from sqlalchemy import text
result = db_session.execute(text('SELECT id, roles, active_role FROM auth_accounts LIMIT 5'))
for row in result:
    print(row)
"
```

### Step 4: 运行测试

```bash
# 运行迁移测试
pytest tests/models/test_auth_account_migration.py -v -s

# 应该看到所有测试通过,输出类似:
# ✓ 迁移前记录数: 10
# ✓ 迁移后记录数: 10
# ✓ roles 约束测试通过: 无效记录数 = 0
# ✓ active_role 约束测试通过: 无效记录数 = 0
# ...
```

### Step 5: 验证迁移

```sql
-- 连接到数据库
psql -U postgres -d composition_evaluator

-- 检查新字段
\d+ auth_accounts

-- 验证数据
SELECT id, roles, active_role, onboarding_completed 
FROM auth_accounts 
LIMIT 5;

-- 检查索引
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'auth_accounts';
```

---

## 🔄 回滚方案 (如果出现问题)

```bash
# 回滚迁移
alembic downgrade -1

# 或者回滚到指定版本
alembic downgrade 20260219_0006

# 从备份恢复
psql -U postgres -d composition_evaluator < backup_20260224_120000.sql
```

---

## ✅ 验收标准

- [ ] 数据库迁移成功执行
- [ ] 所有测试通过 (9/9)
- [ ] 新字段创建成功 (`roles`, `active_role`, `onboarding_completed`)
- [ ] 旧字段删除成功 (`role`)
- [ ] 约束创建成功
- [ ] 索引创建成功
- [ ] 性能测试通过 (< 1秒)

---

## 📊 预期输出

```
✓ 迁移前记录数: 10
✓ 迁移后记录数: 10
✓ 示例记录:
  - ID: 123e4567-e89b-12d3-a456-426614174000
  - roles: ['student']
  - active_role: student
  - onboarding_completed: False

✓ roles 约束测试通过: 无效记录数 = 0
✓ active_role 约束测试通过: 无效记录数 = 0
✓ onboarding_completed 测试: 总记录数=10, false/null=10
✓ 数据迁移正确性测试 (前 10 条记录):
  ✓ 用户 123: roles=['student'], active_role=student
  ✓ 用户 456: roles=['teacher'], active_role=teacher
  ...

✓ 角色查询测试: 学生用户数 = 8
✓ 角色查询测试: 教师用户数 = 2
✓ active_role 一致性测试: 不一致记录数 = 0
✓ 查询性能测试: 0.012秒, 学生用户数 = 8
✓ 数组查询性能测试: 0.008秒, 教师用户数 = 2
✓ 向后兼容性测试: 旧字段 'role' 已删除 = True
```

---

## 🎯 下一步

迁移成功后,继续执行 **Task 2: 手机验证码登录 API**

或者,如果遇到问题:

1. 检查错误日志
2. 使用回滚方案
3. 修复问题后重新执行

---

**创建时间**: 2026-02-24
**Task 状态**: ✅ 代码生成完成,准备执行
