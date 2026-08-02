# Current Status

## Implementation Baseline

```text
Formal Baseline:
  Branch: main
  Commit: 374f07b7ede3593400bf8631994fb1e91a4123bd

Working Branch:
  Branch: knowledge-rebuild-v2
  Current HEAD: read from Git at runtime
  Last Verified Review Source: 16a847a7a9df1021a562ac049405fba9d36066a6

Visual Asset Branch:
  Branch: knowledge-assets

Phase:
  2.5 — Human Content Review In Progress
```

`main` 保存 Batch 10 合并后的正式基线；`knowledge-rebuild-v2` 承载 Batch 10 后的控制面收口、内容修订与当前人工 Review；`knowledge-assets` 保存正式 SVG / PNG 视觉源资产。

Codex 已完成仓库级集中扫描、首轮内容修订、测试、Commit 与 Push，但这不等于最终人工内容验收。当前由用户逐篇人工 Review，Chat 进行第二轮 Review；每完成一个目录或逻辑组，由总控 Planner 生成冻结完整文件，Executor 只负责确定性落库。

## Verified Implementation

### Applications and Packages

- `apps/action-gateway/`：Gateway 认证、Policy、Task 转发和 `/v1/runtime/status`；
- `apps/local-runtime/`：Task 校验、Runtime Policy、Capability 执行和 TaskResult；
- `apps/dev-tunnel/`：Microsoft Dev Tunnels 开发期公网入口、OpenAPI 和验证脚本；
- `packages/contracts/`：Task / Result / Error Contract v1；
- `packages/auth/`：Bearer、API Key 校验和安全比较；
- `packages/policy/`：Capability 默认拒绝与 Allowlist。

当前安全 Capability：

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

当前已有六个已验证或已接受 Skill：

- AI Knowledge Skill；
- Deterministic Delivery Skill；
- Custom GPT Actions Skill；
- Microsoft Dev Tunnels Skill；
- Engineering Insight Distillation Skill v0.2.0；
- Planner Executor Handoff Skill v0.5.1 / `accepted`。

新增：

- Project Knowledge Synthesis Skill v0.1.0 已物化，状态为 `in_review`；
- 首个 governed Pilot 已用于聚合 `docs/knowledge/00_项目入口/`；
- Skill 只输出综合候选、冲突报告、目标资产建议和 Registry / 链接影响，不直接取得正式写入权。

当前还包括：

- Platform Registry；
- Engineering Insight Registry；
- 五条初始工程洞见，其中四条 `provisional`、一条 `candidate`；
- Git 作为唯一知识真源；
- Feishu 作为单向发布投影。

## Knowledge Rebuild Status

Batch 01～Batch 10 的知识资产重构、正式视觉资产治理、Registry 迁移和 `main` 集成已经完成。

当前已确认：

- `MIG-KNOWLEDGE-V2` 已完成；
- Platform Registry 已登记正式资产和关系；
- 十张正式视觉资产 `VIS-001～VIS-010` 已标记为 `accepted`；
- `knowledge-assets` 保存正式 SVG / PNG 源资产；
- `planner-executor-handoff v0.5.1` 已完成 Review 并标记为 `accepted`；
- `project-knowledge-synthesis v0.1.0` 已完成首个真实目录聚合 Pilot，仍处于 `in_review`；
- `00_项目入口` 从六篇正式文章收敛为 `CTX-001`、`CTX-005`、`DEC-001` 三篇，旧 `PRD-001`、`CTX-006`、`CTX-007` 转入技术归档并保留 superseded 关系；
- Portfolio Release 状态为 `planned / not_started`；
- Feishu 最终发布尚未开始。

## Human Content Review Status

当前 Review 模式：

1. 用户逐篇或逐目录人工 Review；
2. Chat / 总控 Planner 进行语义复审和知识综合；
3. Project Knowledge Synthesis 产生去重、冲突、落位和退役建议；
4. 总控 Planner 生成冻结完整文件；
5. Executor 按 Manifest 完整覆盖、验证、单 Commit 和 Push；
6. 全部人工 Review 完成前，不执行 Feishu 发布。

已完成：

```text
context/**
docs/knowledge/00_项目入口/**
```

当前 Review 组：

```text
docs/knowledge/01_产品体系/**
```

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
- Custom GPT 资产化 MVP；
- Project Knowledge Synthesis 的自动 Provider、跨仓库索引、批量 Eval 和直接发布能力；
- Portfolio Release；
- 新知识树的 Feishu 最终发布。

宿主产品已经提供的 MCP、Memory 或其他能力，不等于 ai-agent-platform 已完成对应平台实现。

## Current Restrictions

- 不把当前窄链路 MVP 描述为完整 Agent 平台；
- 不把 Dev Tunnels 描述为生产方案；
- 不把 `provisional` / `candidate` 洞见描述为 `accepted`；
- 不把 Project Knowledge Synthesis v0.1.0 描述为已接受或自动写入系统；
- 不把 Codex 集中扫描与首轮修订描述为最终人工内容验收；
- 在用户逐篇人工 Review 和 Chat 第二轮 Review 全部完成前，不执行 Feishu 发布；
- 人工 Review 完成后，Feishu 发布仍需独立授权；
- Feishu 发布前不读取旧正文、不比较、不合并；
- 不创建根级 `products/`；
- 不提前创建未来空壳资产。

## Next Steps

```text
→ Review docs/knowledge/01_产品体系/**
→ 继续按目录执行人工 Review + Project Knowledge Synthesis
→ 由总控 Planner 生成冻结完整文件包
→ Executor 完成确定性落库
→ 全部知识 Review 完成后执行 Git / Registry 总验收
→ 独立授权 Feishu 单向覆盖发布
→ 发布回读与最终整仓验收
```
