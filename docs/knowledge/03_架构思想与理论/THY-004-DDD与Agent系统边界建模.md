# THY-004 DDD 与 Agent 系统边界建模

## 1. DDD 在 Agent 系统中的价值

Agent 系统的问题往往不是模型不够强，而是概念边界混乱：

- Task 和 Session 混在一起；
- Agent 角色和执行进程混在一起；
- Tool 和 Capability 混在一起；
- Knowledge 和 Memory 混在一起；
-平台和产品领域混在一起。

DDD 用统一语言和边界把这些概念拆开。

## 2. Bounded Context

一个 Bounded Context 内部拥有一致的模型和规则。

`ai-agent-platform` 可以按职责区分：

- Task Control；
-Agent Governance；
-Execution；
-Knowledge Asset；
-Publishing；
-Product Domain；
-Infrastructure Adapter。

不同 Context 通过 Contract 交流，不共享内部对象。

## 3. 核心领域对象

### Task

稳定业务身份，包含目标、约束、版本和验收。

### Session

某次模型或用户交互上下文，可以中断和替换。

### Executor

实际执行主体，例如 Codex、Work、Script 或本地 Runtime。

### Agent Profile

角色目标、行为、权限和输出 Contract。

### Capability

对外暴露的可调用能力及输入输出契约。

### Evidence

证明某个状态或结果成立的材料。

### Knowledge Asset

具有稳定 ID、路径、状态、关系和发布状态的正式资产。

这些对象不能互相代替。

## 4. Entity 与 Value Object

### Entity

有稳定身份并跨时间变化：

- Task；
-Agent Profile；
-Knowledge Asset；
-Release；
-Approval Request。

### Value Object

由值定义，可整体替换：

- Task Version；
-Scope；
-Capability Name；
-Artifact Hash；
-Policy Decision；
-Error Code。

是否需要稳定 ID，是区分 Entity 和 Value Object 的关键。

## 5. Aggregate 与一致性边界

Aggregate 只保护必须同步一致的状态。

例如 Task Aggregate 可以保护：

- 当前版本；
-当前状态；
-允许命令；
-关联 Approval；
-完成条件。

不应把日志、全部 Artifact、Agent Profile 和外部 Provider 都塞进 Task Aggregate，否则每次变化都会扩大锁和事务。

## 6. Domain、Application 与 Infrastructure

### Domain

定义 Task、Policy、Evidence 和状态规则。

### Application

编排用例，例如：

```text
Start Task
Approve Command
Assign Executor
Record Evidence
Complete Task
```

### Infrastructure

实现：

- Git；
-数据库；
-Codex；
-Feishu；
-MCP；
-Tunnel；
-日志；
-模型 Provider。

Domain 不依赖具体 Provider。

## 7. Port / Adapter

Port 定义平台需要什么能力，Adapter 连接具体实现。

```text
Execution Port
  ├─ Codex Adapter
  ├─ Work Adapter
  └─ Script Adapter

Knowledge Port
  ├─ Git Adapter
  ├─ RAG Adapter
  └─ Feishu Projection Adapter
```

Provider 变化应限制在 Adapter，不穿透领域模型。

## 8. Agent 角色不等于领域边界

“产品 Agent”“架构 Agent”“测试 Agent”只是协作角色。

只有当它们拥有独立的：

-语言；
-规则；
-数据；
-权限；
-生命周期；
-一致性边界；

才可能对应独立 Bounded Context。

不能因为使用多个 Prompt 就宣称已经完成多 Agent 领域设计。

## 9. 何时需要多 Agent

多 Agent 只有在以下价值明确时成立：

-并行探索；
-专业上下文隔离；
-权限隔离；
-独立验证；
-不同成本或模型策略；
-失败隔离。

如果一个 Agent 加 Skill 能完成，优先保持简单。

## 10. 平台与产品边界

平台负责跨产品机制：

- Task；
-Policy；
-Execution；
-Evidence；
-Knowledge；
-Registry。

产品负责领域模型：

- 用户旅程；
- Story、Character、Scene；
-业务规则；
-质量标准；
-产品 UI。

产品内验证成功的共性，才抽取到平台。

## 11. 当前实现映射

当前代码已经形成最小 Port / Adapter 证据：

- Gateway 负责外部 Adapter；
- Runtime 负责 Capability 调度；
- Contracts 定义 Task / Result；
- Auth 与 Policy 是共享包；
- Dev Tunnel 是开发期基础设施。

持久 Task、Approval、Evidence 和 Recovery 仍是目标模型。

## 12. 关联文档

- [THY-001 从 AI 工具到 Agent 工程平台](./THY-001-从AI工具到Agent工程平台.md)
- [THY-005 可信 Agent 系统基本原则](./THY-005-可信Agent系统基本原则.md)
- [PRD-007 平台与上层产品边界](../01_产品体系/PRD-007-平台与上层产品边界.md)
- [ARC-001 平台目标架构](../04_平台架构/ARC-001-ai-agent-platform总体架构.md)

## 13. 结论

DDD 的目标不是增加名词，而是让状态、权限、执行、知识和产品领域各自拥有清晰边界。边界清楚后，多 Agent 和多 Provider 才不会把系统变成 Prompt 网络。
