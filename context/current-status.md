# Current Status

## Current Phase

**Phase 2: AI Coding Workflow — In Progress**

Phase 1 Knowledge Foundation 已交付。Phase 2 已启动，当前完成 Gateway MVP 设计基线、Monorepo 根级工程基线、Contracts v1、Auth、Capability Policy、Action Gateway → Local Runtime 本地任务执行链路，以及公网接入前的传输边界、Rate Limit、双端并发和本地启动编排；公网链路尚未建立。

## Completed

- Task 001：Context Foundation — 根 `context/` 六文件、`README.md` Project Context Root、Git 唯一真源与 Feishu 单向投影策略；
- Task 002：知识资产组织 — `docs/knowledge/`、`docs/technical/`、`docs/learning/`、`docs/adr/` 四层结构；
- Task 003-A/B/C：知识配置 v3.0、Project Profile 3.0、治理规则对齐；
- 仓库清理：删除过期的 `feat/feishu-knowledge-projection-v1` 分支，修复全仓过期链接和导航，Archive 文件标记 superseded；
- 知识体系理论文档（5 篇）：EXP-003、ARC-005、ARC-006、SOL-004、WFL-004；
- 图片资源方案：`knowledge-assets` 分支 + `asset://` 引用 + Publisher 上传 Feishu 图片资源；
- Gateway MVP 渐进式实施方案：`SOL-005` 已进入 Git；
- Monorepo 根级工程基线：npm workspaces 契约、Node.js 版本约束、lock 文件和统一仓库验证入口；
- 首个真实 workspace：`@ai-agent-platform/contracts`；
- Contracts v1：Task / Result / Error、Capability 白名单、JSON 数据边界和运行时 validator 已通过测试；
- Skill 隔离：`skills/ai-knowledge` 未加入 workspace，前后自检通过且文件无变化。
- Action Gateway 最小应用：`/health`、`/ready`、Request ID、404、405 和安全 JSON 响应已实现；
- Gateway 默认仅监听 Loopback；
- Auth workspace：API Key 格式校验、SHA-256 固定长度摘要与恒定时间比较、Header 脱敏函数已实现；
- 受保护路由：`GET /v1/capabilities` 要求 Bearer API Key，未认证响应统一为 401；
- Policy workspace：Deny by default、未知 Capability 拒绝、Allowlist 去重与固定顺序已实现；
- Gateway 默认允许 `gateway.ping` 与 `runtime.status`，`/ready` 与 `/v1/capabilities` 只返回 Policy 允许的能力；
- Local Runtime workspace：`/health`、`/ready`、`/v1/tasks` 和 65536 字节 Body 限制已实现，仅监听 Loopback；
- Runtime Task Contract 校验、Policy 二次校验、Capability 调度与 Contract v1 `TaskResult` 已实现；
- Runtime 默认实现 `gateway.ping` 与 `runtime.status`，`system.info.safe` 未实现且默认拒绝；
- Gateway 新增受保护的 `POST /v1/tasks`，只接受 `custom-gpt` requester，并覆盖不可信 Task Request ID；
- Gateway → Runtime HTTP Client 已实现，仅允许 Loopback HTTP，具有 3000 ms 默认 Timeout、65536 字节响应上限和 `TaskResult` 校验；
- 外部 `ACTION_GATEWAY_API_KEY` 与内部 Runtime Key 分离，Runtime `/v1/tasks` 已增加内部 Bearer 认证；
- Gateway 与 Runtime 分别执行 Capability Policy，`system.info.safe` 默认在 Gateway 被拒绝；
- Batch 7.1 公网接入前安全修复：Runtime `TaskResult.taskId` 绑定原 Task、Header 前与 Body 阶段 Timeout 安全映射、Runtime 二次 Policy 真实链路验证、提前响应排空未读 Body、Gateway 固定入站 Timeout；
- Gateway 单实例固定窗口 Rate Limit：Task 30/60 秒、Capabilities 60/60 秒，超限安全返回 429；
- Gateway 默认最大 2 个在途 Task、Runtime 默认最大 1 个执行 Task，均采用无队列快速失败并保证槽位释放；
- Runtime 503 被 Gateway 安全映射为 `RUNTIME_BUSY`，不透传 Runtime Body；
- `npm run local:start` 已实现 Runtime → Gateway 顺序启动、Ready 检查、Key 一致性校验和双进程 Shutdown；
- Local Chain 6/6、Local Stack 5/5、Runtime 44/44、Gateway 76/76、Policy 12/12、Contracts 17/17、Auth 12/12 通过，Repo Check、Knowledge Skill 与根级 Verify 通过。

## Next

- 配置 Cloudflare Named Tunnel、固定 HTTPS 域名和 Custom GPT OpenAPI Schema。

## Not Started

- Feishu 飞书操作（写入、节点创建、部署）；
- 动态权限策略、Cloudflare Tunnel 和 Custom GPT Action Schema；
- 公网端到端验证；
- AI Video Workflow (Phase 3)。

## Current Restrictions

- 不处理 Feishu 写入或部署；
- 不把 Monorepo 工程基线描述为 Gateway MVP 已完成；
- 未经后续任务授权不提前配置 Tunnel、OpenAPI、后续 Capability 或基础设施；
- 不把后续计划描述为当前已实现。

当前限制：Cloudflare Tunnel 尚未配置；Custom GPT OpenAPI 尚未生成；公网端到端链路尚未验证。
