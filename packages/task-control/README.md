# Task Control

`@ai-agent-platform/task-control` 是 `SOL-TSK-001` 的领域实现包，拥有 Task、内嵌版本化 Plan、PlanNode 运行态、三类 Claim、WorkItem、DispatchSignal、TaskEvent、调和器和派生读模型。

本包不实现总控推理、Local Control、本机执行、浏览器 DOM 操作、Approval 决策、Evidence 正文或 AI 视频专业实体；外部对象只通过稳定引用进入 Task Control。

## 当前能力

### Task Intake

- `TaskIntakeApplicationPort.intakeTask()` 是正式、受验证的 Task 创建入口；
- 创建 Task 与初始不可变 Event 在同一事务中提交；
- 相同幂等 Key + 相同请求稳定回放同一个 `TaskIntakeResult`；
- 相同幂等 Key + 不同请求返回 `IDEMPOTENCY_KEY_CONFLICT`；
- `createTask()` 仅保留为领域内兼容入口，新 Gateway Adapter 不得直接写 Store 或使用 Fixture 造 Task。

### Task、Plan 与 Controller

- 总控先读取 Decision Context，再领取短期 Controller Claim；
- 通过带 Task/Plan Version 的业务 Command 原子推进 Task、Plan、Node、Event 和协调对象；
- Plan 只有在全部节点进入终态后才能标记 `COMPLETED`；
- 只有当前、依赖已满足的 PlanNode 才能创建 WorkItem 或请求 Approval；
- `INSERT_NODE_AFTER` 执行真实插入：节点物理顺序插入到锚点之后，并把原直接 successor 对锚点的依赖重连到新节点；
- 等待 Work、等待 Approval、Blocked 和 Paused 状态允许总控按规则重新 Claim；
- `PAUSE_TASK` 保存恢复状态，`RESUME_TASK` 按当前事实恢复，不重复已完成工作。

### WorkItem Application Port

`WorkItemApplicationPort` 提供完整生命周期：

```text
claim → start → complete / fail → retry / expire
```

- Claim、版本、当前节点、角色和幂等门禁持续生效；
- Work 完成只接受 `resultRef`、摘要、状态、错误与 `evidenceRefs`；
- Task Control 拒绝完整 Local Result、Payload、Body 或其他领域正文；
- WorkItem Claim Epoch 持久递增，旧 Token 被 fencing 拒绝；
- Claim、Start、Complete、Fail、Retry、Expire 都产生不可变 TaskEvent。

### Host Dispatch Application Port

`HostDispatchApplicationPort` 将浏览器生命周期拆成两个独立阶段：

```text
Dispatch Claim
→ Host Command 物化
→ Delivery Ack
→ Controller 可 Claim / 处理
→ Host Result Report / Fail
```

- Delivery Ack 只确认命令已投递，不等于回答已经完成；
- Controller Claim 不再删除 BHR 后续合法上报 Host Result 所需的 Dispatch Claim 凭证；
- Ack、Result、Fail 都可幂等重放；
- Claim 过期后可重领并补报 Host Result，旧 Token 仍被 fencing 拒绝；
- `materializeHostCommand()` 只返回 Host Command 所需的稳定引用和目标，不保存 DOM、截图正文或浏览器 Binding；
- Host Result 只保存 `hostResultRef`、摘要和 `evidenceRefs`。

### 稳定 Command Receipt 与 Current Projection

- Intake、Controller Command、Controller Claim/Release、Work Claim/Start/Complete/Progress/Fail/Retry/Expire、Approval Resolution、Dispatch Claim/Ack/Host Result/Uncertain/Fail 都把**首次提交结果快照**写入幂等账本；
- 相同幂等请求的立即回放、实体状态变化后回放和 JSON Store 重启回放都返回首次快照，不重新读取当前可变实体；
- Controller Command 首次产生的 WorkItem ID、Dispatch ID 和 Event ID 进入稳定 `ControllerCommandReceipt`；
- 当前 Task、WorkItem、Dispatch 和 Event 必须通过 `TaskProjectionApplicationPort` 显式查询，不能把命令回执当作当前状态投影。

### 非二值结果与安全接管

- LCL `ACCEPTED/PARTIAL` 通过 `reportWorkProgress()` 进入非终态进度，WorkItem 保持 `RUNNING`，不会提前完成 Task；
- BHR 可能已经产生网页副作用但无法确认时，通过 `reportUncertainHostResult()` 记录 `UNCERTAIN`；
- `UNCERTAIN` 会阻断自动重发并把 Task 转为需要复核的阻断状态，保留命令指纹、执行阶段、页面身份引用和 Evidence Ref；
- `UNCERTAIN` 不会被降级成普通 Delivery Failure，也不会由 Reconciler 自动创建替代 Dispatch。

