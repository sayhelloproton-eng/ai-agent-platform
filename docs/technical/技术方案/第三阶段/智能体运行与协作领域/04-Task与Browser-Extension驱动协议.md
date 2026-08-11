# 智能体运行与协作领域｜Task 与 Browser Extension 驱动协议

> 文档状态：**v0.2 CONFIRMED BUSINESS FLOW / EXACT TASK OPS REQUIRE CROSS-DOMAIN AUDIT**  
> Browser Extension 是 Driver/Adapter，不拥有 Task Workflow。

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

## Browser Extension

负责真实 Carrier 驱动：

```text
轮询 Task 待办
人工 Task 启动确认 UI
打开/恢复 GPT Role/Conversation
创建研发/测试 Worker
识别 c-id
绑定 Worker 到 Task（通过 Task Public API）
WORKER_BIND/NODE_READY/REOPEN/PEER_MESSAGE 注入
Collaboration delivery
真实 Browser Receipt / retry recovery
```

它不能复制 Task eligibility/state machine。

---

# 2. 产品阶段是 Task 前工作流

产品角色特殊：**不是 Task 启动后由 Extension 创建。**

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

产品 identity 的具体 `current URL / c-id` 获取机制仍需 Carrier E2E，详见 `20-产品前置工作流与Carrier身份.md`。

---

# 3. createTask 参与者语义

Task 创建时：

```text
Task A
├── productRoleRef + productWorkerRef   # 已绑定
├── devRoleRef     + workerRef = null
└── testRoleRef    + workerRef = null
```

这里的 Task-level role binding 是 Task Domain 新增/调整的正式事实，需要总纲 Contract Change。

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
→ Browser Extension 创建/绑定 Dev-A
→ Browser Extension 创建/绑定 Test-A
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

不因为这个初始化现实过程引入 WorkItem/Claim/Lease；是否需要 Task 新状态由 Task Owner 审计，默认优先避免增加。

`startTask` API 与两个 Browser binding 的精确调用顺序仍属于跨域工程决策，详见 `18`。

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

Task Domain 判定 Node READY 后，Extension：

```text
读取 requiredRoleRef
→ 读取 Task role binding 得到原 workerRef
→ getRegisteredRole(roleRef)
→ 打开/恢复正确 Conversation
→ 以 exactly-once/幂等语义投递 NODE_READY
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

`startNode` 与 Browser submit 的精确顺序必须 Task + Browser/Execution E2E 冻结。

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

Extension 下一轮轮询看到新的 READY，再唤醒对应已绑定 Worker。

---

# 9. reopen 必须原人继续

```text
reopenNode
→ Task Domain 产生新的 runNo + 正式 reopenContext
→ Task-level role→worker binding 不变
→ Extension 找回同一 Worker Conversation
→ 注入 REOPEN
→ 新 run 的 Node.workerRef 仍使用该原 Worker
```

禁止为 reopen 创建新的研发 Worker。

当前 Task v0.1 若 `reopenNode` 清空 Node.workerRef，可继续保留 run-level 清空语义；新 run `startNode` 时从 Task-level binding 重新写回同一个 workerRef。

---

# 10. Extension 消费多类待办，领域接口分开

一个 Extension loop 可以消费：

```text
Task Domain → Task/Node drive projection
Agent Domain → Collaboration delivery queue
未来其他 Domain → 各自独立 queue/projection
```

不能为了 Extension 方便，把不同 Owner 的业务事实合并进一个“超级待办领域”。

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

Worker 创建只能来自 Task-driven Browser Extension 的执行初始化流程。

---

# 12. Task 终态

Task terminal 就是 terminal：

```text
COMPLETED / TERMINATED / 其他 Task Domain 终态
→ Extension 不再为该 Task 执行 Node/Collaboration work
```

已经存在的 Collaboration messages 只作为历史记录保留，不为了 Task 终态额外改写成新的 Agent 业务状态，也不能反向恢复 Task。

---

# 13. Browser Extension 本地认证

```text
Browser Extension
→ local-platform-token
→ local Agent Runtime / Task / Browser bridge
```

不使用 Role Bearer Key。
