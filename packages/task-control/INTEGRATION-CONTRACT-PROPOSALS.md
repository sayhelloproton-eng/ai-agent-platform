# Task Control Cross-Domain Integration Contract v1

- 状态：Frozen / Implemented
- 平台公共合同：`packages/contracts/src/phase2-integration.ts`
- 合同版本：`1.0.0`
- TSK 投影兼容层：`src/integration-proposals.ts`

> 文件名保留 `PROPOSALS` 仅为兼容历史引用。本文内容已经由第二阶段总纲冻结；TSK 不再把本文件中的旧 Candidate 形状当作平台合同。

## 1. 所有权

TSK 拥有 Task、Plan、Claim、Work Item、Dispatch、Event、版本、幂等和合法迁移。它不保存 Local Result、Payload、Approval Grant、DOM、截图或模型正文，只保存受控引用、摘要和状态。

## 2. 正式边界

| 边界 | 当前实现 |
|---|---|
| Task Intake | `TaskControlService.intakeTask()`，Gateway 路由 `/v1/task-control/intake` |
| Controller | Query-before-Claim；版本化 Controller Command；首次 Receipt 稳定重放 |
| Local Work | `listPendingWorkItems → claim → start → progress/complete/fail` |
| Browser Dispatch | `list → claim → materialize → deliveryAck → reportToken → result/uncertain` |
| Approval | TSK 只保存 `approvalRef` 和等待状态；Grant 正文在 Integration Store |
| Cancellation | Task、Work Item、Dispatch 均形成可回放取消 Event |

## 3. 稳定 Receipt 与 Projection

写命令按业务作用域保存：

- idempotency key；
- request fingerprint；
- 首次提交的 Task / Plan Version；
- 首次 Event IDs；
- Work Item / Dispatch / Approval 等创建引用；
- createdAt。

安全重放必须返回首次 Receipt，不得用当前 Aggregate 重新拼装。当前状态通过 `getCurrentTask`、`getCurrentWorkItem`、`getCurrentDispatch`、Decision Context 和 Event Timeline 独立查询。

## 4. Dispatch 凭证

```text
Claim Token
→ Delivery Ack
→ Delivery Receipt + Report Token
→ Host Result / Uncertain
→ Report Token consumed
```

- Claim Token 只负责短期领取和命令读取；
- Delivery Receipt 证明指定 Delivery 已记录；
- Report Token 在 Delivery 后独立存在，不因 Controller Claim 而失效；
- `UNCERTAIN` 禁止自动生成替代 Dispatch；
- Delivery、Result 和 Uncertain 必须绑定同一 Task / Dispatch / Command。

## 5. Result / Progress

- `ACCEPTED`、`PARTIAL` 是 Work Item 非终态 Progress；
- `SUCCEEDED` 完成 Work Item 和当前 Plan Node 的结果等待；
- `FAILED` 记录错误与 retryable 候选，不自动绕过预算；
- `UNCERTAIN` 是副作用安全状态，必须人工或总控裁决。

LCL 的单次 Local Request `PARTIAL` 可以是请求终态，但映射到 TSK 后仍是 Work Item 非终态进度。

## 6. 部署

当前生产组合由 Action Gateway 进程持有唯一 `TaskControlService` 和 Store；JSON Store 具备跨进程锁、陈旧锁恢复、原子替换和持久化 Receipt。未来迁移 SQLite/PostgreSQL 不改变公共合同。
