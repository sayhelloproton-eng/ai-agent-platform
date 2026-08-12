---
docId: TASK-ORCHESTRATION-CHARTER
title: 任务与编排领域｜领域宪章与 Bounded Context Map
docType: domain-charter
authority: normative
lifecycle: frozen
domain: task-orchestration
boundedContext: task-orchestration
canonicalFor:
- task-orchestration.boundary
- task-orchestration.bounded-context-map
subdomain: null
subdomains:
- task-lifecycle
- task-chain
- node-workflow
- task-documents
- message-event-audit
provides: []
requires: []
contractRefs: []
---

# 任务与编排领域｜领域宪章与 Bounded Context Map

## 1. Purpose

持久化长期工作事实、校验 Task/Node 合法推进并提供稳定查询。

## 2. Owns

- TaskGroup
- Task
- Plan/PlanVersion
- Node/Node runNo
- TaskRoleBinding
- TaskDocument metadata
- TaskMessage
- TaskEvent
- IdempotencyRecord

## 3. Does Not Own

- Role/Worker identity
- Browser DOM/lifecycle
- Model Provider/Inference
- 真实 Effect/Evidence
- Deployment lifecycle

## 4. 主 Bounded Context

```text
task-orchestration
```

正式文档明确冻结一个主要 Bounded Context：Task Orchestration Context，以保持 Task/Node/TaskGroup/Binding/Event/Idempotency 的强一致事务边界。

当前文档体系特别禁止：

```text
package == Bounded Context
service == Bounded Context
folder == Bounded Context
```

## 5. Subdomain｜v1 正式子域

Task Domain 第一版正式划分以下 5 个 Subdomain；它们表达不同业务问题，但**共同位于一个 `task-orchestration` Bounded Context 内**，不因此拆成 5 个 BC。

### 5.1 `task-lifecycle`｜Task Lifecycle

负责 Task 创建、可执行性、人工授权后的 READY、开始、暂停/恢复、等待人工处理、技术失败、完成与终止。

### 5.2 `task-chain`｜Task Chain / TaskGroup

负责大型系统预先建立一组阶段 Task、顺序关系、`maxActiveTasks = 1` 的第一版组内约束、TaskGroup 人工 `READY → ACTIVE`、前序 Task 未完成时后序 Task 不可执行，以及当前 Task `WAITING / FAILED / PAUSED` 时停止继续释放后续 Task。

第一版不是通用 Task DAG。

### 5.3 `node-workflow`｜Node Workflow

负责一个 Task 内的有序 Node、Node 角色要求、具体 Worker 绑定、输入/输出文档要求、自然向后推进和 `reopenNode` 受控回退。

第一版不是通用图工作流引擎。

### 5.4 `task-documents`｜Task Documents

负责 Requirement / PRD / Technical Design / Test Plan / Test Result / Release Result 等 Task-scoped Markdown；Node 显式声明 `inputDocuments / outputDocuments`；Worker 按 `taskId + nodeId` 获取当前 Node 所需上下文；Git 管正文历史，SQLite 只保存当前文档索引、路径与 hash。

### 5.5 `message-event-audit`｜Message / Event / Audit

负责 WAITING / FAILED 等需要人关注的待处理消息、Task / Node 状态事件、审计与问题追踪。第一版不引入消息总线，由 SQLite 保存，扩展/前端轮询读取。

### 5.6 Subdomain 与 Bounded Context 的关系

```text
Task Domain
├── task-lifecycle
├── task-chain
├── node-workflow
├── task-documents
└── message-event-audit
        ↓ shared model boundary
task-orchestration Bounded Context
```

Subdomain 是业务问题划分；Bounded Context 是模型和统一语言适用边界。当前五个 Subdomain 共享同一强一致事务与模型边界。

## 6. Bounded Context → Module

| `task-orchestration` | `@ai-agent-platform/task-orchestration` | library/in-process runtime | — | — |
| `task-store-sqlite` | `@ai-agent-platform/task-store-sqlite` | library | — | — |
| `task-migration-runner` | `@ai-agent-platform/task-migration-runner` | cli/library | — | — |

## 7. Public Boundary

Provides：
- TaskCommandService
- TaskQueryService
- TaskDocumentService

Requires：
- Agent Public Worker/Role facts
- Execution Public Capability/Result
- 必要时 Model infer
- Deployment Module capabilities

跨域依赖必须经过 Public Contract；禁止读取其他领域 DB、Repository、内部 Adapter 或 deep import。

## 8. 详细模型与边界正文

本文件只冻结 DDD 导航边界，不重写原高密度技术正文。详细定义继续由本领域 `01-领域/02-*`、`01-领域/03-*` 和 `02-契约/*` 承载。
