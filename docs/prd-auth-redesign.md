# 产品需求文档: 统一登录与双角色系统重构

**版本**: v2.0
**日期**: 2026-02-23
**作者**: Claude Code (BMAD PM Agent)
**状态**: 草案

---

## 📋 执行摘要

### 产品愿景
构建一个统一的、智能的作文批改平台,通过手机验证码降低登录门槛,支持双角色切换(教师/学生),为教师提供 AI 辅助的高效批改体验,为学生建立长期学习记忆库。

### 核心问题
当前系统存在以下问题:
1. **登录入口分散** - 需要选择"教师/学生",增加用户认知负担
2. **角色固化** - 一个账号只能是教师或学生,无法切换
3. **注册门槛高** - 需要先选择角色,再填写注册信息
4. **教师工作台效率低** - 缺少语音输入、AI 辅助、学生历史
5. **缺少学生长期记忆** - 无法追踪学生学习成长

### 解决方案
1. **统一登录入口** - 所有用户通过手机验证码登录
2. **双角色系统** - 同一账号可同时拥有学生+教师角色
3. **管理员授权** - 管理员指定教师手机号
4. **首登信息补全** - 根据角色强制补全信息
5. **智能工作台** - 教师高效批改、学生长期记忆

---

## 🎯 核心功能需求

### 1. 统一登录与注册

#### 1.1 统一登录入口

**需求描述**:
- 移除现有的 `/login` 页面的"身份选择"功能
- 所有用户统一使用 `/login` 页面
- 默认显示手机验证码登录表单

**用户流程**:
```
访问网站 → 自动跳转到 /login → 输入手机号 → 获取验证码 → 登录成功
```

**验收标准**:
- [ ] 未登录用户访问任何页面,自动跳转到 `/login`
- [ ] `/login` 页面不显示"教师入口/学生入口"选择
- [ ] 登录表单仅包含: 手机号输入框、验证码输入框、"获取验证码"按钮、"登录"按钮

#### 1.2 手机验证码登录(自动注册)

**需求描述**:
- 用户首次使用手机号登录时,自动创建账号
- 登录成功后,根据是否被管理员指定为教师,决定跳转路径

**用户流程**:
```
第一次使用:
输入手机号 → 获取验证码 → 输入验证码 → 登录成功 →
判断是否有教师权限 →

  ├─ 有教师权限 → 跳转到 /onboarding/teacher
  ├─ 无教师权限 → 跳转到 /onboarding/student
  └─ 已补全信息 → 跳转到对应工作台

非第一次使用:
输入手机号 → 获取验证码 → 输入验证码 → 登录成功 →
跳转到上次活跃角色的工作台
```

**验收标准**:
- [ ] 未注册的手机号,验证码验证通过后自动创建账号
- [ ] 新账号的 `role` 字段初始值为 `"student"`
- [ ] 新账号的 `onboarding_completed` 字段初始值为 `false`
- [ ] 登录后检查 `onboarding_completed`,决定是否跳转到信息补全页面

#### 1.3 管理员指定教师权限

**需求描述**:
- 系统有一个管理员账号(通过环境变量配置)
- 管理员可以在管理后台指定某个手机号为教师账号
- 被指定的手机号登录后,会被识别为教师身份

**用户流程**:
```
管理员登录 → 进入管理后台 → 输入手机号 → 点击"设为教师" →
该手机号下次登录时获得教师权限
```

**数据模型**:
```python
class AuthAccount(Base):
    # ... 现有字段
    role: Mapped[str] = mapped_column(String(50), default="student", nullable=False)
    # 改为 JSON 数组,支持多角色
    # role: Mapped[list[str]] = mapped_column(JSON, default=["student"], nullable=False)
```

**验收标准**:
- [ ] 管理员后台有"教师管理"页面
- [ ] 可以输入手机号,点击"设为教师"按钮
- [ ] 被指定的手机号,其 `role` 字段更新为 `["student", "teacher"]`
- [ ] 被指定的手机号登录后,可以选择进入教师工作台或学生工作台

---

### 2. 首次登录信息补全

#### 2.1 学生信息补全

