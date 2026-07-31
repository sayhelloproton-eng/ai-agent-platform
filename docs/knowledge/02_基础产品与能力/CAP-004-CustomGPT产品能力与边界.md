# CAP-004 Custom GPT 产品能力与边界

## 1. Custom GPT 是什么

Custom GPT 是在 ChatGPT 内为特定目的配置的 ChatGPT 版本。它可以组合：

- Name 与 Description；
- Conversation Starters；
- Instructions；
- Knowledge；
- Capabilities；
- Apps 或 Actions；
- 分享和发布设置。

它适合作为可复用的专业角色入口，例如架构、知识治理、代码 Review 或产品分析。

## 2. Custom GPT 不是什么

Custom GPT 不是：

- 一个独立部署的应用服务器；
- 可嵌入任意网站的 API Agent；
- 可靠任务状态数据库；
- 自动共享所有用户 Memory 的角色；
- 能查看 Builder 用户会话的管理后台；
- 可以无限制调用本机和外部系统的执行器。

需要构建自有网站或业务应用时，应使用 OpenAI API 和自己的后端、状态与权限系统。

## 3. 配置构成

### Instructions

定义行为、目标、语气、步骤和边界。Instructions 会应用于 GPT 的每次会话。

### Conversation Starters

帮助用户理解可提问内容，不是执行 Contract。

### Knowledge

上传文件供 GPT 在回答时参考。Knowledge 适合文档、手册和稳定参考资料；规则和行为应主要写在 Instructions 中。

### Capabilities

可选择的内置工具，例如搜索、图片或数据分析。具体可用项受产品版本、计划和 Workspace 影响。

### Apps 与 Actions

Apps 使用用户连接的外部服务；Actions 调用 Builder 配置的外部 API。

当前官方规则：

> 一个 GPT 可以使用 Apps 或 Actions，但不能同时使用两者。

## 4. Memory 与会话边界

Custom GPT 的关键边界是：

- 不使用用户 saved memory；
- 不使用用户 Custom Instructions；
- 不继承过去 GPT 会话；
- 每个新 GPT 会话从新的上下文开始。

因此，Custom GPT Knowledge 不等于 saved memory，Instructions 也不等于项目长期状态。

需要跨会话共享状态时，应使用：

- 外部 Task State；
-数据库；
-Platform Registry；
-知识服务；
-Git；
-明确的用户输入。

## 5. Builder 与用户会话隐私

GPT Builder 不能查看用户与其 GPT 的单独会话。

但当 GPT 使用 Apps 或外部 API 时，完成请求所需的部分输入可能会发送给第三方服务。用户应只使用可信服务，Builder 和平台设计者应：

- 最小化发送数据；
-提供 Privacy Policy；
-避免发送 Secret；
-明确认证和授权；
-保留用户确认；
-在后端记录必要证据。

## 6. 分享与发布

GPT 可以根据计划和 Workspace 以不同方式使用：

- 仅自己；
-指定人员；
-Workspace；
-链接；
-GPT Store。

分享范围不等于数据访问范围。发布前还需要检查：

- Knowledge 是否含私人资料；
- Instructions 是否暴露内部信息；
- Actions 域名和 Privacy Policy；
-凭据是否只保存在认证配置；
-用户是否会触发有副作用的操作；
-输出是否泄露内部错误或状态。

## 7. Custom GPT 与 Project

| Custom GPT | Project |
|---|---|
| 可复用专业角色 | 持续工作的上下文空间 |
| 静态配置与参考知识 | 持续积累 chats、files 和 sources |
| 可跨主题使用 | 围绕一个长期主题 |
| 不继承过去 GPT 会话 | Project 内聊天可按 memory 模式互相引用 |
| 适合规模化角色能力 | 适合组织持续工作 |

两者可以组合使用，但职责不同。Custom GPT 不应替代 Project，Project 也不应替代专业角色配置。

## 8. 在 ai-agent-platform 中的定位

本项目把 Custom GPT 定位为：

```text
专业角色入口
+ 稳定 Instructions
+ 派生 Knowledge Pack
+ 受控 Actions
```

外部平台负责：

```text
Task
+ Identity
+ Policy
+ Approval
+ Evidence
+ Recovery
```

当前仓库已经验证 Custom GPT 通过 Action 调用 `runtime.status`。尚未实现：

- Git 中的完整 Agent Profile；
- Knowledge Pack 发布目录；
-多专业 GPT 自动协作；
-持久 Task State；
-统一 Release 和评估。

## 9. 设计原则

1. Instructions 写行为，Knowledge 写参考；
2. 不把 Memory 当成项目数据库；
3. 不依赖过去会话；
4. Apps 与 Actions 二选一；
5. 外部调用必须有 OpenAPI、认证和后端 Policy；
6. 高风险动作保留用户确认；
7. Builder 配置未来应由 Git 资产派生；
8. GPT 的完成报告不能代替真实执行证据。

## 10. 关联文档

- [CAP-001 什么是 ChatGPT](./CAP-001-什么是ChatGPT-产品模型与Agent入口.md)
- [CAP-005 Custom GPT 配置与 Actions 发布](./CAP-005-CustomGPT-Instructions-Knowledge-Actions与发布配置.md)
- [CTX-005 当前能力地图](../00_项目入口/CTX-005-当前能力地图.md)
- [CTX-007 当前实现与目标架构](../00_项目入口/CTX-007-当前实现与目标架构.md)
- [DEC-001 架构决策演进摘要](../00_项目入口/DEC-001-架构决策演进摘要.md)

## 11. 产品事实核验基线

核验日期：2026-07-31。

- [OpenAI：GPTs in ChatGPT](https://help.openai.com/en/articles/8554407-gpts-in-chatgpt)
- [OpenAI：Creating and editing GPTs](https://help.openai.com/en/articles/8554397-creating-a-gpt)

GPT 配置项、分享方式和能力可用性可能变化，发布前必须重新核验。
