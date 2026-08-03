# Architecture Context

## Canonical 架构入口

平台架构由两篇正式文档共同定义：

- `ARC-001`：System Context、DDD Bounded Context、模块责任、运行闭环、数据/状态/证据流、Adapter / Deployment、实现映射与正式占位；
- `ARC-016`：当前证据、MVP-0～MVP-7、能力依赖、并行建设轨道、多任务不变量、阶段门和风险。

`04_平台架构` 是前序理论与后续专题之间的结构中心：`03` 的平台化、DDD、Skills 与可信原则在此落位；`05～09` 围绕 ARC 的 Context、Agent、Workflow、实验和 Portfolio 挂点继续深化。

## 当前真实实现

```text
Custom GPT
→ Microsoft Dev Tunnels
→ Action Gateway
→ Local Runtime
→ gateway.ping / runtime.status
```

已实现或已验证：Contracts、Auth、Policy、Gateway / Runtime 窄链路、开发期公网入口、人工 Planner–Executor Handoff、Git Knowledge / Context / Registry、测试、Commit 和真实调用证据。

## 目标运行闭环

```text
用户目标
→ ChatGPT / Custom GPT 总控
→ Browser Extension / Action
→ Gateway / Bridge
→ Mac Local Control / Runtime
→ Task Control
→ Agent Governance
→ Context Builder
→ Execution Lane / Executor Adapter
→ Result / Evidence / Side Effects
→ 状态与证据持久化
→ Browser / Action 回传
→ 总控与用户接受、继续、暂停、恢复或终止
```

## DDD Bounded Context

- Task Control；
- Agent Governance；
- Context & Knowledge；
- Execution Orchestration；
- Evidence & Safety；
- Publishing & Registry；
- Product Domain（上层产品占位）；
- Engineering Insight。

这些边界表示状态和规则所有权，近期以模块化单体实现，不表示已经拆分微服务。

## 分阶段路线

```text
MVP-0 窄链路与人工闭环
→ MVP-1 Mac Local Control / CLI 可观测
→ MVP-2 Browser 单任务自调用
→ MVP-3 持久 Task / Version / Role / Context
→ MVP-4 Approval / Evidence / Side-effect / Recovery
→ MVP-5 多角色 Handoff
→ MVP-6 多任务依赖、Worktree 隔离和并行 Lane
→ MVP-7 多执行器与 Capability Routing
```

## 架构不变量

- Task 是任务事实来源；
- 边界由状态和规则所有权决定，不按 Host 或 Agent 名称切分；
- 总控拥有目标与语义决策，Executor 只执行授权 Contract；
- Provider、模型、设备和 Host 差异限制在 Adapter；
- 完成由 Acceptance 与 Evidence 共同判定；
- 写操作默认拒绝，必须满足 Scope、Version、Approval、Idempotency 和隔离；
- 默认串行，并行是满足依赖、资源、Scope 和合并条件后的显式能力；
- Git 是代码和正式知识真源，Feishu 是可重建投影；
- 当前、目标、阶段和历史候选必须分开。

## 上下文与知识系统领域

`05_上下文与知识系统` 将 ARC-001 的 Context & Knowledge 边界细化为：

- Knowledge Asset Governance；
- Context Compilation & Policy；
- Context Runtime & Continuity；
- Knowledge Distribution & Projection；
- Memory, Feedback & Learning。

前三者构成可信知识、最小充分 Context Package 与可恢复运行的核心；后两者负责 Feishu、Custom GPT Knowledge、Knowledge Pack、RAG 等派生分发，以及 Experience → Feedback → Insight → Review → Knowledge 的受控自迭代。User、Task、Agent、Execution 与 Evidence 仍由外部协作领域拥有事实，本系统只通过 Contract 获取视图。

## 当前差距

Browser Loop、Local CLI、持久 Task Store、Role Assignment、Context Builder、Approval / Evidence Store、Safe Continuation、Lane Registry、Codex Adapter、多任务并行和多执行器路由尚未形成完整代码闭环。

Cloudflare Edge 是历史 superseded 路线；Microsoft Dev Tunnels 仅用于开发期 MVP。
