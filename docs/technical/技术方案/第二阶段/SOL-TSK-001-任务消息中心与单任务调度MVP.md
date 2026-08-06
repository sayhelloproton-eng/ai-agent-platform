# SOL-TSK-001｜任务消息中心与单任务调度 MVP 技术方案

## 2026-08-06 实现状态（当前有效）

| 项目 | 当前结论 |
|---|---|
| 状态 | **Implemented / Integrated** |
| 正式 Intake | `POST /v1/task-control/intake` → `TaskControlService.intakeTask()` |
| 持久化 | JSON Store 具备跨进程写锁、陈旧锁恢复、原子替换和持久化首次 Receipt |
| Work 调度 | 正式 TSK → LCL Worker 已接入 Action Gateway |
| Browser 调度 | `REQUEST_ROLE_WORK(targetDomain=browser-host)` 同时创建 Work Item 与 Dispatch |
| 凭证生命周期 | Claim Token 只负责领取；Delivery Receipt 证明投递；Report Token 独立负责最终结果/不确定回报 |
| 不确定副作用 | `UNCERTAIN` 进入人工/总控复核，禁止自动重发 |
| 取消 | Task、Work Item、Dispatch 取消均形成审计事件并清理有效凭证 |
| 内容边界 | Task Store 不保存 Payload、Result、DOM、截图、Approval Grant 正文 |

`packages/task-control/src/integration-proposals.ts` 现在只是 TSK 内部状态投影兼容层；平台公共线协议以 `packages/contracts/src/phase2-integration.ts` 的 `1.0.0` 为准，不再把 Candidate Proposal 当作跨域合同。


| 字段 | 值 |
|---|---|
| 方案 ID | `SOL-TSK-001` |
| 状态 | Implemented / Integrated |
| 所属阶段 | 第二阶段 MVP-3 |
| 核心领域 | Task Control |
| 产品归属 | Platform Management Console 的“任务与工作流”模块 |
| 上游 | Requirement / Goal Ref、Controller Command、Local Result、Host Result |
| 下游 | Controller Decision Context、Role Work Item、Browser Host Command |

## 一、本文拥有的问题

本文只回答一个核心问题：

> 单个 Task 能否把目标引用、结构化 Plan、当前处理角色、工作请求、执行结果、事件和宿主投递组织成一个可持久化、可解释、可恢复的控制闭环，并在不侵入相邻领域内部模型的前提下驱动总控、Local Control 和 Browser Host 协作？

任务消息中心不是普通消息队列，也不是通用工作流引擎。它是第二阶段的最小任务控制面：

```text
Task Aggregate
+ 结构化 Plan
+ 业务命令
+ 角色 Claim
+ Work Item
+ Task Event
+ Dispatch Signal / Host Command
+ Timeline Read Model
```

## 二、已确认前提

1. Task 中必须存在结构化 `plan` 字段。
2. Plan 可以由前置需求规划角色生成，也可以由总控首次处理时生成。
3. 简单 Task 仍有 Plan，但可以只有一个节点。
4. 任务推进不是单独修改 `task.status`，而是同步更新 Task、Plan / PlanNode、Event 和必要的下游引用。
5. Task 长期归属于 `required_role`，具体 Agent Profile 只领取短期 Claim。
6. 总控必须先读取完整 Decision Context，再领取 Task，不能看到 `task_id` 就直接 Claim。
7. Task Control 只校验结构、状态、版本、权限和合法迁移，不自行推理 Plan 应该写什么。
8. Local Control、Browser Host、Approval、Evidence 和模型推理 Provider 各自拥有自己的内部状态；Task Control 只保存引用和协调状态。
9. 总控当前回合的同步 Local Query 可以直接经 Gateway 返回，不强制创建 Work Item；跨回合、长时、需要交接、轮询或副作用的工作才进入 Work Item。
10. 第二阶段只验证单 Task，不建设多 Task DAG、生产队列或通用 Workflow DSL。

## 三、领域边界

### 3.1 Task Control 拥有

- Task Aggregate；
- Task 当前版本和生命周期状态；
- Task 内嵌的 Plan 运行态；
- Plan Node 的结构状态和关联引用；
- `required_role` 与当前 Controller Claim；
- Work Item；
- Task Event；
- Dispatch Signal / Host Command 的任务侧记录；
- 合法业务命令与迁移规则；
- 幂等、乐观并发和 Claim 租约；
- Timeline / Decision Context 读模型。

### 3.2 Task Control 不拥有

| 对象 | 所属领域 | Task Control 只保存 |
|---|---|---|
| 需求正文、产品定义、Goal 语义 | Requirement / Goal / Planning | `requirement_ref`、`goal_ref`、必要摘要 |
| 总控角色规则与 Custom GPT 配置 | Agent Governance | `required_role`、`profile_ref` |
| 模型推理过程 | Controller / Inference Provider | Command 和业务原因摘要 |
| 本机 Git、文件、Runtime 状态 | Local Control | `capability_ref`、`result_ref`、摘要、错误码 |
| 真实执行 Attempt | Execution | `execution_ref` |
| Artifact 文件本体 | Artifact | `artifact_ref` |
| 审批决定与令牌 | Approval | `approval_ref`、等待状态 |
| 截图、日志和 Readback | Evidence | `evidence_ref` |
| 浏览器标签页、DOM 和会话本体 | Browser Host | `conversation_ref`、`host_command_ref`、Host Result |
| 手机或 DeepSeek 模型实例 | Model Inference | `inference_result_ref` |

