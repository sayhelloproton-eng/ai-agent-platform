# 智能体运行与协作领域｜v1 角色 Action 静态权限矩阵

> 目的：把“每个 Agent Package 的 OpenAPI 静态写死”落实到可审计的 Action 面。Agent/Task 已确认接口可冻结；Execution 接口仍需 Execution Domain 最终命名，因此本文对其标记 `REQUIRES FINAL CONTRACT`。

---

# 1. 原则

每个 Custom GPT **只看到自己真实需要的 Action**。

不是：

```text
所有 GPT 共用一个巨大 OpenAPI
→ 靠 Instructions 告诉模型“不要乱用”
```

而是：

```text
package static OpenAPI
→ physically only exposes role-specific operations
→ Gateway role key again validates caller
→ Owner does final legality check
```

---

# 2. 运营 + 产品经理

## CONFIRMED / required

### Agent Domain

```text
listRegisteredRoles
askPeer
replyPeer
```

### Task Domain

```text
createTask
getTask                # task 创建后/协作时按需
getNodeContext         # 若真实有产品相关 Task Node/需要正式上下文时按需
getTaskDocument         # 按需
putTaskDocument         # 如果 Task 创建后仍需要更新正式 Task 文档
```

产品角色的核心 Task 前流程：

```text
需求讨论
→ listRegisteredRoles
→ createTask(initial Requirement + roleBindings)
```

## SHOULD NOT expose by default

```text
startTask
startNode
completeNode（除非某真实 Task Plan 包含产品 Node）
reopenNode
failNode
runCommand
release/deploy mutation
```

Browser Extension/Task driver负责 Task 启动，不让产品 GPT 自己替用户点击启动。

---

# 3. 总控 = 项目管理 + 研发

## Task Domain

```text
getTask
getNodeContext
getTaskDocument
putTaskDocument
completeNode
waitNode
reopenNode
```

按具体 Task API 需要可暴露：

```text
listTaskEvents / pending messages
```

`startNode` 默认由 Browser Extension 驱动，不需要给研发 GPT 自己调用，避免 Worker 自启动未 READY Node。

## Agent Collaboration

```text
askPeer
replyPeer
```

## Execution｜REQUIRES FINAL CONTRACT

读能力至少：

```text
readFile
listFiles/searchFiles
getGitStatus/getGitDiff/getGitLog/getCurrentBranch
getRuntimeVersions
getInstalledDependencies
getProjectScripts
getBuildStatus
getTestResults
getLintResults
getTypecheckResults
getServiceStatus
readLogs
checkHealth
```

代码结构按可用性：

```text
queryCodeGraph / findSymbol / findReferences / impact
```

受控 mutation：

```text
writeFile / applyPatch / runCommand / service mutation
```

必须受 Execution Admission/Approval。

---

# 4. 测试 + 运维

## Task Domain

```text
getTask
getNodeContext
getTaskDocument
putTaskDocument
completeNode
waitNode
```

默认不暴露：

```text
reopenNode
```

原因：当前角色职责下，测试负责产出测试结论/反馈；项目管理+研发角色基于正式结果决定是否 reopen。若后续用户明确要求测试可直接 reopen，再作为静态 Schema 版本变更。

## Agent Collaboration

```text
askPeer
replyPeer
```

## Execution｜REQUIRES FINAL CONTRACT

```text
getBuildStatus
getTestResults
getLintResults
getTypecheckResults
getServiceStatus
getProcessStatus
getPortStatus
readLogs
checkHealth
checkNetwork/checkEndpointReachability
```

发布/运维 mutation：

```text
service/release actions
```

必须受 Execution Admission/Approval。

---

# 5. Browser Extension 专用接口不进入 GPT OpenAPI

以下是 Extension Adapter 能力，不应暴露给角色模型作为 Action：

```text
Task:
listTasks drive projection
startTask
bindTaskWorker
startNode

Agent:
getRegisteredRole
listPendingCollaborationMessages
reportCollaborationDelivery
```

原因：这些是“驱动/投递”能力，不是 Worker 的业务思考工具。

---

# 6. Role 管理命令不进入 GPT OpenAPI

```text
role register
role delete
role validate
custom-gpt setup
```

只在本地 CLI。

否则 GPT 可能修改自己的部署身份/密钥边界。

---

# 7. Gateway path 与 operationId 规则

每个静态 OpenAPI operationId 必须全局稳定、语义单一。

建议 operationId 使用业务动作名，不把 HTTP path 当语义：

```text
listRegisteredRoles
askPeer
replyPeer
getNodeContext
completeNode
waitNode
reopenNode
readFile
getGitStatus
```

避免：

```text
invoke
execute
update
command
operation1
```

如果不同领域恰好 operationId 冲突，在 Gateway/OpenAPI 层使用稳定 namespace，但不要改变领域 API 的业务含义，例如：

```text
agentAskPeer
taskCompleteNode
executionReadFile
```

是否需要 namespace 取决于 Custom GPT OpenAPI 合并后的实际 operationId 唯一性校验。

---

# 8. 静态 Schema 版本规则

Action 集合变化：

```text
新增兼容 Action → Agent Package minor
删除/改语义/改必填参数 → major
纯 description 纠错 → patch（若不改变调用契约）
```

每次 package 版本变更：

```text
local static OpenAPI validate
→ Gateway contract test
→ CLI 提示 Web 更新
```

---

# 9. Action Contract Tests

每个 Agent Package 必须至少测试：

- [ ] OpenAPI syntax valid；
- [ ] operationId unique；
- [ ] only allowed role operations present；
- [ ] no forbidden admin/Extension operations；
- [ ] request required fields match Owner contract；
- [ ] Gateway route exists；
- [ ] role key can call allowed route；
- [ ] role key cannot impersonate another role；
- [ ] downstream domain error correctly preserved/normalized；
- [ ] secret never appears in schema/example。


---

# 10. v0.2 Collaboration Action 参数约束

`askPeer` 不允许模型指定任意外部 worker。推荐静态 Schema 暴露：

```text
taskId
targetAgentPackageRef
content
idempotencyKey
```

Agent Runtime 通过 Task Public API 把 target package 解析为**同一个 Task 的正式 roleRef + workerRef**。

`replyPeer` 推荐：

```text
threadId
content
idempotencyKey
```

目标由 Thread 自动确定。

三个角色都必须遵守：

```text
only same-Task participants
no arbitrary external GPT target
next ask only after previous reply DELIVERED
```

Product Agent Package 还需要一个 Carrier Context/current-link 类 Action 能力，用于在 Task 创建前获得自己的 current workerRef；具体 operationId/provider 在真实 Custom GPT E2E 后冻结。
