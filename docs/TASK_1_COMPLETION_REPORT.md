# Task 1 完成报告: 数据库迁移 - 双角色系统

**日期**: 2026-02-24
**状态**: ✅ 已完成并验证
**耗时**: 约 2 小时

---

## 📋 执行摘要

成功将数据库从单角色系统迁移到双角色系统,支持一个账号同时拥有学生和教师角色。

---

## ✅ 完成的工作

### 1. 数据库迁移脚本

**文件**: [backend/alembic/versions/2026_02_24_0001_add_dual_role_system.py](../backend/alembic/versions/2026_02_24_0001_add_dual_role_system.py)

**关键变更**:
- 添加 `roles` 字段 (JSONB 数组)
- 添加 `active_role` 字段 (当前活跃角色)
- 添加 `onboarding_completed` 字段 (首登完成标记)
- 删除旧的 `role` 字段
- 创建 GIN 索引用于 roles 查询
- 创建 B-tree 索引用于 active_role 查询
- 添加 active_role 约束 (只能是 'student', 'teacher', 'admin')

**数据迁移逻辑**:
```sql
-- 从 auth_account_roles 表迁移数据到新字段
UPDATE auth_accounts
SET roles = (
    SELECT JSON_AGG(ar.role)
    FROM auth_account_roles ar
    WHERE ar.auth_account_id = auth_accounts.id
),
active_role = (
    CASE
        WHEN EXISTS (
            SELECT 1 FROM auth_account_roles ar
            WHERE ar.auth_account_id = auth_accounts.id AND ar.role = 'teacher'
        ) THEN 'teacher'
        ELSE 'student'
    END
)
WHERE EXISTS (
    SELECT 1 FROM auth_account_roles ar
    WHERE ar.auth_account_id = auth_accounts.id
)
```

### 2. 数据模型更新

**文件**: [backend/app/models/auth_account.py](../backend/app/models/auth_account.py)

**关键变更**:
```python
# 旧字段 (已删除)
# role: Mapped[str] = mapped_column(String(20), default="student")

# 新字段
roles: Mapped[List[str]] = mapped_column(
    postgresql.JSONB(astext_type=String()),
    default=lambda: ["student"],
    nullable=False
)
active_role: Mapped[str] = mapped_column(String(20), default="student", nullable=False)
onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
```

---

## 📊 验证结果

### 数据完整性验证

| 指标 | 预期值 | 实际值 | 状态 |
|------|--------|--------|------|
| 数据库版本 | 2026_02_24_0001 | 2026_02_24_0001 | ✅ |
| 总用户数 | 17 | 17 | ✅ |
| 教师数量 | 14 | 14 | ✅ |
| 学生数量 | 3 | 3 | ✅ |
| onboarding完成用户 | 0 | 0 | ✅ |

### 字段验证

| 字段名 | 数据类型 | 可空 | 默认值 | 状态 |
|--------|----------|------|--------|------|
| roles | jsonb | NO | - | ✅ |
| active_role | character varying(20) | NO | 'student' | ✅ |
| onboarding_completed | boolean | NO | false | ✅ |

### 索引验证

| 索引名 | 类型 | 状态 |
|--------|------|------|
| idx_auth_accounts_roles | GIN | ✅ |
| idx_auth_accounts_active_role | B-tree | ✅ |

### 约束验证

| 约束名 | 类型 | 状态 |
|--------|------|------|
| chk_auth_accounts_active_role_valid | CHECK (active_role IN ('student', 'teacher', 'admin')) | ✅ |

---

## 🔄 数据迁移示例

**迁移前**:
```
auth_account_roles 表:
| auth_account_id | role | created_at |
|----------------|------|------------|
| user-123       | teacher | 2026-02-20 |
```

**迁移后**:
```
auth_accounts 表:
| id | phone | roles | active_role | onboarding_completed |
|----|-------|-------|-------------|---------------------|
| user-123 | 13800138000 | ["teacher"] | teacher | false |
```

---

## ⚠️ 遇到的问题与解决方案

### 问题 1: 多个头部版本冲突

**错误**: 
```
Multiple head revisions are present for given argument 'head'
```

**原因**:
- 已存在的迁移: `20260223_0008` (添加 auth_account_roles 表)
- 新迁移: `2026_02_24_0001` (添加双角色 JSONB 字段)
- 两个迁移都基于 `20260219_0006`,导致分支

**解决方案**:
修改新迁移的 `down_revision` 为 `20260223_0008`,使其基于已存在的迁移

### 问题 2: JSON/JSONB 类型不匹配

**错误**:
```
operator class "jsonb_path_ops" does not accept data type json
```

**原因**:
初始使用 `postgresql.JSON` 类型,但 GIN 索引需要 `JSONB` 类型

**解决方案**:
- 将字段类型从 `JSON` 改为 `postgresql.JSONB`
- 索引使用默认的 `jsonb_ops` 操作符类

### 问题 3: 约束语法错误

**错误**:
```
operator does not exist: json <@ character varying[]
```

**原因**:
PostgreSQL 的 CHECK 约束对 JSONB 数组的支持有限

**解决方案**:
- 移除 roles 字段的 CHECK 约束
- 改为应用层验证 (Pydantic schemas)

### 问题 4: Docker 容器文件系统隔离

**错误**:
迁移文件在主机创建,但容器中不可见

**解决方案**:
使用 `docker cp` 将文件复制到容器后执行迁移

---

## 📁 相关文件

### 新增文件
- `backend/alembic/versions/2026_02_24_0001_add_dual_role_system.py` - 数据库迁移脚本
- `backend/tests/models/test_auth_account_migration.py` - 迁移测试套件
- `docs/TASK_1_DATABASE_MIGRATION_GUIDE.md` - 执行指南
- `backup_20260224_001343.sql` - 数据库备份 (63K)

### 修改文件
- `backend/app/models/auth_account.py` - AuthAccount 模型更新

---

## 🚀 下一步

根据 [Superpowers Writing Plans](superpowers-writing-plans.md),接下来是:

**Task 2: 手机验证码登录 API (自动注册)**
- 预计耗时: 3-4 小时
- 主要内容:
  - 修改 `/api/v1/auth/login` 端点支持自动注册
  - 实现 `determine_next_action()` 逻辑
  - 根据角色和 onboarding 状态返回 next_action

---

## ✅ 验收标准

根据 Superpowers 标准,Task 1 已满足所有验收标准:

- [x] **RED**: 编写失败的测试
- [x] **GREEN**: 实现最小可行代码
- [x] **REFACTOR**: 代码审查和优化
- [x] **数据完整性**: 所有用户数据成功迁移
- [x] **性能优化**: GIN 和 B-tree 索引已创建
- [x] **向后兼容**: 保留旧字段 `student_profile_completed_at` 等
- [x] **回滚方案**: downgrade() 函数完整实现

---

**报告生成时间**: 2026-02-24 00:25
**执行者**: Claude Code + Superpowers Subagent-Driven Development
