# BMAD 快速开始指南

**安装日期**: 2026-02-23
**版本**: 6.0.1
**项目**: Composition Evaluator

---

## ✅ 安装验证

### 已安装组件

**核心模块**:
- ✅ BMAD Core (v6.0.1)
- ✅ BMAD Method Module (BMM)
- ✅ Claude Code 工具集成

**统计**:
- 🤖 10 个 AI 代理
- 📋 25 个工作流
- ⚡ 6 个任务模板

### 目录结构

```
composition-evaluator/
├── _bmad/                          # BMAD 核心目录
│   ├── _config/                    # 配置文件
│   ├── _memory/                    # 共享内存/上下文
│   ├── bmm/                        # BMAD Method 模块
│   │   ├── agents/                 # AI 代理定义
│   │   └── workflows/              # 工作流定义
│   └── core/                       # 核心功能
├── _bmad-output/                   # BMAD 输出目录
│   ├── planning-artifacts/         # 规划文档输出
│   └── implementation-artifacts/   # 实施工件输出
└── docs/                           # 项目文档
    └── bmad-frontend-review-guide.md  # BMAD 前端评审指南
```

---

## 🤖 可用 AI 代理

### 产品管理
- **/pm** - 产品经理
  - 创建 PRD (产品需求文档)
  - 定义产品愿景和功能
  - 用户故事和史诗创建

### 设计
- **/ux-designer** 或 **/ux-expert** - UX 设计师
  - 创建 UX 设计规范
  - 14步 UX 设计工作流
  - 组件策略和设计系统

### 架构
- **/architect** - 架构师
  - 创建技术架构文档
  - 系统设计和技术选型
  - 数据模型和 API 设计

### 开发
- **/dev** - 开发者
  - 实现功能代码
  - 代码重构
  - 单元测试

### 质量保证
- **/qa** - 质量保证
  - 代码审查
  - 测试策略
  - 质量检查清单

### Scrum 管理
- **/sm** - Scrum Master
  - Sprint 规划
  - 任务管理
  - 团队协调

### 分析
- **/analyst** - 业务分析师
  - 市场调研
  - 竞品分析
  - 数据分析

### 技术写作
- **/tech-writer** - 技术文档撰写者
  - API 文档
  - 用户手册
  - 技术规范

### 快速流
- **/quick-flow** 或 **/quick** - 快速开发流
  - 小型功能和 Bug 修复
  - 快速技术规范
  - 简化工作流

### BMAD 主持
- **/bmad-master** - BMAD 主持者
  - 帮助和指导
  - 工作流协调
  - 问题诊断

---

## 📋 主要工作流

### 规划阶段 (Planning)

1. **Brainstorming** - 头脑风暴
   - 创意生成
   - 问题探索
   - 解决方案构思

2. **Create PRD** - 创建产品需求文档
   - 产品愿景
   - 功能定义
   - 用户故事

3. **Create UX Design** - 创建 UX 设计规范
   - 14步 UX 工作流
   - 设计系统选择
   - 组件策略

4. **Create Architecture** - 创建技术架构
   - 系统设计
   - 技术栈选择
   - 数据模型

5. **Document Project** - 项目文档化
   - 现有项目分析
   - 文档生成
   - 知识整理

### 解决方案阶段 (Solutioning)

6. **Create Epics and Stories** - 创建史诗和故事
   - 功能分解
   - 任务估算
   - 优先级排序

7. **Check Implementation Readiness** - 检查实施准备情况
   - 设计评审
   - 依赖检查
   - 风险评估

### 实施阶段 (Implementation)

8. **Quick Flow** - 快速开发流
   - 小型功能
   - Bug 修复
   - 快速迭代

9. **Sprint Planning** - Sprint 规划
   - 任务分配
   - 迭代计划
   - 目标设定

---

## 🎯 立即开始

### 1. 获取帮助

运行 `/bmad-help` 获取基于当前项目状态的个性化指导:

```
/bmad-help

# 或者询问特定情况
/bmad-help 我刚刚完成架构设计,下一步做什么?
```

### 2. 创建前端需求评审 (推荐第一步)

使用 UX Designer 代理进行前端需求评审:

```
/ux-designer

# 或
/ux-expert
```

**UX Designer 将引导你完成**:
1. ✅ 项目理解
2. ✅ 核心体验定义
3. ✅ 情感响应设计
4. ✅ 灵感与趋势分析
5. ✅ 设计系统选择
6. ✅ 视觉基础定义
7. ✅ 体验定义
8. ✅ 设计方向
9. ✅ 用户旅程
10. ✅ 组件策略
11. ✅ UX 模式
12. ✅ 响应式与可访问性
13. ✅ 最终完成

### 3. Party Mode (多智能体协作)

