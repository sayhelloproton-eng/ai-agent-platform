# SOL-TSK-001｜任务消息中心与单任务调度 MVP 技术方案

| 字段 | 值 |
|---|---|
| 方案 ID | `SOL-TSK-001` |
| 状态 | Candidate |
| 所属阶段 | 第二阶段 MVP-3 |
| 核心领域 | Task Control |
| 产品归属 | Platform Management Console 的“任务与工作流”模块 |
| 上游 | 总控 Decision、Goal / Context Ref |
| 下游 | Local Control Work Item、Browser Host Command |

## 一、目标

任务消息中心 MVP 不是建设普通消息队列，而是验证：

> 单个任务能否依靠声明式规则、版本化状态、工作单、事件和调度信号，在不侵入上下游领域内部的前提下，从总控流转到 Local Control，再重新调度总控并最终结束。

任务中心是：

```text
调度中心
+ 工作流控制面
+ 流程解释真源
```

它不一定亲自触发浏览器或执行器，但负责声明下一步由谁处理、等待什么以及为什么。

## 二、需要回答的核心问题

1. Task 能否成为单任务当前状态的唯一解释入口？
2. 总控能否通过业务命令提交 Decision，而不是直接修改状态字段？
3. Local Control 能否领取 Work Item 并只返回结果引用？
4. Browser Host 能否领取 Dispatch Signal，而不读取完整 Task 业务数据？
5. 旧版本、重复命令和非法状态迁移能否被拒绝？
6. 浏览器投递失败是否只影响 Host Signal，而不污染 Task 业务状态？
7. 通过 Event 时间线能否回答“发生了什么、为什么、下一步是谁”？

## 三、上下游领域限制

### 3.1 总控

任务中心接收：

```text
ControllerDecision
```

任务中心只验证：

- `task_version`；
- 当前状态；
- Decision Schema；
- Transition Rule；
- 幂等键；
- 下一处理者是否合法。

任务中心不读取聊天历史、不保存推理过程、不改写 Decision 语义，也不根据自然语言猜测下一步。

### 3.2 Goal / Context

任务中心只保存：

```text
goal_ref
context_ref
```

不保存 Goal 正文、Context 正文和编译规则。

### 3.3 Local Control

任务中心创建：

```text
Work Item
```

Local Control 返回：

```text
result_ref + status + error_code
```

任务中心不生成 Shell、不读取 Git、不解释文件内容，也不操作 Local Control 内部状态。

### 3.4 Browser Host

任务中心创建：

```text
Host Command / Dispatch Signal
```

扩展返回投递状态。扩展不能修改 Task，任务中心不能操作 DOM。

### 3.5 Execution / Artifact / Approval / Evidence

MVP 仅预留引用，不实现完整领域：

```text
execution_ref
artifact_ref
approval_ref
evidence_ref
```

## 四、声明式控制模型

任务中心通过一组版本化表或记录解释流程：

```text
Workflow Definition
→ Transition Rule
→ Task Snapshot
→ Work Item
→ Task Event
→ Dispatch Signal / Host Command
```

数据库不是领域本身。所有写入必须经过 Application Service，直接插表只能作为测试 Fixture，不能作为正式业务入口。

## 五、最小数据模型

### 5.1 `workflow_definitions`

```text
workflow_id
workflow_version
name
initial_state
terminal_states
status
```

MVP 只有一个固定单任务工作流。

### 5.2 `transition_rules`

```text
workflow_id
workflow_version
from_state
trigger_type
to_state
next_handler
required_fields
rule_version
```

示例：

```text
READY_FOR_CONTROLLER
+ REQUEST_CAPABILITY
→ WAITING_FOR_LOCAL_CONTROL
→ local_control
```

### 5.3 `tasks`

```text
task_id
task_version
workflow_id
workflow_version
status
current_handler
next_handler
goal_ref
context_ref
conversation_ref
latest_result_ref
created_at
updated_at
```

Task 是当前 Snapshot，可以更新；每次业务变更递增 `task_version`。

### 5.4 `work_items`

```text
work_item_id
task_id
created_from_task_version
target_domain
capability_ref
arguments_ref
expected_result_type
status
claimed_by
claim_token
result_ref
error_code
created_at
claimed_at
completed_at
```

Work Item 是调度单，不是 Execution 领域完整记录。

### 5.5 `task_events`

