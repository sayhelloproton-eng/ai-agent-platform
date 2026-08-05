# Task Control MVP Runbook

## 1. 构建与验证

```bash
npm ci
npm run check:task-control
```

正式仓库环境使用 Node.js 20。领域整改门禁包括原有测试与 `tests/remediation.test.mjs`。

## 2. 本地持久化

推荐状态文件：

```text
.runtime/task-control/state.json
```

`.runtime/` 必须保持在 Git 忽略范围内。启动时先调用 `recoverAll()`，它会：

- 清理过期 Controller / Work / Dispatch Claim；
- 为每次过期、替换和回收写入 TaskEvent；
- 对账非终止 Task；
- 只提升当前且依赖已满足的 PlanNode；
- 为待总控处理的 Task 补建缺失 Dispatch；
- 取消终止 Task 的未开始协调对象；
- 对暂停 Task 保留既有 WorkItem / Dispatch 历史，但不再创建或允许领取新的协调对象；
- 保持等待中的外部结果，不伪造失败。

## 3. 单 Task 验证顺序

```text
createTask
→ reconcile
→ dispatch.listPending
→ dispatch.claim / dispatch.ack
→ task.getDecisionContext
→ task.claimController
→ task.submitControllerCommand(CREATE_PLAN 或 REQUEST_ROLE_WORK)
→ work.claim / work.reportResult
→ reconcile
→ 再次驱动 controller
→ ADVANCE_PLAN_NODE
→ COMPLETE_TASK
```

Plan 只有在全部节点都为 `COMPLETED/SKIPPED/CANCELLED` 且 `currentNodeId = null` 时才能完成。

## 4. 暂停与恢复

```text
claimController
→ PAUSE_TASK
→ Task.status = PAUSED
→ Task.resumeStatus 保存暂停前协调状态
→ 不创建或领取新 Work/Dispatch
→ 仍允许外部 Work/Approval 结果按版本回报
→ 重新 claimController
→ RESUME_TASK
→ 根据最新事实恢复 WAITING/READY/BLOCKED 状态
```

暂停不删除 Plan、WorkItem、Dispatch、Result Ref、Approval Ref 或 Event。

## 5. Approval Resolution

Approval 领域通过 `ApprovalResolutionPort.resolveApproval()` 提交：

- `taskId`、`approvalRef`；
- `APPROVED/REJECTED/CANCELLED`；
- `expectedTaskVersion`、`expectedPlanVersion`；
- `resultRef` 与摘要（可选）；
- `idempotencyKey`。

Task Control 不保存 Approval 正文，也不自行判断是否应批准。

## 6. 事故处理

- `TASK_VERSION_CONFLICT`：重新读取 Decision Context，不得覆盖写；
- `PLAN_VERSION_CONFLICT`：重新读取最新 Plan，再生成新 Command；
- `IDEMPOTENCY_KEY_CONFLICT`：同一 Key 被不同请求复用；停止重试并检查调用方；
- `CLAIM_EXPIRED`：执行 Reconcile，然后重新 Claim；三类 Claim Epoch 独立递增，旧 Token 不得重用；
- `HOST_DISPATCH_FAILED`：保留 Task 业务状态，Reconciler 可补建新 Dispatch；
- 状态文件损坏：停止写入，保留原文件并从最近备份恢复，不手工拼接 JSON；
- Task 与 Plan 不一致：停止自动推进，按 Event Timeline 审计；
- legacy 幂等记录冲突：换新 Key 重新提交，不删除旧记录。

## 7. 不允许的操作

- 直接编辑状态文件推进 Task；
- 把 Browser Host 成功当作 Task 完成；
- 让 Worker 修改 Plan；
- 对非当前节点创建 WorkItem；
- 在未完成节点存在时完成 Plan；
- 把聊天历史作为恢复真源；
- 未经总控审计增加或重定义公共状态、Command、Event 或跨域字段。