核心规则：

> Task Control 拥有协调事实，不复制专业领域内部实体；聚合公开结果不转移数据所有权。

### 3.3 领域自治与平台公共语义治理

Task Control 可以独立设计、实现和迭代自己的内部模型与代码，包括：

- Aggregate、Entity、Value Object 和 Domain Policy 的内部组织；
- Application Service、Repository、事务和持久化实现；
- 单 Task 调度器 / Reconciler 的内部算法；
- Timeline、任务关注列表和调试读模型；
- SQLite 到 PostgreSQL 的存储迁移；
- 不改变外部语义的性能、索引、缓存和模块拆分。

Task Control 不得独立改变以下平台公共语义：

```text
task_id / task_version / plan_version
required_role / profile_ref
Controller Claim / Work Item Claim / Dispatch Claim
Task / PlanNode / WorkItem / Dispatch 状态含义
Controller Command / Worker Result / Host Result
Decision Context
Result Ref / Approval Ref / Evidence Ref / Conversation Ref
correlation_id / causation_id / idempotency_key
总控 → Task Control → Local Control / Browser Host 的端到端链路
```

公共合同由总控治理面维护架构基线、合同版本、兼容性规则、跨领域变更审计和最终串联验收。Task Control 领域可以提出合同变更，但不得先在实现中改变语义再要求其他领域适配。

公共合同变更至少必须经过：

```text
领域提出 Change Proposal
→ 说明问题、影响范围和兼容策略
→ 总控进行跨领域审计
→ 冻结新合同版本与迁移窗口
→ 各领域分别实现
→ Contract Test 与端到端串联验收
→ 才能提升为新的平台公共语义
```

Task Control 对 Host Command、Local Result、Approval Ref 等对象只拥有本领域的引用和协调记录，不拥有这些公共合同的单方面解释权。


## 四、Task Aggregate

### 4.1 最小结构

```json
{
  "task_id": "task-001",
  "task_version": 12,
  "title": "验证本地 Runtime 当前状态",
  "objective": "获得最新 Runtime 状态并决定是否继续后续验证",
  "requirement_ref": "requirement-001",
  "goal_ref": "goal-001",
  "required_role": "controller",
  "status": "READY_FOR_CONTROLLER",
  "plan": {
    "plan_version": 4,
    "source": {
      "type": "controller",
      "ref": "ai-agent-platform-controller"
    },
    "status": "ACTIVE",
    "current_node_id": "node-02",
    "nodes": []
  },
  "controller_claim": null,
  "latest_event_id": "event-118",
  "latest_result_refs": ["result-runtime-001"],
  "approval_refs": [],
  "conversation_ref": "conversation-001",
  "created_at": "...",
  "updated_at": "..."
}
```

### 4.2 Task 的不变量

- `task_id` 创建后不变；
- 每次被接受的业务变更递增 `task_version`；
- `required_role` 表示长期处理资格，不表示某个会话永久占有；
- 非终止 Task 必须拥有可解释的当前处理阶段；
- Task 完成时 Plan 必须满足完成条件；
- Task 失败或取消时，未完成 Plan Node 必须进入可解释的停止状态；
- Task 不保存模型完整思维过程；
- Task 不允许通过任意字段 Patch 修改。

## 五、结构化 Plan

### 5.1 Plan 的定位

Plan 是 Task Aggregate 内的版本化执行计划，不单独建设完整 Planning 平台。

来源可以是：

```text
用户或需求正文
产品经理 / 规划角色
总控首次处理
结构化任务模板
```

Task 创建时允许：

- 已携带合法 Plan；
- 暂无 Plan，但必须进入 `PLAN_REQUIRED` 或 `READY_FOR_CONTROLLER`，由总控生成；
- 简单 Task 携带一个单节点 Plan。

### 5.2 Plan 最小字段

```text
plan_version
source
status
current_node_id
nodes[]
created_at
updated_at
```

Plan 状态：

```text
DRAFT
ACTIVE
BLOCKED
COMPLETED
CANCELLED
```

### 5.3 Plan Node 最小字段

```json
{
  "node_id": "node-02",
  "title": "判断是否需要启动 Runtime",
  "kind": "DECISION",
  "status": "BLOCKED",
  "required_role": "controller",
  "depends_on": ["node-01"],
  "acceptance_criteria": [
    "根据最新 Runtime Result 给出下一步"
  ],
  "work_refs": [],
  "result_refs": ["result-runtime-001"],
  "approval_ref": null,
  "summary": "Runtime 当前不可连接"
}
```

Node 类型保持最小：

```text
ACTION
DECISION
REVIEW
APPROVAL
SUMMARY
```

Node 状态：

