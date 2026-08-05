# SOL-TSK-001 Implementation Report

## 1. 基线

- 仓库输入：`ai-agent-platform-5b1edbe303aa8c3c4388804149a875f8f34ca9dd.zip`
- 方案输入：总控审计后的 `第二阶段(3).zip`
- 实现领域：Task Control
- 公共合同版本：`1.0.0`
- 实施日期：2026-08-05

本次只实现 Task Control 领域代码、测试、运行手册、工作区登记和实现状态；没有修改 Controller、Local Control、Browser Host 的领域代码。

## 2. 已实现

- Task Aggregate 与内嵌版本化 Plan / PlanNode；
- Controller Claim、WorkItem Claim、Dispatch Claim 三类独立租约；
- Claim Epoch 持久递增与陈旧 Token fencing；
- Decision Context 查询与冻结公共合同的 snake_case Adapter；
- 版本化 Controller Command 与原子事务；
- WorkItem 创建、领取、成功/失败回报；
- Browser Host Dispatch 创建、领取、交付、失败重试；
- 确定性 Task Reconciler 与进程恢复扫描；
- Task Timeline、Role Attention Inbox、Runtime Dispatch Queue；
- 关键 Task / Plan 审计状态事件回放；
- 内存 Store、原子 JSON 文件 Store 与未来 SQLite Schema；
- 幂等、版本冲突、角色边界、非法 Plan 和非法持久化防线。

## 3. 验证结果

领域门禁：

```text
npm run check:task-control
20 tests passed / 0 failed
```

不依赖 Git 元数据的现有回归门禁已通过：

```text
check:contracts
check:auth
check:policy
check:gateway
check:runtime
check:dev-tunnel
check:local-chain
check:local-stack
```

## 4. 环境限制

以下门禁无法在当前归档执行环境完整证明：

1. `npm ci`：当前内部 npm 镜像对锁定依赖 `undici-types@6.21.0` 返回 404。未修改依赖版本或绕过仓库锁定策略。
2. `check:repo`：输入 ZIP 不包含 `.git`，且当前容器为 Node 22，仓库正式门禁要求 Node 20。
3. `check:registry`：输入 ZIP 本身把中文路径编码为 `#Uxxxx`，因此现有 Registry 中大量中文 canonical path 无法命中。检查日志未出现 `PKG-TASK-CONTROL`、`CAP-TASK-CONTROL` 或 `packages/task-control` 新增错误。

这些限制不是 Task Control 测试失败。交付后应在真实 Git Worktree、Node 20 和正常 npm registry 环境运行根级 `npm ci && npm run verify`。

## 5. 未实现与后续边界

- Gateway HTTP / Action Adapter：属于后续跨领域串联批次；
- Browser Host 真实页面驱动：由 `SOL-BHR-001` 领域实现；
- Local Control 真实异步 Adapter：由 `SOL-LCL-001` 领域实现；
- Approval、Evidence：仅保存引用；
- `RESUME_TASK`：等待公共合同由总控冻结后再增加；
- 多 Task 并发策略、优先级队列、PostgreSQL、生产消息总线：不属于本 MVP。

## 6. 自审结论

- 未改变总控冻结的公共 Task / Plan / Claim / Command / Event 语义；
- 未让 Task Control 接管其他领域内部状态；
- 消息中心仍是 Task、WorkItem、Dispatch 和 Event 的派生视图；
- Browser Host 投递成功不等于 Task 完成；
- Worker 结果只让 Task 回到总控复审，不自行推进业务计划；
- 一条 Task 完整闭环已通过，正式模型没有被限制为全局单任务。
