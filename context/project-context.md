# Project Context

## 项目是什么

`ai-agent-platform` 是面向 AI Agent 工程学习、真实平台建设、知识治理、多 Agent 协作和求职 Portfolio 的长期工程项目。

它不是单个聊天机器人，也不是提示词集合，而是把 Chat、Custom GPT、Codex、Gateway、Runtime、Skills、知识、代码、测试和基础设施组织成可持续演进的工程系统。

`ai-agent-platform` 是当前主产品、底层平台和仓库主体。AI 视频工作流是首个计划验证的上层产品；可信任务控制台、专业 Agent 资产工作台、项目知识治理工作台和第二垂直工作流仅处于机会方向，不是正式产品承诺。

平台建立在 ChatGPT、Projects、Custom GPT、Plugins / Apps、Actions、Work、Codex 和 OpenAI API 等生态能力之上，但不把 Host 产品功能冒充为平台实现。平台核心是可信 Context、Planner–Executor Handoff、Task Control、身份与 Policy、Approval、Evidence、Recovery、Executor / Provider Adapter、Agent 资产治理和知识发布。

项目与产品不同：项目承载建设历史、学习、实验、治理和 Portfolio；产品承诺为明确用户持续交付价值与体验。潜在方向只有通过问题证据、产品形态、最小纵向切片和停止条件，才升级为正式产品概念。

## 为什么创建

项目发起者具有前端工程背景，正在通过真实平台建设补齐 Agent 工程、后端、运行时、工具集成和全栈交付能力。项目必须通过真实代码、架构、实验、Demo 和工程证据形成职业竞争力，而不能停留在工具使用和概念学习。

长期实践中的主要问题包括：

- 项目知识散落在长聊天和临时输出中；
- 新 Agent 难以恢复真实上下文；
- 产品能力、平台设计和当前实现容易混淆；
- 强模型 Token 被机械执行消耗；
- 文档、代码、决策和 Feishu 缺少稳定关系；
- 多角色和多任务缺少可靠状态与治理。

## 长期目标

- 建立可运行、可解释、可验证的 Agent 工程平台；
- 让 Task、Agent、Capability、Workflow、Knowledge 与 Result 具有稳定边界；
- 让模型、工具、设备和 Provider 可替换；
- 让总控 Planner 负责目标、规划、语义资产和复审；
- 让 Executor 负责确定性落盘与真实执行；
- 让用户负责重要变化审批和最终确认；
- 让知识、代码、测试、决策和证据可追踪；
- 让上层产品可以依托平台孵化；
- 形成可用于简历和面试的真实 Portfolio。

## 建设主线

1. Knowledge Foundation；
2. AI Coding Workflow；
3. Task Control and Trusted Execution；
4. 上层真实产品工作流；
5. Portfolio Release。

各阶段的当前状态、执行顺序和完成门槛见：

- [`current-status.md`](current-status.md)
- [`roadmap.md`](roadmap.md)

## 非目标

- 当前不建设通用 Agent SaaS；
- 不采用 LangGraph 作为当前核心；
- 不预建根级 `products/`；
- 不提前创建没有真实资产的包和目录；
- 不把 Feishu 作为第二真源；
- 不把未验证设计写成实现。
