# THY-001 从 AI 工具到 Agent 工程平台

## 1. 问题不是“还缺哪个工具”

按 ChatGPT、Codex、MCP、Agent 的顺序堆工具，容易学会菜单，却无法回答：

- 目标由谁保存；
-任务怎样分解；
-权限由谁决定；
-执行失败怎样恢复；
-结果怎样证明；
-知识如何成为正式资产；
-多个角色如何协作而不互相覆盖。

Agent 工程的核心不是工具数量，而是把智能、执行和治理组成可验证系统。

## 2. 六层工程模型

```text
Agent Interface
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

### Interface

用户、Chat、Custom GPT、Web、CLI、IDE 和移动端。

### Brain

理解、推理、规划、角色判断和 Review。

### Runtime

Task、State、Policy、Approval、Evidence、Recovery 和调度。

### Tool Layer

Actions、MCP、Skills、Scripts、API 和 Provider Adapter。

### Knowledge Layer

Context、正式文档、Registry、Memory、Knowledge Pack 和外部检索。

### Infrastructure

Git、设备、网络、云、存储、日志和第三方服务。

任何一层都不能替代其他层。

## 3. 从能力到系统

模型能写代码，不等于系统可以安全修改仓库。

需要补齐：

```text
模型能力
+ 明确任务
+ 可信上下文
+ 受限工具
+ 执行环境
+ 状态
+ 证据
+ 人工控制
```

一个可靠 Agent 平台至少同时管理：

- 认知；
-控制；
-执行；
-知识与资产；
-基础设施。

## 4. 五个协作平面

### 认知平面

负责研究、规划、专业判断和复审。

### 控制平面

负责 Goal、Task、Version、State、Approval、Policy、Evidence、Health 和 Recovery。

### 执行平面

负责 Codex、Work、脚本、Skill 和其他 Executor 的真实动作。

### 知识与资产平面

负责 Git 文档、ADR、Skill、Registry、Agent Profile 和 Knowledge Pack。

### 基础设施平面

负责设备、网络、Provider、日志、存储和发布目标。

## 5. 为什么先做窄链路

平台抽象必须有真实调用方。

当前项目先验证：

```text
Custom GPT
→ Action
→ Dev Tunnel
→ Gateway
→ Local Runtime
→ runtime.status
```

它只证明一条安全调用线，但提供了真实的认证、Policy、Contract、错误、日志和测试证据。

在此基础上再增加 Task、Approval、Evidence 和 Recovery，优于先搭建空的通用编排框架。

## 6. 平台不等于重型框架

平台可以从轻量 Contract 和状态开始。

当前不采用 LangGraph 作为核心，是因为：

- 真实业务 Workflow 尚未出现；
-控制面边界仍在验证；
-引入重型框架会增加状态和调试成本；
-现阶段 Agent + Skills + Task Contract 足以验证核心假设。

未来如果出现复杂图状态、补偿和跨服务编排，再根据证据选型。

## 7. 平台价值

平台不是把所有能力放进一个仓库，而是提供跨产品复用的工程机制：

- Task / Result；
- Identity / Policy；
- Execution Lane；
- Approval / Evidence；
- Health / Recovery；
- Knowledge / Registry；
- Provider Port。

上层产品继续拥有自己的用户、领域模型、体验和质量标准。

## 8. 复杂度升级原则

只有当下一层解决真实问题时才升级：

```text
对话
→ Tool Call
→ 单 Agent Workflow
→ Task Control
→ 多执行器
→ 多 Agent
→ 平台化
```

如果脚本能稳定完成，就不需要 Agent；如果单 Agent 能完成，就不需要多 Agent。

## 9. 当前项目位置

已实现：

- 安全 Action 链；
-Contracts、Auth、Policy；
-Gateway、Runtime、Dev Tunnel；
-六个正式 Skill，包括确定性交付与规划者—执行器交接治理；
-Platform Registry；
-Git 单一真源。

未实现：

- 持久 Task State；
-Approval、Evidence、Ledger；
-Health / Recovery；
-多执行器调度；
-Agent Profile / Knowledge Pack；
-AI 视频业务纵向切片。

## 10. 关联文档

- [ARC-001 平台总体架构](../04_平台架构/ARC-001-ai-agent-platform总体架构/README.md)
- [PRD-003 平台产品定义](../01_产品体系/PRD-003-ai-agent-platform产品定义.md)
- [THY-002 AI 开发范式演进](./THY-002-AI开发范式演进.md)
- [THY-003 Agent + Skills 开发范式](./THY-003-Agent与Skills开发范式.md)
- [THY-005 可信 Agent 系统基本原则](./THY-005-可信Agent系统基本原则.md)

## 11. 参考

- [OpenAI：A practical guide to building agents](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/)
- [`context/architecture-context.md`](../../../context/architecture-context.md)
