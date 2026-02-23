# 🚀 GitHub 私有仓库快速设置

## 一键设置 (推荐)

```bash
./setup-github-sync.sh
```

脚本将引导你完成所有设置步骤。

---

## 手动设置 (3 步)

### 1️⃣ 创建 GitHub 仓库

访问: https://github.com/new

- Repository name: `composition-evaluator`
- Visibility: 🔒 **Private**
- ⚠️ 不要初始化 README

### 2️⃣ 配置 Git Remote

```bash
# 替换 YOUR_USERNAME 为你的 GitHub 用户名
git remote add origin https://github.com/YOUR_USERNAME/composition-evaluator.git

# 验证
git remote -v
```

### 3️⃣ 推送代码

```bash
git push -u origin main
```

---

## ✅ 验证设置

访问你的 GitHub 仓库,检查:

- [ ] 代码已推送
- [ ] Actions 标签显示工作流运行中
- [ ] CI/CD 测试通过

---

## 🔄 自动同步已配置

每次推送代码到本地,会自动同步到 GitHub!

**触发条件**:
- 推送到 `main` 或 `develop` 分支
- 创建 Pull Request
- 手动触发 (Actions → Run workflow)

---

## 📚 详细文档

查看完整设置指南: [docs/github-setup-guide.md](docs/github-setup-guide.md)

内容包括:
- 详细设置步骤
- 自动同步工作流说明
- CI/CD 配置详解
- BMAD 集成验证
- 故障排除

---

## 🆘 常见问题

### 推送失败?

**使用 Personal Access Token:**
```bash
git push https://YOUR_TOKEN@github.com/YOUR_USERNAME/composition-evaluator.git
```

**或使用 SSH (推荐):**
```bash
git remote set-url origin git@github.com:YOUR_USERNAME/composition-evaluator.git
git push -u origin main
```

### 工作流未运行?

检查:
1. Settings → Actions → General
2. 确保 Actions 权限已启用
3. 查看 Actions 标签的日志

---

## 📦 已配置功能

✅ **自动同步** - 每次推送自动同步到 GitHub
✅ **CI/CD** - 自动运行测试和代码检查
✅ **BMAD 验证** - 自动验证 BMAD 集成状态
✅ **私有仓库** - 代码安全存储在私有仓库

---

## 🎯 下一步

1. ✅ 完成设置
2. ✅ 访问你的 GitHub 仓库
3. ✅ 查看 Actions 工作流运行
4. ✅ 开始使用 BMAD: 运行 `/bmad-help`

---

**需要帮助?** 查看 [docs/github-setup-guide.md](docs/github-setup-guide.md)
