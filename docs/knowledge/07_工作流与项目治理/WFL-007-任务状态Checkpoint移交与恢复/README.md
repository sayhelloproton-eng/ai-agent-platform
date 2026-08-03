# WFL-007 任务状态、Checkpoint、移交与恢复

> 核心结论：Task 必须独立于聊天 Session 和单个 Executor 持续存在；暂停、恢复、移交、取消与终止是正式控制能力，不是异常发生后的临时补丁。

## 1. 文档定位

本文拥有 Task 运行状态、合法转换、Lease、Checkpoint、Handoff、Pause、Resume、Retry、Cancel 和 Terminate。

Context Package 和 Context Instance 属于 `05`；本文只引用它们。Execution 的工具运行细节属于 `WFL-006`，Approval 属于 `WFL-009`。

## 2. 四类状态必须区分

- **Task State**：任务整体所处阶段，由 Task Control 拥有。
- **Execution State**：某次执行尝试、进程或工具调用状态。
- **Context State**：Context Package / Instance 的版本、新鲜度和访问状态。
- **Project State**：阶段、基线、Roadmap 和项目风险，由 `WFL-012` 处理。

Session 是否在线不构成 Task State。

## 3. 建议状态族

```text
created
→ planning
→ ready
→ running
→ verifying
→ reviewing
→ integrating
→ succeeded
```

控制和异常分支：

```text
running / verifying / reviewing
  → waiting_approval
  → blocked
  → pausing → paused → resuming → running
  → cancelling → cancelled
  → terminating → terminated
  → failed
```

状态集合属于目标设计，最终必须与 Contracts 和 Task Control 实现共同 Review；当前人工流程不能被描述为已经具有完整机器状态机。

## 4. 状态转换

每次转换记录：

- Task ID / Version；
- From / To；
- Command；
- Actor；
- 时间；
- 原因；
- Expected Version；
- 相关 Execution / Approval / Evidence / Checkpoint；
- 转换结果。

执行器可以请求转换，但不能仅通过自然语言声明暂停、恢复或完成。

## 5. Lease 与执行所有权

Lease 表示某个 Executor 在限定时间和范围内拥有推进某次 Execution 的权利。

规则：

- 一个互斥 Lane 同一时间只有一个有效 Lease；
- Lease 绑定 Task Version、Executor、Workspace 和期限；
- Heartbeat 丢失不自动重放副作用；
- Version 变化、暂停、取消、终止或人工接管时撤销 Lease；
- 新 Executor 接管前必须校验旧 Lease 和外部状态。

## 6. Checkpoint 触发

以下时机必须考虑 Checkpoint：

- 阶段完成；
- Context 接近上限；
- Session 可能结束；
- 配额或资源不足；
- Executor 异常；
- 等待审批；
- 暂停、移交或终止前；
- 高风险副作用前后；
- 长流程达到稳定执行点。

## 7. Checkpoint Schema

```text
checkpoint_id
task_id / version
task_state
source_commit
workspace_ref
execution_id / execution_point
completed_steps
remaining_steps
context_refs
confirmed_facts
decisions
approval_refs
evidence_refs
side_effect_refs
errors
lease_ref
next_action
created_at / created_by
integrity_hash
```

Checkpoint 保存稳定引用和必要摘要，不复制全部日志，不保存可过期 Secret。敏感内容按权限裁剪。

## 8. Handoff

Handoff 流程：

```text
生成 Checkpoint
  → 发送 Handoff Offer
  → 接收方验证 Task Version、Git、Lease、Evidence 与 Side Effects
  → Accept / Reject / Request Clarification
  → 写入 Receipt
  → 新 Lease
  → 从明确 Execution Point 继续
```

无法确认时进入只读恢复，不猜测前一 Session 的隐藏状态。

## 9. Pause 与 Resume

### Pause

1. 停止创建新副作用；
2. 等待或选择安全点；
3. 保存 Checkpoint；
4. 处理进行中的外部动作；
5. 记录资源和待处理 Approval；
6. 撤销或挂起 Lease；
7. 进入 `paused`。

### Resume

1. 验证 Task Version；
2. 验证 Source Commit、Workspace 和输入；
3. 重建最小 Context；
4. 检查 Permission、Approval 和 Lease；
5. 回读可能部分完成的外部副作用；
6. 通过幂等检查后继续；
7. 从明确 Execution Point 恢复。

禁止盲目重放最后一个命令。

## 10. Retry

Retry 绑定：

- 错误类型；
- 可重试性；
- 最大次数；
- 时间、Token 和成本预算；
- Backoff；
- 幂等键；
- 每次尝试的 Evidence。

权限失败、Scope 冲突、架构决策缺失和不可逆副作用不应自动重试。

## 11. Cancel 与 Terminate

- **Cancel**：用户或系统不再需要任务，尝试有序停止并进入 `cancelled`。
- **Terminate**：风险、失控或无法到达安全点，需要强制终止并进入 `terminated`。
- **Failed**：任务在允许策略下未能完成。
- **Succeeded**：满足完整完成定义。

终止必须撤销 Lease、关闭可控资源、保存最终 Snapshot、记录不可补偿副作用和错误 Evidence。终止永远不能标记为完成。

## 12. Session 丢失后的恢复

恢复只依赖：

- Task Contract；
- Source Commit；
- Checkpoint；
- Context / Evidence / Approval / Side-effect 引用；
- Git 和外部系统 Readback。

不能依赖某个 Chat 的隐藏记忆或 Executor 自述。

## 13. 当前实践与目标

当前使用交接包、固定 SHA、Context 摘要、执行报告和人工停止来维持连续性；Gateway / Runtime 具有超时与并发失败处理，但尚无完整任务级 Pause / Resume / Terminate 状态机。目标是在 Task Control 中实现状态、Lease、Checkpoint 和幂等恢复。