```text
PENDING
READY
IN_PROGRESS
WAITING_RESULT
WAITING_APPROVAL
BLOCKED
COMPLETED
SKIPPED
CANCELLED
FAILED
```

### 5.4 MVP 计划形态

MVP 使用版本化 Node List：

- 默认顺序推进；
- 允许少量 `depends_on`；
- 支持插入、替换、跳过、取消和完成节点；
- 一个 Node 可以关联一个或多个 Work Item；
- 一个 Work Item 只服务一个主要 Node；
- 不实现任意 DAG、并行 Join、循环表达式和通用条件 DSL。

### 5.5 语义所有权

| 行为 | 总控 / 规划角色 | Task Control |
|---|---:|---:|
| 决定 Plan 有哪些节点 | 是 | 否 |
| 判断原计划是否仍成立 | 是 | 否 |
| 提交节点插入、替换、完成 | 是 | 接收并校验 |
| 校验 Node ID、版本、状态和引用 | 否 | 是 |
| 保证 Task / Plan / Event 原子一致 | 否 | 是 |
| 自行根据错误日志发明补救节点 | 否 | 否 |

> 智能角色拥有计划语义，Task Control 拥有计划运行态和一致性。

## 六、角色归属与三类 Claim

### 6.1 Task 长期归属

```text
required_role = controller
```

表示当前 Task 需要具备 `controller` 角色的 Agent 处理。

Task 不永久绑定某个 Custom GPT、某个 Chat 会话或某个 Provider ID。

### 6.2 Controller Claim

总控在读取 Decision Context 并确认资格后，领取短期处理租约：

```json
{
  "claim_id": "claim-controller-001",
  "task_id": "task-001",
  "role_id": "controller",
  "claimed_by_profile": "ai-agent-platform-controller",
  "claimed_from_task_version": 12,
  "expires_at": "..."
}
```

前置条件：

- Task 当前允许总控处理；
- 调用凭据解析出的角色与 `required_role` 匹配；
- `expected_task_version` 正确；
- 当前无有效 Controller Claim，或旧 Claim 已过期；
- Profile 的项目范围包含该 Task；
- 幂等键有效。

### 6.3 Work Item Claim

专业执行域只领取 Task Control 已创建的异步或可交接 Work Item，不领取 Task 的语义所有权。同步 `local.*` 查询不需要 Work Item Claim；它在当前 Controller 回合返回 Canonical Local Result。

### 6.4 Dispatch Claim

Browser Host 只领取 Dispatch Signal / Host Command，不领取 Task 或 Controller Claim。

### 6.5 同角色接管

以下场景允许新的同角色总控接管：

- 原 Claim 超时；
- 原总控主动释放；
- 原 Chat 会话关闭；
- Browser Host 打开新的同角色会话；
- 人工在另一个同角色入口提交 `task_id`；
- Task 因结果、审批或错误重新进入待总控处理状态。

新总控通过 Decision Context 和 Event 历史恢复，不继承旧聊天全文。

## 七、Task 状态机

### 7.1 最小状态

```text
CREATED
PLAN_REQUIRED
READY_FOR_CONTROLLER
WAITING_FOR_ROLE_WORK
WAITING_FOR_APPROVAL
BLOCKED
PAUSED
COMPLETED
FAILED
CANCELLED
```

### 7.2 正常循环

```text
CREATED
→ PLAN_REQUIRED / READY_FOR_CONTROLLER
→ READY_FOR_CONTROLLER
→ WAITING_FOR_ROLE_WORK
→ READY_FOR_CONTROLLER
→ COMPLETED
```

### 7.3 状态与 Plan 必须联动

| 场景 | Task 状态 | Plan / Node 变化 |
|---|---|---|
| 总控生成首版计划 | `PLAN_REQUIRED → READY_FOR_CONTROLLER` | `plan_version=1`，首节点 Ready |
| 请求执行角色工作 | `READY_FOR_CONTROLLER → WAITING_FOR_ROLE_WORK` | 当前 Node Waiting Result，绑定 Work Item |
| 工作成功 | `WAITING_FOR_ROLE_WORK → READY_FOR_CONTROLLER` | 记录 Result，当前 Node 可完成或等待总控复审 |
| 工作失败 | `WAITING_FOR_ROLE_WORK → READY_FOR_CONTROLLER / BLOCKED` | Node 记录失败；总控决定重试或改计划 |
| 请求审批 | `READY_FOR_CONTROLLER → WAITING_FOR_APPROVAL` | Node Waiting Approval，绑定 `approval_ref` |
| 审批完成 | `WAITING_FOR_APPROVAL → READY_FOR_CONTROLLER` | Node 获得审批结果引用 |
| 完成 | `READY_FOR_CONTROLLER → COMPLETED` | Plan Completed，必需 Node 满足验收 |
| 终止 | 任意允许状态 → `FAILED / CANCELLED` | 未执行 Node 取消并记录原因 |

Browser Host 投递状态不直接进入 Task 业务状态：

```text
Task.status = READY_FOR_CONTROLLER
DispatchSignal.status = PENDING / CLAIMED / DELIVERED / CONSUMED / FAILED / CANCELLED
```

Host 投递失败不会把 Task 标记为业务失败。

