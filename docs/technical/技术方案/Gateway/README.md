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
| `SOL-005-Custom-GPT-Actions与Gateway-MVP渐进式实施方案.md` | 历史总纲（superseded）：原 Cloudflare Tunnel 路线已由 Microsoft Dev Tunnels 当前实现取代，仍保留早期阶段与决策记录 |
| `SOL-006-Task-Result-Error-Contract-v1.md` | 已实现的 Contract v1 设计：Task、Result、Error、Capability 白名单、运行时校验和不变量 |

## 实施状态

当前阶段：**Microsoft Dev Tunnels + Custom GPT Actions MVP 已完成**。

`SOL-005` 保留早期 Phase 0 至 Phase 14 路线作为历史基线。当前已完成 Monorepo 工程基础、Contracts v1、Auth、Capability Policy、Action Gateway → Local Runtime、本地进程编排、Microsoft Dev Tunnels 持久入口、公网直连 `runtime.status`、URL 重启稳定性，以及 Custom GPT Builder、Preview 和正式 GPT Action 调用验证；下一步是最终审阅和提交 MVP 差异。

当前公网链路固定为：

```text
Custom GPT Action
→ Microsoft Dev Tunnel
→ action-gateway
→ local-runtime
```

## 当前代码

实现资产位于 [`apps/action-gateway/`](../../../../apps/action-gateway/)、[`apps/local-runtime/`](../../../../apps/local-runtime/) 和 [`apps/dev-tunnel/`](../../../../apps/dev-tunnel/)。

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
- Microsoft Dev Tunnels 只公开 Gateway loopback 8787，Runtime 8790 不公开；
- Tunnel 匿名访问与 Gateway Bearer 认证继续分层；
- 公网 `/health`、未认证 401、已认证 capabilities 和真实 `runtime.status` 已通过；
- 同一持久 Tunnel 停止并重新 Host 后公网 URL 精确一致；
- Custom GPT Action OpenAPI 模板和本机解析 Schema 已通过 Builder 验证；
- 创建后的正式 Custom GPT 已通过自然语言调用零参数 `POST /v1/runtime/status`，并返回成功的 Local Runtime 状态。

下一步仅包括：

- 最终审阅 MVP 差异；
- 提交已验收的 MVP 变更。

## 代码落位边界

本目录仅存放技术方案文档，**不存放运行时代码**。

当前运行代码位于以下目录：

| 边界 | 目录 | 说明 |
|---|---|---|
| 可运行应用 | `apps/action-gateway/`、`apps/local-runtime/` | Gateway 与 Runtime 服务 |
| 公网开发入口 | `apps/dev-tunnel/` | Microsoft Dev Tunnels 安装、持久资源复用、启动、停止、验证和 OpenAPI |
| 共享库 | `packages/contracts/`、`packages/auth/`、`packages/policy/` | 协议、认证与策略 |
| 仓库脚本 | `scripts/` | 仓库检查与本地链路验证 |

当前公网运行入口统一使用 `apps/dev-tunnel/`。

## 使用规则

- 实施前必须阅读 `SOL-005` 中对应阶段的任务模板；
- 每阶段严格限定允许修改的文件范围；
- 不提前实现后续阶段；
- 不修改本目录外的方案文档（`docs/` 其余部分）与 `skills/`；
- 每步完成后按正式反馈模板报告。
