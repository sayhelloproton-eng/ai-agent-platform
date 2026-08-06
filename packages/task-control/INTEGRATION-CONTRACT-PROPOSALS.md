# Task Control Cross-Domain Contract Proposals

- 状态：Candidate，仅供第二阶段总控审计
- 提案版本：`2026-08-06-round2-candidate`
- 所属领域：Task Control
- 约束：本文件和 `src/integration-proposals.ts` **不冻结平台公共合同**；只有总控裁决并进入 `packages/contracts` 的版本才是正式合同。

## 1. 提案目的

第二轮 TSK 已补齐 Task Intake、WorkItem 与 Host Dispatch Application Port。本文件只提出 Adapter 所需最小边界，不允许 Gateway、Worker 或 Browser Host 直接依赖 TSK 内部 Aggregate，也不允许 TSK 保存其他领域正文。

## 2. Task Intake 候选边界

Gateway / 上游提交：

- `contractVersion`；
- `taskId`；
- `title`、`objective`；
- `requiredRole`；
- `requirementRef/goalRef/conversationRef`（可选）；
- 可选初始 Plan；
- `producerRef`、`correlationId`；
- `idempotencyKey`。

TSK 返回稳定创建回执：

- `taskId`；
- `taskVersionAtCreation`；
- `initialEventIds`。

要求：相同请求稳定回放，不同请求复用 Key 冲突；Gateway 不得直接写 Store 或造 Fixture Task。

待总控裁决：

- Task ID 由调用方还是 Task Control 生成；
- `projectId/taskType/subjectRef` 是否进入公共 Intake；
- 初始 Plan 是否允许从 Intake 直接提交；
- 外部字段风格和公共错误码。

## 3. CTL 候选边界

TSK 提供 Controller Input：

- Task/Plan Version；
- required role；
- task status、current node；
- allowed commands；
- latest event cursor；
- Decision Context 引用或投影。

CTL 使用 Query-before-Claim，并提交版本化 Controller Decision。

仍待总控裁决：

- camelCase / snake_case；
- Task、Plan、Node 状态和 Node Kind；
- Command 集合和 Payload；
- `planId/projectId`；
- latest result 摘要和 Event Cursor；
- Error Code 命名空间；
- Gateway 使用进程内 Package Adapter 还是独立本地服务 Adapter。

## 4. LCL / WorkItem 候选边界

TSK 对 Worker 暴露 Work Application Port：

```text
claim → start → complete / fail → retry / expire
```

Local Work Request 只包含：

- `workItemId`；
- `taskId`、`planNodeId`；
- `createdFromTaskVersion`；
- `capabilityRef/inputRef/expectedResultType`；
- `requiredRole`；
- `attempt`。

完成/失败只回报：

- `expectedTaskVersion`、`claimToken`；
- `resultRef`；
- `resultSummary`；
- `evidenceRefs`；
- `errorCode/errorSummary/retryable`；
- 幂等 Key。

TSK 拒绝完整 Local Result、stdout/stderr、命令正文或工具 Payload。

待总控裁决：

- 同步 `local.*` 与异步 WorkItem 的边界；
- Result Ref 注册责任；
- retryable 与重试预算；
- Worker 部署和身份合同。

## 5. BHR / Host Dispatch 候选边界

### Host Command Materialization

TSK 提供：

- Dispatch/Task/WorkItem 标识；
- target role/profile/conversation refs；
- signal type；
- host command type/ref；
- created-from Task Version；
- idempotency reference。

不包含 DOM、截图正文或 Binding 内部结构。

### Delivery Ack

用于确认命令投递，独立于回答结果：

- Dispatch ID；
- Claim Token / Epoch；
- delivered / failed；
- delivery summary / error summary；
- 幂等 Key。

### Host Result

在 Delivery Ack 和 Controller Claim 之后仍可合法上报：

- Dispatch ID；
- Claim Token / Epoch；
- `hostResultRef`；
- summary；
- `evidenceRefs`；
- success / failure；
- error summary；
- 幂等 Key。

TSK 不保存 DOM、截图正文、Binding、Observation 正文或页面识别状态。

待总控裁决：

- Dispatch → 完整 HostCommand 的公共字段；
- Ack、响应开始、响应完成和 Fail 的公共状态机；
- Host Result、Observation、Evidence 注册流程；
- 普通 Wake 与高风险 UI Action 授权边界；
- Conversation/Binding 生命周期。

## 6. 存储与部署候选

当前 JSON Adapter 的正式约束：单进程、单文件、单 Writer。所有 Adapter 必须共享同一 Store 实例。

进入多进程接线前的候选方案：

1. Gateway 内进程内 Package Adapter，保持单 Writer；
2. 独立 Task Control 本地服务，服务内部单 Writer；
3. 经总控批准后迁移 SQLite 单写者或 PostgreSQL。

本领域不单方面选择部署拓扑，也不引入第二套控制平面。

## 7. 接入原则

1. Adapter 只翻译合同，不复制领域真源。
2. Task Intake 必须走应用 Port，不得直接写 Store。
3. CTL 不直接 Patch TSK 内部字段。
4. LCL 不修改 Plan，不传入完整 Local Result 正文。
5. BHR 不决定下一业务节点，不传入 DOM/截图/Binding 正文。
6. Delivery Ack 和 Host Result 是独立生命周期。
7. 所有写入携带版本、幂等 Key 和可验证身份。
8. 总控冻结合同前，Candidate 可以迭代，但不得注册为生产公共语义。