## 八、Controller Decision Context

### 8.1 查询入口

```text
task.getDecisionContext(task_id)
```

总控必须先读取，再 Claim。

### 8.2 最小返回

```json
{
  "contract_version": "1.0.0",
  "task": {
    "task_id": "task-001",
    "task_version": 12,
    "required_role": "controller",
    "status": "READY_FOR_CONTROLLER",
    "objective": "获得 Runtime 状态并决定下一步",
    "plan": {
      "plan_version": 4,
      "current_node_id": "node-02",
      "nodes": []
    }
  },
  "requirement": {
    "ref": "requirement-001",
    "summary": "只读检查，不允许启动或修改服务",
    "acceptance_criteria": []
  },
  "recent_events": [],
  "latest_results": [],
  "constraints": [],
  "pending_approvals": [],
  "available_context_refs": [],
  "allowed_controller_commands": [],
  "active_claim": null,
  "next_event_cursor": "event-118"
}
```

### 8.3 聚合边界

Decision Context 可以包含：

- Task / Plan 当前快照；
- 上一个 Cursor 之后的 Task Event；
- 最新 Result 摘要与引用；
- Requirement / Goal 摘要；
- Approval 状态摘要；
- 可继续查询的 Local / Knowledge / Evidence / Host 引用。

它不得：

- 复制 Local Control 原始大日志；
- 复制浏览器 DOM 全文；
- 保存 Custom GPT 聊天历史；
- 把推理 Provider 的内部会话当作 Task 状态；
- 跨库读取其他领域私有表。

## 九、业务命令

### 9.1 禁止字段 Patch

禁止：

```http
PATCH /tasks/task-001
{"status":"COMPLETED"}
```

必须使用有语义的业务命令。

### 9.2 Controller Command

最小类型：

```text
CREATE_PLAN
REVISE_PLAN
ADVANCE_PLAN_NODE
REQUEST_ROLE_WORK
REQUEST_APPROVAL
BLOCK_TASK
PAUSE_TASK
COMPLETE_TASK
FAIL_TASK
RELEASE_CLAIM
```

统一信封：

```json
{
  "command_contract_version": "1.0.0",
  "task_id": "task-001",
  "claim_token": "claim-token",
  "expected_task_version": 12,
  "expected_plan_version": 4,
  "idempotency_key": "controller-run-018:revise-plan",
  "command": {
    "type": "REVISE_PLAN",
    "reason_summary": "Runtime 不可连接，原计划缺少连接诊断",
    "payload": {
      "operations": []
    }
  }
}
```

Task Control 校验：

- 调用者身份和角色；
- Controller Claim；
- Task / Plan Expected Version；
- Command Schema；
- 当前状态是否允许；
- Node / 引用是否存在；
- 结构操作是否冲突；
- 幂等键；
- 是否需要创建 Work、Approval 或 Dispatch 引用。

### 9.3 Worker Result Command

领取 Work Item 的 Worker / Execution Adapter 只能提交：

```text
REPORT_WORK_RESULT
REPORT_WORK_FAILURE
```

不能提交 Plan 修订或 Task 完成。

### 9.4 Host Result Command

Browser Host 只能提交：

```text
ACK_HOST_COMMAND
FAIL_HOST_COMMAND
REPORT_RESPONSE_STATE
```

Host Result 只描述宿主事实，不宣称业务完成。

## 十、原子推进规则

每个被接受的 Controller Command 必须在一个应用事务语义中完成：

```text
校验身份、Claim、Task Version、Plan Version
→ 校验 Command 和状态迁移
→ 更新 Task Snapshot
→ 更新 Plan / PlanNode
→ 创建不可变 Task Event
→ 创建或更新 Work Item / Approval Ref / Dispatch Signal
→ 递增 Task Version
→ 返回新版本和引用
```

任何一步失败：

```text
Task、Plan、Event 和下游请求都不能部分落地。
```

### 10.1 示例：请求异步角色工作

```text
当前 Node = READY
→ REQUEST_ROLE_WORK
→ Node = WAITING_RESULT
→ 创建 Work Item
→ Task = WAITING_FOR_ROLE_WORK
→ 生成 TASK_ROLE_WORK_REQUESTED Event
```

如果总控只需要一次同步仓库、文件或 Runtime 查询，则直接调用 `local.*` 并在当前回合获得 Local Result；Task Control 可记录 Result Ref，但不创建 Work Item。

### 10.2 示例：失败后修订计划

```text
Local Result = FAILED
→ Task 回到 READY_FOR_CONTROLLER
→ 总控 Claim
→ REVISE_PLAN：插入诊断 Node
→ 原 Node = BLOCKED
→ 新 Node = READY
→ plan_version + 1
→ task_version + 1
→ 生成 TASK_PLAN_REVISED Event
```

## 十一、Work Item

最小字段：

```text
work_item_id
task_id
plan_node_id
created_from_task_version
target_domain
required_role
capability_ref
input_ref
expected_result_type
status
attempt
claim_epoch
claimed_by
claim_token
progress_status
progress_ref
result_ref
evidence_refs
error_code
retryable
created_at
claimed_at
started_at
completed_at
```

