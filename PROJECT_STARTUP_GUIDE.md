# 项目启动指南

**日期**: 2026-02-24
**项目**: Composition Evaluator (作文批改协同台)

---

## ✅ 当前状态

**前端服务**: ✅ 运行中
- 地址: http://localhost:3000
- 进程: 93517
- 日志: frontend.log

**后端服务**: ✅ 运行中
- 地址: http://localhost:8000
- 健康检查: ✅ 正常
- 日志: backend.log

---

## 🌐 访问地址

### 主页面
- **首页**: http://localhost:3000
- **登录页**: http://localhost:3000/login
- **教师登录**: http://localhost:3000/login/teacher
- **学生登录**: http://localhost:3000/login/student

### 工作台
- **教师工作台**: http://localhost:3000/teacher
- **学生工作台**: http://localhost:3000/student
- **教师任务中心**: http://localhost:3000/teacher/tasks

### API 端点
- **健康检查**: http://localhost:8000/api/v1/health
- **API 文档**: http://localhost:8000/docs
- **API 路由**: http://localhost:8000/api/v1/*

---

## 🎯 可用功能

### 1. 统一登录流程
- ✅ 手机号格式化 (自动添加空格)
- ✅ 验证码发送 (60 秒倒计时)
- ✅ 4 位验证码输入 (自动聚焦)
- ✅ 自动提交 (输入完 4 位后)
- ✅ 智能路由 (根据角色和 onboarding 状态)

### 2. 学生 Onboarding
- ✅ 3 步向导流程
  - 第 1 步: 基本信息 (姓名、性别)
  - 第 2 步: 年级和城市
  - 第 3 步: 设置密码
- ✅ 进度指示器
- ✅ 表单验证
- ✅ 完成后跳转到学生工作台

### 3. 教师批改功能
- ✅ 作文内容展示 (左侧,占 2/3)
- ✅ 批改表单 (右侧,占 1/3)
  - 三维分数 (结构、语言、立意)
  - 总分自动计算
  - 总体评语
  - 优点亮点
  - 下次目标
  - 改进建议 (Tag 输入)
- ✅ 自动保存 (30 秒防抖)
  - 状态指示器 (正在保存/未保存/已保存/错误)
  - 时间格式化 (刚刚/X 分钟前/HH:MM)
- ✅ 保存草稿和发布功能

---

## 🔧 管理命令

### 查看服务状态
```bash
# 检查端口占用
lsof -ti:3000  # 前端
lsof -ti:8000  # 后端

# 查看进程
ps aux | grep -E "(next dev|uvicorn)"

# 查看日志
tail -f frontend.log
tail -f backend.log
```

### 停止服务
```bash
# 方法 1: 使用 PID 文件
kill $(cat frontend.pid)
kill $(cat backend.pid)

# 方法 2: 直接杀端口
kill $(lsof -ti:3000)
kill $(lsof -ti:8000)

# 方法 3: 查找并杀进程
pkill -f "next dev"
pkill -f "uvicorn"
```

### 重启服务
```bash
# 前端
cd frontend
npm run dev

# 后端 (在 backend 目录)
cd backend
../.venv314/bin/uvicorn app.main:app --reload --port 8000

# 或使用绝对路径
.venv314/bin/uvicorn app.main:app --reload --port 8000
```

---

## 📊 数据库管理

### 数据库文件
- 位置: `./composition_evaluator.db`
- 类型: SQLite

### 查看数据库
```bash
# 查看表
sqlite3 composition_evaluator.db ".tables"

# 查看用户
sqlite3 composition_evaluator.db "SELECT * FROM auth_accounts LIMIT 5;"

# 查看迁移版本
sqlite3 composition_evaluator.db "SELECT * FROM alembic_version;"

# 备份数据库
cp composition_evaluator.db backup_$(date +%Y%m%d_%H%M%S).db
```

---

## 🧪 测试账号

### 创建测试账号

**学生账号**:
```bash
# 方法 1: 通过注册界面
访问 http://localhost:3000/login/student

# 方法 2: 直接插入数据库
sqlite3 composition_evaluator.db "
INSERT INTO auth_accounts (id, email, hashed_password, roles, active_role, onboarding_completed, display_name, phone)
VALUES ('test-student-1', 'student@test.com', '...hashed...', '[\"student\"]', 'student', 1, '测试学生', '13800138001');
"
```

