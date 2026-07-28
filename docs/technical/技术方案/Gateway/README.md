# Gateway 技术方案

## 目录定位

本目录保存 Custom GPT Actions 与 Action Gateway 相关的技术方案、实施大纲和设计文档。

核心问题域：

- Custom GPT Action 如何安全调用本地 Mac 能力；
- Action Gateway 作为公网唯一入口的架构设计；
- Local Runtime 的权限与安全边界；
- 认证、授权、审计与可观测性。

## 当前资产

| 文件 | 说明 |
|---|---|
| `SOL-005-Custom-GPT-Actions与Gateway-MVP渐进式实施方案.md` | 总纲：15 个阶段（Phase 0 至 Phase 14）渐进式 MVP 实施计划，覆盖仓库基线、Monorepo、Contracts、Gateway、认证、权限、Runtime、Capability、Cloudflare Tunnel、Custom GPT Action、安全复核与知识沉淀 |
| `SOL-006-Task-Result-Error-Contract-v1.md` | 已实现的 Contract v1 设计：Task、Result、Error、Capability 白名单、运行时校验和不变量 |

## 实施状态

当前阶段：**设计与渐进实施阶段**。

`SOL-005` 已定义完整路线图（Phase 0 至 Phase 14）。Monorepo 工程基础、Contracts v1、Auth、Capability Policy、Action Gateway → Local Runtime 本地任务链路、应用层入口保护与本地启动编排已落地并通过测试；动态策略、Tunnel 与公网 Action 链路尚未实现。每阶段遵循“一步一任务、一步一自检、一步一反馈、一步一审核”原则。

## 当前代码

实现资产位于 [`apps/action-gateway/`](../../../../apps/action-gateway/) 和 [`apps/local-runtime/`](../../../../apps/local-runtime/)。

- 已实现本地 HTTP 外壳；
- 已实现 `GET /health` 和 `GET /ready`；
- 已通过 `packages/auth/` 实现 API Key 格式检查、SHA-256 固定长度摘要与恒定时间比较；
- 已实现受保护的 `GET /v1/capabilities`；
- 已通过 `packages/policy/` 实现 Capability 级 Deny by default 与明确允许；
- Gateway 默认展示并允许 `gateway.ping` 与 `runtime.status`；
- 当前没有动态策略管理；
- Authorization Header 脱敏工具已存在，但正式日志系统尚未建立；
- Local Runtime 已实现 `GET /health`、`GET /ready` 与 `POST /v1/tasks`；
- Runtime 已实现 Task Contract 校验、Policy 二次校验和 Contract v1 `TaskResult`；
- Runtime 当前执行 `gateway.ping` 与 `runtime.status`，仅监听 Loopback；
- Gateway 已新增受外部 API Key 保护的 `POST /v1/tasks`；
- Gateway Runtime Client 只连接 Loopback HTTP，并验证 Runtime `TaskResult`；
- Runtime `TaskResult` 必须与原 Task 的 `taskId` 一致，Header 前和 Body 读取阶段超时均安全映射；
- Gateway 与 Runtime 使用分离的两套 API Key，并分别执行 Capability Policy；
- Runtime 二次 Policy 已有 Gateway 放行、Runtime 拒绝的真实集成测试；
- Runtime `/v1/tasks` 已增加内部 API Key，health 与 ready 保持公开；
- Gateway 提前响应会排空未读请求 Body，并设置固定 Header、Request、Keep-Alive 与 Socket 入站 Timeout；
- 本地 Gateway → Runtime 链路已通过真实双服务测试；
- Gateway 对 Task 与 Capabilities 使用独立的单实例固定窗口 Rate Limit；
- Gateway 和 Runtime 分别使用无队列并发 Gate，满载快速返回 503；
- Runtime Busy 由 Gateway 安全分类和映射，不透传 Runtime 原始响应；
- Local Stack 已实现 Runtime → Gateway 顺序启动、Ready 检查和双进程清理；
- 公网链路尚未建立。

下一步是配置 Cloudflare Named Tunnel、固定 HTTPS 域名和 Custom GPT OpenAPI Schema。

## 代码落位边界

本目录仅存放技术方案文档，**不存放运行时代码**。

运行时代码完成后将位于以下目录：

| 边界 | 目录 | 说明 |
|---|---|---|
| 可部署应用 | `apps/action-gateway/`、`apps/local-runtime/` | Gateway 与 Runtime 服务 |
| 共享库 | `packages/contracts/`、`packages/auth/`、`packages/policy/`、`packages/observability/` | 协议、认证、策略、可观测性 |
| 安全能力 | `capabilities/` | 白名单 Capability 实现 |
| 基础设施 | `infra/cloudflare/`、`infra/launchd/` | Tunnel、进程管理 |
| 运维脚本 | `scripts/` | 一键启动/停止/验证 |

当前 `packages/contracts/`、`packages/auth/`、`packages/policy/`、`apps/action-gateway/` 与 `apps/local-runtime/` 已创建；其他运行时代码目录尚未创建。

## 使用规则

- 实施前必须阅读 `SOL-005` 中对应阶段的任务模板；
- 每阶段严格限定允许修改的文件范围；
- 不提前实现后续阶段；
- 不修改本目录外的方案文档（`docs/` 其余部分）与 `skills/`；
- 每步完成后按正式反馈模板报告。
