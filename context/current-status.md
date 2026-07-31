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

### Batch 01 — First Repository Materialization Completed

- 根入口与 Context 控制面；
- Platform Registry MVP；
- Engineering Insight Registry 迁移；
- `00～10` 目标知识树；
- 技术目录职责拆分；
- Registry 校验入口。

Batch 01 已完成首次仓库落库，但仍处于 Review 阶段，不能描述为最终验收通过。

### Current — Batch 01-R1

- 修复 Context 当前状态；
- 修复 Registry 计划资产与正式资产的状态混淆；
- 将迁移矩阵纳入 Git；
- 修复 `canonical_path`、`current_path` 与 `target_path` 语义；
- 清理空 Generated 索引；
- 增强 Registry 校验。

### Not Started — Batch 02

- `00_项目入口` 正式文章；
- `01_产品体系` 正式文章；
- 正式文章逐篇 Review；
- 图片资产；
- 飞书发布。

后续总体顺序：

```text
→ 批量生成和落库正式文档
→ 全库 Review
→ 生成正式视觉资产
→ 建立 Feishu 映射
→ 对正式文档逐篇 overwrite
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