### 一致性、恢复与读模型

- Controller Claim、WorkItem Claim、Dispatch Claim 独立，并分别持久化递增 Epoch；
- Claim 到期、替换与回收全部写入不可变 TaskEvent；
- 幂等键绑定规范化请求 SHA-256 指纹；
- stale version、非法迁移、重复命令和指纹冲突均无部分副作用；
- 确定性 Task Reconciler 可重复执行而不产生重复副作用；
- Task Timeline、Role Attention Inbox 和 Runtime Dispatch Queue 为派生读模型；
- 可从有序 TaskEvent 回放关键 Task/Plan 审计状态；
- 持久化载入时校验 Task、Event、WorkItem、Dispatch 和幂等记录。

## 存储与并发边界

MVP 使用 `JsonFileTaskControlStore`：

```text
单状态文件
→ 跨进程 PID/Token Writer Lock
→ 进程内事务串行
→ 完整状态克隆
→ 临时文件写入
→ 原子 rename 提交
→ 重启后重新读取
```

- 同一路径只能存在一个有效 Writer；同进程或另一 OS 进程误启动第二个 Writer 时显式返回 `STORE_SINGLE_WRITER_REQUIRED`；
- Writer Lock 保存 PID、hostname、随机 Token、获取时间和更新时间；同主机 PID 已死亡或锁达到允许恢复条件时，可以安全回收陈旧锁；
- 每次事务提交前重新校验 Lock Token，锁被替换时拒绝写入，避免失去所有权后继续覆盖状态；
- 多个 Application Port 或 Adapter 必须共享同一个 Store/Service 实例，写入统一经过 `transact()`；
- Task/Plan Version、Claim Epoch、Event Sequence 和幂等指纹继续承担业务并发门禁。

该 Adapter 现在可以显式阻止跨进程并发写导致的静默丢更新，但仍是本地单 Writer MVP，不是生产级共享数据库。多主机、高可用或大规模并发前，应由总控冻结 SQLite 单写服务或 PostgreSQL 迁移决策；本领域没有引入第二 Gateway、第二 Task Store、消息队列或 Daemon。

`schema/sqlite.sql` 只是 TSK 内部最低迁移参考，不是已经批准的基础设施决策或跨领域公共合同。

## 构建与测试

```bash
npm run build --workspace @ai-agent-platform/task-control
npm run test --workspace @ai-agent-platform/task-control
```

根级验证入口：

```bash
npm run check:task-control
```

当前最终领域回归：

```text
55 tests passed
0 failed
```

## 主要入口

```ts
import {
  JsonFileTaskControlStore,
  RandomIdGenerator,
  SystemClock,
  TaskControlService,
} from "@ai-agent-platform/task-control";

const store = await JsonFileTaskControlStore.open(".runtime/task-control/state.json");
const service = new TaskControlService(
  store,
  new SystemClock(),
  new RandomIdGenerator(),
);

await service.recoverAll();
```

进程关闭时应调用 `store.close()` 释放文件 Writer 所有权。

## 领域边界

- 总控拥有目标理解、计划语义和结果判断；
- Task Control 拥有 Task Intake、状态、合法迁移、版本、Claim、WorkItem、Dispatch、Event 和 Reconciler；
- Local Control 只返回本机事实，TSK 只保存 WorkItem 与 Result Ref；
- Browser Host 只执行 Host Command 并回报宿主事实；
- Approval 领域决定授权结果，TSK 只接收版本化 Resolution；
- 消息中心是 Task 事实的投影，不是独立状态真源；
- 公共语义变更必须由总控做跨领域合同审计。

## 当前限制

- MVP 测试以一条 Task 完成闭环，不实现生产级多 Task 公平调度；
- 不提供 HTTP/Gateway Adapter；Gateway 与正式 TSK 的连接属于总控集成批次；
- 不执行 LCL 命令或 BHR DOM 动作，只提供领域 Application Port 和候选映射；
- 不实现通用 DAG、BPMN、Workflow DSL、优先级队列或生产消息总线；
- Approval、Local Result、DOM、截图和 Binding 正文不进入 Task Control；
- JSON 文件 Adapter 只适用于单状态文件、跨进程互斥的单 Writer MVP，不提供多主机共享写；
- CTL/LCL/BHR 候选接口尚未进入 `packages/contracts`，不得描述为冻结公共合同。
