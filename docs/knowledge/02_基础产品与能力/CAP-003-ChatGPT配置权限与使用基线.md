# CAP-003 ChatGPT 配置、权限与使用基线

## 1. 配置为什么是工程问题

配置决定 ChatGPT 可以使用哪些上下文、数据和工具，也决定用户数据如何被引用、外部服务如何连接以及哪些操作需要确认。

配置不能只按菜单记忆，而应按作用域和风险分类。

## 2. 四类配置

### 2.1 稳定个人偏好

例如：

- 默认语言；
- 表达风格；
- 长期沟通方式；
- 无敏感性的稳定背景。

适合放在 Personalization、Custom Instructions 或 Memory，但不能覆盖项目明确规则。

### 2.2 项目规则

例如：

- 项目目标；
- 术语；
- 输出结构；
- 安全边界；
- Review 要求；
- 禁止修改范围。

ChatGPT Project Instructions 可以保存面向会话的简化规则。需要版本控制和工程审计的规则进入 Git，例如 `AGENTS.md`、Context 和治理文档。

### 2.3 动态状态

例如：

- 当前分支；
- 当前 Commit；
- 当前任务；
- 当前错误；
- 下一步；
- 临时配额。

这些内容变化快，不应长期写入 Custom Instructions 或 Memory。本项目使用 `context/current-status.md`、Registry 和 Git 保存。

### 2.4 Secret 与 Private Context

Secret 包括：

- API Key；
- OAuth Client Secret；
-Cookie；
-Token；
-SSH 私钥；
-生产凭据。

Secret 不进入：

- Git；
- Prompt；
-公开知识；
-执行报告；
-截图；
-OpenAPI 文本。

Private Context 只有任务确实需要时才读取，不自动升级为公共资产。

## 3. 账号、计划与 Workspace

功能可见性可能由以下因素共同决定：

- 账号计划；
-个人空间或组织 Workspace；
-管理员策略；
-地区；
-客户端；
-产品灰度；
-系统权限；
-数据控制。

因此不能依据他人的截图或旧教程判断自己是否拥有某项功能。

建议维护“账号观察记录”，但它必须标明：

```text
观察日期
客户端
账号 / Workspace
计划
可见功能
实际验证结果
限制
```

账号观察不是产品普遍事实。

## 4. Personalization 与 Custom Instructions

### Personalization

影响 ChatGPT 对用户的长期适配，例如风格、背景和偏好。

### Custom Instructions

适合显式告诉 ChatGPT：

- 希望它了解的稳定背景；
- 希望它采用的回复方式。

不适合：

- 单次任务；
-某个仓库的完整工程规则；
-Secret；
-经常变化的进度；
-需要严格版本审计的 Contract。

项目规则与个人偏好冲突时，以当前任务和项目明确约束为准。

## 5. Memory

Memory 可以引用聊天、文件或连接应用中的长期上下文，并受用户设置控制。

工程基线：

- Memory 是个性化机制，不是事实数据库；
- Saved memory 和聊天历史是不同来源；
- 删除聊天不一定同时删除已经形成的记忆；
- Temporary Chat 不使用或创建记忆；
- 敏感信息一旦提供，可能进入个性化上下文；
- 精确删除需要处理所有相关来源。

本项目只允许 Memory 保存长期且低风险的个人偏好，不保存 Commit、Secret 和任务状态。

## 6. Project Instructions

Project Instructions：

- 只在对应 Project 中生效；
- 可以覆盖全局 Custom Instructions；
- 适合项目目标、术语、沟通和输出约定；
- 不替代 Git 中的 `AGENTS.md`；
- 不承担代码级目录规则；
- 不适合保存高频状态。

推荐：

```text
Project Instructions：面向对话的稳定简版
AGENTS.md：面向执行器的正式工程规则
Context：当前状态
Registry：资产与关系
```

## 7. Data Controls 与隐私

使用 ChatGPT 时需要确认：

- 对话是否可能用于改进模型；
- Workspace 是否有不同数据策略；
-连接应用会发送哪些内容；
-文件和项目的保留与删除规则；
-分享聊天、Project 或 GPT 时哪些内容可见；
-第三方 API 如何处理数据。

本项目的默认原则：

1. 不把 Secret 提供给模型；
2. 不把私人原文升级为公共知识；
3. 对外部 App / Action 使用最小必要数据；
4. 分享前检查文件、聊天和项目成员；
5. 高风险写操作保留人工确认。

## 8. Apps、Actions 与系统权限

### Apps

Apps 使用用户授权连接外部服务。是否可用和能否写入可能受计划、Workspace 和管理员策略影响。

### Actions

Actions 是 Custom GPT 调用开发者 API 的方式，需要 OpenAPI 与认证。它们不能代替后端权限和 Policy。

### 本机系统权限

Desktop、Work 或其他本机入口可能请求：

- 文件访问；
-辅助功能；
-屏幕录制；
-浏览器控制；
-麦克风；
-相机。

授权前必须确认：

- 具体用途；
-授权范围；
-是否可撤销；
-是否会读取已登录内容；
-异常时是否停止；
-是否有自动重试。

## 9. 配置变更方法

任何高影响配置变更使用：

```text
记录当前状态
→ 明确目标
→ 最小修改
→ 验证实际行为
→ 记录差异
→ 必要时回滚
```

不要一次修改多个权限或记忆选项，否则难以判断哪项配置产生了结果。

## 10. 本项目推荐基线

- 全局个人偏好保持短小；
- 项目长期规则进入 Git；
- Project Instructions 只保留会话层简版；
- Memory 不保存精确工程状态；
- Secret 永不进入知识包；
- Apps / Actions 按最小权限启用；
- 浏览器和 Computer Use 异常时停止，不自动恢复；
- 动态产品事实记录核验日期；
- 重要任务结果必须回到真实文件、测试和 Commit。

## 11. 关联文档

- [CAP-002 ChatGPT 产品形态与能力边界](./CAP-002-ChatGPT产品形态与能力边界.md)
- [正式知识导航](../README.md)
- [`AGENTS.md`](../../../AGENTS.md)
- [`context/knowledge-strategy.md`](../../../context/knowledge-strategy.md)

## 12. 产品事实核验基线

核验日期：2026-07-31。

- [OpenAI：Memory FAQ](https://help.openai.com/en/articles/8590148-memory-in-chatgpt)
- [OpenAI：Projects in ChatGPT](https://help.openai.com/en/articles/10169521-chatgpt-projects)

具体设置名称和位置可能变化，执行配置任务时必须以当前 UI 和官方说明为准。
