# 智能体运行与协作领域｜产品前置工作流与 Carrier Identity

> 文档状态：**v0.2 / BUSINESS CONFIRMED + CARRIER E2E REQUIRED**

---

# 1. 产品角色是特殊的 pre-Task Worker

产品角色不是 Browser Extension 收到 Task 后才创建。

真实流程：

```text
用户主动打开产品 Custom GPT
→ 创建一个新的产品 Conversation
→ 用户与产品 Worker 充分、完整沟通
→ 澄清目标/范围/约束
→ 形成需求内容
→ 产品 Worker 判断需求已形成
→ 再创建 Task
```

因此：

- Task 之前已经存在产品 Worker；
- 当前产品 Conversation 就是未来这个 Task 的 product worker；
- 不允许为了取得产品 workerRef 而先创建空 Task；
- 不允许 Task Scheduler / Task polling 负责“创建产品人员”；
- 每一个新需求应使用新的产品 Conversation，不跨 Task 复用旧产品 Worker。

---

# 2. 每 Task 独立 Worker

冻结：

```text
Task A → Product-A / Dev-A / Test-A
Task B → Product-B / Dev-B / Test-B
```

禁止：

```text
Task B 继续使用 Task A 的 Product/Dev/Test Conversation
```

同一个 Task 内，同一角色则始终复用原 Worker，包括 reopen。

原因：Conversation 本身保留上下文，跨 Task 复用会污染需求/代码/测试上下文。

---

# 3. 产品创建 Task 的正式顺序

```text
1. 用户与产品 Worker 全量沟通
2. 产品 Worker 确认需求已经形成
3. 获取当前自身 Carrier identity / workerRef
4. listRegisteredRoles()
5. 按 agentPackageRef 找到 product/dev/test roleRef
6. createTask(...)
7. Task 进入待用户批准执行的正式流程
```

createTask 业务输入至少需要表达：

```text
product roleRef + product workerRef
dev roleRef
test roleRef
requirement / objective / plan / documents（由 Task Domain Contract 决定）
```

产品 GPT 不能因为聊天进行到一半自动创建 Task；应在需求信息充分后再创建。

---

# 4. Carrier Context Action 需求

产品 Worker 必须能在创建 Task 前获得自己的 Conversation identity。

业务期望能力可表达为：

```text
getCurrentCarrierContext()
→ carrierType
→ roleRef / g-id
→ workerRef / c-id
→ conversationUrl
```

这是 Agent/Carrier 侧能力，不是 Task API。

用户明确希望优先通过 Action 获取“当前链接信息”，避免为了产品前置流程再调度 Task 系统或主动创建 Extension 工作流。

---

# 5. 当前仍需真实 E2E 的地方

不能在没有证据时假设 Custom GPT Action 天然知道浏览器 `location.href` / `c-id`。

必须做最小真实实验：

```text
Custom GPT
→ debug/current-carrier Action
→ Gateway 记录允许记录的 request metadata
→ 确认是否存在稳定 Conversation identity
```

如果平台原生没有提供，则需要继续设计 Carrier Context Provider；其约束：

- 不把产品 Worker 创建并入 Task Scheduler；
- 不改变“用户先与产品 GPT 充分沟通”的交互；
- 不信任模型任意自报 URL；
- 必须能够证明当前页面与当前 role/worker 对应；
- 真实 Browser 测试通过后再冻结实现。

是否使用 Browser Extension 的**被动页面上下文能力**作为 Provider，是 E2E 后的实现选择，不在本文件提前硬冻结。

---

# 6. 产品 Task 绑定

产品创建 Task 时直接写入：

```text
product roleRef
product workerRef
```

这是 Task Domain 的正式 Task-level participant/binding fact。

研发/测试则在 Task 获得用户执行批准后，由 Browser Extension 初始化并绑定。

---

# 7. 产品 Worker 与 Collaboration

Task 创建后，Product-A 成为这个 Task 的正式参与者。

研发/测试需要确认需求时：

```text
Dev-A/Test-A
→ askPeer(targetAgentPackageRef = product)
→ Agent Runtime 校验双方都属于同一 Task
→ Message Center
→ Browser Extension
→ Product-A
```

Product-A 回复：

```text
replyPeer(threadId, content)
```

回复真实投递回原发问 Worker并 `DELIVERED` 后，同一 thread 才允许下一问。