```text
event_id
task_id
task_version
event_type
producer
payload_ref
correlation_id
causation_id
created_at
```

Event 不可变，表达已经发生的事实。

### 5.6 `dispatch_signals`

```text
signal_id
task_id
created_from_task_version
signal_type
target_handler
conversation_ref
status
claimed_by
attempt_count
idempotency_key
created_at
delivered_at
last_error
```

Signal 表示等待 Host / Driver 完成的一次投递。

### 5.7 Host Command

扩展 MVP 接入后，Signal 可承载或引用以下 Host Command：

```text
CONTINUE_SESSION
OPEN_ROLE_SESSION
SUBMIT_WAKE_MESSAGE
OBSERVE_RESPONSE
EXECUTE_APPROVED_UI_ACTION
```

当前任务中心只需支持继续总控和打开固定测试审计角色所需的最小命令。

## 六、Task、Event、Signal 与 Work Item 分离

```text
Task Snapshot
回答：现在是什么状态？

Task Event
回答：已经发生了什么？

Dispatch Signal
回答：等待哪个 Driver 完成一次网页宿主投递？

Work Item
回答：等待哪个专业领域完成一次工作？
```

不能把四者压缩成一个“消息表”，否则无法区分当前事实、历史事实、执行请求和宿主投递。

## 七、最小状态机

```text
CREATED
READY_FOR_CONTROLLER
WAITING_FOR_LOCAL_CONTROL
COMPLETED
PAUSED
FAILED
```

正常循环：

```text
CREATED
→ READY_FOR_CONTROLLER
→ WAITING_FOR_LOCAL_CONTROL
→ READY_FOR_CONTROLLER
→ COMPLETED
```

Local Control Result 返回后，任务中心重新进入 `READY_FOR_CONTROLLER`，同时创建新的 Controller Dispatch Signal。

浏览器投递状态不进入 Task 业务状态：

```text
Task.status = READY_FOR_CONTROLLER
Signal.status = PENDING / CLAIMED / DELIVERED / FAILED
```

## 八、公开业务接口

### 8.1 任务入口

```text
task.create
task.get
task.listEvents
```

任务可以由测试脚本、用户入口或前置规划导入，但正式创建必须经过 `task.create`。

### 8.2 总控接口

```text
task.getControllerInput
task.submitDecision
```

`submitDecision` 接收总控 MVP 的 Decision Contract，而不是任意状态 Patch。

### 8.3 Local Control 接口

```text
work.listAvailable
work.claim
work.reportResult
work.reportFailure
```

### 8.4 Browser Host 接口

```text
dispatch.listPending
dispatch.claim
dispatch.ack
dispatch.fail
```

MVP 不建设通用消息总线。以上接口是 Task Control 面向明确上下游提供的 Application Interface。

## 九、业务命令而不是字段修改

禁止提供：

```text
PATCH /tasks/{id}
{"status": "COMPLETED"}
```

应提供：

```text
submitControllerDecision
reportWorkResult
reportWorkFailure
ackHostCommand
pauseTask
```

Application Service 依据当前 Task、expected version 和 Transition Rule 决定是否合法，并在同一事务中更新 Snapshot、创建 Event 及必要的 Work Item / Signal。

## 十、版本、幂等与领取

### 10.1 Expected Version

每个写命令必须携带：

```text
expected_task_version
```

版本不一致时返回：

```text
TASK_VERSION_CONFLICT
```

### 10.2 幂等

创建 Work Item、Signal 和提交 Decision 必须携带：

```text
idempotency_key
```

重复请求返回原结果，不重复产生副作用。

### 10.3 Claim

Work Item 与 Signal 使用最小 Claim Token，防止两个消费者同时处理同一记录。

MVP 为单任务、单消费者，不实现复杂租约、抢占和动态再分配；字段可以预留，规则保持简单。

## 十一、完整串联流程

```text
1. task.create
2. Task = READY_FOR_CONTROLLER
3. 创建 Controller Dispatch Signal
4. Mock Browser Host ack
5. 总控读取 Controller Input
6. 总控提交 REQUEST_CAPABILITY
7. Task Center 验证版本和 Transition
8. 创建 Local Control Work Item
9. Task = WAITING_FOR_LOCAL_CONTROL
10. Local Control claim
11. Local Control reportResult(result_ref)
12. Task = READY_FOR_CONTROLLER
13. 创建新的 Controller Dispatch Signal
14. 总控读取最新 Result Ref
15. 总控提交 COMPLETE
16. Task = COMPLETED
17. Event 时间线可完整回放
```

