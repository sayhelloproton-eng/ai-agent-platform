# CAP-001 什么是 ChatGPT：产品、模型与 Agent 入口

## 1. 本文回答什么

本文建立 `ChatGPT`、模型、Custom GPT、Codex、API 与 Agent 系统之间的基础边界，避免把产品入口、模型能力和工程系统混成同一个概念。

本文不维护当前模型完整名单、套餐额度或界面菜单。易变产品信息必须回到 OpenAI 官方文档和用户当前账号验证。

## 2. ChatGPT 是什么

ChatGPT 是 OpenAI 提供的通用 AI 产品与交互入口。用户可以通过对话提交问题、文件、资料和任务，并使用当前账号允许的搜索、数据分析、图片、语音、应用连接或其他工具。

从工程视角看，ChatGPT 主要承担：

- 人机交互入口；
- 目标理解与上下文组织；
- 推理、规划和内容生成；
- 调用当前会话可用的工具；
- 交付回答、分析、草稿或可审阅结果。

ChatGPT 不是单个固定模型。产品可以在不同任务和入口中使用不同模型、推理模式和工具。模型是一次运行中的推理组件，ChatGPT 是承载交互、上下文、权限和工具的产品环境。

## 3. 产品、模型与 Agent 的区别

### 3.1 模型

模型负责根据输入进行推理和生成。它本身不自动拥有：

- 项目长期状态；
- 仓库读写权限；
- 外部系统凭据；
- 可恢复任务生命周期；
- 审批记录；
- 副作用账本；
- 工程证据。

### 3.2 产品入口

ChatGPT、Custom GPT、ChatGPT Work 和 Codex 都是产品或工作入口。它们向模型提供不同的上下文、工具、权限和交付方式。

入口决定“用户如何工作”，但不自动构成完整 Agent 平台。

### 3.3 Agent 系统

一个能够持续完成真实任务的 Agent 系统通常还需要：

```text
目标与 Task
+ 上下文
+ 模型推理
+ Tool / Capability
+ 权限与 Policy
+ 执行环境
+ 状态
+ Approval
+ Evidence
+ Recovery
```

因此：

> 模型提供智能，产品提供入口，Agent 系统负责把智能接入受控任务与执行闭环。

## 4. Chat、Work、Custom GPT 与 Codex

### Chat

适合讨论、问答、搜索、分析和短内容。它可以使用文件和工具，但重要工程事实不应只保存在某个聊天线程中。

### ChatGPT Work

适合目标明确、结果可审阅、可能需要文件或工具的较大任务。具体能力随客户端、账号、工作区和产品版本变化，不能把 Work 简化为“更强的聊天”，也不能默认它一定能修改某台本机。

### Custom GPT

Custom GPT 是为特定用途配置的 ChatGPT 版本，可以组合 Instructions、Knowledge 和选定能力。它适合作为专业角色入口，但不承担可靠的项目状态数据库。详细边界见 [CAP-004 Custom GPT 产品能力与边界](./CAP-004-CustomGPT产品能力与边界.md)。

### Codex

Codex 面向代码、仓库、终端、测试和软件工程流程。它更接近真实执行器，但仍必须受 Git、测试、权限、Scope 和人工 Review 约束。

## 5. ChatGPT 与 API 的区别

ChatGPT 是面向最终用户的产品。OpenAI API 是开发者构建自有应用和 Agent 系统的接口。

两者不能互相替代：

- ChatGPT 提供现成的 UI、账号、对话、文件和产品工具；
- API 允许开发者定义自己的状态、权限、数据、工具、界面和运行时；
- Custom GPT 在 ChatGPT 内运行；
- 需要嵌入自有网站、产品或业务系统时，应使用 API 或受控后端，而不是把 GPT 页面当成产品 Runtime。

## 6. 在 ai-agent-platform 中的定位

本项目采用以下角色分工：

```text
当前 Chat
  → 目标、架构、正文、任务拆解和复审

Custom GPT
  → 专业角色入口与受控 Actions

Codex / Work
  → 真实仓库、终端、测试和 Git 执行

Gateway / Runtime
  → 认证、授权、Capability 与调用边界

Git / Registry
  → 正式事实、资产、状态和证据
```

当前已验证的真实链路是：

```text
Custom GPT
→ Microsoft Dev Tunnels
→ Action Gateway
→ Local Runtime
→ runtime.status
```

这证明了一个受控 Action 可以触达本机 Runtime，但不代表完整 Task Control、多 Agent 或生产平台已经完成。

## 7. 稳定结论与易变事实

### 稳定结论

- ChatGPT 不是一个固定模型；
- 模型不等于 Agent 系统；
- 产品入口不等于任务状态数据库；
- 真实执行结果需要代码、测试、Diff、Commit 或其他证据；
- 高风险能力必须受权限和人工控制。

### 易变事实

- 当前模型名称；
- 菜单位置；
- 套餐与额度；
- 某项工具是否对某计划开放；
- Web、Desktop、Mobile 和 Work 的具体差异。

这些内容必须注明核验日期，不能成为长期架构不变量。

## 8. 关联文档

- [CAP-002 ChatGPT 产品形态与能力边界](./CAP-002-ChatGPT产品形态与能力边界.md)
- [CAP-004 Custom GPT 产品能力与边界](./CAP-004-CustomGPT产品能力与边界.md)
- [CTX-001 项目总览](../00_项目入口/CTX-001-项目总览.md)
- [CTX-007 当前实现与目标架构](../00_项目入口/CTX-007-当前实现与目标架构.md)
- [PRD-001 平台愿景](../00_项目入口/PRD-001-平台愿景.md)

## 9. 产品事实核验基线

核验日期：2026-07-31。

- [OpenAI：Projects in ChatGPT](https://help.openai.com/en/articles/10169521-chatgpt-projects)
- [OpenAI：GPTs in ChatGPT](https://help.openai.com/en/articles/8554407-gpts-in-chatgpt)
- [OpenAI：Creating and editing GPTs](https://help.openai.com/en/articles/8554397-creating-a-gpt)

官方产品能力可能变化；本文保留稳定边界，具体可用性以最新官方文档和当前账号为准。