**需求描述**:
- 首次登录的用户,如果没有教师权限,强制跳转到学生信息补全页面
- 必须填写所有字段才能进入系统

**表单字段**:
```typescript
interface StudentOnboardingData {
  real_name: string;        // 真实姓名(必填)
  grade: string;            // 年级(必填,选择:一年级~高三)
  city: string;             // 城市(必填,级联选择:省/市)
  gender: "male" | "female" | "other";  // 性别(必填)
  password: string;         // 密码(必填,用于密码登录)
  avatar_url?: string;      // 头像(可选)
}
```

**用户流程**:
```
新用户登录 → 跳转到 /onboarding/student → 填写信息 → 点击"完成注册" →
跳转到学生工作台
```

**验收标准**:
- [ ] 所有字段都是必填(除头像外)
- [ ] 年级选择器提供 1-12 年级选项
- [ ] 城市选择器提供省/市二级联动
- [ ] 密码强度要求: 至少 8 位,包含字母和数字
- [ ] 提交后更新 `User` 表,设置 `onboarding_completed = true`
- [ ] 提交后自动跳转到 `/student/workbench`

#### 2.2 教师信息补全

**需求描述**:
- 被管理员指定为教师的用户,首次登录时强制跳转到教师信息补全页面

**表单字段**:
```typescript
interface TeacherOnboardingData {
  real_name: string;        // 真实姓名(必填)
  password: string;         // 密码(必填,用于密码登录)
  school_name?: string;     // 学校名称(可选)
  subject?: string;         // 科目(可选,如语文、数学)
  avatar_url?: string;      // 头像(可选)
}
```

**用户流程**:
```
被指定为教师的新用户登录 → 跳转到 /onboarding/teacher → 填写信息 →
点击"完成注册" → 跳转到教师工作台
```

**验收标准**:
- [ ] 真实姓名和密码是必填
- [ ] 密码强度要求同学生
- [ ] 提交后更新 `User` 表,设置 `onboarding_completed = true`
- [ ] 提交后自动跳转到 `/teacher/workbench`

---

### 3. 双角色系统

#### 3.1 角色数据模型

**需求描述**:
- 同一账号可以同时拥有学生和教师角色
- 数据库中 `role` 字段改为 JSON 数组

**数据模型变更**:
```python
# 旧模型
role: Mapped[str] = mapped_column(String(20), default="student")

# 新模型
roles: Mapped[list[str]] = mapped_column(JSON, default=["student"], nullable=False)
active_role: Mapped[str] = mapped_column(String(20), default="student", nullable=False)
```

**迁移策略**:
```python
# Alembic 迁移脚本
def upgrade():
    # 1. 添加 roles 字段
    op.add_column('auth_accounts', sa.Column('roles', JSON, nullable=True))

    # 2. 迁移现有数据
    connection = op.get_bind()
    result = connection.execute('SELECT id, role FROM auth_accounts')
    for row in result:
        old_role = row[1]
        roles = json.dumps([old_role])
        connection.execute(
            f'UPDATE auth_accounts SET roles = \'{roles}\' WHERE id = \'{row[0]}\''
        )

    # 3. 添加 active_role 字段
    op.add_column('auth_accounts', sa.Column('active_role', String(20), server_default="student"))

    # 4. 删除旧 role 字段
    op.drop_column('auth_accounts', 'role')
```

**验收标准**:
- [ ] 数据库迁移脚本无损迁移现有数据
- [ ] 新注册用户默认 `roles = ["student"]`
- [ ] 管理员指定教师时,更新 `roles = ["student", "teacher"]`
- [ ] `active_role` 记录用户当前活跃角色

#### 3.2 角色切换功能

**需求描述**:
- 全局导航栏显示当前角色
- 点击可切换到另一个角色(如果拥有)
- 切换后立即生效,跳转到对应工作台
- 记住 `active_role`,下次登录时使用

**UI 设计**:
```
┌─────────────────────────────────────────────┐
│  [Logo]  作文批改平台    [头像 ▼]           │
│                                ┌──────────┐ │
│                                │ 🎓 学生  │ │ ← 当前角色
│                                │ 👨‍🏫 教师  │ │ ← 可切换
│                                └──────────┘ │
└─────────────────────────────────────────────┘
```