## 十二、异常语义

### 12.1 旧 Decision

```text
expected_task_version < current
→ 拒绝
→ 不生成 Work Item 或状态迁移 Event
```

可记录独立审计拒绝，但不能改变 Task 业务状态。

### 12.2 Local Control 失败

Local Control 返回：

```text
status = FAILED
error_code
retryable
result_ref / evidence_ref
```

MVP 最小规则将 Task 重新调度给总控：

```text
Task = READY_FOR_CONTROLLER
```

由总控判断重试、暂停或失败。任务中心不自行进行语义重试。

### 12.3 Browser Host 失败

```text
Signal = FAILED
Task 仍保持 READY_FOR_CONTROLLER
```

MVP 允许人工重新产生 Signal；复杂自动恢复后续实现。

### 12.4 无进展

总控连续提交相同 Decision 且没有新 Result：

```text
→ PAUSED
→ reason = NO_PROGRESS
```

该规则可由任务中心基于确定性计数执行，无需模型判断。

### 12.5 非法迁移

在 `WAITING_FOR_LOCAL_CONTROL` 状态提交 `COMPLETE`：

```text
→ TRANSITION_NOT_ALLOWED
```

## 十三、管理后台读模型

任务中心是未来 `Platform Management Console` 的一个模块。

MVP 可提供最小只读页面或调试视图：

```text
Task 概览
当前状态
当前 / 下一处理者
Work Item
Event 时间线
Dispatch Signal
关联 Ref
错误和停止原因
```

前端不得直接修改表。暂停、恢复、重发 Signal 等操作未来必须调用业务命令。

完整控制台不属于本 MVP。

## 十四、测试场景

### 14.1 正常单任务闭环

按第十一节完整执行并完成。

### 14.2 版本冲突

使用旧 `task_version` 提交 Decision，必须拒绝且无业务副作用。

### 14.3 幂等

重复提交同一 Decision：

```text
Work Item 仍只有一个
Event 不重复
```

### 14.4 非法迁移

非法 Decision 返回稳定错误，Task 保持原状态。

### 14.5 Local Control 失败

Task 不被误标完成，重新调度总控。

### 14.6 Host 投递失败

Signal 失败，Task 业务状态不变。

### 14.7 Event 回放

从 Event 顺序重建的关键 Task 状态与当前 Snapshot 一致。

### 14.8 直接数据库写入防线

正式 API 外直接插入不完整 Task 不应被系统接受为正常业务记录；测试 Fixture 必须与正式数据明确隔离。

## 十五、交付物

```text
Task Control Application Service
Workflow Definition Fixture
Transition Rule Fixture
Task Store
Work Item Store
Task Event Store
Dispatch Signal Store
Controller API
Local Control API
Browser Host API
Version / Idempotency Tests
Task Timeline Read Model
Single-Task Integration Test
```

存储技术在实现时选择。MVP 可使用 SQLite 或现有受控数据库，但领域接口不得绑定具体表结构。

## 十六、验收标准

- 单任务完整流转通过；
- Task Snapshot 可查询；
- Event 不可变且可回放；
- Work Item 与 Signal 分离；
- 旧版本被拒绝；
- 重复命令无重复副作用；
- Local Control 只收到业务工作单；
- Browser Host 只收到宿主命令；
- 总控不能直接设置 Task 状态；
- 任务中心不读取本机资源和聊天历史；
- Task Timeline 能解释每次流转；
- 数据可供未来管理后台读取。

## 十七、非目标

- 不做多任务；
- 不做任务依赖图；
- 不做优先级队列；
- 不做通用 Workflow DSL；
- 不做通用多角色编排；
- 不做正式 Approval / Evidence；
- 不做生产消息队列；
- 不做复杂租约、自动恢复和重试；
- 不做完整后台管理系统；
- 不让前端直接改表。

## 十八、后续衔接

MVP-4 只消费 Task Center 的 Host Command，不读取 Task 内部表。

最终串联后，再统一评估：

- Event Envelope 是否抽成共享合同；
- Host Command 是否独立存储；
- Work Item 是否进入通用 Execution Lane；
- Approval / Evidence 如何接入；
- 管理后台 BFF 与读模型；
- 多任务调度和任务依赖关系。
