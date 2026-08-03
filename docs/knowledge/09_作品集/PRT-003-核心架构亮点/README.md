# PRT-003 核心架构判断与可信边界

> 核心结论：项目的架构亮点不是组件数量，而是把用户入口、可信执行、任务治理、上下文知识、Agent Skill、Evidence 和发布状态分成清晰领域，并为每项能力标记真实实现边界。

## 1. 可信执行链

```text
Custom GPT
→ Dev Tunnels
→ Action Gateway
→ Local Runtime
```

关键判断：

- 公网只暴露 Gateway；
- Runtime 只监听 Loopback；
- 外部与内部 Key 分离；
- Gateway 和 Runtime 分别执行默认拒绝 Policy；
- Capability 窄化为明确 Contract；
- 错误、大小、超时、并发和响应受限。

**证据**：`apps/*`、`packages/*`、`EXP-005`、`EXP-006`、`npm run verify`。

**边界**：当前只有 `gateway.ping` 和 `runtime.status` 等窄能力，不是完整 Agent Runtime。

## 2. 轻量 Task Control 路线

项目没有把重型图编排框架作为起点，而是先固定：

- Task / Version；
- Task Contract；
- Execution Lane；
- Planner / Executor / Reviewer / Approver；
- Checkpoint / Handoff；
- Approval / Evidence；
- Pause / Resume / Terminate；
- Release / Readback。

**证据**：`WFL-001～WFL-012`、Planner–Executor Handoff、冻结 Artifact 实践。

**边界**：结构化 Task Store、Lease、Approval Store 和自动调度仍是目标设计。

## 3. 上下文与知识不是同一个存储桶

项目区分：

- Git Canonical Knowledge；
- Project Context；
- Context Package / Instance；
- Task State；
- Memory / Feedback；
- Knowledge Pack；
- Feishu / GPT Knowledge / RAG Projection。

**证据**：`ARC-002`、`ARC-005`、`ARC-006`、`KNO-006/009/011`。

**边界**：通用 Context Builder、外部 Knowledge Service 和自动 Memory 晋升尚未实现。

## 4. Registry 驱动的知识资产平台

Platform Registry 统一：

- 稳定 ID；
- 类型、状态和 Evidence Level；
- Current / Canonical Path；
- Relations；
- Release、Projection 和 Migration；
- Visual Asset。

Git 是唯一真源；Feishu、Custom GPT Knowledge 和未来 RAG 都是派生目标。

**证据**：`platform-registry/`、Registry 校验、Document Bundle、迁移矩阵。

**边界**：自动 Impact Analyzer 和多渠道 Publisher 尚未完整实现。

## 5. Agent 资产与 Skill 资产分离

最新智能体资产体系把可治理 Agent 明确拆成：

```text
Role Definition
+ Agent Profile
+ Skill References
+ Knowledge Pack References
+ Capability / Tool Bindings
+ Policy / Approval References
+ Eval Suite
+ Host Release Manifest
```

`AGT-001/002/003/005/007/008` 分别拥有总体架构、角色与 Profile、知识与行为装配、Skill / Capability / Tool / Permission / Policy、评估发布和专业智能体目录。`skills/**` 继续作为六个活跃 Skill 的运行时真源，不再为每个 Skill 在知识目录复制第二份完整设计正文。

**证据**：`AGT-001/002/003/005/007/008`、`VIS-035`、`skills/**` 和 Skill 验证。

**边界**：当前尚无正式 `agents/` 目录、Role / Agent Profile Schema、Knowledge Pack、Agent Eval Release Registry 或 released 专业 Agent；自动专业 Agent 编排和 Publisher 仍未实现。

## 6. 架构—上下文—工作流—证据闭环

```text
Architecture：确定建设什么和状态属于谁
Context：保证所有参与者理解同一目标和事实
Workflow：把角色、Task、工具和资产串成执行线
Experiment：验证真实结果和限制
Portfolio：从稳定证据派生对外说明
```

这条闭环使项目能够在失败和替代路线中持续收敛，而不是依赖单次聊天成功。

## 7. 关联资产

- [ARC-001 ai-agent-platform 总体架构与执行路径](../../04_平台架构/ARC-001-ai-agent-platform总体架构/README.md)
- [ARC-016 能力依赖与分阶段 MVP](../../04_平台架构/ARC-016-能力依赖多任务并行与分阶段MVP路线图/README.md)
- [EXP-005 Custom GPT Actions 最小可信执行链实验](../../08_实验与复盘/EXP-005-Custom-GPT-Actions链路实验/README.md)
- [EXP-006 Gateway、Runtime 与 Dev Tunnels 安全链路实验](../../08_实验与复盘/EXP-006-Gateway-Local-Runtime与Dev-Tunnels实验/README.md)
- [AGT-001 智能体资产体系总体架构](../../06_智能体资产体系/AGT-001-智能体资产体系总体架构/README.md)
- [AGT-005 Skill、能力、工具、权限与策略资产治理](../../06_智能体资产体系/AGT-005-Skill能力工具权限与策略资产治理/README.md)
- [AGT-008 专业智能体目录与 P0 资产化路线](../../06_智能体资产体系/AGT-008-专业智能体目录与P0资产化路线/README.md)
- [CTX-005 当前能力与演进差距](../../00_项目与产品/CTX-005-当前能力与演进差距.md)
