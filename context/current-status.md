# Current Status

## Implementation Baseline

```text
Branch: main
Commit: 以 origin/main 实际 HEAD 为准
Control Branch: knowledge-rebuild-v2
Phase: 2.5 — Final Content Review Completed
```

`main` 是 Batch 10 合并后的正式基线；`knowledge-rebuild-v2` 继续承载 Batch 10 后的控制面与最终内容 Review 收口；`knowledge-assets` 继续保存正式视觉源文件。

## Verified Implementation

### Applications

- `apps/action-gateway/`：Gateway 认证、Policy、Task 转发、`/v1/runtime/status`；
- `apps/local-runtime/`：Task 校验、Runtime Policy、Capability 执行、TaskResult；
- `apps/dev-tunnel/`：Microsoft Dev Tunnels 开发期公网入口、OpenAPI 和验证脚本。

### Packages

- `packages/contracts/`：Task / Result / Error Contract v1；
- `packages/auth/`：Bearer、API Key 校验和安全比较；
- `packages/policy/`：Capability 默认拒绝与 Allowlist。

### Capabilities

- `gateway.ping`；
- `runtime.status`。

`system.info.safe` 只存在于 Contract 白名单，当前没有默认实现并被 Policy 拒绝。

### Security and Reliability

- 外部与内部 API Key 分离；
- Gateway 与 Runtime 双层 Policy；
- Loopback-only；
- Timeout、请求/响应大小限制；
- Rate Limit；
- Gateway 最大 2 个在途 Task；
- Runtime 最大 1 个执行 Task；
- 无队列快速失败；
- TaskResult `taskId` 对应校验；
- 安全错误映射和响应脱敏。

### Skills and Knowledge Governance

- AI Knowledge Skill；
- Deterministic Delivery Skill；
- Custom GPT Actions Skill；
- Microsoft Dev Tunnels Skill；
- Engineering Insight Distillation Skill v0.2.0；
- Planner Executor Handoff Skill v0.4.0，已实现、验证并标记为 `accepted`；
- 当前正式 Skill 数量为 6；
- Engineering Insight Registry；
- 五条初始洞见，其中四条 provisional、一条 candidate；
- 两轮离线 Pilot Eval。

## Knowledge Rebuild Status

### Batch 01 and Batch 01-R1 — Completed

- 根入口与 Context 控制面；
- Platform Registry MVP；
- Engineering Insight Registry 迁移；
- `00～10` 目标知识树；
- 技术目录职责拆分；
- Registry 校验入口；
- Context 当前状态与 Registry 计划资产语义修正；
- 迁移矩阵纳入 Git；
- `canonical_path`、`current_path` 与 `target_path` 语义修正；
- 空 Generated 索引清理与 Registry 校验增强。

### Batch 02 and Batch 02-R1 — Completed and Accepted

- `00_项目入口` 六篇正文已落库并通过 Review；
- `01_产品体系` 五篇正文已落库并通过 Review；
- 十一篇正文已升级为 `accepted`；
- `publication_status` 仍为 `unpublished`；
- 图片尚未生成；
- HTML 尚未生成；
- 飞书尚未发布。

### Current — Final Content Review Completed

- Batch 01～Batch 10 的知识资产重构与 `main` 集成已经完成并接受；
- `MIG-KNOWLEDGE-V2` 已完成，不再包含后续内容校准；
- 141 个 Registry 资产全部 `materialized`，全部 `migration_state: complete`；
- 十张正式视觉资产 `VIS-001～VIS-010` 已升级为 `accepted`；
- `knowledge-assets` 保留为正式 SVG / PNG 源资产分支；
- `knowledge-rebuild-v2` 继续承载 Batch 10 后的收口工作；
- 合并后的 `main` 已重新执行完整验证；
- MIG-002 最终正式内容 Review 控制计划已物化并接受；
- R-01～R-06 六个集中 Review 域已执行并完成；
- `SOL-KNO-001` 已补齐 Platform Registry 实现治理与验证方案；
- Project Knowledge Synthesis Skill 已进入 Feishu 发布之后的 Roadmap，状态为 `planned / future`，未创建 Skill 目录；
- Portfolio Release 已建立正式阶段，状态为 `planned / not_started`；
- Feishu 最终发布尚未开始。

后续总体顺序:

```text
→ 独立授权 Feishu 单向覆盖发布
→ 发布回读
→ 最终整仓验收
→ 再按 Roadmap 评估 Project Knowledge Synthesis Skill
```

## Not Implemented

- 动态 Task Control；
- Execution / Result 持久化；
- Executor Adapter 与 Execution Lane；
- Approval、Evidence、Side-effect Ledger；
- Health & Recovery；
- 多执行器自动调度；
- MCP；
- AI 视频工作流；
- 生产级公网服务；
- 完整 Agent Profile 与 Knowledge Pack；
- Project Knowledge Synthesis Skill（`planned / future`）；
- Portfolio Release（`planned / not_started`）；
- 新知识树的 Feishu 最终发布。

## Current Restrictions

- 不把首个 MVP 描述为完整 Agent 平台；
- 不把 Dev Tunnels 描述为生产方案；
- 不把 provisional / candidate 洞见描述为 accepted；
- 不操作飞书，直到最终正式内容 Review 完成并获得独立发布授权；
- 飞书发布前不读取旧正文、不比较、不合并；
- 不创建根级 `products/`；
- 不提前实现未来包。
