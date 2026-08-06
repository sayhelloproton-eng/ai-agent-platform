# Task Control MVP Runbook

## 1. 构建与验证

```bash
npm ci
npm run check:task-control
```

正式仓库环境使用 Node.js 20。第二轮领域门禁包含原有测试、第一轮整改测试和 `tests/round2-remediation.test.mjs`。

预期至少：

```text
43 tests passed
0 failed
```

## 2. 启动与持久化

推荐状态文件：

```text
.runtime/task-control/state.json
```

启动：

```text
JsonFileTaskControlStore.open(path)
→ TaskControlService(...)
→ recoverAll()
```

退出时必须调用：

```text
store.close()
```

同一进程内不得对同一路径打开第二个 Json Writer；否则返回 `STORE_SINGLE_WRITER_REQUIRED`。所有 Gateway、Worker、Host Adapter 必须共享同一个 TaskControlService/Store 实例，不能各自打开同一 JSON 文件。

## 3. 正式 Task Intake

新 Adapter 使用：

```text
intakeTask
```

而不是直接写 Store 或调用测试 Fixture。

流程：

```text
校验输入
→ 计算请求指纹
→ 创建 Task Snapshot
→ 创建初始不可变 Event
→ 保存幂等结果
→ 原子提交
```

相同请求重复提交稳定回放；不同请求复用 Key 返回 `IDEMPOTENCY_KEY_CONFLICT`。

## 4. 单 Task 验证顺序

```text
intakeTask
→ reconcile
→ dispatch.listPending
→ dispatch.claim
→ materializeHostCommand
→ dispatch.acknowledgeDelivery
→ task.getDecisionContext
→ task.claimController
→ task.submitControllerCommand(CREATE_PLAN / REQUEST_ROLE_WORK)
→ work.claim
→ work.start
→ work.complete / fail
→ reconcile
→ 再次驱动 controller
→ ADVANCE_PLAN_NODE
→ COMPLETE_TASK
```

Delivery Ack 与 Host Result 是独立阶段。Controller Claim 后，BHR 仍可使用有效 Dispatch Claim Token 上报 Host Result。

## 5. WorkItem 生命周期

```text
PENDING
→ claimWorkItem
→ startWorkItem
→ completeWorkItem / failWorkItem
→ retryWorkItem（需要时）
→ expireWorkItem（确定过期时）
```

Work 完成只允许提交：

- `resultRef`；
- `resultSummary`；
- `evidenceRefs`；
- success / failure；
- `errorCode`、`errorSummary`、`retryable`。

禁止提交完整 Local Result、stdout/stderr 正文、命令 Payload 或任意 Body。

## 6. Browser Dispatch 与 Host Result

正常链路：

```text
claimDispatch
→ materializeHostCommand
→ acknowledgeDispatch
→ Controller Claim 可发生
→ reportHostResult / failHostResult
```

规则：

- Ack 只确认投递；
- Host Result 独立完成；
- 重复 Ack、重复 Result 使用同一请求稳定回放；
- 已投递/已消费但 Host Result 未完成时，Claim 过期后允许重领补报；
- 旧 Claim Epoch 永远不能覆盖新 Claim；
- Task Control 不保存 DOM、截图正文、Binding 或页面内部状态。

## 7. 暂停、恢复与 Approval

```text
claimController
→ PAUSE_TASK
→ Task.status = PAUSED
→ resumeStatus 保存暂停前协调状态
→ 不创建或领取新 Work/Dispatch
→ 已合法开始的外部 Result 仍可按版本回报
→ 重新 claimController
→ RESUME_TASK
```

Approval 领域通过 `ApprovalResolutionPort.resolveApproval()` 提交引用化结果；TSK 不保存 Approval 正文，也不自行判断审批。

## 8. 节点插入

`INSERT_NODE_AFTER(anchor, inserted)` 的确定语义：

1. inserted 节点出现在 anchor 后；
2. inserted 依赖 anchor；
3. 原来直接依赖 anchor 的 successor 改为依赖 inserted；
4. 其他依赖保持不变；
5. 操作必须通过 Plan Version 与结构一致性校验。

不允许“名称叫插入，实际只追加到数组末尾”。

## 9. 恢复与调和

`recoverAll()` 会：

- 清理过期 Controller / Work / Dispatch Claim；
- 为过期、替换和回收写 TaskEvent；
- 对已投递但 Host Result 未完成的 Dispatch 保留上报恢复路径；
- 对账非终止 Task；
- 只提升当前且依赖满足的 PlanNode；
- 为待总控处理的 Task 补建缺失 Dispatch；
- 取消终止 Task 的未开始协调对象；
- 对暂停 Task 保留历史但不创建或领取新工作；
- 保持等待中的外部结果，不伪造失败。

## 10. 事故处理

- `TASK_VERSION_CONFLICT`：重新读取最新 Task，不覆盖写；
- `PLAN_VERSION_CONFLICT`：重新读取最新 Plan；
- `IDEMPOTENCY_KEY_CONFLICT`：停止重试并检查调用方；
- `CLAIM_EXPIRED`：Reconcile 后重新 Claim；
- `CLAIM_TOKEN_INVALID`：检查是否使用了旧 Epoch 或错误阶段 Token；
- `STORE_SINGLE_WRITER_REQUIRED`：关闭重复 Store，让所有 Adapter 共享唯一 Writer；
- `HOST_DISPATCH_FAILED`：保留 Task 业务状态，由 Reconciler 或总控决定重试；
- 状态文件损坏：停止写入，保留原文件，从备份恢复；
- Task 与 Plan 不一致：停止自动推进，按 Event Timeline 审计。

## 11. 不允许的操作

- Gateway 直接写 Store 或使用测试 Fixture 创建正式 Task；
- 多个进程直接写同一 JSON 状态文件；
- 直接编辑状态文件推进 Task；
- 把 Delivery Ack 或 Browser Host 成功当作 Task 完成；
- 让 Worker 修改 Plan；
- 对非当前节点创建 WorkItem；
- 保存完整 Local Result、DOM、截图或 Binding；
- 未经总控审计冻结跨领域字段、状态或错误语义。
