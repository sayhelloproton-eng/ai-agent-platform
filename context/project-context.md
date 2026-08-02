# Project Context

## 项目是什么

`ai-agent-platform` 是面向 AI Agent 工程学习、真实平台建设、知识治理、多 Agent 协作和求职 Portfolio 的长期工程项目。

它不是单个聊天机器人，也不是提示词集合，而是把 Chat、Custom GPT、Codex、Gateway、Runtime、Skills、知识、代码、测试和基础设施组织成可持续演进的工程系统。

`ai-agent-platform` 是底层平台和当前仓库主体。AI 视频工作流以及未来其他产品，都是依托平台构建的上层实践，不改变当前仓库的平台主体定位。

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