让多个 AI 代理一起讨论和协作:

```
/party-mode

# 示例场景:
"Bring in the PM, Architect, and UX Designer to discuss the login page redesign"
```

### 4. 快速修复

对于小型功能或 Bug 修复,使用快速流:

```
/quick-flow

# 或
/quick
```

---

## 📂 输出文档位置

所有生成的文档将保存在:

```
_bmad-output/
├── planning-artifacts/           # 规划阶段文档
│   ├── prd.md                   # 产品需求文档
│   ├── ux-design-specification.md  # UX 设计规范
│   ├── architecture.md          # 技术架构
│   └── epics-and-stories.md     # 史诗和故事
│
└── implementation-artifacts/     # 实施阶段文档
    ├── tech-specs/              # 技术规范
    ├── sprint-plans/            # Sprint 计划
    └── implementation-guides/   # 实施指南
```

---

## 🎨 针对 Composition Evaluator 的推荐工作流

### 场景 1: 登录页面重构 (当前任务)

**步骤**:

1. **启动 UX 审查**
   ```
   /ux-designer
   ```
   - 完成 14 步 UX 工作流
   - 重点关注 Step 11 (组件策略)

2. **技术架构评审**
   ```
   /architect
   ```
   - 评审当前架构
   - 定义组件拆分策略

3. **创建实施计划**
   ```
   /sm
   ```
   - 创建任务分解
   - 设置优先级

4. **开始实施**
   ```
   /dev
   ```
   - 按照组件策略实施
   - 编写测试

### 场景 2: 新功能开发 (教师任务中心)

**步骤**:

1. **头脑风暴**
   ```
   /analyst
   ```
   - 研究类似功能
   - 分析最佳实践

2. **创建 PRD**
   ```
   /pm
   ```
   - 定义功能需求
   - 用户故事和验收标准

3. **UX 设计**
   ```
   /ux-designer
   ```
   - 创建 UX 规范
   - 设计组件和交互

4. **技术架构**
   ```
   /architect
   ```
   - 设计 API
   - 数据模型
   - 技术选型

5. **Sprint 规划**
   ```
   /sm
   ```
   - 任务分解
   - 迭代计划

6. **实施**
   ```
   /dev
   ```
   - 开发功能
   - 编写测试

7. **QA 审查**
   ```
   /qa
   ```
   - 代码审查
   - 测试验证

### 场景 3: 现有项目文档化

**步骤**:

1. **项目文档化**
   ```
   /bmad-master
   然后选择 "Document Project" 工作流
   ```
   - 分析现有代码
   - 生成架构文档
   - 创建用户指南

---

## 💡 最佳实践

### 1. 从小处开始,逐步扩展

- ✅ **小型任务**: 使用 `/quick-flow`
- ✅ **中型功能**: 使用 `/pm` → `/ux-designer` → `/dev`
- ✅ **大型功能**: 使用完整工作流

### 2. 利用 Party Mode

对于重要决策,让多个代理讨论:

```
/party-mode

"让 PM、Architect 和 UX Designer 讨论认证流程"
```

### 3. 文档驱动开发

BMAD 强调"先写文档,再写代码":

1. 先完成规划文档 (PRD、UX、Architecture)
2. 再进行实施 (Dev、QA)
3. 持续迭代和改进

### 4. 使用 /bmad-help

任何时候不确定下一步,运行:

```
/bmad-help
```

它会根据你的项目状态提供个性化建议。

### 5. 保持文档更新

- 定期运行 `/bmad-master` 更新文档
- 在重大变更后重新运行 `/architect`
- 保持 UX 规范与实现同步

---

## 🔗 相关资源

### 内部文档
- [BMAD 前端需求评审设计指南](./bmad-frontend-review-guide.md)
- [BMAD 官方文档](https://docs.bmad-method.org)

### 社区
- [Discord 社区](https://discord.gg/gk8jAdXWmj)
- [GitHub 仓库](https://github.com/bmad-code-org/BMAD-METHOD)
- [YouTube 频道](https://www.youtube.com/@BMadCode)

### 支持
- [GitHub Issues](https://github.com/bmad-code-org/BMAD-METHOD/issues)
- [Discussions](https://github.com/bmad-code-org/BMAD-METHOD/discussions)

---

## 🚀 立即行动

### 推荐第一步

运行 `/bmad-help` 获取个性化指导:

```
/bmad-help
```

### 推荐第二步

基于当前项目状态 (登录页面重构需求),运行:

```
/ux-designer
```

开始 14 步 UX 设计工作流!

---

**祝你使用 BMAD 愉快! 🎉**

如有问题,随时运行 `/bmad-help` 或查阅 [BMAD 前端需求评审设计指南](./bmad-frontend-review-guide.md)。
