# BMAD 前端需求评审设计指南

**项目**: Composition Evaluator
**基于**: BMAD-METHOD (Breakthrough Method of Agile AI Driven Development)
**日期**: 2026-02-23

---

## 📋 目录

1. [BMAD-METHOD 简介](#bmad-method-简介)
2. [前端需求评审框架](#前端需求评审框架)
3. [14步 UX 设计工作流](#14步-ux-设计工作流)
4. [应用于 Composition Evaluator](#应用于-composition-evaluator)
5. [实施计划](#实施计划)

---

## BMAD-METHOD 简介

### 核心理念

BMAD (Breakthrough Method of Agile AI Driven Development) 是一个 AI 驱动的敏捷开发框架,强调:

- **Scale-Adaptive Intelligence**: 根据项目复杂度自动调整规划深度
- **Structured Workflows**: 基于敏捷最佳实践的结构化工作流
- **Specialized Agents**: 12+ 个领域专家(PM、架构师、开发者、UX、Scrum Master 等)
- **Collaborative Discovery**: 协作式发现,而非假设驱动的设计

### 关键特性

1. **先写文档,再写代码** - 强制要求 AI 先进行深度思考和规划
2. **多智能体协作** - Party Mode 允许多个 AI 角色在同一个会话中协作讨论
3. **分步工作流** - 每个步骤都有明确的目标和验收标准
4. **A/P/C 协作菜单** - 每步完成后提供 Advanced Elicitation / Party Mode / Continue 选项

---

## 前端需求评审框架

### 核心原则

基于 BMAD 的 UX 设计工作流,前端需求评审应遵循以下原则:

#### 1. 协作式发现 (Collaborative Discovery)
- ❌ **错误做法**: AI 直接生成需求文档
- ✅ **正确做法**: AI 作为 UX 主持者,引导利益相关者进行协作式发现

#### 2. 避免假设驱动设计 (Avoid Assumption-Based Design)
- ❌ **错误做法**: 基于假设生成设计决策
- ✅ **正确做法**: 通过提问和对话理解真实用户需求

#### 3. 体验原则指导 (Experience Principles)
- ❌ **错误做法**: 直接跳到 UI 实现
- ✅ **正确做法**: 先定义体验原则,再指导设计决策

#### 4. 组件策略优先 (Component Strategy First)
- ❌ **错误做法**: 临时创建组件,缺乏统一策略
- ✅ **正确做法**: 先分析设计系统覆盖率,再规划自定义组件

---

## 14步 UX 设计工作流

### Phase 1: 理解与发现 (Steps 1-2)

#### Step 1: 初始化
- 创建 UX 设计规范文档
- 加载项目上下文 (PRD、Epics、Briefs)
- 设置工作流参数

**关键问题**:
- 项目文档是否完整?
- 需要哪些输入文档?
- 利益相关者是谁?

#### Step 2: 项目理解 (Project Understanding)

**目标**: 理解项目背景、目标用户和产品的独特性

**关键对话**:
```markdown
1. 从已加载文档中总结:
   - 项目愿景是什么?
   - 目标用户是谁?
   - 核心功能/目标是什么?

2. 填补上下文空白:
   - 你在构建什么?(1-2句话描述)
   - 目标用户是谁?
   - 产品的独特价值主张是什么?
   - 用户主要的操作/目标是什么?

3. 深入探索用户上下文:
   - 用户试图解决什么问题?
   - 当前方案的痛点是什么?
   - 什么会让用户说"这正是我需要的"?
   - 目标用户的技术熟练度如何?
   - 主要使用什么设备?
   - 何时何地使用此产品?

4. 识别 UX 设计挑战:
   - 需要解决的关键 UX 挑战
   - 平台特定考虑
   - 复杂的用户流程或交互

5. 识别设计机会:
   - 可以创造竞争优势的领域
   - 创新 UX 模式的机会
```

**输出内容**:
```markdown
## Executive Summary

### Project Vision
[项目愿景总结]

### Target Users
[目标用户描述]

### Key Design Challenges
[关键 UX 挑战]

### Design Opportunities
[设计机会]
```

---

### Phase 2: 核心体验定义 (Steps 3-4)

#### Step 3: 核心体验定义 (Core Experience Definition)

**目标**: 定义核心用户交互、平台要求和无缝体验

**关键对话**:
```markdown
1. 定义核心用户操作:
   - 用户最频繁做的事情是什么?
   - 哪个用户操作必须做到完美?
   - 什么应该对用户来说完全无感知?
   - 如果我们做好一个交互,其他都顺理成章 - 是什么?

2. 探索平台要求:
   - Web、移动 App、桌面还是多平台?
   - 主要是触屏还是鼠标/键盘?
   - 有什么特定平台要求或限制?
   - 需要考虑离线功能吗?
   - 有什么设备特定能力可以利用?

3. 识别无缝交互:
   - 什么用户操作应该感觉自然,无需思考?
   - 用户在类似产品上目前的困难是什么?
   - 什么交互如果做到无缝会创造愉悦感?
   - 什么应该自动发生,无需用户干预?
   - 我们在哪里可以消除竞争对手需要的步骤?

4. 定义关键成功时刻:
   - 用户什么时候意识到"这个更好"?
   - 用户什么时候感到成功或成就?
   - 什么交互如果失败会毁了体验?
   - 什么是成败攸关的用户流程?
   - 首次用户成功发生在哪里?

5. 综合体验原则:
   基于对话,我听到这些核心体验原则:
   - [基于核心操作聚焦的原则 1]
   - [基于无缝交互的原则 2]
   - [基于平台考虑的原则 3]
   - [基于关键成功时刻的原则 4]
```

**输出内容**:
```markdown
## Core User Experience

### Defining Experience
[核心体验定义]

### Platform Strategy
[平台要求和决策]

### Effortless Interactions
[无缝交互区域]

### Critical Success Moments
[关键成功时刻]

### Experience Principles
[UX 决策指导原则]
```

#### Step 4: 情感响应定义 (Emotional Response Definition)

**目标**: 定义产品在情感上应该让用户有什么感觉

**关键对话**:
```markdown
1. 探索期望的情感状态:
   - 当用户使用产品时,你希望他们有什么感觉?
   - 用户完成主要任务后应该有什么感觉?
   - 应该传达什么样的品牌个性?

2. 识别情感关键时刻:
   - 什么交互应该创造愉悦/惊喜?
   - 什么时刻应该让用户感到自信/赋能?
   - 什么时候需要同理心/理解?

3. 定义情感原则:
   - 情感响应如何影响视觉设计?
   - 微交互和动画如何支持情感目标?
   - 内容和文案如何塑造情感体验?
```

---

### Phase 3: 设计系统与视觉基础 (Steps 5-8)

#### Step 5: 灵感与趋势 (Inspiration & Trends)

**目标**: 收集设计灵感并分析趋势

**关键对话**:
```markdown
1. 设计灵感:
   - 有哪些产品或网站在类似 UX 方面做得好?
   - 哪些设计模式与你的愿景产生共鸣?

2. 趋势分析:
   - 你所在行业的相关设计趋势是什么?
   - 趋势中哪些适合你的品牌/用户?
   - 你想避开的趋势是什么?

3. 差异化:
   - 如何在遵循最佳实践的同时脱颖而出?
   - 什么独特的设计元素能创造识别度?
```

#### Step 6: 设计系统选择 (Design System Selection)

**目标**: 选择设计系统并定义自定义方法

**设计系统选项**:
- Material Design (Google)
- Human Interface Guidelines (Apple)
- Fluent Design System (Microsoft)
- Ant Design
- Chakra UI
- Radix UI + 自定义
- 其他...

**关键对话**:
```markdown
1. 设计系统偏好:
   - 有品牌色彩或风格指南吗?
   - 倾向于极简还是丰富的设计语言?
   - 有没有特别喜欢的设计系统?

2. 平台考虑:
   - Web 应用需要跨浏览器吗?
   - 有移动端需求吗?
   - 桌面端需要支持吗?

3. 自定义策略:
   - 设计系统如何与品牌对齐?
   - 需要什么自定义 tokens?
   - 组件自定义程度如何?
```

**输出内容**:
```markdown
## Design System Strategy

### Selected Design System
[选择的设计系统及理由]

### Brand Alignment Approach
[品牌对齐方法]

### Token Customization
[需要自定义的 tokens (颜色、排版、间距等)]

### Component Customization Strategy
[组件自定义策略]
```

#### Step 7: 定义体验 (Defining Experience)

**目标**: 将高层原则转化为具体的设计方向

**关键对话**:
```markdown
1. 视觉语言优先级:
   - 根据品牌和用户体验原则,什么最重要?
   - 简洁还是表达力?
   - 专业还是友好?
   - 传统还是创新?

2. 功能优先级:
   - 哪些功能最重要,需要最突出的视觉层级?

3. 设计方向:
   - 基于以上,我建议 X 个设计方向:
   - [方向 1 描述]
   - [方向 2 描述]
   - 每个方向强调不同的体验方面
```

#### Step 8: 视觉基础 (Visual Foundation)

**目标**: 定义色彩、排版、间距等视觉元素

**输出内容**:
```markdown
## Visual Foundation

### Color Palette
- Primary colors
- Secondary colors
- Semantic colors (success, warning, error)
- Neutral colors

### Typography
- Font families
- Type scale (headings, body, captions)
- Line heights
- Font weights

### Spacing System
- Spacing scale
- Layout grids
- Component spacing

### Elevation & Shadows
- Depth system
- Shadow tokens

### Border Radius
- Radius scale
- Usage guidelines
```

---

### Phase 4: 设计方向与组件 (Steps 9-11)

#### Step 9: 设计方向 (Design Directions)

**目标**: 创建具体的设计方向供选择

**输出**: 2-3 个设计方向,每个包括:
- 布局方法
- 视觉密度
- 交互模式
- 示例界面(可选)

#### Step 10: 用户旅程 (User Journeys)

**目标**: 映射关键用户流程和交互

**关键对话**:
```markdown
1. 识别关键旅程:
   - 首次使用流程是什么样的?
   - 日常使用的核心流程是什么?
   - 高级用户的流程是什么?

2. 为每个旅程定义:
   - 入口点
   - 步骤序列
   - 决策点
   - 退出点

3. 识别摩擦点:
   - 哪里可能困惑?
   - 哪里需要引导?
   - 哪里需要确认/反馈?
```

#### Step 11: 组件策略 (Component Strategy)

**目标**: 定义组件库策略和自定义组件

**关键对话**:
```markdown
1. 分析设计系统覆盖:
   已有组件:
   - [列出设计系统提供的组件]

   我们需要的组件:
   - [从旅程分析得出的组件需求 1]
   - [从设计要求得出的组件需求 2]
   - [从核心体验得出的组件需求 3]

   差距分析:
   - [差距 1 - 需要但没有]
   - [差距 2 - 需要但没有]

2. 设计自定义组件:

   对于每个自定义组件:
   **[组件名称] 设计:**
   - 目的: 这个组件为用户做什么?
   - 内容: 显示什么信息或数据?
   - 操作: 用户可以用这个组件做什么?
   - 状态: 有哪些不同的状态?
   - 变体: 需要不同的尺寸或样式吗?
   - 可访问性: 需要什么 ARIA 标签和键盘支持?

3. 组件策略:
   **基础组件:** (来自设计系统)
   - [基础组件 1]
   - [基础组件 2]

   **自定义组件:** (在此步骤设计)
   - [自定义组件 1 及理由]
   - [自定义组件 2 及理由]

4. 实施路线图:
   **阶段 1 - 核心组件:**
   - [组件 1] - [关键流程] 需要
   - [组件 2] - [关键流程] 需要
```

**输出内容**:
```markdown
## Component Strategy

### Design System Components
[设计系统组件分析]

### Custom Components
[自定义组件规格]

### Component Implementation Strategy
[组件实施策略]

### Implementation Roadmap
[实施路线图]
```

---

### Phase 5: UX 模式与完成 (Steps 12-14)

#### Step 12: UX 模式 (UX Patterns)

**目标**: 定义一致性模式以确保整个应用的 UX 一致性

**关键模式**:
- 导航模式
- 表单模式
- 反馈模式
- 确认模式
- 错误处理
- 空状态
- 加载状态

#### Step 13: 响应式与可访问性 (Responsive & Accessibility)

**目标**: 确保设计在所有设备上可用且可访问

**响应式设计**:
- 断点策略
- 布局调整
- 组件行为

**可访问性**:
- WCAG 合规级别
- 键盘导航
- 屏幕阅读器支持
- 色彩对比度
- 焦点管理

#### Step 14: 完成 (Complete)

**目标**: 最终确定 UX 设计规范并准备进入架构阶段

**最终输出**: 完整的 UX 设计规范文档,包括:
- Executive Summary
- Core User Experience
- Emotional Response
- Inspiration & Trends
- Design System Strategy
- Defining Experience
- Visual Foundation
- Design Directions
- User Journeys
- Component Strategy
- UX Patterns
- Responsive & Accessibility

---

## 应用于 Composition Evaluator

### 当前项目状态分析

**已完成功能**:
- ✅ 基于角色的身份验证 (教师/学生)
- ✅ 短信验证登录
- ✅ 微信 OAuth 集成
- ✅ 基于密码的身份验证
- ✅ 基础 UI/UX(中文设计系统)

**进行中**:
- 🔄 登录/注册页面评估(当前任务)
- 🔄 安全改进
- 🔄 可访问性增强

**已知问题**:
- 组件复杂度高 (role-auth-page.tsx: 685 行)
- 身份验证端点缺少速率限制
- 需要可访问性改进
- 密码复杂度要求

### 应用 BMAD 14步工作流

#### 阶段 1: 项目理解

**当前问题**:
- 登录页面组件复杂度高(685行)
- 需要评估现有设计的 UX 质量
- 需要识别改进机会

**建议步骤**:

1. **加载现有上下文**:
   - 阅读 [role-auth-page.tsx](../frontend/app/login/_components/role-auth-page.tsx)
   - 阅读现有设计系统文档
   - 阅读产品需求文档(如果有)

2. **项目理解对话**:
   ```markdown
   **目标用户**:
   - 教师用户: 需要快速、专业的登录体验
   - 学生用户: 需要简单、引导性的登录体验

   **核心功能**:
   - 多种登录方式(短信、微信、密码)
   - 基于角色的路由
   - 安全的身份验证流程

   **关键 UX 挑战**:
   - 如何在单一页面处理多种登录方式而不混乱?
   - 如何平衡简洁性和功能性?
   - 如何确保用户知道选择哪种登录方式?

   **设计机会**:
   - 渐进式披露(Progressive Disclosure)
   - 上下文帮助和引导
   - 清晰的视觉层级
   ```

#### 阶段 2: 核心体验定义

**核心用户操作**:
- 快速登录(教师优先考虑效率)
- 简单登录(学生优先考虑易用性)

**平台策略**:
- 响应式 Web 应用
- 移动优先设计(考虑到微信使用)
- 支持触摸和鼠标/键盘

**无缝交互**:
- 自动检测和推荐最佳登录方式
- 记住上次选择
- 微信扫码自动登录

**关键成功时刻**:
- 首次登录成功
- 身份验证完成
- 到达预期的仪表板

**体验原则**:
1. **简洁优先**: 减少认知负担
2. **清晰引导**: 用户始终知道下一步
3. **快速反馈**: 即时验证和错误提示
4. **安全信任**: 传达安全性和专业性

#### 阶段 3: 设计系统与视觉基础

**建议设计系统**:
- **选项 1**: Chakra UI + 自定义
  - 优点: 组件丰富、可访问性好、中文支持
  - 缺点: 需要自定义以匹配品牌

- **选项 2**: shadcn/ui + Tailwind CSS
  - 优点: 完全可定制、现代设计
  - 缺点: 需要更多自定义工作

- **选项 3**: Ant Design
  - 优点: 中文友好、企业级、组件完整
  - 缺点: 较重、可能过于复杂

**推荐**: Ant Design (中文 UI,企业级,完整的表单和身份验证组件)

**品牌对齐**:
- 使用现有的中文设计系统 tokens
- 自定义主色调以匹配品牌
- 保持专业教育产品的视觉风格

#### 阶段 4: 组件策略

**现有组件分析**:

当前 [role-auth-page.tsx](../frontend/app/login/_components/role-auth-page.tsx) (685行) 需要拆分为:

1. **基础组件** (来自 Ant Design):
   - Button
   - Input
   - Form
   - Tabs
   - Divider
   - Message/Notification
   - Spin/Loading

2. **自定义组件** (需要创建):
   - `AuthContainer` - 认证页面容器
   - `RoleSelector` - 角色选择器
   - `LoginMethodSelector` - 登录方式选择器
   - `SMSLoginForm` - 短信登录表单
   - `PasswordLoginForm` - 密码登录表单
   - `WeChatLoginButton` - 微信登录按钮
   - `AuthErrorDisplay` - 认证错误显示
   - `LoginSuccessAnimation` - 登录成功动画

**实施路线图**:

**阶段 1 - 核心组件** (用于基本登录功能):
- `AuthContainer`
- `RoleSelector`
- `SMSLoginForm`
- `PasswordLoginForm`

**阶段 2 - 增强组件** (改善用户体验):
- `LoginMethodSelector`
- `WeChatLoginButton`
- `AuthErrorDisplay`

**阶段 3 - 优化组件** (增加愉悦感):
- `LoginSuccessAnimation`
- 微交互和过渡动画

#### 阶段 5: UX 模式

**导航模式**:
- 登录后基于角色的自动路由
- 面包屑导航(如适用)

**表单模式**:
- 实时验证
- 清晰的错误消息
- 成功反馈

**反馈模式**:
- Loading 状态
- 成功/错误通知
- 确认对话框(如适用)

**错误处理**:
- 友好的错误消息
- 恢复建议
- 重试选项

**空状态**:
- 不适用于登录页面

**加载状态**:
- 表单提交中的 Loading 状态
- 微信 OAuth 重定向中的 Loading 状态

**可访问性**:
- WCAG AA 合规
- 键盘导航支持
- ARIA 标签
- 色彩对比度 ≥ 4.5:1
- 焦点管理

---

## 实施计划

### 立即行动

1. **运行 BMAD UX 工作流**:
   ```bash
   # 在项目根目录
   npx bmad-method install
   ```

2. **启动 UX 设计规范**:
   - 打开 Claude Code
   - 运行: `/ux-designer` 或 `/ux-expert`
   - 按照 14 步工作流进行

3. **重构登录页面**:
   - 基于 BMAD 组件策略拆分 role-auth-page.tsx
   - 创建可重用的认证组件
   - 应用 BMAD UX 模式

### 短期目标 (1-2周)

- [ ] 完成 BMAD UX 设计规范文档
- [ ] 拆分 role-auth-page.tsx 为多个小组件
- [ ] 实现 Ant Design 设计系统
- [ ] 应用 BMAD UX 模式
- [ ] 添加速率限制
- [ ] 改进可访问性(WCAG AA)

### 中期目标 (1个月)

- [ ] 完成 BMAD 前端规范
- [ ] 将 BMAD 工作流应用于其他页面
- [ ] 创建完整的组件库
- [ ] 实施设计系统 tokens
- [ ] 建立 UX 审查流程

### 长期目标 (3个月)

- [ ] 完整的 BMAD 工作流集成
- [ ] 自动化 UX 审查
- [ ] 持续改进和迭代
- [ ] 多 AI 协作工作流(Party Mode)
- [ ] 建立前端最佳实践文档

---

## BMAD 工作流命令

### 安装和设置

```bash
# 安装 BMAD
npx bmad-method install

# 或指定版本
npx bmad-method@6.0.1 install
```

### 可用命令

- `/bmad-help` - 获取帮助和指导
- `/pm` - 产品经理代理(创建 PRD)
- `/architect` - 架构师代理(技术架构)
- `/ux-designer` 或 `/ux-expert` - UX 设计师代理(前端规范)
- `/po` - 产品负责人(文档分片)
- `/dev` - 开发者代理(实现代码)
- `/qa` - 质量保证代理(测试和审查)

### Party Mode

```bash
# 启动多智能体协作
/party-mode

# 示例:让 PM 和 Architect 讨论
"Bring in the PM and Architect agents to discuss the authentication flow"
```

---

## 参考资源

### BMAD 文档

- [BMAD GitHub](https://github.com/bmadcode/BMAD-METHOD)
- [BMAD 文档](https://docs.bmad-method.org)
- [Discord 社区](https://discord.gg/gk8jAdXWmj)

### 设计系统

- [Ant Design](https://ant.design/)
- [Material Design](https://m3.material.io/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Chakra UI](https://chakra-ui.com/)

### 可访问性

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)

---

## 结论

BMAD-METHOD 提供了一个结构化、协作式的前端需求评审和设计框架。通过应用 14 步 UX 设计工作流,我们可以:

1. **避免假设驱动设计** - 通过协作式发现理解真实用户需求
2. **建立体验原则** - 指导所有设计决策
3. **组件策略优先** - 平衡设计系统和自定义组件
4. **确保一致性** - 通过 UX 模式确保整个应用的一致性
5. **提高可访问性** - 从设计阶段就考虑可访问性

对于 Composition Evaluator 项目,BMAD 将帮助我们:
- 重构复杂的登录页面
- 建立统一的设计系统
- 创建可重用的组件库
- 改善整体用户体验
- 建立可持续的前端开发流程

---

**下一步**: 运行 `npx bmad-method install` 并启动 `/ux-designer` 工作流!
