# GitHub 私有化仓库自动同步设置指南

**项目**: Composition Evaluator
**创建日期**: 2026-02-23
**状态**: 已配置

---

## 📋 目录

1. [快速开始](#快速开始)
2. [手动设置步骤](#手动设置步骤)
3. [自动同步工作流](#自动同步工作流)
4. [CI/CD 配置](#cicd-配置)
5. [BMAD 集成验证](#bmad-集成验证)
6. [故障排除](#故障排除)

---

## 🚀 快速开始

### 一键设置脚本

我们提供了一个自动化脚本来帮助你设置 GitHub 私有仓库:

```bash
./setup-github-sync.sh
```

这个脚本将引导你完成:
1. ✅ Git 配置检查
2. ✅ 仓库详情设置
3. ✅ GitHub 仓库创建指引
4. ✅ Git remote 配置
5. ✅ 首次推送到 GitHub

### 手动设置

如果你更喜欢手动设置,请按照以下步骤操作:

---

## 📝 手动设置步骤

### 步骤 1: 创建 GitHub 私有仓库

1. 访问 https://github.com/new
2. 填写仓库信息:
   - **Repository name**: `composition-evaluator` (或你喜欢的名称)
   - **Description**: `Composition Evaluator - AI-powered evaluation system with role-based authentication`
   - **Visibility**: 🔒 **Private**
   - ⚠️ **重要**: 不要初始化 README,我们已经有代码了
3. 点击 "Create repository"

### 步骤 2: 配置 Git Remote

在你的本地项目目录运行:

```bash
# 添加 GitHub 远程仓库
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 或者使用 SSH (推荐)
git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git

# 验证配置
git remote -v
```

### 步骤 3: 推送代码到 GitHub

```bash
# 推送主分支
git push -u origin main

# 如果遇到问题,使用强制推送
git push -u origin main --force
```

### 步骤 4: 验证设置

1. 访问你的 GitHub 仓库页面
2. 检查代码是否已推送
3. 查看 "Actions" 标签页,确认工作流正在运行

---

## 🔄 自动同步工作流

### 工作原理

我们已经配置了 GitHub Actions 工作流,会在以下情况自动触发:

**触发条件**:
- ✅ 推送代码到 `main` 或 `develop` 分支
- ✅ 创建 Pull Request
- ✅ 手动触发 (workflow_dispatch)

**自动执行的操作**:
1. 检出最新代码
2. 配置 Git 用户信息
3. 显示当前分支和提交信息
4. 自动推送到 GitHub (force push 模式)

### 工作流文件

**位置**: [`.github/workflows/auto-sync.yml`](../.github/workflows/auto-sync.yml)

**关键配置**:
```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  workflow_dispatch:  # 手动触发
```

### 手动触发同步

你也可以手动触发同步:

1. 访问 GitHub 仓库
2. 点击 "Actions" 标签
3. 选择 "Auto Sync to GitHub Private Repository"
4. 点击 "Run workflow" 按钮
5. 选择分支并点击运行

---

## 🧪 CI/CD 配置

### CI 工作流

我们配置了完整的 CI/CD 流水线:

**位置**: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

**包含的任务**:

#### 1. Backend Tests (后端测试)
- ✅ Python 3.11 环境
- ✅ PostgreSQL 数据库服务
- ✅ 运行 pytest 测试套件
- ✅ 生成代码覆盖率报告
- ✅ 上传到 Codecov

#### 2. Frontend Tests (前端测试)
- ✅ Node.js 22 环境
- ✅ npm 依赖安装
- ✅ 运行测试套件
- ✅ 生产构建验证

#### 3. Lint (代码检查)
- ✅ Backend: Ruff 代码检查
- ✅ Frontend: ESLint 检查

### 触发条件

```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
```

### 查看测试结果

1. 访问 GitHub 仓库
2. 点击 "Actions" 标签
3. 选择 "CI - Build and Test"
4. 查看具体运行结果和日志

---

## 🤖 BMAD 集成验证

### BMAD 验证工作流

我们创建了专门的 BMAD 集成检查:

**位置**: [`.github/workflows/bmad-integration.yml`](../.github/workflows/bmad-integration.yml)

**验证内容**:

1. ✅ BMAD 安装检查
   - `_bmad` 目录存在
   - 配置文件完整
   - 代理和工作流计数

2. ✅ BMAD 命令验证
   - 命令文件存在
   - 关键命令列表

3. ✅ BMAD 文档检查
   - 快速开始指南
   - 前端评审指南

4. ✅ 生成 BMAD 摘要

### 查看验证结果

每次推送或 Pull Request 后,这个工作流会自动运行并显示:
- BMAD 版本信息
- 安装状态
- 可用工具列表
- 下一步操作建议

---

## 🔧 故障排除

### 问题 1: 推送失败 - Authentication Error

**错误信息**:
```
fatal: Authentication failed for 'https://github.com/...'
```

**解决方案**:

**选项 A: 使用 Personal Access Token**
1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. 选择权限:
   - `repo` (完整仓库访问权限)
   - `workflow` (GitHub Actions 权限)
4. 生成并复制 token
5. 使用 token 推送:
   ```bash
   git push https://YOUR_TOKEN@github.com/YOUR_USERNAME/YOUR_REPO.git
   ```

**选项 B: 使用 SSH (推荐)**
```bash
# 生成 SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# 添加到 SSH agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# 复制 public key
cat ~/.ssh/id_ed25519.pub

# 添加到 GitHub:
# Settings → SSH and GPG keys → New SSH key

# 更改 remote URL
git remote set-url origin git@github.com:YOUR_USERNAME/YOUR_REPO.git

# 推送
git push -u origin main
```

### 问题 2: 工作流未运行

**检查步骤**:

1. 验证 Actions 已启用
   - 访问仓库 Settings → Actions → General
   - 确保 "Actions permissions" 设置正确

2. 检查工作流文件语法
   ```bash
   # 验证 YAML 语法
   cat .github/workflows/auto-sync.yml
   ```

3. 查看 Actions 日志
   - GitHub 仓库 → Actions 标签
   - 查看失败的工作流运行

### 问题 3: 强制推送警告

如果你看到关于 force push 的警告:

```bash
# 使用 --force-with-lease 代替 --force (更安全)
git push -u origin main --force-with-lease
```

### 问题 4: BMAD 工作流失败

**检查**:

1. 验证 BMAD 安装:
   ```bash
   ls -la _bmad/
   cat _bmad/_config/manifest.yaml
   ```

2. 检查文件权限:
   ```bash
   ls -la .github/workflows/
   ```

3. 手动触发工作流:
   - GitHub → Actions → BMAD Integration Check
   - 点击 "Run workflow"

---

## 📊 仓库状态概览

### 当前配置

| 项目 | 状态 | 说明 |
|------|------|------|
| Git 仓库 | ✅ | 已初始化 |
| 远程仓库 | ⏳ | 待创建 |
| 自动同步 | ✅ | 已配置 |
| CI/CD | ✅ | 已配置 |
| BMAD 集成 | ✅ | 已配置 |

### 工作流列表

1. **Auto Sync** ([`auto-sync.yml`](../.github/workflows/auto-sync.yml))
   - 自动同步代码到 GitHub

2. **CI/CD** ([`ci.yml`](../.github/workflows/ci.yml))
   - 后端测试
   - 前端测试
   - 代码检查

3. **BMAD Integration** ([`bmad-integration.yml`](../.github/workflows/bmad-integration.yml))
   - BMAD 配置验证
   - 集成检查

---

## 🎯 最佳实践

### 1. 分支策略

推荐使用以下分支策略:

```
main (生产)
  ↑
develop (开发)
  ↑
feature/* (功能分支)
hotfix/* (紧急修复)
```

### 2. 提交规范

使用 Conventional Commits 格式:

```bash
feat: add new feature
fix: bug fix
docs: documentation changes
style: formatting, missing semi colons, etc
refactor: refactoring production code
test: adding tests
chore: updating build tasks, package manager configs, etc
```

### 3. Pull Request 流程

1. 从 `develop` 创建功能分支
2. 开发和测试
3. 创建 PR 到 `develop`
4. CI 检查通过后合并
5. 定期从 `develop` 合并到 `main`

### 4. 分支保护

推荐在 GitHub 设置中启用:

**Settings → Branches → Add rule**

- `main` 分支:
  - ✅ Require a pull request before merging
  - ✅ Require status checks to pass before merging
  - ✅ Require branches to be up to date before merging
  - ❌ Do not allow bypassing the above settings

### 5. 敏感信息管理

**⚠️ 重要**: 确保不推送敏感信息:

```bash
# 检查环境变量文件
cat .env.example

# 确保 .env 在 .gitignore 中
cat .gitignore | grep .env

# 检查是否有敏感信息已提交
git log --all --full-history --source -- "*.env"
git log --all --full-history --source -- "*secret*"
```

---

## 📚 相关文档

- [BMAD 快速开始指南](./bmad-quick-start.md)
- [BMAD 前端需求评审设计指南](./bmad-frontend-review-guide.md)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Git 工作流](https://www.atlassian.com/git/tutorials/comparing-workflows)

---

## 🆘 获取帮助

### GitHub 支持

- [GitHub Docs](https://docs.github.com)
- [GitHub Community Forum](https://github.community)

### 项目相关

- 查看 BMAD 文档: `docs/bmad-quick-start.md`
- 运行 `/bmad-help` 获取帮助

---

## ✅ 检查清单

完成设置后,确认以下项目:

- [ ] GitHub 私有仓库已创建
- [ ] 代码已推送到 GitHub
- [ ] Git remote 配置正确
- [ ] Actions 工作流运行成功
- [ ] CI/CD 测试通过
- [ ] BMAD 集成验证通过
- [ ] 分支保护规则已设置
- [ ] 敏感信息已排除 (.env 在 .gitignore)
- [ ] 协作者已添加 (如需要)

---

**祝你使用愉快! 🎉**

如有问题,请参考 [故障排除](#故障排除) 部分或查看相关文档。
