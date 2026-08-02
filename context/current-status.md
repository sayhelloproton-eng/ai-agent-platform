# Current Status

## Implementation Baseline

```text
Formal Baseline:
  Branch: main
  Commit: 374f07b7ede3593400bf8631994fb1e91a4123bd

Working Branch:
  Branch: knowledge-rebuild-v2
  Current HEAD: read from Git at runtime
  Last Verified Review Source: c4301368c9af11f2f0c40323871dcb59daa9edda

Visual Asset Branch:
  Branch: knowledge-assets

Phase:
  2.5 — Human Content Review In Progress
```

`main` 保存 Batch 10 合并后的正式基线；`knowledge-rebuild-v2` 承载 Batch 10 后的控制面收口、内容修订与当前人工 Review；`knowledge-assets` 保存正式 SVG / PNG 视觉源资产。

Codex 已完成仓库级集中扫描、首轮内容修订、测试、Commit 与 Push，但这不等于最终人工内容验收。当前由用户逐篇人工 Review，Chat 进行第二轮 Review；按目录或逻辑组冻结修改清单后，再由本地 Codex 集中落库。

## Verified Implementation

### Applications

- `apps/action-gateway/`：Gateway 认证、Policy、Task 转发和 `/v1/runtime/status`；
- `apps/local-runtime/`：Task 校验、Runtime Policy、Capability 执行和 TaskResult；
- `apps/dev-tunnel/`：Microsoft Dev Tunnels 开发期公网入口、OpenAPI 和验证脚本。

### Packages

- `packages/contracts/`：Task / Result / Error Contract v1；
- `packages/auth/`：Bearer、API Key 校验和安全比较；
- `packages/policy/`：Capability 默认拒绝与 Allowlist。

### Capabilities

- `gateway.ping`；
- `runtime.status`。

`system.info.safe` 只存在于 Contract 白名单，当前没有默认实现，并被 Policy 拒绝。

### Security and Reliability

- 外部与内部 API Key 分离；
- Gateway 与 Runtime 双层 Policy；
- Loopback-only；
- Timeout、请求与响应大小限制；
- Rate Limit；
- Gateway 最大 2 个在途 Task；
- Runtime 最大 1 个执行 Task；
- 无队列快速失败；
- TaskResult `taskId` 对应校验；
- 安全错误映射与响应脱敏。

### Skills and Knowledge Governance

当前正式 Skill 共 6 个：

- AI Knowledge Skill；
- Deterministic Delivery Skill；
- Custom GPT Actions Skill；
- Microsoft Dev Tunnels Skill；
- Engineering Insight Distillation Skill v0.2.0；
- Planner Executor Handoff Skill v0.5.1 已通过 Review 并标记为 `accepted`，已补齐 Context Access、Scope Lock 与冻结交付之间的机器约束。

当前还包括：

- Platform Registry；
- Engineering Insight Registry；
- 五条初始工程洞见，其中四条 `provisional`、一条 `candidate`；
- 两轮离线 Pilot Eval；
- Git 作为唯一知识真源；
- Feishu 作为单向发布投影。

## Knowledge Rebuild Status

Batch 01～Batch 10 的知识资产重构、正式视觉资产治理、Registry 迁移和 `main` 集成已经完成。

当前已确认：

- `MIG-KNOWLEDGE-V2` 已完成；
- 142 个 Registry 资产已经物化；
- 318 条 Registry Relation 已登记；
- 十张正式视觉资产 `VIS-001～VIS-010` 已标记为 `accepted`；
- `knowledge-assets` 保存正式 SVG / PNG 源资产；
- `planner-executor-handoff v0.5.1` 已完成 Review 并标记为 `accepted`；
- `SOL-KNO-001` 已补齐 Platform Registry 实现、治理与验证方案；
- Project Knowledge Synthesis Skill 已进入 Roadmap，状态为 `planned / future`，未创建 Skill 目录；
- Portfolio Release 已建立正式阶段，状态为 `planned / not_started`；
- Feishu 最终发布尚未开始。

## Human Content Review Status

当前人工 Review 基线：

```text
knowledge-rebuild-v2@fca48b22ff931d1ffcfceb906d8a1e6a042dd952
```

当前 Review 模式：

1. 用户从最新本地仓库包逐篇人工 Review；
2. Chat 对同一文件进行第二轮 Review；
3. 每篇形成“确认不改”或“确认修改”的结论；
4. 每完成一个目录或逻辑组，再汇总修改清单；
5. 本地 Codex 按冻结清单集中修改、测试、Commit 和 Push；
6. 不为每篇文档单独提交；
7. 全部人工 Review 完成前，不执行 Feishu 发布。

Codex 在 `fca48b22...` 中完成的集中扫描与首轮修订，只作为当前人工 Review 的辅助证据，不代表最终人工验收已经完成。

当前 Review 组：

```text
context/**
```

详细逐篇进度由本轮人工 Review 清单维护，本文件只保存当前阶段和总体状态，不展开全部文件级记录。

## Not Implemented

- 动态 Task Control；
- Execution / Result 持久化；
- Executor Adapter 与 Execution Lane；
- Approval、Evidence、Side-effect Ledger；
- Health & Recovery；
- 多执行器自动调度；
- 平台自有 MCP Server、MCP Adapter 与统一 MCP 治理；
- AI 视频工作流；
- 生产级公网服务；
- 完整 Agent Profile 与 Knowledge Pack 资产体系；
- Custom GPT 资产化 MVP，包括 Instructions 真源、Builder 配置、两层 Knowledge Pack 与确定性发布包；
- Project Knowledge Synthesis Skill（`planned / future`）；
- Portfolio Release（`planned / not_started`）；
- 新知识树的 Feishu 最终发布。

宿主产品已经提供的 MCP、Memory 或其他能力，不等于 ai-agent-platform 已完成对应平台实现。

## Current Restrictions

- 不把当前窄链路 MVP 描述为完整 Agent 平台；
- 不把 Dev Tunnels 描述为生产方案；
- 不把 `provisional` / `candidate` 洞见描述为 `accepted`；
- 不把 Codex 集中扫描与首轮修订描述为最终人工内容验收；
- 在用户逐篇人工 Review 和 Chat 第二轮 Review 全部完成前，不执行 Feishu 发布；
- 人工 Review 完成后，Feishu 发布仍需独立授权；
- Feishu 发布前不读取旧正文、不比较、不合并；
- 不创建根级 `products/`；
- 不提前实现未来目录、包或空壳资产。

## Next Steps

```text
→ 完成全部文档的用户逐篇人工 Review
→ 完成 Chat 第二轮 Review
→ 按目录或逻辑组由本地 Codex 集中落库
→ 执行最终 Git 与 Registry 校验
→ 独立授权 Feishu 单向覆盖发布
→ 发布回读与失败项修正
→ 最终整仓验收
→ 再按 Roadmap 推进后续平台能力
```
