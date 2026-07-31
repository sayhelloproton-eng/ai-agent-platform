# Current Status

## Implementation Baseline

```text
Branch: main
Commit: bd31893ddb9bb2efeb3cb38f67f1add66735cd79
Phase: 2.5 — Knowledge Asset Rebuild and Platform Governance
```

该提交是进入知识资产重构前的实现事实基线。知识重构工作位于 `knowledge-rebuild-v2`，当前提交以该分支实际 HEAD 为准，不代表已经合并到 `main`。

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
- Custom GPT Actions Skill；
- Microsoft Dev Tunnels Skill；
- Engineering Insight Distillation Skill v0.2.0；
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

### Current — Batch 05 In Review

- CAP-001～CAP-008 与 THY-001～THY-006 已通过真实 Commit Review 并保持 `accepted`；
- ARC-007～ARC-014、ARC-016 与 KNO-001～KNO-010 已通过 Batch 04 真实 Commit Review 并升级为 `accepted`；
- ARC-017～ARC-018、AGT-001～AGT-010 与 WFL-005～WFL-012 已首次物化为 `partial`；
- 本批二十篇新正文均保持 `unpublished`；
- `ARC-015`、`SKL-001～SKL-002` 和旧路径 `WFL-001～WFL-004` 未纳入本批；
- 当前等待 Batch 05 二十篇正文的真实 Commit Review；
- 图片、HTML 和飞书尚未开始。

后续总体顺序：

```text
→ Review 并接受 ARC-017～ARC-018、AGT-001～AGT-010 与 WFL-005～WFL-012
→ 处理实验、作品集、术语与来源
→ 处理 SKL / WFL 历史路径迁移与剩余计划资产
→ 全库一致性 Review
→ 生成正式视觉资产
→ 合并 main
→ 建立 Feishu 映射并逐篇 overwrite
```

## Not Implemented

- 动态 Task Control；
- 持久状态；
- Approval、Evidence、Side-effect Ledger；
- Health & Recovery；
- 多 Agent 自动协作；
- MCP；
- AI 视频工作流；
- 生产级公网服务；
- 完整 Agent Profile 与 Knowledge Pack；
- 新知识树的飞书投影。

## Current Restrictions

- 不把首个 MVP 描述为完整 Agent 平台；
- 不把 Dev Tunnels 描述为生产方案；
- 不把 provisional / candidate 洞见描述为 accepted；
- 不操作飞书，直到全部正式文档进入 main 并通过 Review；
- 飞书发布前不读取旧正文、不比较、不合并；
- 不创建根级 `products/`；
- 不提前实现未来包。
