# Task Control MVP Runbook

## 1. 构建与验证

```bash
npm ci
npm run check:task-control
```

## 2. 本地持久化

推荐状态文件：

```text
.runtime/task-control/state.json
```

`.runtime/` 必须保持在 Git 忽略范围内。启动时先调用 `recoverAll()`，它会：

- 清理过期 Controller / Work / Dispatch Claim；
- 对账非终止 Task；
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

## 4. 事故处理

- `TASK_VERSION_CONFLICT`：重新读取 Decision Context，不得覆盖写；
- `PLAN_VERSION_CONFLICT`：重新读取最新 Plan，再生成新 Command；
- `CLAIM_EXPIRED`：执行 Reconcile，然后重新 Claim；三类 Claim 的 Epoch 独立递增，旧 Token 不得重用；
- `HOST_DISPATCH_FAILED`：保留 Task 状态，Reconciler 会补建新 Dispatch；
- 状态文件损坏：停止写入，保留原文件并从最近备份恢复，不手工拼接 JSON；
- Task 与 Plan 不一致：停止自动推进，按 Event Timeline 审计。

## 5. 不允许的操作

- 直接编辑状态文件推进 Task；
- 把 Browser Host 成功当作 Task 完成；
- 让 Worker 修改 Plan；
- 把聊天历史作为恢复真源；
- 未经总控审计增加公共状态或 Command 枚举。