Work Item 回答：

> 哪个专业领域需要完成什么跨回合、异步或可交接工作，并把结果以什么合同返回？

它不是所有能力调用的通用包装，也不是完整 Execution Attempt。一次同步 Local Query、一次纯读 Context 查询或一次短小的确定性读取不应为了“统一”被强制建成 Work Item。

状态：

```text
PENDING
CLAIMED
RUNNING
SUCCEEDED
FAILED
EXPIRED
CANCELLED
```

Work Item 的 `progress_status` 独立为 `NONE / ACCEPTED / PARTIAL`。`PARTIAL` 只表示一次 Local Request 已终止且工作项获得了可继续的部分结果，不把 Work Item 直接标记为 `SUCCEEDED`。

## 十二、Task Event

最小字段：

```text
event_id
task_id
task_version
event_type
producer_ref
payload_ref
correlation_id
causation_id
created_at
```

Event 不可变。

关键事件：

```text
TASK_CREATED
TASK_PLAN_CREATED
TASK_PLAN_REVISED
CONTROLLER_CLAIMED
CONTROLLER_CLAIM_RELEASED
ROLE_WORK_REQUESTED
ROLE_WORK_SUCCEEDED
ROLE_WORK_FAILED
APPROVAL_REQUESTED
APPROVAL_RESOLVED
TASK_BLOCKED
TASK_PAUSED
TASK_COMPLETED
TASK_FAILED
TASK_CANCELLED
HOST_DISPATCH_CREATED
HOST_DISPATCH_DELIVERED
HOST_DISPATCH_FAILED
COMMAND_REJECTED
```

Event 只记录业务事实和必要引用，不保存模型隐藏思维过程。

## 十三、Dispatch Signal 与 Host Command

### 13.1 Dispatch Signal

```text
signal_id
task_id
created_from_task_version
signal_type
target_role
conversation_ref
host_command_ref
status
claimed_by
attempt_count
idempotency_key
created_at
delivered_at
last_error
```

### 13.2 Host Command

MVP 类型：

```text
CONTINUE_SESSION
OPEN_ROLE_SESSION
SUBMIT_WAKE_MESSAGE
OBSERVE_RESPONSE
EXECUTE_APPROVED_UI_ACTION
```

Task Control 只生成任务侧意图和最小路由信息。Browser Host 拥有页面执行细节。

## 十四、公开 Application Interface

### 14.1 任务入口

```text
task.create
task.get
task.getDecisionContext
task.listEvents
```

### 14.2 总控入口

```text
task.claimController
task.submitControllerCommand
task.releaseControllerClaim
```

### 14.3 Role Work 入口

```text
work.listAvailable
work.claim
work.reportResult
work.reportFailure
```

### 14.4 Browser Host 入口

```text
dispatch.listPending
dispatch.claim
dispatch.ack
dispatch.fail
```

接口是领域 Application Interface，不等于最终 HTTP 路径或数据库表名。

### 14.5 公共合同版本与兼容门禁

Task Control 的公开 Application Interface 必须消费并返回明确的合同版本，不允许依赖数据库表结构作为跨领域合同。

最小门禁：

- 请求中的 `contract_version` / `command_contract_version` 必须在支持范围内；
- 新增可选字段必须保持旧消费者可继续解析；
- 删除字段、改变枚举含义、改变状态迁移或 Claim 权限属于破坏性变更；
- 破坏性变更必须发布新的主版本，并由总控完成跨领域迁移审计；
- Task Control 的内部表名、索引和 Repository 结构不属于公共合同；
- `packages/contracts/` 中的公共 Schema 由总控基线治理，Task Control 负责实现与合同测试，不能私自改义。

每个跨领域入口至少应有：

```text
Schema Validation
Contract Version Test
Authorization Test
Idempotency Test
Expected Version Test
Cross-domain Fixture Test
```


## 十五、版本、幂等与冲突

### 15.1 Expected Version

所有写命令必须携带适用版本：

```text
expected_task_version
expected_plan_version（涉及 Plan 时）
```

冲突返回：

```text
TASK_VERSION_CONFLICT
PLAN_VERSION_CONFLICT
```

### 15.2 幂等

创建 Task、Controller Command、Work Item 和 Dispatch Signal 必须使用 `idempotency_key`。

同一调用者 + 同一业务操作 + 同一幂等键：

- 只产生一次业务副作用；
- 重复调用返回首次结果；
- 不重复创建 Event、Work Item 或 Signal。

### 15.3 Claim 冲突

```text
CONTROLLER_ALREADY_CLAIMED
WORK_ALREADY_CLAIMED
DISPATCH_ALREADY_CLAIMED
CLAIM_EXPIRED
CLAIM_TOKEN_INVALID
```

MVP 采用简单过期租约，不实现抢占、优先级竞争和分布式一致性协议。

## 十六、失败语义

### 16.1 角色不匹配

```text
required_role = controller
调用方 role = reporter
→ ROLE_NOT_ALLOWED
```

### 16.2 旧 Command

```text
expected_task_version < current
→ 拒绝
→ 不更新 Task / Plan
→ 不产生业务副作用
```