**用户流程**:
```
用户点击头像下拉菜单 → 显示"🎓 学生"和"👨‍🏫 教师" →
点击"👨‍🏫 教师" → 更新 active_role = "teacher" →
跳转到 /teacher/workbench → 下次登录默认进入教师工作台
```

**验收标准**:
- [ ] 导航栏显示当前角色图标(🎓 或 👨‍🏫)
- [ ] 点击头像显示下拉菜单,列出所有可用角色
- [ ] 点击角色后,前端调用 `/api/v1/auth/switch-role` 更新 `active_role`
- [ ] 切换后立即跳转到对应工作台(`/${role}/workbench`)
- [ ] 下次登录时,读取 `active_role`,进入对应工作台

---

### 4. 教师工作台

#### 4.1 教师工作台首页

**需求描述**:
- 教师登录后,默认进入教师工作台
- 核心功能是"批改作业"
- 一切设计服务于高效批改

**页面布局**:
```
┌─────────────────────────────────────────────────────────┐
│  👨‍🏫 教师工作台  |  班级管理  |  任务发布  |  [头像]    │
├──────────┬──────────────────────────────────────────────┤
│          │  📊 批改进度                                 │
│ 待批改   │  已批改: 15  |  待批改: 8  |  总计: 23       │
│ (8)      │                                              │
│          │  ┌────────────────────────────────────────┐  │
│          │  │  最新任务: 春天的景色                   │  │
│          │  │  截止: 2024-02-25                      │  │
│          │  │  提交: 18/20                           │  │
│          │  │  [立即批改]                            │  │
│          │  └────────────────────────────────────────┘  │
│  ┌────┐  │                                              │
│  │张三│  │  🎯 快速入口                                 │
│  ├────┤  │  [查看全部任务] [发布新任务] [班级管理]      │
│  │李四│  │                                              │
│  ├────┤  │  📈 近期统计                                 │
│  │王五│★ │  本周批改: 45 篇                             │
│  └────┘  │  平均用时: 8 分钟/篇                         │
│          │  AI 辅助率: 78%                              │
└──────────┴──────────────────────────────────────────────┘
```

**验收标准**:
- [ ] 显示"待批改"学生列表(左侧)
- [ ] 显示批改进度统计(已批改/待批改)
- [ ] 显示最新任务卡片
- [ ] 显示快速入口按钮
- [ ] 显示近期统计(本周批改数、平均用时、AI 辅助率)

#### 4.2 批改页面(核心功能)

**需求描述**:
- 教师点击"立即批改"或选择学生,进入批改页面
- 支持语音输入评语
- 显示学生历史背景
- AI 辅助批改(Claude、GPT-4、Gemini 多模型)

**页面布局**:
```
┌────────────────────────────────────────────────────────────┐
│  ← 返回  |  春天的景色 - 张三(三年级,上海)  |  [保存] [提交] │
├──────────┬─────────────────────────────────┬───────────────┤
│          │                                 │  🤖 AI 建议   │
│  学生    │    作文内容                     │  ┌───────────┐│
│  列表    │    (主要区域)                   │  │总分: 85/100││
│          │                                 │  │           ││
│ ┌────┐   │  ┌──────────────────────────┐  │  │优点:      ││
│ │张三│ ★ │  │  春天的景色              │  │  │- 描写生动││
│ ├────┤   │  │                          │  │  │           ││
│ │李四│   │  │  春天来了,花儿开了...    │  │  │建议:      ││
│ ├────┤   │  │                          │  │  │- 补充细节││
│ │王五│ ✓ │  │  [全文]                  │  │  │           ││
│ └────┘   │  └──────────────────────────┘  │  └───────────┘│
│          │                                 │               │
│          │  学生历史背景:                  │  [采纳] [修改]│
│          │  • 上次作业: 《我的家乡》 82分  │               │
│          │  • 平均分: 79分                │  🎙️ 语音评语  │
│          │  • 擅长: 描写文                │  [🎤 按住说话] │
│          │  • 待改进: 结构                │               │
│          │                                 │  批改历史     │
│          │  [教师批改区域]                │  - 2024-01-01 │
│          │  ┌──────────────────────────┐  │  - 2024-01-02 │
│          │  │ 总分: [90]  等级: A      │  │               │
│          │  │ 评语: [_______]          │  │               │
│          │  │ [🎤 语音输入]            │  │               │
│          │  │ [快捷评语 ▼]             │  │               │
│          │  │ [提交] [保存]            │  │               │
│          │  └──────────────────────────┘  │               │
└──────────┴─────────────────────────────────┴───────────────┘
```

