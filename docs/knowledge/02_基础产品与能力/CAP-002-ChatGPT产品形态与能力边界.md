# CAP-002 ChatGPT 产品形态与能力边界

## 1. 为什么需要产品地图

ChatGPT 中的 Chat、Projects、Memory、Files、Custom GPT、Apps、Work、Voice、图片和浏览器能力解决不同问题。把它们统称为“知识库”或“Agent”会导致错误设计。

本文提供稳定的职责地图，不维护逐屏菜单教程。

## 2. 主要产品形态

| 形态 | 主要用途 | 不应承担 |
|---|---|---|
| Chat | 临时讨论、分析、搜索和内容生成 | 项目唯一真源、可靠任务数据库 |
| Project | 聚合相关 chats、files、sources 和 project instructions | Git 仓库、版本化知识库、自动隔离的安全边界 |
| Memory | 个性化和跨对话背景 | 精确项目状态、Secret、工程日志 |
| Files / Sources | 给当前聊天或 Project 提供参考材料 | 版本控制、完整资产关系 |
| Custom GPT | 可复用的专业角色入口 | 跨会话任务状态、共享数据库 |
| Apps | 使用用户连接的外部服务 | 无限制外部访问 |
| Actions | 由 GPT 调用开发者定义的 API | 绕过后端认证、Policy 和用户确认 |
| Work | 面向较大且可审阅的任务 | 自动获得所有本机权限 |
| Codex | 软件工程执行和仓库工作 | 项目事实真源、业务最终决策 |

## 3. Chat

Chat 适合：

- 快速问答；
- 讨论和澄清；
- 小范围分析；
- 搜索；
- 草稿；
- 处理当前上传内容。

风险是重要结论容易只存在于长会话中。项目需要把稳定结论转入 Git、ADR、Registry、代码或测试。

## 4. Projects

OpenAI 当前把 Project 描述为用于长期工作的 workspace，可以把 chats、reference files、sources 和 project instructions 放在一起。Project instructions 只在对应 Project 中生效，并覆盖全局 Custom Instructions。

### 4.1 Project 的价值

- 聚合同一主题的聊天和资料；
- 让项目内新聊天优先使用项目上下文；
- 支持长期、重复和多线程工作；
- 降低每次重新解释背景的成本。

### 4.2 Project Memory 的两种模式

创建 Project 时，需要区分：

#### Project-only memory

- 不引用此前 saved memories；
- 可以引用同一 Project 内其他聊天；
- 不能引用 Project 外聊天；
- 共享 Project 会自动使用 project-only memory。

#### Default memory

- 可以引用 saved memories；
- 可以使用同一 Project 内聊天；
- Project 外聊天是否可被引用取决于计划和 Workspace；
- 对非 Enterprise 计划，默认记忆不应被描述为完全隔离。

所以：

> Project 只有在 project-only memory 或相应 Workspace 隔离规则下，才能明确声明项目内上下文边界。

### 4.3 Project 不是 Git

Project 不提供 Git 的：

- Commit；
- Diff；
- Branch；
- Review；
- 文件路径不变量；
- Schema 校验；
- 资产关系；
- 可重复发布。

本项目可以使用 ChatGPT Project 组织会话，但正式事实仍进入 Git。

## 5. Memory

Memory 用于个性化。启用后，ChatGPT 可以从聊天、文件和连接应用中形成或使用对用户有帮助的上下文。用户可以查看、修正、关闭或删除相关记忆，也可以使用 Temporary Chat 避免使用和创建记忆。

适合保存：

- 长期沟通偏好；
- 稳定职业背景；
- 持续项目名称；
- 不敏感的长期约束。

不适合保存：

- 当前 Commit；
- 精确任务状态；
- API Key；
- 生产配置；
- 审批日志；
- 快速过期的产品事实。

Memory、Custom Instructions、Project Instructions 和 Custom GPT Instructions 是不同机制。

## 6. Files 与 Sources

文件可以为 Chat 或 Project 提供参考内容。它们适合：

- 报告；
- 数据；
-说明文档；
-图片；
-表格；
-临时上下文。

限制：

- 文件不自动成为经过 Review 的正式知识；
- 相同文件的更新和版本关系需要外部治理；
- 文件解析能力受类型、模型和工具影响；
- 大量文件不等于高质量检索；
- 敏感文件仍需遵守权限和数据边界。

## 7. Apps、Browser 与 Computer Use

### Apps

Apps 连接用户授权的外部服务。可用性取决于计划、Workspace、管理员策略和具体 App。调用外部服务时，需要关注数据发送范围和第三方处理方式。

### Browser / Web Search

搜索用于获取最新网页信息。搜索结果不是项目真源，正式结论需要记录来源、核验日期和适用边界。

### Computer Use

Computer Use 可以通过界面完成操作，但浏览器和本机操作具有副作用风险。必须设置：

- 允许范围；
- 不可自动执行的动作；
- 授权点；
- 停止条件；
- 失败后是否重试；
- 是否会影响已登录会话和页面状态。

## 8. Web、Desktop 与 Mobile

这些入口共享同一 ChatGPT 账号体系，但能力不保证完全一致：

- Desktop 更可能提供本地文件、应用或工作入口；
- Web 通常是产品配置和 GPT Builder 的主要入口；
- Mobile 适合随时对话、语音和轻量任务；
- 某项功能可能分阶段发布，或受系统版本、地区、计划和 Workspace 影响。

因此，正式知识只描述稳定边界；具体界面作为“当前产品快照”单独核验。

## 9. 本项目的选择

| 需求 | 主要载体 |
|---|---|
| 当前讨论与规划 | ChatGPT Chat |
| 项目会话组织 | ChatGPT Project |
| 专业角色入口 | Custom GPT |
| 真实仓库执行 | Codex / Work |
| 项目正式事实 | Git |
| 跨资产状态与关系 | Platform Registry |
| 面向人的发布 | Feishu Projection |
| 未来实时共享检索 | External Knowledge Service |

## 10. 关联文档

- [CAP-001 什么是 ChatGPT](./CAP-001-什么是ChatGPT-产品模型与Agent入口.md)
- [CAP-003 ChatGPT 配置、权限与使用基线](./CAP-003-ChatGPT配置权限与使用基线.md)
- [PRD-001 平台愿景](../00_项目入口/PRD-001-平台愿景.md)
- [CTX-006 知识库阅读导航](../00_项目入口/CTX-006-知识库阅读导航.md)

## 11. 产品事实核验基线

核验日期：2026-07-31。

- [OpenAI：Projects in ChatGPT](https://help.openai.com/en/articles/10169521-chatgpt-projects)
- [OpenAI：Memory FAQ](https://help.openai.com/en/articles/8590148-memory-in-chatgpt)

Project、Memory、文件限制和工具可用性会变化，使用时应重新核验当前计划和 Workspace。
