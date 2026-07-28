# Current Status

## Current Phase

**Phase 2: AI Coding Workflow — In Progress**

Phase 1 Knowledge Foundation 已交付。Phase 2 已启动，当前完成 Gateway MVP 设计基线、Monorepo 根级工程基线、Contracts v1、Auth、Capability Policy 和 Action Gateway 静态 API Key 认证；尚未实现 Local Runtime 或任务执行。

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
- Gateway 默认只允许 `gateway.ping`，`/ready` 与 `/v1/capabilities` 只返回 Policy 允许的能力；
- Policy 12/12、Gateway 30/30、Contracts 17/17、Auth 12/12 通过，Knowledge Skill 未受影响。

## Next

- 创建 Local Runtime 最小应用，并实现 `gateway.ping` 与 `runtime.status`。

## Not Started

- Feishu 飞书操作（写入、节点创建、部署）；
- 动态权限策略、Runtime、Cloudflare Tunnel 和 Custom GPT Action Schema；
- Runtime 和 Capability 的平台业务代码；
- AI Video Workflow (Phase 3)。

## Current Restrictions

- 不处理 Feishu 写入或部署；
- 不把 Monorepo 工程基线描述为 Gateway MVP 已完成；
- 未经后续任务授权不提前创建 Gateway、Runtime、Capability 或基础设施；
- 不把后续计划描述为当前已实现。

当前无 Known Issues。