**核心功能**:

##### 4.2.1 语音输入评语
- 点击"🎤 语音输入"按钮,开始录音
- 使用浏览器 SpeechRecognition API 或第三方服务
- 实时转文字,显示在评语输入框
- 支持普通话和英语

**验收标准**:
- [ ] 点击"🎤 语音输入"按钮,弹出"按住说话"提示
- [ ] 录音过程中显示音波动画
- [ ] 说话结束后,转文字结果填入评语输入框
- [ ] 支持重新录音

##### 4.2.2 学生历史背景
- 显示学生的历史作业记录
- 统计平均分、擅长点、待改进点
- 帮助教师全面了解学生

**验收标准**:
- [ ] 显示"学生历史背景"卡片
- [ ] 列出最近 5 次作业(标题、分数)
- [ ] 计算平均分
- [ ] AI 分析擅长点和待改进点(基于历史批改记录)

##### 4.2.3 AI 辅助批改
- 点击"🤖 AI 建议"按钮,请求 AI 批改
- 多模型协作(Claude 内容分析、GPT-4 评分、Gemini 评语)
- 显示置信度(高/中/低)
- 教师可采纳、修改或忽略

**验收标准**:
- [ ] 点击"🤖 AI 建议",发送请求到 `/api/v1/grading/ai-suggest`
- [ ] 显示加载动画
- [ ] 10 秒内返回结果(或显示缓存结果)
- [ ] 显示总分、优点、建议
- [ ] 显示"🤖 AI 高度推荐"标签(如果置信度 ≥ 80%)
- [ ] 提供"采纳"、"修改"、"忽略"按钮

---

### 5. 学生工作台

#### 5.1 学生工作台首页

**需求描述**:
- 学生登录后,默认进入学生工作台
- 核心功能是"提交作业"和"查看反馈"

**页面布局**:
```
┌─────────────────────────────────────────────────────────┐
│  🎓 学生工作台  |  我的作业  |  学习档案  |  [头像]    │
├─────────────────────────────────────────────────────────┤
│  📝 待提交作业                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │  春天的景色                                     │   │
│  │  截止: 2024-02-25  剩余: 2 天                   │   │
│  │  [立即提交]                                     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  📊 学习统计                                            │
│  已提交: 15 篇  |  平均分: 82 分  |  排名: 第 8 名     │
│                                                         │
│  📈 成长轨迹                                            │
│  [图表: 最近 10 次作业分数趋势]                        │
│                                                         │
│  💬 最新反馈                                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │  《我的家乡》 - 张老师                           │   │
│  │  "描写生动,但需要补充细节..."                   │   │
│  │  [查看详细]                                     │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**验收标准**:
- [ ] 显示"待提交作业"列表
- [ ] 显示学习统计(已提交数、平均分、排名)
- [ ] 显示成长轨迹图表(最近 10 次作业)
- [ ] 显示最新反馈

#### 5.2 提交作业页面

**需求描述**:
- 学生点击"立即提交",进入作业提交页面
- 支持多种格式: 文本、图片、文档(docx, pdf)

**页面布局**:
```
┌─────────────────────────────────────────────────────────┐
│  ← 返回  |  提交作业: 春天的景色                         │
├─────────────────────────────────────────────────────────┤
│  📝 作业内容                                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │  标题: [春天的景色]                            │   │
│  │                                                 │   │
│  │  请描述你眼中的春天...                          │   │
│  │                                                 │   │
│  │  [文本输入框]                                   │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │                                        │   │   │
│  │  │  (在此输入作文内容...)                  │   │   │
│  │  │                                        │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  📎 添加附件(可选)                                      │
│  [📷 上传图片] [📄 上传文档]                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │  已上传:                                         │   │
│  │  • photo1.jpg (2.3 MB)                         │   │
│  │  • essay.docx (156 KB)                         │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [保存草稿]  [提交]                                     │
└─────────────────────────────────────────────────────────┘
```

**支持格式**:
- **文本**: 直接输入文本
- **图片**: jpg, png (自动 OCR 提取文字)
- **文档**: docx, pdf (提取文本内容)

**验收标准**:
- [ ] 支持文本输入(最多 2000 字)
- [ ] 支持上传图片(jpg, png, 最大 5MB)
- [ ] 图片上传后自动调用 OCR API 提取文字
- [ ] 支持上传文档(docx, pdf, 最大 10MB)
- [ ] 文档上传后提取文本内容
- [ ] 提交前可预览完整内容
- [ ] 支持保存草稿(自动保存每 30 秒)

#### 5.3 学生长期记忆库

**需求描述**:
- 系统自动建立学生长期记忆库
- 基于历史作业、年级、地区,分析学生特点
- 为教师批改提供背景信息

**记忆库内容**:
```typescript
interface StudentLongTermMemory {
  student_id: string;

