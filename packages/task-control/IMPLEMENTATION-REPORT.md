# SOL-TSK-001 Audit Remediation Report

## 1. 基线与范围

- 综合审计基线：`main@eb1444044b50c9a8e00d7da9283d9999e3256d9e`
- 审计日期：2026-08-05
- 整改领域：Task Control
- 实施方式：基于与审计包 TSK 文件哈希一致的领域源码制作增量整改
- 公共合同：未单方面修改 `packages/contracts`

本轮只修改 `packages/task-control/**`。没有修改 CTL、LCL、BHR、Gateway、OpenAPI、Context、Registry 或其他领域实现。

## 2. 审计问题整改

### TSK-H01｜Plan 错误完成

已修复：

- `ADVANCE_PLAN_NODE` 只能推进当前节点；
- 没有 `nextNodeId` 时，必须确认全部节点已处于 `COMPLETED/SKIPPED/CANCELLED`；
- `assertTaskConsistency()` 拒绝“Plan 已完成但仍有未完成节点”的任何写入或持久化恢复。

### TSK-H02｜非当前节点创建 WorkItem

已修复：

- `REQUEST_ROLE_WORK` 必须指向 `plan.currentNodeId`；
- 当前节点必须可执行且依赖满足；
- 同一节点已有活动 WorkItem 时拒绝重复创建；
- `REQUEST_APPROVAL` 使用相同当前节点门禁。

### TSK-H03｜等待态、暂停、恢复和 Approval 不闭合

已修复：

- `WAITING_FOR_ROLE_WORK`、`WAITING_FOR_APPROVAL` 可被 Controller 重新 Claim；
- 等待态可执行 `PAUSE_TASK/FAIL_TASK/RELEASE_CLAIM`；
- 新增 `RESUME_TASK`；
- Task 保存 `resumeStatus`，暂停期间外部 Work/Approval 结果会更新恢复目标而不解除暂停；
- 新增 `ApprovalResolutionPort` 与 `resolveApproval()` 最小应用接口；
- Approval 只以引用进入 TSK。

### TSK-H04｜Claim 过期改变状态但缺 Event

已修复：

- Controller、WorkItem、Dispatch Claim 到期均生成独立 Release Event；
- 直接替换过期 Claim 时先写 Release，再写 Claimed；
- Work/Dispatch Claim 和回收都会推进 Task Version；
- Event causation 链保持连续；
- Claim Epoch 持久递增，旧 Token 被 fencing 拒绝。

### TSK-H05｜幂等 Key 未绑定请求

已修复：

- 所有幂等入口计算规范化请求 SHA-256；
- 指纹排除 `idempotencyKey` 本身并稳定排序对象字段；
- 同 Scope + Key + 相同请求重放原结果；
- 同 Scope + Key + 不同请求返回 `IDEMPOTENCY_KEY_CONFLICT`；
- 冲突、旧版本和非法迁移均在事务草稿上失败，无状态副作用。

## 3. Schema 与状态变化

### Task Aggregate

新增内部字段：

```text
resumeStatus: TaskStatus | null
```

仅在 `PAUSED` 状态存在，用于恢复协调状态。

### Controller Command

新增 TSK 内部命令：

```text
RESUME_TASK
```

是否进入平台统一 Controller Command 合同，等待总控裁决。

### Approval

新增 TSK 应用 Port：

```text
ApprovalResolutionPort.resolveApproval(input)
```

Resolution：`APPROVED/REJECTED/CANCELLED`。

### Event

新增：

```text
WORK_ITEM_CLAIMED
WORK_ITEM_CLAIM_RELEASED
DISPATCH_CLAIMED
DISPATCH_CLAIM_RELEASED
TASK_RESUMED
```

### Idempotency

`IdempotencyRecord` 和目标 SQLite Schema 新增：

```text
request_fingerprint
```

旧 JSON 状态安全迁移为 legacy 指纹，不会误重放不同请求。

## 4. 跨域接口准备

新增：

- `src/integration-proposals.ts`；
- `INTEGRATION-CONTRACT-PROPOSALS.md`；
- CTL Controller Input / Claim / Decision 候选；
- LCL Local Work Request / Completion 候选；
- BHR Browser Dispatch / Host Result 候选；
- 三组候选 Contract Test。

这些接口没有写入 `packages/contracts`，也没有宣称为冻结公共语义。

## 5. 测试结果

```text
33 tests passed
0 failed
```

新增重点测试：

- Plan 完成门禁；
- 当前节点约束；
- 等待 Work 后重新 Claim；
- Pause / Resume；
- Approval wait / resolve；
- 暂停期间 Approval Resolution；
- Work/Dispatch Claim expiry Event；
- 幂等请求指纹冲突；
- 非法 Resume 无副作用；
- CTL/LCL/BHR 候选 Contract Test。

## 6. 剩余跨域差异

### CTL

仍需总控冻结唯一字段风格、状态枚举、Node Kind、Command Payload、Plan/Project 标识、Result 摘要、Event Cursor 和 Error Code。Gateway 仍不能直接用候选接口替换 Fixture。

### LCL

尚未实现 Gateway Local Adapter、WorkItem Worker、LocalRequest 调用和 Result Ref 注册。同步 `local.*` 与异步 WorkItem 的边界仍需总控冻结。

### BHR

尚未实现 Dispatch → HostCommand 物化、Wake Payload、正式 Gateway Operation、Host Result/Observation/Evidence 回写。BHR 会话创建、授权模型和响应生命周期属于 BHR/总控整改。

## 7. 自审结论

- 8 项 TSK 领域整改要求已实现；
- TSK 状态机现在满足单任务串行推进和暂停恢复门禁；
- 版本冲突、非法迁移、幂等冲突均无副作用；
- 没有复制 Local Result、Context、DOM、Approval 正文或其他领域实体；
- 没有单方面改变平台公共合同；
- 当前达到“TSK 领域整改完成、跨域集成就绪提案待总控裁决”，不等同于第二阶段最终串联通过。
