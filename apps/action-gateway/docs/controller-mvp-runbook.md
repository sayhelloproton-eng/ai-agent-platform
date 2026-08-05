# Controller MVP Runbook

## 范围

本 Runbook 验证 `SOL-CTL-001` 的代码闭环：

```text
Decision Context → Controller Claim → Controller Command
→ Task + Plan + Event 一致更新 → Claim 释放或任务完成
```

当前 Task Control 是 Action Gateway 内显式标注的内存 Fixture，不是 `SOL-TSK-001` 的正式存储实现。

## 启动

使用 Node 20 和仓库锁定依赖：

```bash
npm ci
npm run local:build
```

设置现有 Gateway / Runtime Key，并可选设置：

```text
ACTION_GATEWAY_CONTROLLER_PROFILE_ID=ai-agent-platform-controller
```

启动 Gateway 后，Fixture 提供：

```text
task_id = task-ctl-001
required_role = controller
plan = null
```

## Action 顺序

1. `POST /v1/controller/task-context`
2. 使用返回的 `task.taskVersion` 调用 `POST /v1/controller/task-claim`
3. 使用 Claim 返回的新 `taskVersion` 和 `claimToken` 调用 `POST /v1/controller/task-command`
4. 每次命令使用最新 `taskVersion` 与 `planVersion`
5. 完成或停止时调用 `POST /v1/controller/task-release`；`COMPLETE_TASK` 会自动清除 Claim

模型不得提交 `profileId`、`roleId`、Actor 或 Plan Node 运行状态。

## 验证

```bash
npm run check:controller-mvp
npm run check:contracts
npm run check:gateway
npm run check:dev-tunnel
```

Builder 侧还必须完成：

```text
解析生成后的 OpenAPI
→ 配置 Bearer Key
→ Preview 查询 task-ctl-001
→ Claim
→ 创建最小 Plan
→ 提交推进命令
```

Builder Preview 未真实完成前，只能称为代码与本地 HTTP 闭环通过。