  // 基础信息
  basic_info: {
    grade: string;        // 年级
    city: string;         // 城市
    gender: string;       // 性别
  };

  // 作业统计
  stats: {
    total_submissions: number;
    average_score: number;
    submission_frequency: number;  // 提交频率(次/月)
  };

  // 写作特点(AI 分析)
  writing_characteristics: {
    strengths: string[];      // 擅长点(如: "描写生动", "结构清晰")
    weaknesses: string[];     // 待改进点(如: "细节不足", "逻辑混乱")
    preferred_topics: string[];  // 偏好题材(如: "写景", "叙事")
    writing_style: string;      // 写作风格(如: "朴实", "华丽")
  };

  // 成长轨迹
  growth_trajectory: {
    recent_scores: number[];    // 最近 10 次分数
    improvement_rate: number;   // 进步率(%)
    streak: number;             // 连续提交次数
  };

  // 历史作业
  submissions: Array<{
    id: string;
    title: string;
    score: number;
    feedback: string;
    submitted_at: string;
  }>;

  // 更新时间
  updated_at: string;
}
```

**更新机制**:
- 每次批改后,AI 自动分析并更新记忆库
- 使用 GPT-4 分析写作特点
- 每月重新计算成长轨迹

**验收标准**:
- [ ] 每个学生有唯一的长期记忆库
- [ ] 记忆库包含基础信息、作业统计、写作特点、成长轨迹
- [ ] 教师批改时显示"学生历史背景"卡片(来自记忆库)
- [ ] 每次批改后自动更新记忆库
- [ ] 学生可以在"学习档案"页面查看自己的记忆库

---

## 🗄️ 数据模型变更

### AuthAccount 模型变更

```python
class AuthAccount(Base):
    __tablename__ = "auth_accounts"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True, unique=True)

    # 旧字段(删除)
    # role: Mapped[str] = mapped_column(String(20), default="student", nullable=False)

    # 新字段
    roles: Mapped[list[str]] = mapped_column(JSON, default=["student"], nullable=False)
    active_role: Mapped[str] = mapped_column(String(20), default="student", nullable=False)

    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # 新增字段
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
```

### User 模型变更

```python
class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    auth_account_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("auth_accounts.id"), nullable=False)

    # 新增字段
    real_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    grade: Mapped[str | None] = mapped_column(String(20), nullable=True)  # 学生: 一年级~高三
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)  # 城市
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)  # male/female/other
    school_name: Mapped[str | None] = mapped_column(String(200), nullable=True)  # 教师: 学校
    subject: Mapped[str | None] = mapped_column(String(50), nullable=True)  # 教师: 科目

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
```

### StudentLongTermMemory 模型(新增)

```python
class StudentLongTermMemory(Base):
    __tablename__ = "student_long_term_memory"

    student_id: Mapped[str] = mapped_column(String(36), primary_key=True)

    basic_info: Mapped[dict] = mapped_column(JSON, nullable=False)
    stats: Mapped[dict] = mapped_column(JSON, nullable=False)
    writing_characteristics: Mapped[dict] = mapped_column(JSON, nullable=False)
    growth_trajectory: Mapped[dict] = mapped_column(JSON, nullable=False)
    submissions: Mapped[list] = mapped_column(JSON, nullable=False)

    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
