# Git 自动提交配置说明

## 📋 概述

本项目已配置自动 Git hooks,可以在关键改动后自动提交到 GitHub。

## 🚀 功能

### 1. 自动推送 (Post-Commit Hook)

每次在 `main` 分支上提交后,会自动推送到 GitHub:

```bash
git commit -m "your message"
# 自动执行: git push origin main
```

### 2. 智能自动提交脚本

运行自动提交脚本,它会:
- ✅ 检测改动文件
- ✅ 根据文件类型自动生成 commit message
- ✅ 自动提交并推送

**使用方法:**

```bash
# 方式 1: 使用脚本
./git-auto-push.sh

# 方式 2: 直接运行 hook
.git/hooks/auto-commit.sh
```

## 📝 Commit Message 规则

脚本会根据改动文件自动选择类型:

| 改动文件 | Commit 类型 | 示例 |
|---------|------------|------|
| `frontend/*` | `feat(frontend)` | 前端功能改动 |
| `backend/*` | `feat(backend)` | 后端功能改动 |
| `frontend/*` + `backend/*` | `feat(cross)` | 前后端都改动 |
| `docs/*`, `README*` | `docs` | 文档改动 |
| `*test*` | `test` | 测试相关 |
| `.claude/*` | `chore(specs)` | 规格和记忆文件 |

## 🛠️ 手动提交

如果你想手动控制提交,可以使用标准 Git 命令:

```bash
# 查看改动
git status

# 添加文件
git add <file>
# 或添加所有
git add -A

# 提交
git commit -m "your commit message"

# 推送(如果 post-commit hook 没有自动推送)
git push origin main
```

## ⚙️ 配置文件

- `.git/hooks/post-commit` - 提交后自动推送
- `.git/hooks/auto-commit.sh` - 智能自动提交脚本
- `git-auto-push.sh` - 便捷命令

## 🔧 禁用自动推送

如果你想暂时禁用自动推送功能:

```bash
# 移除 post-commit hook
rm .git/hooks/post-commit

# 或重命名(保留但禁用)
mv .git/hooks/post-commit .git/hooks/post-commit.disabled
```

## 📌 最佳实践

1. **重要改动**: 手动编写详细的 commit message
2. **小改动**: 使用自动提交脚本
3. **紧急修复**: 手动提交并推送,确保快速部署

## 🎯 当前配置

- **仓库**: https://github.com/yisen99/composition-evaluator-v2
- **分支**: main
- **自动推送**: ✅ 已启用
- **智能提交**: ✅ 已配置
