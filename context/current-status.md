# Current Status

## Implementation Baseline

```text
Formal Baseline:
  Branch: main
  Commit: 374f07b7ede3593400bf8631994fb1e91a4123bd

Working Branch:
  Branch: knowledge-rebuild-v2
  Current HEAD: read from Git at runtime
  Last Verified Review Source: 93da9612e237f94cc6044d85ac7a2f0d7c37b203

Phase:
  2.5 — Human Content Review and Governance Refinement
```

`main` 保存已合并正式基线；`knowledge-rebuild-v2` 承载控制面收口、正式内容 Review、Skill 治理和最终发布准备。视觉资产不再使用独立分支，正文和资源在当前工作分支以 Document Bundle 共同管理。

## Verified Implementation

### Runtime chain

```text
Custom GPT
→ Microsoft Dev Tunnels
→ Action Gateway
→ Local Runtime
→ gateway.ping / runtime.status
```

已验证 Contracts、Auth、Policy、双层 Key、双层 Capability Policy、Loopback、Rate/Concurrency/Timeout/Size 限制、Builder Action 与真实自然语言调用。动态 Task Store、Approval、Evidence、Execution Lane、多执行器与自动恢复仍未实现。

### Knowledge and Skill governance

活跃 Skill 收敛为六个：

1. `planner-executor-handoff`：普通实施与冻结 Artifact 两种交接模式；
2. `project-knowledge-synthesis`：多源事实、重复、冲突和目标资产结构；
3. `engineering-document-authoring`：Human-first、AI-lossless 正式工程文档；
4. `project-knowledge-governance`：落位、Registry、生命周期、完整性与 Feishu 投影；
5. `engineering-insight-distillation`：显式触发的工程洞见提炼；
6. `custom-gpt-actions`：Builder 兼容 Action 和服务端适配边界。

治理变化：

- `deterministic-delivery` 已并入 `planner-executor-handoff` 的 `apply_frozen_artifacts` 模式；
- `ai-knowledge` 已由职责更窄的 `project-knowledge-governance` 取代；
- Microsoft Dev Tunnels 已降级为 `apps/dev-tunnel/` Runbook；
- Project Knowledge Synthesis v0.1.0 仍为 `in_review`；
- Engineering Document Authoring 与 Project Knowledge Governance 首版为 `in_review`；
- Skill 采用 Skill Creator 的最小入口、渐进披露、精确触发和可验证资源结构。

### Document and projection model

正式资源型文档采用：

```text
Document-ID-title/
├── README.md
└── assets/
```

- 正文和资源同分支、同 Commit、同生命周期；
- Git 使用本地相对资源路径；
- 每个图片立即跟随 AI 可读语义镜像；
- Feishu Publisher 在投影时上传本地图片并插入媒体块；
- Feishu URL、Media Token 与 Block ID 不回写 Git；
- Git 和 Feishu 要求语义等价，不要求物理语法相同。

当前视觉资产 Registry 扩展到 35 个 ID。`VIS-028 v2` 与 `VIS-029 v2` 使用用户已确认的正式 PNG：VIS-028 保留总体架构与执行路径构图并补入 DDD 限界上下文映射，VIS-029 沿用此前确认的分阶段 MVP 路线图；包内 SVG 仅作为可编辑参考。旧 `VIS-001`、`VIS-003`～`VIS-009` 转入平台架构历史 Document Bundle，保留语义但不再作为当前架构入口。

## Current Review State

- `00_项目入口`、`01_产品体系`、`02_基础产品与能力` 与 `03_Agent工程架构思想与方法论` 已经综合收敛并完成落库；
- `04_平台架构` 已纠偏收敛为 ARC-001 与 ARC-016 两篇 Canonical 文档：ARC-001 纳入 DDD、运行、部署、信任和实现映射；ARC-016 纳入能力依赖、并行不变量、阶段门和证据等级。旧观点和旧图转入可追溯技术归档；
- `05_上下文与知识系统` 已收敛为六篇 Canonical 文档，覆盖五领域、多消费者 Context 编译、运行连续性、多渠道知识分发和受控知识自迭代，并完成六张正式视觉资产；
- `06_智能体资产体系` 已收敛为六篇 P0 Canonical 文档，并以 `AGT-001` 一张总体架构图统一表达 Role、Agent Profile、Skill、Knowledge Pack、Capability、Tool、Policy、Eval、Host Release 与运行实例边界；
- `07_工作流与项目治理` 已完成落库，Task、角色分配、Handoff、阶段门、执行通道、审批、副作用和项目状态治理由该章节拥有；
- 当前主线进入 `08_实验与复盘` 正式内容 Review；
- Skill 组合治理、Document Bundle、Human-first / AI-lossless 与 Publisher 本地图片转换规则已完成落库；
- Feishu 最终覆盖发布、发布回读和整仓验收尚未开始；
- 本次治理不执行 Feishu 写入。

## Next Actions

1. 开始 `docs/knowledge/08_实验与复盘/` 人工 Review；
2. 按目录生成冻结完整文件，由 Executor 机械落库；
3. 全部正文 Review 后执行 Registry / 链接 / 文档包 / 图片语义镜像总验收；
4. 独立授权 Git → Feishu 覆盖发布并回读；
5. 最终整仓验收后再评估 fast-forward only 接入 `main`。

## Non-claims

宿主产品已有的 MCP、Memory、Projects 或视觉能力，不等于平台已经实现对应 Runtime、RAG、Task Store 或 Agent 自动调度。Skill 物化也不等于相关业务能力已进入生产。
