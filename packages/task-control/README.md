# Task Control

`@ai-agent-platform/task-control` 是 `SOL-TSK-001` 的领域实现包，拥有 Task、内嵌版本化 Plan、PlanNode 运行态、三类 Claim、WorkItem、DispatchSignal、TaskEvent、调和器和派生读模型。

本包不实现总控推理、Local Control、本机执行、浏览器 DOM 操作、Approval、Evidence 或 AI 视频专业实体；这些对象只通过稳定引用进入 Task Control。

## 当前能力

- 创建带 Plan 或待总控生成 Plan 的 Task；
- 总控先读取 Decision Context，再领取短期 Controller Claim；
- 通过 `toDecisionContextContractV1` 输出总控冻结的 snake_case 公共合同，并隐藏 Claim Token；
- 通过版本化业务 Command 原子推进 Task、Plan、Node、Event 和下游协调对象；
- 创建、领取和回报异步 WorkItem；
- 创建、领取、确认和失败重试 Browser Host Dispatch；
- Controller Claim、WorkItem Claim、Dispatch Claim 独立，并分别持久化递增 Epoch 防止陈旧写入；
- Task Version / Plan Version 乐观并发控制；
- 幂等创建、命令、Claim 和结果回报；
- 确定性 Task Reconciler，可重复执行而不产生重复副作用；
- Task Timeline、Role Attention Inbox 和 Runtime Dispatch Queue 派生读模型；
- 从有序 Task Event 回放关键 Task / Plan 审计状态；
- 持久化载入时校验 Task、Event、WorkItem 和 Dispatch 结构及引用完整性；
- 进程恢复扫描；
- 原子 JSON 文件持久化 Adapter 和内存测试 Adapter；
- 为后续 SQLite / PostgreSQL Adapter 保留独立 Store Port，并提供目标 SQLite Schema。

## 存储说明

仓库当前坚持零运行时依赖，并以 Node.js 20 为正式基线。Node.js 20 没有内置 SQLite API，而当前仓库也没有 SQLite 驱动。因此本次 MVP 使用：

```text
JsonFileTaskControlStore
→ 单进程事务串行
→ 完整状态克隆
→ 临时文件写入
→ 原子 rename 提交
→ 进程重启后重新读取
```

它用于验证持久化、恢复、幂等与领域语义，不宣称是生产数据库。`schema/sqlite.sql` 冻结了未来 SQLite Adapter 的逻辑表结构；进入多任务并发前应迁移 PostgreSQL。

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
- Task Control 拥有状态、合法迁移、版本、Claim、WorkItem、Dispatch 和 Event；
- Local Control 只返回本机事实；
- Browser Host 只执行 Host Command 并回报宿主事实；
- 消息中心是 Task 事实的投影，不是独立状态真源；
- 公共语义变更必须由总控做跨领域合同审计。

## 当前限制

- MVP 测试以一条 Task 完成闭环，不实现多 Task 调度策略；
- 不提供 HTTP 路由，Gateway Adapter 由后续跨领域串联批次实现；
- 不实现通用 DAG、BPMN、Workflow DSL、优先级队列或生产消息总线；
- `PAUSED` 当前只冻结并保留信息，恢复命令需在公共合同冻结后增加；
- Approval 和 Evidence 只保存引用；
- JSON 文件 Adapter 只适用于单进程本地 MVP。
