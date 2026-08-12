---
docId: AGENT-DOC-03-02
title: 智能体运行与协作领域｜Task 与 Browser Extension 驱动协议
docType: cross-domain-flow
authority: normative
lifecycle: frozen
domain: agent-runtime-collaboration
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 智能体运行与协作领域｜Task、Worker 与 Execution Browser 驱动协议

> 本文定义 Agent 侧 Worker/Carrier 协作与 Execution Browser 的跨领域驱动协议。Execution Browser 本体属于 Execution，并只通过 Execution Runtime/application flow 参与 Task/Agent 公共合同。

---

# 1. 三方职责

## Task Domain

拥有：

```text
Task / Node lifecycle
当前 Node / READY eligibility
requiredRoleRef
Task-level participant/worker binding truth
Node.runNo / Node.workerRef
version / idempotency
reopen legality and reopen context
terminal state
```

## Agent Domain

拥有：

```text
Agent Package
Role Registry
roleRef → Carrier metadata
Role Key / Gateway identity
Collaboration Thread/Message/Delivery
```

## Execution Browser / Task Driver

负责真实 Carrier 驱动：

```text
轮询 Task 待办
人工 Task 启动确认 UI
打开/恢复 GPT Role/Conversation
创建研发/测试 Worker
识别 c-id
绑定 Worker 到 Task（通过 Task Public API）
WORKER_BIND/NODE_READY/REOPEN/PEER_MESSAGE 小型 trigger 注入
Collaboration delivery
真实 Browser Receipt / retry recovery
不承担大型 Task 文档 / Artifact 的 DOM 传输
```

它不能复制 Task eligibility/state machine。

---

# 2. 产品阶段是 Task 前工作流

产品角色特殊：**不是 Task 启动后由 Execution Task Driver 创建。**

```text
用户主动打开产品 Custom GPT 新 Conversation
→ 与产品 Worker 充分、完整沟通
→ 需求澄清/确认
→ 形成 Requirement/需求内容
→ 产品 Worker 获取自己的 current Carrier identity/workerRef
→ listRegisteredRoles
→ createTask
```

产品阶段不需要 Task Scheduler 来创建 Worker。

每个新需求使用新的产品 Conversation；不同 Task 不复用 Worker。

产品 identity 的具体 `current URL / c-id` 获取机制仍需 Carrier E2E，详见本领域 `03-流程与数据/06-产品前置工作流与Carrier身份.md`。

---

# 3. createTask 参与者语义

Task 创建时：

```text
Task A
├── productRoleRef + productWorkerRef   # 已绑定
├── devRoleRef     + workerRef = null
└── testRoleRef    + workerRef = null
```

这里的 Task-level role binding 是 Task Domain 的正式业务事实。

Node 继续只声明：

```text
requiredRoleRef
```

---

# 4. 一个 Task 一组 Worker

冻结：

```text
Task A → Product-A / Dev-A / Test-A
Task B → Product-B / Dev-B / Test-B
```

不同 Task 不复用同一个 Conversation。

同一 Task 内相同角色始终复用该 Task 的同一个 Worker，包括 reopen。

---

# 5. 用户批准 Task 后的执行初始化

业务顺序已经冻结：

```text
用户批准 Task 执行
→ Execution Browser CREATE Dev-A → Agent identity validation → Task bind
→ Execution Browser CREATE Test-A → Agent identity validation → Task bind
→ 两个 Worker 都绑定成功
→ 才进入正式 Node 执行
→ 首个 READY Node 对应 Worker 收到 NODE_READY
```

先研发、后测试。

如果：

```text
Dev bind success
Test create/bind failure
```

则：

```text
保留 Dev binding
停止正式 Node work
下一轮只补 Test
不得重建 Dev
```

该初始化流程不引入 WorkItem / Claim / Lease，也不增加新的 Task 业务状态；如真实实现证据证明现有状态无法表达，再由 Task Owner 通过 Contract Change 处理。

具体调用顺序必须满足 one-time/idempotent provisioning、两个 Worker 齐备后再开始正式 Node work，并以当前 Task/Execution Public Contract 为准。

---

# 6. WORKER_BIND：只绑定，不工作

研发/测试 Conversation 首次创建时注入：

```text
triggerType = WORKER_BIND
```

目的只有：

```text
建立 Conversation
确认 roleRef / workerRef / taskId
让 Worker 知道自己属于哪个 Task
完成 Task binding
```

MUST NOT：

```text
执行研发/测试正文工作
调用 completeNode
调用 waitNode/reopenNode 推进 Workflow
产生未 READY Node 的业务副作用
```

即使测试 Worker 已经创建，它也必须等到测试 Node 真正 READY 才执行测试。

---

# 7. NODE_READY

Task Domain 判定 Node READY 后，Execution Task Driver：

