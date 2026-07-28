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

`SOL-005` 已定义完整路线图（Phase 0 至 Phase 14）。Monorepo 工程基础、Contracts v1 和 Action Gateway 本地 HTTP 外壳已落地并通过测试；认证、Runtime 与公网 Action 链路尚未实现。每阶段遵循“一步一任务、一步一自检、一步一反馈、一步一审核”原则。

## 当前代码

实现资产位于 [`apps/action-gateway/`](../../../../apps/action-gateway/)。

- 已实现本地 HTTP 外壳；
- 已实现 `GET /health` 和 `GET /ready`；
- 尚未实现认证、Local Runtime 和公网链路。

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

当前 `packages/contracts/` 与 `apps/action-gateway/` 已创建；其他运行时代码目录尚未创建。

## 使用规则

- 实施前必须阅读 `SOL-005` 中对应阶段的任务模板；
- 每阶段严格限定允许修改的文件范围；
- 不提前实现后续阶段；
- 不修改本目录外的方案文档（`docs/` 其余部分）与 `skills/`；
- 每步完成后按正式反馈模板报告。