可以记录 `COMMAND_REJECTED` 审计 Event，但不能改变 Task 业务状态。

### 16.3 非法 Plan 操作

例如：

- 插入重复 `node_id`；
- 完成不存在的 Node；
- 跳过必需 Node 却直接完成 Task；
- 修改已经 Completed 的历史 Node；
- 依赖引用不存在；
- Plan 已完成仍追加普通执行节点。

返回：

```text
PLAN_OPERATION_NOT_ALLOWED
```

### 16.4 Local Control 失败

```text
Work Item = FAILED
Task = READY_FOR_CONTROLLER 或 BLOCKED
当前 Node 记录失败结果
创建 Controller Dispatch Signal
```

任务中心不自行解释错误并重试，由总控决定。

### 16.5 Browser Host 失败

```text
Dispatch Signal = FAILED
Task 业务状态保持不变
```

可以人工或规则化重新创建 Signal。

### 16.6 无进展

同一 Task 在没有新 Event / Result / Approval 的情况下，连续提交语义等价命令超过预算：

```text
→ Task = PAUSED
→ reason = NO_PROGRESS
```

该计数可由 Task Control 确定性执行。

## 十七、完整单 Task 串联

```text
1. task.create(requirement_ref, required_role=controller, plan 或 plan=null)
2. Task = PLAN_REQUIRED / READY_FOR_CONTROLLER
3. 创建 Controller Dispatch Signal
4. Browser Host 或人工唤醒总控
5. 总控 task.getDecisionContext
6. 总控确认角色和最新版本
7. 总控 task.claimController
8. 总控 CREATE_PLAN 或 REQUEST_ROLE_WORK
9. Task Control 原子更新 Task + Plan + Event + Work Item
10. Worker / Execution Adapter claim Work Item
11. Worker / Execution Adapter reportResult(result_ref)
12. Task Control 更新 Node 结果并重新调度 controller
13. Browser Host 注入最小 Wake Message
14. 总控重新查询 Decision Context
15. 总控 ADVANCE / REVISE_PLAN / REQUEST_APPROVAL / COMPLETE_TASK
16. Task = COMPLETED / PAUSED / FAILED
17. Timeline 可解释完整过程
```

## 十八、管理后台读模型

MVP 提供只读调试视图所需数据：

```text
Task 基本信息
Requirement / Goal Ref
required_role
当前 Task 状态和版本
当前 Plan / Plan Version / Node List
Controller Claim
Work Item
Result Ref
Approval Ref
Dispatch Signal
Event 时间线
停止、错误和无进展原因
```

后台不能直接改表。后续操作仍必须调用业务命令。

## 十九、最小存储建议

MVP 可以使用 SQLite 或现有受控数据库。

逻辑存储至少包括：

```text
tasks
task_events
work_items
dispatch_signals
idempotency_records
```

Plan 可以先作为 Task Aggregate 的结构化 JSON 保存；只有真实查询、并发和局部更新需求证明需要时，再拆出独立表。

这避免为了一个 Node List 提前建设通用 Workflow Schema。

### 19.1 Task Control 内部实现结构

以下结构属于 Task Control 领域内部实现，可以独立迭代，但必须持续满足公共合同：

```text
Task Control
├── Domain
│   ├── Task Aggregate
│   ├── Plan / PlanNode
│   ├── Controller Claim
│   ├── WorkItem / WorkItem Claim
│   ├── DispatchSignal / Dispatch Claim
│   ├── TaskEvent
│   ├── TaskTransitionPolicy
│   ├── PlanOperationPolicy
│   └── TaskSchedulingPolicy
├── Application
│   ├── TaskCommandService
│   ├── DecisionContextQueryService
│   ├── ControllerClaimService
│   ├── WorkItemService
│   ├── DispatchService
│   ├── TaskReconciler
│   └── TimelineProjectionService
├── Ports
│   ├── TaskRepository
│   ├── TaskEventRepository
│   ├── WorkItemRepository
│   ├── DispatchRepository
│   ├── IdempotencyRepository
│   ├── TransactionManager
│   └── Clock / IdGenerator
└── Adapters
    ├── SQLite Store
    ├── HTTP / Gateway Adapter
    ├── Test Fixture Adapter
    └── Fake Browser / Worker Adapter
```

Gateway Adapter 只负责认证结果传递、Schema 校验、错误映射和领域路由；业务迁移必须进入 Application / Domain 层。

### 19.2 单 Task 调度器 / Reconciler

MVP 的“单任务调度”由一个确定性的 `TaskReconciler` 实现，不建设通用工作流引擎或生产消息队列。

触发来源：

```text
Task 创建成功
Controller Command 接受
Work Result / Failure 接受
Host Result 接受
Claim 或 Dispatch 到期
人工执行 reconcile(task_id)
进程恢复后的周期扫描
```

单次调和规则：