```text
读取 requiredRoleRef
→ 读取 Task role binding 得到原 workerRef
→ getRegisteredRole(roleRef)
→ 打开/恢复正确 Conversation
→ 以 idempotent / effectively-once 边界投递 NODE_READY；不承诺端到端 exactly-once
```

Worker 可以：

```text
直接使用同 Conversation 历史
按需 getNodeContext / Task Document
按需 Execution Local Resource API
按需 askPeer
```

**不要求每次唤醒都强制先 getNodeContext。**

如果上下文不明确、可能过期或证据不足，Instructions 要求 Worker 主动获取正式事实，不盲猜。

`startNode` 与 Browser submit 的顺序必须遵守当前 Execution/Task E2E：任何 delivery uncertainty 都不得导致重复业务 Effect。

---

# 8. Node 完成与自然推进

Agent 不调用：

```text
setStatus
advanceTask
changeNodeStatus
```

正确意图：

```text
completeNode(...)
```

Task Domain 负责：

```text
校验状态/version/worker/output
当前 Node → SUCCEEDED
下一个串行 Node → READY
```

Execution Task Driver 下一轮轮询看到新的 READY，再唤醒对应已绑定 Worker。

---

# 9. reopen 必须原人继续

```text
reopenNode
→ Task Domain 产生新的 runNo + 正式 reopenContext
→ Task-level role→worker binding 不变
→ Execution Task Driver 找回同一 Worker Conversation
→ 注入 REOPEN
→ 新 run 的 Node.workerRef 仍使用该原 Worker
```

禁止为 reopen 创建新的研发 Worker。

`reopenNode` 可清空 Node 当前 run 的 `workerRef`；Task-level `TaskRoleBinding` 保持不变。新 run 的 `startNode` 必须从 TaskRoleBinding 重新解析并写回同一个 `workerRef`。

---

# 10. Execution Task Driver 消费多类待办，领域接口分开

一个 Execution Task Driver loop 可以消费：

```text
Task Domain → Task/Node drive projection
Agent Domain → Collaboration delivery queue
未来其他 Domain → 各自独立 queue/projection
```

不能为了 Execution Task Driver 方便，把不同 Owner 的业务事实合并进一个“超级待办领域”。

---

# 11. Collaboration 不创建 Worker

正常情况下 Task 正式执行前 product/dev/test Workers 已经全部绑定，因此 `askPeer` 应直接能定位 Task 参与者。

仍保留防御：

```text
TARGET_WORKER_NOT_BOUND
```

但：

```text
Collaboration Message Center
MUST NOT 创建 Worker
```

Worker 的真实 Conversation CREATE 只能来自 Execution-owned Browser provisioning flow；Agent 校验 Worker identity，Task 通过 Public Contract 固化 TaskRoleBinding。

---

# 12. Task 终态

Task terminal 就是 terminal：

```text
COMPLETED / TERMINATED / 其他 Task Domain 终态
→ Execution Task Driver 不再为该 Task 执行 Node/Collaboration work
```

已经存在的 Collaboration messages 只作为历史记录保留，不为了 Task 终态额外改写成新的 Agent 业务状态，也不能反向恢复 Task。

---

# 13. Execution Browser 本地认证

```text
Execution Browser
→ local-platform-token
→ Execution Runtime Browser protocol surface
→ Execution Runtime 通过 Public Contract/client 协调 Task / Agent
```

不使用 Role Bearer Key。

---

# 14. Carrier reuse 后的 Browser 流程裁剪

Custom GPT 已提供 GPT Actions File Bridge 后，Browser 主链只保留它不可替代的职责：

```text
Conversation CREATE / RESTORE / WAKE
g-id / c-id identity observation
page state / permission UI / screenshot
真实 Browser submit / delivery / recovery
```

Task 文档与大型动态上下文改为：

```text
Worker Action
→ Gateway
→ Task/Execution Public API
→ openaiFileResponse
→ Conversation
```

所以以下流程从 v1 happy path 裁掉：

```text
Browser 注入完整 PRD/技术方案/测试报告
每个 Action 完成后 Browser 再次 WAKE
把 Browser permission 自动点击当作所有 routine Action 的必经步骤
```

静态 OpenAPI 对 routine control/intent operation 显式 `x-openai-isConsequential:false`。`Always Allow` 是否能在目标环境稳定消除后续 routine prompt 仍需 E2E；Browser permission handler 保留为异常/恢复能力，不能提前删除。

## Browser Ownership

Execution Domain 独占 Browser capability；Agent 文档只定义 Worker/Carrier 协作要求。

正式 provisioning：Task authorization → Execution Browser CREATE/识别 c-id → Agent 接受/校验 Worker identity → Task `bindTaskWorker` 写 TaskRoleBinding → required bindings 齐全后 startTask。CREATE 成功不等于 Task binding 成功。

WAKE 只代表恢复既有 Worker Conversation 并注入最小 trigger/identity；不代表 Node/Action/Effect 已成功。Task 状态推进始终通过 Task Public API。
