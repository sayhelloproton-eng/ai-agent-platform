# Architecture Context

## 当前架构思想

```text
User
  ↓
ChatGPT Interface
  ↓
Agent Brain
  ↓
Agent Runtime
  ↓
Tool Layer
  ↓
Knowledge Layer
  ↓
Infrastructure
```

## 分层含义

### User

提出目标、约束和验收要求，并对架构方向、高风险操作与正式决策做最终确认。

### ChatGPT Interface

承担交互、需求澄清、任务组织和结果沟通，不把聊天内容自动视为正式项目事实。

### Agent Brain

理解目标、选择能力、组织上下文与制定执行策略。它应依赖稳定 Contract 和 Port，不绑定单一模型或 Provider。

### Agent Runtime

负责执行生命周期、状态、重试、权限和可观测性。该层是长期方向，当前尚未建设。

### Tool Layer

封装 Agent 可调用的工程能力，并通过明确输入、输出和错误边界连接外部系统。

### Knowledge Layer

提供正式知识、上下文检索、关系、状态和证据。Git 是其正式事实来源；Feishu 只能是投影。

### Infrastructure

承载模型、存储、代码平台、设备、网络和外部 Provider。上层不应依赖某一个具体实现。

## 架构原则

- 业务与模型解耦；
- 业务与设备解耦；
- Domain 与 Provider 解耦；
- 上层依赖 Port、Contract 和稳定接口；
- 模型、Tool、Provider 和设备可替换；
- 优先简单、清晰、可验证的实现；
- 计划能力与已实现能力必须明确区分。

## 渐进式建设

这张分层图描述长期架构方向，不是当前实现清单。

当前只建设 **Knowledge Layer / Context Foundation**。后续模块必须按 Roadmap 逐步进入，并且只有在存在真实调用方、测试和验收证据时，才能被标记为已实现。

Task 001 禁止提前实现 Gateway、MCP、Action、Agent Runtime、业务代码或其他未来模块。
