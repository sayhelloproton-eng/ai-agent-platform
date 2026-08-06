# CTL Integration Contract

状态：CTL 最终领域交接候选；公共合同仍由第二阶段总纲冻结。

## 1. 领域边界

CTL 是 Controller 语义层和 Task Control Application Adapter，不拥有：

- Task、Plan、PlanNode、Claim、Event 或持久 Task Store；
- Local Work、Browser Host、Approval 或 Result 正文；
- Task Intake 创建接口。

正式状态和命令提交事实来自 `@ai-agent-platform/task-control`。

## 2. Controller 输入

Controller 先调用 `getTaskDecisionContext(task_id)`，获得：

- Task/Plan Version；
- 当前节点和状态；
- 最新事件、Result/Approval 引用；
- 约束；
- 当前实际可提交的 `allowedControllerCommands`。

未观察最新 Task Version 时不得 Claim。

## 3. Claim

`claimControllerTask` 需要：

- `task_id`；
- `expected_task_version`；
- `idempotency_key`。

Gateway 注入 Profile 和 Role。Task Control 返回 Claim Token、Epoch、版本和过期时间。旧 Epoch Token 必须被 fencing 拒绝。

## 4. Command Adapter

当前无损适配：

- `CREATE_PLAN`；
- `REVISE_PLAN`；
- `ADVANCE_PLAN_NODE`；
- `BLOCK_TASK`；
- `COMPLETE_TASK`。

`REVISE_PLAN / INSERT_NODE_AFTER` 映射为 Task Control 的真实 `INSERT_NODE_AFTER`，由 TSK 原子插入节点并重连直接 successor 依赖。

当前明确拒绝：

- `REQUEST_ROLE_WORK`：Controller Command v1 缺少 `capabilityRef/inputRef/expectedResultType` 和 Result Ref 责任；
- `REQUEST_APPROVAL`：Controller Command v1 缺少正式 `approvalRef` 生产和 Resolution 生命周期；
- WAIT 节点：CTL 与 TSK 的等待模型尚未冻结；
- PAUSE、RESUME、FAIL：TSK 内部已具备，但尚未进入 Controller Command v1。

拒绝必须使用稳定错误，不得静默忽略或伪造成功。

## 5. Command Receipt

正式目标：

```text
Controller Command
→ Task Control 原子提交
→ Task Control 持久化不可变 Command Receipt
→ CTL 将 Receipt 投影为 ControllerCommandResult
```

`ControllerTaskControlService` 提供兼容能力：

- `submitControllerCommandWithReceipt()`；
- `readControllerCommandReceipt()`。

Receipt 至少包含：

- 请求指纹；
- Task Control Command Result；
- 提交时 Task Snapshot；
- 受因果关联的 Task Event；
- Event Sequence 和 Event Count。

CTL 的 `controller-idempotency.json` 仅是响应投影缓存，不是命令提交事实真源。即使 TSK 已提交而 CTL 缓存写入失败，重启后也应从 Task Control Receipt 恢复原始响应。

在总纲为 TSK 实现正式持久 Receipt 前，现有 TSK 调用走兼容 fallback；该 fallback 不能被宣称为已关闭跨进程崩溃窗口。

## 6. 幂等

作用域：

```text
profile_id + task_id + operation + idempotency_key
```

请求必须绑定规范化 SHA-256 指纹：

- 同键同指纹：返回首次稳定 Receipt/响应，`idempotentReplay=true`；
- 同键不同指纹：`CONTROLLER_IDEMPOTENCY_CONFLICT`，无副作用。

## 7. 锁与恢复

CTL 响应缓存锁记录：

- Owner ID；
- PID；
- Host ID；
- 创建时间；
- 过期时间。

活跃同主机 PID 的锁不得被 TTL 误删；死亡 PID 锁可安全回收；跨主机或不可验证锁仅在 TTL 到期后回收。释放锁前必须再次验证 Owner ID，避免删除新持有者的锁。

## 8. Error 映射

- Task/Plan stale version → 对应 Controller Version Conflict；
- Claim 过期/替换 → Controller Claim Expired/Invalid；
- 幂等指纹冲突 → Controller Idempotency Conflict；
- 尚未冻结的命令 → `CONTROLLER_COMMAND_NOT_ALLOWED`，消息以 `CONTRACT_NOT_FROZEN:` 开头；
- 不存在的 Task/Node → Controller Not Found；
- 非法 Plan → Controller Plan Invalid。

## 9. 可复用测试夹具

路径：

```text
apps/action-gateway/tests/fixtures/controller-command-receipt-fixture.mjs
```

夹具模拟由 Task Control 持久化的不可变 Receipt，用于总纲后续实现正式 Receipt Port 和崩溃窗口 E2E，不得作为生产 Store。
