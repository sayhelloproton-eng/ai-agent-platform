# PRT-006 项目成果与证据索引

> 核心结论：本索引只提供从作品集声明回到真实代码、知识、实验、测试和状态的导航；它不改变资产生命周期，机器状态仍以 Platform Registry 和 Git 为准。

## 1. 快速入口

- [项目故事与价值主线](../PRT-001-ai-agent-platform项目故事/README.md)
- [Demo 与 Portfolio Release 路线图](../PRT-002-Demo路线图/README.md)
- [核心架构判断与可信边界](../PRT-003-核心架构亮点/README.md)
- [工程能力与证据映射](../PRT-004-工程能力证明/README.md)
- [关键问题、失败与架构收敛](../PRT-005-关键问题与解决过程/README.md)

## 2. 可运行代码

| 范围 | 作用 |
|---|---|
| [`apps/action-gateway/`](../../../../apps/action-gateway/) | 外部入口、认证、Policy、限流和 Runtime 转发 |
| [`apps/local-runtime/`](../../../../apps/local-runtime/) | 本机 Task 校验、第二层 Policy 和 Capability |
| [`apps/dev-tunnel/`](../../../../apps/dev-tunnel/) | Microsoft Dev Tunnels 生命周期、OpenAPI 和真实验证 |
| [`packages/contracts/`](../../../../packages/contracts/) | Task、Result 和 API Contract |
| [`packages/auth/`](../../../../packages/auth/) | Key 和认证边界 |
| [`packages/policy/`](../../../../packages/policy/) | Capability 默认拒绝 Policy |

## 3. 平台与知识资产

| 范围 | 证据 |
|---|---|
| [`platform-registry/`](../../../../platform-registry/) | Asset、Relations、Release、Projection、Migration 和 Visual Registry |
| [`context/`](../../../../context/) | 项目短入口、当前状态、架构和路线 |
| [`docs/knowledge/`](../../) | Canonical 知识体系 |
| [`docs/adr/`](../../../adr/) | Git / Feishu 和 Document Bundle 决策 |
| [`skills/`](../../../../skills/) | 六个活跃 Skill 的实现、测试和资源 |

## 4. 核心架构与工作流

- [ARC-001 ai-agent-platform 总体架构与执行路径](../../04_平台架构/ARC-001-ai-agent-platform总体架构/README.md)
- [ARC-016 能力依赖、多任务并行与分阶段 MVP](../../04_平台架构/ARC-016-能力依赖多任务并行与分阶段MVP路线图/README.md)
- [ARC-002 上下文与知识系统总体架构](../../05_上下文与知识系统/ARC-002-上下文与知识系统总体架构/README.md)
- [WFL-001 工作流与项目治理总体模型](../../07_工作流与项目治理/WFL-001-工作流与项目治理总体模型/README.md)
- [WFL-005 任务合同与多角色协作](../../07_工作流与项目治理/WFL-005-任务合同与多角色协作/README.md)
- [WFL-007 任务状态、Checkpoint、移交与恢复](../../07_工作流与项目治理/WFL-007-任务状态Checkpoint移交与恢复/README.md)
- [AGT-001 智能体资产体系总体架构](../../06_智能体资产体系/AGT-001-智能体资产体系总体架构/README.md)
- [AGT-005 Skill、能力、工具、权限与策略资产治理](../../06_智能体资产体系/AGT-005-Skill能力工具权限与策略资产治理/README.md)
- [AGT-008 专业智能体目录与 P0 资产化路线](../../06_智能体资产体系/AGT-008-专业智能体目录与P0资产化路线/README.md)

## 5. 实验与复盘

| ID | Evidence |
|---|---|
| `EXP-001` | [公开飞书知识库读取与权限边界](../../08_实验与复盘/EXP-001-公开飞书知识库读取实验/README.md) |
| `EXP-002` | [飞书异构节点递归导出与完整性](../../08_实验与复盘/EXP-002-公开飞书知识库递归导出实验/README.md) |
| `EXP-003` | [知识系统与单一真源收敛](../../08_实验与复盘/EXP-003-知识系统初始化阶段复盘/README.md) |
| `EXP-004` | [工程洞见提炼 Skill 评测](../../08_实验与复盘/EXP-004-工程洞见提炼Skill首轮评测/README.md) |
| `EXP-005` | [Custom GPT Actions 最小可信执行链](../../08_实验与复盘/EXP-005-Custom-GPT-Actions链路实验/README.md) |
| `EXP-006` | [Gateway、Runtime 与 Dev Tunnels 安全链路](../../08_实验与复盘/EXP-006-Gateway-Local-Runtime与Dev-Tunnels实验/README.md) |
| `EXP-007` | [Cloudflare 路线替代](../../08_实验与复盘/EXP-007-Cloudflare路线替代复盘/README.md) |
| `EXP-008` | [长上下文、冻结交付与知识综合](../../08_实验与复盘/EXP-008-长上下文与知识综合复盘/README.md) |
| `EXP-009` | [任务中断、健康恢复与快照续跑](../../08_实验与复盘/EXP-009-健康恢复与任务快照实验/README.md) |

## 6. 验证入口

根目录执行：

```bash
npm run verify
```

该命令覆盖 Repo、Skill、Knowledge、Authoring、Handoff、Visual、Insight、Synthesis、Registry、Contracts、Auth、Policy、Gateway、Runtime、Dev Tunnel 和本地链路。

单次验证结果必须结合执行时间、环境和 Commit 使用，不能把历史一次通过写成永久状态。

## 7. 已形成的工程成果

- Git 唯一真源和 Platform Registry；
- Document Bundle 和 Human-first / AI-lossless 视觉语义块；
- 六个活跃 Skill；
- 智能体资产体系六篇 Canonical 文档与 `VIS-035`；
- Action Gateway、Local Runtime 和 Dev Tunnels；
- Custom GPT `runtime.status` 真实调用；
- Engineering Insight Pilot Eval；
- Planner–Executor 冻结交付、负向门禁和安全续跑；
- 产品、能力、架构、上下文、工作流、实验和作品集知识体系。

## 8. 当前未完成

- 正式 `agents/` 目录、Role / Agent Profile Schema、Knowledge Pack、Agent Eval Release 和 released 专业 Agent；
- 动态 Task / Execution / Result Store；
- Approval / Evidence / Side-effect Ledger；
- 自动多 Agent 协作；
- Knowledge Pack 和 Agent Profile Publisher；
- AI 视频业务 Demo；
- 生产级公网部署；
- 最终 Feishu 覆盖发布与回读；
- 正式 Portfolio Release。

## 9. 公开前检查

- 固定 Commit / Tag；
- 仓库和 Demo 验证；
- Secret、Token、私人 Context 和第三方全文检查；
- README、Feishu、简历和面试声明一致；
- 当前能力、设计和计划分级；
- 失败和限制不隐藏；
- 所有外部链接和 Demo 入口回读。

## 10. 关联资产

- [REF-004 架构图索引](../../10_术语与来源/REF-004-架构图索引.md)
- [REF-005 知识文章与仓库资产索引](../../10_术语与来源/REF-005-知识文章与仓库资产索引.md)
