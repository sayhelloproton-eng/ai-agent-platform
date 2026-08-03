# PRT-004 工程能力与证据映射

> 核心结论：工程能力不能用技术名词自证；每项能力都必须绑定问题、决定、代码或文档、测试或实验，以及不能声称的边界。

## 1. 能力矩阵

| 能力 | 项目中的真实工作 | 主要证据 | 声明边界 |
|---|---|---|---|
| 需求与产品收敛 | 从就业目标、平台愿景和 AI 视频场景定义产品边界与阶段 | `PRD-003/005/006/007` | AI 视频尚未形成业务 Demo |
| 系统架构与 DDD | 定义领域、状态所有权、Adapter、信任边界和 MVP 依赖 | `ARC-001`、`ARC-016` | 部分领域仍为 accepted design |
| Node.js 全栈工程 | Workspaces、Contracts、Gateway、Runtime、Dev Tunnel | `apps/*`、`packages/*`、Workspace tests | 非生产级多实例平台 |
| API 与安全 | 双 Key、双层 Policy、Loopback、限流、并发、超时和大小限制 | `packages/auth`、`policy`、`EXP-005/006` | 未实现生产 IAM 和 Secret 轮换 |
| Agent 工程 | Role / Agent Profile / Skill / Knowledge Pack / Capability / Tool / Permission / Policy / Eval / Host Release 边界 | `AGT-001/002/003/005/007/008`、`VIS-035`、六个活跃 Skill | 尚无正式 Profile、released 专业 Agent和自动多 Agent 调度 |
| AI 编码工作流 | Planner / Executor、Task Contract、冻结 Artifact、Review、Git Policy | `WFL-002/005/006`、Handoff Skill | 当前以人工 Planner 为主 |
| 上下文与知识 | Git 单一真源、Context 编译、Document Bundle、Projection | `ARC-002/005/006`、`KNO-006/009/011` | 通用 RAG / Publisher 未完成 |
| 测试与质量 | Repo、Knowledge、Registry、Visual、Contracts、Apps 和链路验证 | `npm run verify`、各测试目录 | 不是生产监控或 SLA |
| 故障恢复 | 安全停止、Checkpoint 候选、最小修正和脏工作区续跑 | `EXP-008`、`EXP-009` | 无自动 Recovery Service |
| 项目治理 | Registry、Migration、Supersede、单 Commit、远端回读 | `platform-registry`、`WFL-010/012` | Feishu 最终发布待完成 |

## 2. 需求与架构能力

项目不是从框架选型开始，而是先回答：

- 谁使用平台；
- 什么是平台，什么是上层产品；
- 哪些状态必须由平台拥有；
- 当前六个月需要实现什么；
- 哪些能力只保留占位；
- 如何用 AI 视频验证通用设计。

这证明的是范围收敛、系统建模和演进设计能力，不是生产规模经验。

## 3. 全栈与安全能力

真实实现包括：

- TypeScript / Node.js Workspaces；
- Contracts、Auth、Policy 共享包；
- Gateway 和 Runtime 双服务；
- Dev Tunnel 生命周期；
- OpenAPI；
- 本地链路与错误路径测试；
- Loopback、双层认证和默认拒绝。

安全设计以最小暴露和可审计失败为优先，不通过开放 Shell 来证明“功能强”。

## 4. Agent 与知识工程能力

项目把 ChatGPT、Codex、Work、模型和工具视为可替换 Provider，并把长期 Agent 资产与运行时任务分开。稳定部分包括：

- Role Definition 与 Agent Profile；
- Skill、Capability 和 Tool Binding；
- Knowledge Pack 与 Context 引用；
- Permission、Policy 与一次性 Approval；
- Eval Suite 与 Host Release Manifest；
- Task Contract、Evidence、Git 和 Registry。

`06_智能体资产体系` 已形成六篇 Canonical 文档和 `VIS-035`，并明确 `skills/**` 是 Skill 运行时真源。当前证明的是资产模型、边界和六个活跃 Skill，不是已经发布了专业 Agent。

知识系统采用 Docs-as-Code 和派生投影，避免把 Memory、RAG、Feishu 和正式知识混为一体。

## 5. 交付与恢复能力

真实批次证明：

- 可以从固定 SHA 生成冻结 ZIP；
- 可以限制 Overlay、Delete 和 Git Scope；
- 可以发现 Registry、活跃链接和历史 Migration 的不同语义；
- 可以在错误门禁停止后保留工作区并续跑；
- 可以完成全量验证、单 Commit、Push 和远端回读。

## 6. 面试时的可信表达

可以说：

- “我设计并实现了一个最小可信的 Custom GPT 到本机 Runtime 链路。”
- “我用 Registry、Document Bundle 和冻结交付管理 AI 工程资产。”
- “我设计了 Task Control、Approval 和 Evidence 边界，并验证了部分流程。”

不能说：

- “我已经实现完整多 Agent 平台。”
- “系统已达到生产级安全和稳定性。”
- “我有大规模 RAG 或生产调度运营经验。”

## 7. 关联资产

- [PRT-003 核心架构判断与可信边界](../PRT-003-核心架构亮点/README.md)
- [PRT-005 关键问题、失败与架构收敛](../PRT-005-关键问题与解决过程/README.md)
- [PRT-006 项目成果与证据索引](../PRT-006-项目成果索引/README.md)
