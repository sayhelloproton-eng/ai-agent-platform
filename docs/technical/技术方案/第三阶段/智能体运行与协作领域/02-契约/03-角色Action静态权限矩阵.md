---
docId: AGENT-DOC-02-03
title: 智能体运行与协作领域｜v1 角色 Action 静态权限矩阵
docType: policy-contract
authority: normative
lifecycle: frozen
domain: agent-runtime-collaboration
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 智能体运行与协作领域｜v1 角色 Action 静态权限矩阵

> 每个 Agent Package 的 OpenAPI 是静态、版本化、角色最小化的 Carrier contract。GPT-facing operation 可以是清晰 facade；真实业务合法性始终由 owning Domain Public Contract/Policy 决定。

## 1. 全局原则

1. 角色只看到职责需要的 Actions。
2. operationId/summary/description/parameters 必须能让模型区分读、写、审批、恢复。
3. 输入从 `unknown` 进入 Gateway runtime validation。
4. Gateway 不因为 Action 暴露而获得业务 ownership。
5. 所有真实 Effect 最终进入 Execution Policy/Approval。
6. 每个 operation 显式声明 `x-openai-isConsequential: true|false`。

## 2. 产品 = 运营 + 产品经理

### Agent

```text
listRegisteredRoles
getRegisteredRole（必要时）
```

### Task

```text
createTask
getTask
putTaskDocument
getTaskDocument
```

产品可以在 Task 创建前完成 requirement；createTask 时携带 product role+worker 与 dev/test role requirements。

### Collaboration

Task 建立后，只有确有产品参与业务需求时才暴露 `askPeer/replyPeer`；不把产品 GPT 变成任意消息发送器。

### Execution

产品默认不暴露源码写入、shell、git mutation 等工程 Effect。若未来确有产品侧文件读取需求，必须按最小 capability 单独开放。

## 3. 总控 = 项目管理 + 研发

### Task

```text
getTask
getNodeContext
startNode（仅合法驱动角色/场景）
completeNode
waitNode
failNode
reopenNode
getTaskDocument
putTaskDocument
```

调用方不能在 `startNode` 任意指定 workerRef；Task 自动解析 TaskRoleBinding。

### Collaboration

```text
askPeer
replyPeer
```

### Execution facade

角色可以暴露清晰 facade，例如：

```text
readFile / listFiles / searchFiles
getGitStatus / getGitDiff / getGitLog
queryCode / references / impact
getDependencyInfo / getScripts
runBuild / runTests / runTypecheck / runLint
writeFile / applyPatch
runCommand
process/service/network diagnostics
```

Gateway 统一映射到 Execution `executeCapability` canonical contract；read/mutation/approval 语义由 capability/policy 决定。

## 4. 测试 = 测试 + 运维

### Task

```text
getTask
getNodeContext
completeNode
waitNode
failNode
getTaskDocument
putTaskDocument
```

如测试职责被明确允许触发 reopen，则只暴露具体 `reopenNode`，不得暴露泛化状态修改 Action。

### Collaboration

```text
askPeer
replyPeer
```

### Execution facade

```text
readFile / searchFiles
getGitDiff
runTests / runTypecheck / runLint / build
readLogs / health / port / process diagnostics
browser observe/screenshot（按角色实际需要）
```

高风险 mutation 仍受 Execution Policy/Approval。

## 5. Browser 专用接口不进入 GPT OpenAPI

以下属于 Execution Browser runtime surface，不暴露给 GPT：

```text
bind/restore tab
capture current page identity
content-script heartbeat
page runtime state
permission UI handler
raw submit primitive
recovery scan
```

GPT 只看到业务/领域级 Action。

## 6. Role 管理命令不进入 GPT OpenAPI

```text
role register/delete/key show/key rotate
custom-gpt materialize/setup
```

这些只能在本地管理面执行。

## 7. Gateway path / operationId

- operationId 使用稳定业务动词，不使用 `executeAnything/updateStatus` 等泛化词。
- GPT-facing path 不依赖 arbitrary custom headers。
- taskId/nodeId/workerRef/idempotency/correlation 等必要 metadata 放 typed body/path/query。
- Gateway adapter 再转换成内部 canonical DTO。

## 8. 静态 Schema 版本

每个 Agent Package 自带 `actions/custom-gpt.openapi.yaml`；随 package SemVer 更新。部署后若 schema 与 package version 不一致，Role doctor/verify 必须报告 drift/ACTION_REQUIRED，而不是运行时动态改 schema。

## 9. Collaboration 参数约束

### `askPeer`

模型可给：

```text
targetAgentPackageRef
threadId?
content
idempotencyKey
```

不能自由指定任意 roleRef/workerRef 目标；Agent Runtime 根据 Task participant/binding 解析。

### `replyPeer`

模型给：

```text
threadId
content
idempotencyKey
```

reply target/replyTo 从 Thread 当前状态决定。

## 10. OpenAI Actions transport

### `x-openai-isConsequential`

- query/read/control-without-real-effect：明确 `false`。
- 真实可能产生不可逆/外部 Effect 的 operation：根据实际语义明确 `true`，但这只控制 Carrier confirmation。
- Carrier confirmation **不替代** Execution Approval。

### File Bridge

- 输入文件参数使用 `openaiFileIdRefs`，Gateway 做 runtime object-array normalization。
- 输出文件使用 `openaiFileResponse`，受文件数/大小/类型/response-budget/relay 安全约束。
- File Bridge transport 字段不进入 business DTO。

### Custom Header

GPT Actions schema 不要求 OpenAI 不支持的任意自定义 headers。内部 idempotency/version/correlation 仍可保留，由 typed payload + Gateway adapter 构造。

## 11. Contract Tests

每个 Agent Package 至少验证：

- OpenAPI parse/validation；
- operationId 唯一；
- `x-openai-isConsequential` 每 operation 显式存在；
- 不出现 forbidden dynamic tool/capability catalog；
- 不要求 arbitrary custom headers；
- role-specific allowlist 正确；
- File Bridge schema/transport hard limits；
- Gateway → internal canonical contract mapping；
- real Custom GPT Preview/Action behavior E2E。
