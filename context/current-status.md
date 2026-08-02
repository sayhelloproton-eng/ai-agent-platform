# Current Status

## Implementation Baseline

```text
Formal Baseline:
  Branch: main
  Commit: 374f07b7ede3593400bf8631994fb1e91a4123bd

Working Branch:
  Branch: knowledge-rebuild-v2
  Current HEAD: read from Git at runtime
  Last Verified Review Source: ad0bb6e687167ce198709b31e4733c5f2362e1ed

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

首批 10 个正式视觉资产已迁回对应文档包，用于验证 Document Bundle 和 Human-first、AI-lossless 规则。

## Current Review State

- `00_项目入口` 与 `01_产品体系` 已经综合收敛并完成落库；
- 当前主线继续逐目录正式内容人工 Review；
- Skill 组合治理、Document Bundle、Human-first / AI-lossless 与 Publisher 本地图片转换规则已完成落库；
- Feishu 最终覆盖发布、发布回读和整仓验收尚未开始；
- 本次治理不执行 Feishu 写入。

## Next Actions

1. 继续 `docs/knowledge/02_基础产品与能力/` 人工 Review；
2. 按目录生成冻结完整文件，由 Executor 机械落库；
3. 全部正文 Review 后执行 Registry / 链接 / 文档包 / 图片语义镜像总验收；
4. 独立授权 Git → Feishu 覆盖发布并回读；
5. 最终整仓验收后再评估 fast-forward only 接入 `main`。

## Non-claims

宿主产品已有的 MCP、Memory、Projects 或视觉能力，不等于平台已经实现对应 Runtime、RAG、Task Store 或 Agent 自动调度。Skill 物化也不等于相关业务能力已进入生产。