**教师账号**:
```bash
# 方法 1: 通过注册界面
访问 http://localhost:3000/login/teacher

# 方法 2: 直接插入数据库
sqlite3 composition_evaluator.db "
INSERT INTO auth_accounts (id, email, hashed_password, roles, active_role, onboarding_completed, display_name, phone)
VALUES ('test-teacher-1', 'teacher@test.com', '...hashed...', '[\"teacher\"]', 'teacher', 1, '测试教师', '13800138002');
"
```

---

## 🐛 常见问题

### 问题 1: 前端无法访问后端
**症状**: 前端显示"后端状态：未检测"

**解决方案**:
```bash
# 检查后端是否运行
curl http://localhost:8000/api/v1/health

# 检查端口
lsof -ti:8000

# 如果没运行,重启后端
cd backend && ../.venv314/bin/uvicorn app.main:app --reload --port 8000
```

### 问题 2: 数据库迁移卡住
**症状**: 后端启动时显示 "Running upgrade..." 但卡住不动

**解决方案**:
```bash
# 查看当前版本
sqlite3 composition_evaluator.db "SELECT version_num FROM alembic_version;"

# 查看最新迁移文件
ls -lt backend/alembic/versions/ | head -5

# 手动更新版本
sqlite3 composition_evaluator.db "UPDATE alembic_version SET version_num='最新版本号';"

# 重启后端
kill $(lsof -ti:8000)
cd backend && ../.venv314/bin/uvicorn app.main:app --reload --port 8000
```

### 问题 3: 前端端口被占用
**症状**: 启动前端时提示 "Port 3000 is already in use"

**解决方案**:
```bash
# 查找占用进程
lsof -ti:3000

# 杀掉进程
kill $(lsof -ti:3000)

# 或使用其他端口
cd frontend
PORT=3001 npm run dev
```

### 问题 4: 自动保存不工作
**症状**: 修改表单后没有自动保存

**检查项**:
1. 打开浏览器控制台,查看是否有错误
2. 检查网络请求是否发送成功
3. 确认后端 API 是否正常

**调试**:
```javascript
// 在浏览器控制台
localStorage.setItem('debug', 'true')
```

---

## 📝 开发笔记

### 前端技术栈
- Next.js 14.2.32
- React 18.3.1
- TypeScript 5.7.3
- Tailwind CSS 3.4.17

### 后端技术栈
- FastAPI
- Python 3.14
- SQLAlchemy ORM
- SQLite 数据库

### 特色功能实现
- **双角色系统**: `roles` (JSONB) + `active_role`
- **Next Action 导航**: 后端返回 next_action 字段
- **自动保存**: 自定义 Hook `useAutoSaveDraft` (30 秒防抖)
- **Tag 输入**: 按 Enter 添加,点击 × 移除

---

## 🚀 部署准备

### 环境变量
参考 `.env.example` 创建 `.env` 文件

### 生产构建
```bash
# 前端
cd frontend
npm run build
npm start

# 后端
cd backend
.venv314/bin/gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

---

## 📚 相关文档

- [TASK_6_COMPLETION_REPORT.md](docs/TASK_6_COMPLETION_REPORT.md) - 教师批改页面
- [TASK_7_COMPLETION_REPORT.md](docs/TASK_7_COMPLETION_REPORT.md) - 自动保存功能
- [TASK_8_COMPLETION_REPORT.md](docs/TASK_8_COMPLETION_REPORT.md) - 集成测试与代码审查
- [CODE_REVIEW_REPORT.md](docs/CODE_REVIEW_REPORT.md) - 代码审查报告
- [INTEGRATION_TEST_PLAN.md](docs/INTEGRATION_TEST_PLAN.md) - 集成测试计划

---

## 📞 支持

如有问题,请查看:
1. 浏览器控制台 (F12)
2. 后端日志: `tail -f backend.log`
3. 前端日志: `tail -f frontend.log`
4. GitHub Issues: https://github.com/yisen99/composition-evaluator/issues

---

**最后更新**: 2026-02-24 10:00
**状态**: ✅ **服务运行中**
