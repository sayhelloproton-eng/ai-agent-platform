# Roadmap

本 Roadmap 描述阶段顺序，不代表后续能力已经实现。每一阶段必须在上一阶段通过验收并获得人工确认后再开始。

## Phase 1: Knowledge Foundation

建立 Project Context Root、项目级 Context、Git 唯一真源、Knowledge Strategy 与 AI Knowledge Skill，使新 Agent 能恢复项目方向并受控管理长期知识。

当前状态：**Completed**

> Task 001（Context Foundation）、Task 002（知识资产组织）、Task 003-A/B/C（知识配置 v3.0、Project Profile、治理规则对齐）及 `skills/ai-knowledge/` v1.2.0 已完成交付。

## Phase 2: AI Coding Workflow

建立 ChatGPT → Task → Codex → Git 的可追踪工程闭环，包括 Task Contract、Gateway / Bridge、执行、测试、Result、Branch / Commit / PR 和知识回写。

当前状态：**In Progress**

已完成：

- Gateway MVP 渐进式实施方案；
- npm workspaces 根级工程基础，包括 Node.js 版本约束、lock 文件和统一验证入口；
- `packages/contracts`：Task / Result / Error Contract v1、Capability 白名单、运行时校验和测试；
- `apps/action-gateway`：本地 `/health`、`/ready`、Request ID 与统一安全响应格式；
- `packages/auth` 与 Gateway API Key 认证：安全密钥比较、Header 脱敏和受保护 Capability 查询；
- `packages/policy`：Capability 级默认拒绝、明确允许和 Gateway 可见能力过滤；
- `apps/local-runtime`：本地 health、Task Contract 校验、Runtime Policy 二次校验、安全 Capability 调度和 `TaskResult`；
- Action Gateway → Local Runtime：受保护 Task 转发、双层 API Key、双层 Policy、Runtime Client 和真实本地链路验证。
- 公网接入前安全加固：TaskResult 与原 Task 的 `taskId` 绑定、Header 前与 Body 阶段 Timeout 映射、Runtime 二次 Policy 真实链路、未读请求 Body 排空和 Gateway 固定入站 Timeout。
- 公网入口前应用保护与本地编排：单实例 Rate Limit、Gateway / Runtime 无队列并发 Gate、Runtime Busy 安全映射和 Local Stack 启停验证。

下一项：

- 配置 Cloudflare Tunnel，并完成 Custom GPT Action 公网端到端验证。

## Phase 3: AI Video Workflow

以真实复杂业务验证 Agent、Tool、Knowledge、Workflow 与 Provider 的组合能力。

当前状态：**Not Started**

## Roadmap Rules

- 当前一次只执行一个 Phase 内的一个明确任务；
- 不因长期架构存在而提前实现未来模块；
- 阶段完成必须有实际交付物与验证证据；
- 阶段顺序、目标或架构方向的变化由 Project Owner 确认；
- 计划中的能力不得描述为已实现。
