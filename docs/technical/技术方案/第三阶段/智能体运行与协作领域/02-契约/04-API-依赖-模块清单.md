---
docId: AGENT-DOC-02-04
title: 智能体运行与协作领域｜API / 依赖 / 模块快速清单
docType: dependency-index
authority: normative
lifecycle: frozen
domain: agent-runtime-collaboration
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 智能体运行与协作领域｜API、依赖与 Module 快速清单

## Domain

```text
Owner:
Agent Package
Role
Worker identity
Role Registry / credential
Collaboration Message Center
Agent Gateway / Custom GPT carrier protocol
```

不拥有 Task workflow、Browser implementation、real Effect、Model runtime、Deployment lifecycle。

## v1 最小业务概念

```text
AgentPackageRef
RoleRef
WorkerRef
RegisteredRole
RoleCredential
CollaborationThread
CollaborationMessage
DeliveryState/ReceiptRef
```

不建立 Agent/Session/AgentRun。

## 固定角色

```text
产品 = 运营 + 产品经理
总控 = 项目管理 + 研发
测试 = 测试 + 运维
```

## Agent Runtime Public API

### Role Registry

```text
listRegisteredRoles(...)
getRegisteredRole(...)
```

### Collaboration

```text
askPeer(...)
replyPeer(...)
```

内部 Task Driver 所需 pending/delivery report capability 必须保持 Agent owner 语义，但不直接暴露给 Custom GPT，除非该 operation 被正式列入相应 Agent Package Actions。

## Local management CLI

```text
role register
role show
role validate
role delete
role key show/rotate
```

register/delete 不是 GPT runtime Public API。

## Product pre-Task flow

```text
user opens product GPT Conversation
→ clarify requirement
→ authoritative Browser identity/c-id observation
→ createTask(product role+worker, dev/test role requirements)
```

## Task execution initialization dependency

```text
human authorization
→ Execution Browser CREATE dev Worker
→ Agent validates/registers worker identity
→ Task.bindTaskWorker(dev)
→ Execution Browser CREATE test Worker
→ Agent validates/registers worker identity
→ Task.bindTaskWorker(test)
→ Task may start formal Node work
```

恢复只补缺失步骤，不重复创建已成功 Worker。

## Requires｜Task

```text
createTask/getTask/getNodeContext
bindTaskWorker
start/complete/wait/reopen Node commands
TaskDocument reads/writes required by role
Task participant/status validation
```

Agent 绝不读 Task SQLite。

## Requires｜Execution

```text
Browser CREATE/RESTORE/WAKE
Collaboration physical delivery
Local typed capabilities
File fetch/materialization
Result/Evidence
```

Agent 绝不直接执行 shell/git/browser effect。

## Requires｜Deployment

```text
Module Graph/config materialization
public-ingress external resource
Custom GPT carrier readiness
verify/doctor/upgrade/ACTION_REQUIRED_WEB
```

## Requires｜Model

仅在 Agent/下游流程需要显式认知算力时使用 Model Public Contract；Custom GPT 自身 Carrier cognition 不等于 Model Domain runtime。

## Gateway

```text
Custom GPT
→ HTTPS 443 public ingress
→ agent-gateway
→ Agent/Task/Execution public contracts
```

约束：45s Action ceiling、request/response `<100k chars`、真实 429/5xx、无 arbitrary custom headers、显式 `x-openai-isConsequential`。

## Browser

Browser Extension 属于 Execution。Agent 只依赖稳定 logical capabilities/results，不依赖 tab/window/content internal id。

## Dev Tunnel

Dev Tunnel 是 Deployment External Resource Module。Agent Gateway requires `public-ingress` capability/moduleRef，不拥有 tunnel login/start/stop。

## Agent Package static config

```text
package.json Agent fields
context/fixed-context.md
memory/memory.md
knowledge/*
actions/custom-gpt.openapi.yaml
carrier requirements profile
```

不存在 runtime dynamic Action schema、Capability Catalog、Schema Composer。

## Authentication

```text
Custom GPT → Gateway = one Role one Bearer/API key
Browser Extension → Execution Runtime = local-platform-token
```

## Collaboration durable boundary

保存逻辑 thread/message/participants/reply relation/delivery state/idempotency；不复制 full transcript、Task docs、Execution logs/evidence 或 Worker 完整上下文。

## 当前不稳定能力

Always Allow、Multi-Action Worker Turn、Conversation-native file handling、Context Pack/ZIP 等只按 `06-状态与实施/KNOWN-LIMITATIONS-AND-SPIKES.md` 使用，不成为无 fallback 主链。