```

---

## 🔐 权限与安全

### 权限控制

```python
# 权限装饰器
def require_roles(*roles: str):
    def decorator(func):
        async def wrapper(*args, **kwargs):
            current_user = get_current_user()
            if current_user.active_role not in roles:
                raise HTTPException(403, "权限不足")
            return await func(*args, **kwargs)
        return wrapper
    return decorator

# 使用示例
@router.get("/teacher/workbench")
@require_roles("teacher")
async def teacher_workbench():
    pass

@router.get("/student/workbench")
@require_roles("student")
async def student_workbench():
    pass
```

### API 端点权限

| 端点 | 允许角色 |
|------|----------|
| `/api/v1/grading/submissions` | teacher |
| `/api/v1/grading/ai-suggest` | teacher |
| `/api/v1/submissions/submit` | student |
| `/api/v1/admin/assign-teacher` | admin |

---

## 📊 非功能性需求

### 性能要求
- 登录响应时间 < 1 秒
- 作业提交响应时间 < 2 秒
- AI 批改建议返回时间 < 10 秒
- 长期记忆库更新时间 < 5 秒

### 安全要求
- 验证码 5 分钟内有效
- 验证码每天每手机号最多 10 次
- 密码至少 8 位,包含字母和数字
- 敏感操作需要二次验证

### 兼容性要求
- Chrome 最新版
- Safari 最新版
- Firefox 最新版
- 移动端浏览器

---

## 🚀 实施计划

### 阶段 1: 后端重构 (1 周)
1. 数据库迁移(roles 字段)
2. 首登信息补全 API
3. 角色切换 API
4. 管理员指定教师 API

### 阶段 2: 前端重构 (2 周)
1. 统一登录页面
2. 学生/教师信息补全页面
3. 双角色切换组件
4. 教师工作台(核心功能)
5. 学生工作台

### 阶段 3: AI 集成 (1 周)
1. 学生长期记忆库构建
2. AI 批改建议
3. 语音转文字集成
4. OCR 集成

### 阶段 4: 测试与发布 (1 周)
1. 功能测试
2. 性能测试
3. 安全测试
4. 灰度发布

---

## 📝 附录

### 用户故事

**US-1: 统一登录**
```
作为新用户,
我想要通过手机验证码直接登录,
这样我就可以快速开始使用,而不需要先选择身份。
```

**US-2: 首登信息补全**
```
作为新用户,
我想要首次登录时补全个人信息,
这样系统可以为我提供个性化的服务。
```

**US-3: 角色切换**
```
作为既是教师又是学生的用户,
我想要可以快速切换角色,
这样我可以在不同场景下使用不同功能。
```

**US-4: 教师高效批改**
```
作为教师,
我想要使用语音输入评语,
这样我就可以快速完成批改,而不需要打字。
```

**US-5: 学生长期记忆**
```
作为教师,
我想要查看学生的历史背景,
这样我就可以更全面地了解学生,给出更好的反馈。
```

### 验收标准汇总

- [ ] 统一登录入口,移除身份选择
- [ ] 手机验证码登录,自动注册
- [ ] 管理员指定教师功能
- [ ] 首登信息补全强制拦截
- [ ] 双角色系统(roles + active_role)
- [ ] 全局角色切换功能
- [ ] 教师工作台(语音输入、AI 辅助、学生历史)
- [ ] 学生工作台(多格式提交、长期记忆库)

---

**文档版本**: v1.0
**最后更新**: 2026-02-23
**下一步**: 使用 BMAD UX Designer 创建设计规范
