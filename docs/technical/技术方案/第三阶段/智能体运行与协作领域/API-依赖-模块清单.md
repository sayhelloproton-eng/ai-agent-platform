# 智能体运行与协作领域｜API / 依赖 / 模块快速清单

> v0.2 快速上下文页。完整语义以专题文档为准。

---

# Domain

```text
智能体运行与协作领域
= Agent Package
+ Role Registry / Role Credential
+ Agent Gateway
+ Worker/Conversation carrier semantics
+ Collaboration Message Center
+ Browser Carrier driving integration
+ Dev Tunnel public ingress integration
```

Carrier v1：

```text
ChatGPT Web Custom GPT
```

---

# v1 最小实体

```text
Agent Package  = npm Agent 定义
Role           = registered Custom GPT g-id
Worker/Person  = one Task's Custom GPT Conversation c-id
Thread         = Task 内跨角色协作 thread
Message        = QUESTION / REPLY
```

不建：

```text
Agent business entity
Session entity
AgentRun entity
Worker Pool
```

---

# 固定角色

```text
运营 + 产品经理
总控 = 项目管理 + 研发
测试 + 运维
```

```text
one Agent Package → one current registered Role/workspace
one Task → one Product Worker + one Dev Worker + one Test Worker
Worker Conversation MUST NOT be reused across Tasks
same Task reopen MUST reuse original Worker
```

---

# Agent Runtime Public API

## Role Registry

```text
listRegisteredRoles()
getRegisteredRole(roleRef)
```

## Collaboration

角色侧：

```text
askPeer(taskId, targetAgentPackageRef, content, idempotencyKey)
replyPeer(threadId, content, idempotencyKey)
```

Extension 侧：

```text
listPendingCollaborationMessages(...)
reportCollaborationDelivery(...)
```

约束：

```text
same Task participants only
reply DELIVERED → next question allowed
Message Center never creates Worker
Task terminal → no more collaboration processing; history stays as-is
```

---

# Agent local management CLI

每个 Agent Package 提供自己的管理闭环，概念能力：

```text
setup custom-gpt
show/copy GPT fields
register-role <gpt-url>
show-role
validate-role
delete-role
show-role-key
rotate-role-key
verify/doctor
```

Role 删除：

```text
CLI → Task Public API query non-terminal usage
in use → ROLE_IN_USE
not in use → physical delete registry entry + secret
no tombstone
```

---

# Product pre-Task flow

```text
User ↔ new Product GPT Conversation
→ full requirement discussion
→ get current carrier context / workerRef via Action capability
→ listRegisteredRoles
→ resolve product/dev/test by agentPackageRef
→ createTask(product role+worker, dev role, test role, requirement...)
→ wait for execution approval
```

当前 page URL / c-id 的可靠获取机制必须真实 Carrier E2E。

---

# Task execution initialization

```text
User approves execution
→ Extension creates/binds Dev Worker
→ Extension creates/binds Test Worker
→ both bindings succeed
→ formal Node execution starts
```

`WORKER_BIND` 只绑定，不执行 Task work。

Task Public Contract 需要跨域增加/调整：

```text
Task-level roleBindings
one-time worker binding operation
createTask participant semantics
get/list drive projection
reopenContext
```

精确字段/operationId 由 Task Domain 冻结。

---

# Agent Domain Requires｜Execution

Agent 提需求，Execution 设计/实现：

```text
File/workspace
Git
CodeGraph (if needed)
Node/npm environment
Build/Test/Lint/Typecheck
Runtime/process/ports/logs/health
Machine/network
Controlled command execution
Browser real side effects/Delivery/Receipt
Approval/Policy
```

只走 Execution Public Contract。

---

# Gateway

独立 npm 包：

```text
agent-gateway
```

```text
Custom GPT
→ role-specific Bearer Key
→ Microsoft Dev Tunnel
→ Agent Gateway
→ Agent/Task/Execution Public APIs
```

公网只暴露 Gateway。

Gateway 不拥有 Task/Execution/Collaboration 内部状态。

---

# Browser Extension

独立 npm + Chrome Extension 单元：

```text
browser-extension
```

```text
Task polling
execution approval UI
Dev/Test Worker create/bind
Conversation resolve/reopen
WORKER_BIND / NODE_READY / REOPEN
Collaboration PEER_MESSAGE delivery
Browser Delivery Receipt
```

认证：

```text
local-platform-token
```

不使用 Role Key。

---

# Dev Tunnel

独立 npm 单元：

```text
dev-tunnel
```

自闭环：

```text
setup
account/create-account guidance
login
configure
bind Gateway
start/stop/status
public-url
verify/doctor
```

---

# 七个独立发布单元

```text
agent-runtime
agent-gateway
browser-extension
dev-tunnel
agent-product
agent-controller-dev
agent-test-ops
```

全部遵守统一 Package Lifecycle Protocol；也允许自己的专有命令。

原则：

```text
package owns its own setup/config/account/login/bind/lifecycle details
Platform Deployment discovers/orchestrates/pass-throughs standard package commands
```

---

# Agent Package static config

```text
package.json:
  displayName
  description
  conversationStarters
  instructions
  recommended model
  capability toggles
  action schema pointer
  knowledge file list

context/fixed-context.md
memory/memory.md
knowledge/*
actions/custom-gpt.openapi.yaml
```

不存在：

```text
agent.manifest.json
instructions.md
Capability Catalog
Schema Composer
runtime dynamic Action schema
```

---

# Authentication

```text
Custom GPT → Gateway = one Role one Bearer Key
Browser Extension → local services = local-platform-token
```

Role Key 可以 rotate，不改变 roleRef。

---

# Collaboration durable boundary

保存：

```text
Thread
Question/Reply content
participants
reply relation
delivery attempts/status/receipt timestamps
idempotency
```

不保存：

```text
full GPT transcript
Task docs copy
Execution logs copy
Worker complete context
```

---

# 真正剩余未决

```text
Task exact API/schema
Task execution-init/startTask exact order
startNode ↔ NODE_READY exactly-once order
Product current c-id/url carrier mechanism
Browser c-id creation/restore E2E
Execution Local Resource exact contracts
Deployment lifecycle descriptor/package exact naming
Dev Tunnel/Gateway real E2E
```

详见 `18-未决项与总纲裁决点.md`。
