# Task Control Cross-Domain Contract Proposals

- 状态：Candidate，仅供第二阶段总控审计
- 提案版本：`2026-08-05-candidate`
- 所属领域：Task Control
- 约束：本文件和 `src/integration-proposals.ts` **不冻结平台公共合同**；只有总控裁决并进入 `packages/contracts` 的版本才是正式合同。

## 1. 提案目的

综合审计确认 CTL、TSK、LCL、BHR 已分别实现，但尚未形成唯一公共合同。TSK 本轮只准备最小接口边界，避免 Gateway、Worker 或 Browser Host 直接依赖 TSK 内部 Aggregate。

## 2. CTL 候选边界

### Controller Input

TSK 提供：

- `taskId`；
- `taskVersion`；
- `planVersion`；
- `requiredRole`；
- `taskStatus`；
- `currentNodeId`；
- `allowedCommands`；
- `latestEventCursor`；
- Decision Context。

### Controller Claim

CTL 提交：

- `taskId`；
- `expectedTaskVersion`；
- `requiredRole`；
- `profileId`；
- `leaseMs`；
- `idempotencyKey`。

### Controller Decision

CTL 提交：

- `taskId`；
- `expectedTaskVersion`；
- `expectedPlanVersion`；
- `claimToken`；
- `idempotencyKey`；
- 结构化业务 Command。

### 仍待总控裁决

- camelCase 与 snake_case 的唯一外部风格；
- CTL 与 TSK 的 Task、Plan、Node 状态映射；
- Node Kind 的唯一枚举；
- Command 集合和 Payload；
- 是否增加 `planId`、`projectId`；
- `latestResults` 的摘要结构；
- Event Cursor 使用 sequence 还是 Event ID；
- 公共 Error Code 命名空间；
- Gateway 使用进程内 Package Adapter 还是独立本地服务 Adapter。

## 3. LCL 候选边界

### Local Work Request

由 TSK WorkItem 派生，只包含协调信息：

- `workItemId`；
- `taskId`；
- `planNodeId`；
- `createdFromTaskVersion`；
- `capabilityRef`；
- `inputRef`；
- `expectedResultType`；
- `requiredRole`；
- `attempt`。

### Local Work Completion

LCL/Worker 回报：

- `workItemId`；
- success / failure；
- `resultRef`；
- `errorCode`、`errorSummary`；
- `retryable`；
- `idempotencyKey`。

TSK 不保存 Local Result 正文，不拼接 CLI 命令，也不解释本机事实。

### 仍待总控裁决

- 同步 `local.*` 查询不建 WorkItem 的具体 Operation 清单；
- 哪些异步或跨回合操作必须创建 WorkItem；
- Gateway Local Adapter 与 Worker 的部署边界；
- Canonical Local Result 到 Result Ref 的注册流程；
- retryable 的公共语义和重试预算归属。

## 4. BHR 候选边界

### Browser Dispatch

TSK 派生最小驱动意图：

- `dispatchId`；
- `taskId`；
- `workItemId`；
- `createdFromTaskVersion`；
- `target.roleRef/profileRef/conversationRef`；
- `signalType`；
- `hostCommandType`；
- `hostCommandRef`；
- `idempotencyKey`。

### Browser Host Result

BHR 回报引用和宿主事实：

- acknowledged / failed；
- `hostResultRef`；
- `bindingRef`；
- `observationRef`；
- `evidenceRefs`；
- `errorSummary`；
- 扩展 details；
- `idempotencyKey`。

TSK 不保存 DOM、截图正文、页面身份识别逻辑或 Approval Grant。

### 仍待总控裁决

- DispatchSignal 如何物化为完整 HostCommand；
- Wake Payload 的生成、存储和解析；
- HostCommand 动作枚举与 TSK 驱动意图的映射；
- 普通 Wake/Continue 与高风险 UI Action 的授权边界；
- 新建角色会话后的 Binding/Conversation 生命周期；
- HostResult、Observation、Evidence 如何注册成稳定 Ref；
- ACK、送达、响应开始、响应完成和失败的公共状态机。

## 5. 接入原则

1. Adapter 只翻译合同，不复制领域真源。
2. TSK Task/Plan/WorkItem/Dispatch 不进入其他领域内部存储作为第二份权威状态。
3. CTL 不直接 Patch TSK 内部字段。
4. LCL 不修改 Plan。
5. BHR 不决定下一业务节点。
6. 所有写入携带版本、幂等 Key 和可验证身份。
7. 总控冻结合同前，候选接口可以迭代，但不得进入生产 Gateway 作为“正式公共语义”。
