# Task Control

`@ai-agent-platform/task-control` 是 `SOL-TSK-001` 的领域实现包，拥有 Task、内嵌版本化 Plan、PlanNode 运行态、三类 Claim、WorkItem、DispatchSignal、TaskEvent、调和器和派生读模型。

本包不实现总控推理、Local Control、本机执行、浏览器 DOM 操作、Approval 决策、Evidence 或 AI 视频专业实体；外部对象只通过稳定引用进入 Task Control。

## 当前能力

- 创建带 Plan 或等待总控生成 Plan 的 Task；
- 总控先读取 Decision Context，再领取短期 Controller Claim；
- 通过 `toDecisionContextContractV1` 提供现有 snake_case 兼容视图，并隐藏 Claim Token；该视图仍等待总控统一合同裁决；
- 通过带 Task/Plan Version 的业务 Command 原子推进 Task、Plan、Node、Event 和协调对象；
- Plan 只有在全部节点进入终态后才能标记 `COMPLETED`；
- 只有当前、依赖已满足的 PlanNode 才能创建 WorkItem 或请求 Approval；
- 创建、领取和回报异步 WorkItem；
- 创建、领取、确认和失败重试 Browser Host Dispatch；
- Controller Claim、WorkItem Claim、Dispatch Claim 独立，并分别持久化递增 Epoch 防止陈旧写入；
- Claim 到期、替换与回收全部写入不可变 TaskEvent；
- 等待 Work、等待 Approval、Blocked 和 Paused 状态允许总控按规则重新 Claim；
- `PAUSE_TASK` 保存恢复状态，`RESUME_TASK` 按当前事实恢复，不重复已完成工作；
- 通过 `resolveApproval()` 提供最小 Approval Resolution Port，只保存 Approval/Result 引用；
- 幂等键绑定规范化请求 SHA-256 指纹；相同 Key 的不同请求返回 `IDEMPOTENCY_KEY_CONFLICT`；
- 确定性 Task Reconciler，可重复执行而不产生重复副作用；
- Task Timeline、Role Attention Inbox 和 Runtime Dispatch Queue 派生读模型；
- 从有序 TaskEvent 回放关键 Task/Plan 审计状态；
- 持久化载入时校验 Task、Event、WorkItem、Dispatch 和幂等记录；
- 原子 JSON 文件持久化 Adapter 和内存测试 Adapter；
- 为后续 SQLite/PostgreSQL Adapter 保留独立 Store Port，并提供目标 SQLite Schema；
- 提供 CTL、LCL、BHR 三组候选接口映射，明确标记为“待总控冻结”，不作为平台公共合同发布。

## 存储说明

仓库当前坚持零运行时依赖，并以 Node.js 20 为正式基线。Node.js 20 没有内置 SQLite API，而当前仓库也没有 SQLite 驱动。因此 MVP 使用：

```text
JsonFileTaskControlStore
→ 单进程事务串行
→ 完整状态克隆
→ 临时文件写入
→ 原子 rename 提交
→ 进程重启后重新读取
```

它用于验证持久化、恢复、幂等与领域语义，不宣称是生产数据库。`schema/sqlite.sql` 冻结的是 TSK 内部目标存储结构，不是跨领域公共合同；进入多任务并发前应迁移 PostgreSQL。

旧状态文件中没有 `resumeStatus` 或 `requestFingerprint` 时会执行安全兼容读取：暂停任务恢复目标默认为 `READY_FOR_CONTROLLER`；旧幂等记录被标记为 legacy 指纹，后续同 Key 新请求会安全冲突而不是错误重放。

## 构建与测试

```bash
npm run build --workspace @ai-agent-platform/task-control
npm run test --workspace @ai-agent-platform/task-control
```

根级验证入口：

```bash
npm run check:task-control
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

## 领域边界

- 总控拥有目标理解、计划语义和结果判断；
- Task Control 拥有状态、合法迁移、版本、Claim、WorkItem、Dispatch、Event 和 Reconciler；
- Local Control 只返回本机事实，TSK 只保存 WorkItem 与 Result Ref；
- Browser Host 只执行 Host Command 并回报宿主事实；
- Approval 领域决定授权结果，TSK 只接收版本化 Resolution；
- 消息中心是 Task 事实的投影，不是独立状态真源；
- 公共语义变更必须由总控做跨领域合同审计。

## 当前限制

- MVP 测试以一条 Task 完成闭环，不实现生产级多 Task 公平调度；
- 不提供 HTTP/Gateway Adapter；Gateway 与正式 TSK 的连接属于总控集成批次；
- 不实现 LCL Worker 或 BHR HostCommand 物化器，仅提供候选 Port/映射；
- 不实现通用 DAG、BPMN、Workflow DSL、优先级队列或生产消息总线；
- Approval 与 Result 正文不进入 Task Control；
- JSON 文件 Adapter 只适用于单进程本地 MVP；
- CTL/LCL/BHR 候选接口尚未进入 `packages/contracts`，不得被描述为冻结公共合同。
