# SOL-TSK-001 Second-Round Remediation Report

## 1. 基线与范围

- 第二轮审计参考：`main@353a9ff39af6582e33f0ea8078af75f40c64380c`
- 实际实现原则：在上一轮最新 `SOL-TSK-001-audit-remediation-overlay.zip` 累积结果上连续增量整改
- 整改领域：Task Control
- 修改范围：`packages/task-control/**`
- 公共合同：没有修改 `packages/contracts/**`，所有跨域字段仍为 Candidate Proposal

本轮没有修改 CTL、LCL、BHR、Gateway、OpenAPI、Registry、Context 或其他领域代码。

## 2. 已关闭问题

### 2.1 正式 Task Intake Application Port

新增 `TaskIntakeApplicationPort.intakeTask()`：

- 校验输入和合同版本；
- 原子创建 Task、初始不可变 Event 和幂等记录；
- 返回稳定 `TaskIntakeResult`；
- 相同请求稳定回放；
- 不同请求复用 Key 冲突；
- 保留 `createTask()` 仅用于领域内兼容，正式 Adapter 不再需要直接写 Store 或使用 Fixture。

### 2.2 Dispatch Claim / Controller Claim 生命周期竞态

修复链路：

```text
BHR claim
→ 浏览器投递 Ack
→ Controller claim
→ BHR Host Result report
```

关键变化：

- Delivery Ack 与 Host Result 分离；
- Controller Claim 可以消费驱动意图，但不会删除合法 Host Result 上报凭证；
- Dispatch 同时记录 delivery status 与 host result status；
- Ack、Result、Fail 可独立幂等；
- 已投递/已消费 Dispatch 在 Host Result 未结束时，Claim 过期后可重领补报；
- 旧 Epoch Token 继续被 fencing 拒绝；
- 重启后持久化 Claim 仍可完成合法补报。

### 2.3 WorkItem Application Port

新增完整应用 Port：

```text
claim / start / complete / fail / retry / expire
```

- 保留当前节点、版本、角色、Claim 和幂等门禁；
- Work 完成只接受 Result Ref、摘要、状态、错误和 Evidence Ref；
- 拒绝完整 Local Result、Payload 和 Body；
- 每个生命周期变化产生 TaskEvent；
- Retry 恢复节点等待结果状态并生成新尝试。

### 2.4 Host Command / Host Result Port

新增：

- `materializeHostCommand()`；
- `acknowledgeDispatch()`；
- `reportHostResult()`；
- `failHostResult()`。

TSK 只拥有 Dispatch 状态与稳定引用，不保存 DOM、截图正文或浏览器 Binding。

### 2.5 真实节点插入

`INSERT_NODE_AFTER` 不再等同于数组尾部追加：

- 节点插入到锚点后；
- 新节点依赖锚点；
- 原直接 successor 的锚点依赖重连到新节点；
- 执行顺序和操作名称一致。

### 2.6 存储并发边界

明确 `JsonFileTaskControlStore`：

- 单进程；
- 单状态文件；
- 单 Writer；
- 所有 Adapter 共享同一个 Store；
- `transact()` 串行化写入；
- Task/Plan Version 和 Event 顺序继续提供业务并发门禁。

同一路径第二个 Writer 返回 `STORE_SINGLE_WRITER_REQUIRED`。本轮不引入数据库服务、Daemon 或第二控制平面。SQLite/PostgreSQL 迁移等待总控按真实并发需求裁决。

## 3. 模型与事件变化

### WorkItem

新增：

```text
status: RUNNING / EXPIRED
startedAt
resultSummary
evidenceRefs
retryable
```

### Dispatch

增加独立 Host Result 维度：

```text
hostResultStatus
hostResultRef
hostResultSummary
hostEvidenceRefs
reportedAt
```

### Event

新增：

```text
WORK_ITEM_STARTED
WORK_ITEM_RETRIED
WORK_ITEM_EXPIRED
HOST_DISPATCH_CONSUMED
HOST_RESULT_REPORTED
HOST_RESULT_FAILED
```

### Plan Operation

新增并实现：

```text
INSERT_NODE_AFTER
```

## 4. 公共合同提案

`src/integration-proposals.ts` 和 `INTEGRATION-CONTRACT-PROPOSALS.md` 更新为第二轮 Candidate：

- Task Intake Proposal；
- WorkItem Application Proposal；
- Browser Delivery Ack Proposal；
- Browser Host Result Proposal。

这些类型未写入 `packages/contracts`，不得被描述为已冻结公共合同。

## 5. 测试结果

```text
43 tests passed
0 failed
```

第二轮新增重点场景：

- Task Intake 创建、稳定重放和幂等冲突；
- BHR Claim → Delivery Ack → Controller Claim → Host Result；
- Controller Claim 不破坏合法 BHR 回报；
- Dispatch 过期、重领、旧 Token fencing、重复 Ack、重复 Report；
- WorkItem claim / start / complete / fail / retry / expire；
- 完整 Local Result 正文拒绝；
- Host Result 正文拒绝；
- `INSERT_NODE_AFTER` successor 重连和真实执行顺序；
- 多 Application Adapter 共享 Store 时版本和 Event 一致；
- stale version 无事件副作用；
- JSON Store 单 Writer；
- 状态持久化重启后的 Host Result 补报。

## 6. 剩余跨域阻断

### CTL / Gateway

- 仍需总控冻结唯一 Controller/Task 公共合同；
- Gateway 仍需正式 Task Intake 和 Controller Adapter；
- Candidate 字段不能直接替换 `packages/contracts`。

### LCL

- 仍需 WorkItem → Local Work Request Adapter；
- Local Result 到 Result Ref 的注册归属尚待总控裁决；
- TSK 已具备 Work Application Port，但不执行本机命令。

### BHR

- 仍需 Dispatch → 正式 HostCommand Adapter；
- Delivery Ack、Host Result、Observation/Evidence Ref 的公共字段待冻结；
- 会话创建、Binding、DOM 和响应观察仍属于 BHR。

## 7. 自审结论

- 第二轮六项必须处理内容均已实现；
- TSK 现在拥有正式 Task Intake、WorkItem 和 Host Dispatch 应用 Port；
- Dispatch/Controller Claim 不再互相破坏合法生命周期；
- 节点插入语义与真实执行顺序一致；
- JSON Store 的单写者边界已由实现和测试强制；
- 没有保存 Local Result、Context、DOM、截图、Binding 或其他领域正文；
- 没有单方面冻结公共合同；
- 当前达到“TSK 第二轮领域整改完成，具备统一接线所需内部应用能力”，不等同于四领域最终串联通过。