```text
1. 在事务中读取 Task Aggregate 和相关 WorkItem / Dispatch
2. 若 Task 为 COMPLETED / FAILED / CANCELLED，则取消未开始的下游协调对象
3. 若 Task 为 PAUSED，则不创建新的 WorkItem 或 Dispatch
4. 处理过期 Controller Claim、Work Item Claim 和 Dispatch Claim
5. 校验当前 Plan / Node 与 Task 状态是否一致
6. 若 READY_FOR_CONTROLLER 且不存在有效 Controller Dispatch，则幂等创建 Dispatch Signal
7. 若 Node 已请求异步角色工作且不存在有效 WorkItem，则幂等创建 WorkItem
8. 若 WorkItem 已产生结果，则把 Task 恢复到允许总控复审的状态，并创建 Controller Dispatch
9. 若等待审批，则只保存 Approval Ref 和等待状态，不伪造审批结果
10. 追加必要 Task Event，递增版本并提交
```

`TaskReconciler` 只执行确定性规则，不读取自然语言日志来推理新计划，不替总控决定重试、改计划或完成任务。

为避免重复调度，至少使用下列唯一语义：

```text
一个 Task 版本下同一 controller wake 只存在一个有效 Dispatch
一个 PlanNode 的同一 work request 只存在一个有效 WorkItem
一个 WorkItem Attempt 的同一 dispatch 类型只存在一个有效 Signal
```

### 19.3 任务消息中心的派生读模型

消息中心不是独立 Aggregate。MVP 从 Task、WorkItem、DispatchSignal 和 TaskEvent 派生三类读模型：

```text
Task Timeline
    面向单个 Task 的完整事实时间线

Role Attention Inbox
    面向角色的待关注、待处理和已阻断事项

Runtime Dispatch Queue
    面向 Browser Host / Worker Adapter 的可领取驱动请求
```

最小 `Role Attention Inbox` 字段：

```text
entry_id
task_id
source_event_id
required_role
attention_type
work_item_id / dispatch_ref / approval_ref
status
created_at
read_at
resolved_at
```

`attention_type` MVP 可以限定为：

```text
CONTROLLER_ACTION_REQUIRED
ROLE_WORK_AVAILABLE
APPROVAL_WAITING
TASK_BLOCKED
TASK_PAUSED
TASK_TERMINAL
```

该 Inbox 是可重建投影：删除或重建 Inbox 不得改变 Task 事实。只有 WorkItem Claim、Dispatch Claim 或 Controller Claim 才授予实际处理权，读取消息本身不授予权限。

### 19.4 事务实现边界

一个业务命令的写入必须由 `TransactionManager` 包住：

```text
读取当前 Aggregate 与幂等记录
→ 领域校验与状态迁移
→ 保存 Task Snapshot
→ 保存 WorkItem / Dispatch 变化
→ 追加 TaskEvent
→ 写入幂等结果
→ 提交
```

MVP 使用同一 SQLite 数据库完成原子提交，不引入外部消息总线。Browser Host 和 Worker 通过轮询公开 Application Interface 获取待处理对象，因此不存在“数据库已更新但消息总线未发布”的双写问题。

未来引入跨进程事件发布时，再增加 Transactional Outbox；Outbox 只能发布已经提交的领域事实，不能成为 Task 真源。

### 19.5 进程恢复

Task Control 启动后执行一次恢复扫描：

```text
查找非终止 Task
→ 标记过期 Claim
→ 对账未完成 WorkItem 和 Dispatch
→ 对 READY_FOR_CONTROLLER Task 补建缺失的 Controller Dispatch
→ 对等待角色结果的 Task 保持等待，不伪造失败
→ 对状态与 Plan 不一致的记录标记为内部一致性错误并停止自动推进
```

恢复必须幂等。重复启动、重复扫描或进程中途退出不能重复创建 WorkItem、Dispatch 或业务 Event。

### 19.6 本领域落地顺序

```text
1. 冻结并导入总控治理的公共 Contract Fixture
2. 实现 Domain Model 与 Transition Policy
3. 实现 SQLite Schema、Repository 和 TransactionManager
4. 实现 Controller Claim 与 Controller Command
5. 实现 WorkItem、Dispatch 和三类 Claim
6. 实现 TaskReconciler
7. 实现 Decision Context、Timeline 和 Role Attention Read Model
8. 接入 Fake Worker / Fake Browser Host 完成单 Task 闭环
9. 接入真实 Local Control Result
10. 与 SOL-CTL-001、SOL-BHR-001 做跨领域 Contract Test
11. 由总控执行最终端到端串联验收
```


## 二十、测试场景

### 20.1 带前置 Plan 的 Task

导入规划角色生成的 Plan，总控读取后直接推进当前节点。

### 20.2 总控生成 Plan

Task 无 Plan：

```text
查询 Context
→ Claim
→ CREATE_PLAN
→ Task / Plan / Event 一致
```

### 20.3 失败后修订 Plan

执行失败后插入补救 Node，并创建新 Work Item。

### 20.4 同角色接管

原 Claim 过期，另一个 controller Profile 重新查询、Claim 并继续。

### 20.5 角色不匹配

reporter 尝试 Claim controller Task，必须拒绝。

### 20.6 版本冲突

使用旧 Task 或 Plan Version 提交命令，必须无业务副作用。

### 20.7 幂等

重复 `REQUEST_ROLE_WORK` 只生成一个 Work Item 和一组 Event。

### 20.8 非法 Plan 操作

重复 Node、非法跳过和错误完成必须拒绝。

### 20.9 Host 投递失败

Signal 失败，Task 与 Plan 业务状态不被污染。

### 20.10 Event 回放

从 Event 顺序重建的关键 Task / Plan 状态与当前 Snapshot 一致。

### 20.11 直接数据库写入防线

正式 API 外写入的不完整记录不能被当成合法 Task；测试 Fixture 与正式数据必须隔离。

### 20.12 调和器幂等

对同一 Task 连续执行多次 Reconcile：

- 不重复创建 Controller Dispatch；
- 不重复创建 WorkItem；
- 不重复追加同一业务 Event；
- 不改变已完成 Node；
- 返回相同或等价的稳定结果。

### 20.13 Claim 到期恢复

分别验证 Controller Claim、Work Item Claim 和 Dispatch Claim 到期：

- 到期 Claim 不能继续提交受保护写入；
- 调和器能够释放或标记到期占用；
- 可以生成新的合法 Claim；
- 旧 Claim 的迟到结果不能覆盖新版本。

### 20.14 任务消息投影重建

清空 Timeline / Role Attention 的投影表后，从 Task Snapshot、WorkItem、Dispatch 和 TaskEvent 重建：

- 待总控事项不丢失；
- 待角色工作不丢失；
- 阻塞和暂停事项可见；
- 重建过程不修改 Task 业务状态。

### 20.15 公共合同兼容

使用总控冻结的跨领域 Fixture 验证：

- Decision Context 可被 SOL-CTL-001 消费；
- Local Result Ref 不依赖 Local Control 私有字段；
- Host Command 可被 SOL-BHR-001 消费；
- 旧次版本请求在兼容窗口内仍可处理；
- 未经治理的新枚举或字段语义不会被静默接受。


## 二十一、交付物

```text
Task Control Application Service
Task Aggregate Schema
Plan / PlanNode Schema
Task Decision Context Schema
Controller Claim Service
Controller Command Handler
Task Transition Policy
Task Store
Task Event Store
Work Item Store
Dispatch Signal Store

Task Reconciler / Scheduler
Role Attention Read Model
Contract Compatibility Tests
Recovery / Reconcile Tests
Version / Idempotency / Claim Tests
Timeline Read Model
Single-Task Integration Test
Runbook
```

## 二十二、验收标准

- Task 内存在结构化、版本化 Plan；
- Plan 可以来自上游，也可以由总控生成；
- 总控必须先读取 Decision Context，再 Claim；
- Task 长期归属角色，Claim 只代表短期处理权；
- 同角色总控可以在 Claim 过期后接管；
- Task、Plan、PlanNode、Event 和下游请求原子一致；
- 旧 Task / Plan Version 被拒绝；
- 重复命令无重复副作用；
- 同步 Local Query 直接返回，不强制建立 Work Item；
- 异步 Worker / Execution Adapter 只领取 Work Item；
- Browser Host 只领取 Dispatch Signal；
- 总控不能直接 Patch Task / Plan 字段；
- Task Control 不自行推理计划语义；
- 领域内部实现可以独立迭代，但不得自行改变公共合同语义；
- 公共合同变更经过总控版本治理和跨领域兼容审计；
- Reconciler 重复运行不产生重复 WorkItem、Dispatch 或 Event；
- Role Attention Inbox 可从正式事实重建，不成为状态真源；
- Timeline 能解释每次计划和任务变化；
- 单 Task 完整闭环通过。

## 二十三、非目标

- 不做多 Task 并发；
- 不做 Task 依赖图；
- 不做通用 Planning 引擎；
- 不做任意 DAG / BPMN / Workflow DSL；
- 不做优先级队列和生产消息总线；
- 不做动态执行器竞争；
- 不做复杂租约和自动抢占；
- 不做正式 Approval / Evidence 领域；
- 不做完整 Platform Management Console；
- 不让前端或总控直接修改数据库字段。

## 二十四、与其他 MVP 的合同

### 24.1 对 `SOL-CTL-001`

提供：

```text
getTaskDecisionContext
claimControllerTask
submitControllerCommand
releaseControllerTask
```

并保证 Plan / Task / Event 原子推进。

### 24.2 对 `SOL-LCL-001`

同步 `local.*` 查询可以直接经 Gateway 返回，总控在当前回合消费；Task Control 只保存必要的 Canonical Result Ref、摘要和错误码。只有跨回合、长时、需要交接、轮询或副作用的操作，Task Control 才建立 Work Item / Execution 协调状态。双方不得直接读取对方内部数据库。

### 24.3 对 `SOL-BHR-001`

提供 Host Command / Dispatch Signal；Browser Host 不读取 Task 内部表，不自行推进 Task。

### 24.4 对 `SOL-MOB-001`

Task Control 不直接依赖手机模型。推理结果通过 Model Inference Provider 的稳定 Result Ref 进入 Task / Evidence；DeepSeek 和手机模型可以替换，不改变 Task Aggregate。
