# SOL-P3-BHR-001｜Browser Execution Lifecycle 重塑

## 1. 目标

Browser Host 已经证明可以真实驱动网页 GPT。Phase 3 不再证明“能不能点网页”，而要把 Browser Runtime 从过载 Workflow Engine 收敛成可靠 Capability Module。

## 2. 概念拆层

### Host Lifecycle Plane

负责：

- register；
- heartbeat；
- poll；
- binding health；
- local journal / recovery substrate。

### Observation Plane

负责纯读取：

- page identity；
- generation state；
- visible target；
- evidence。

硬规则：`OBSERVE != MUTATE`。

### Execution Plane

负责一个明确 Browser Action：

```text
authorization
→ precondition
→ execute
→ Delivery / Effect confirmed
→ Result
→ END
```

### Continuation Plane

负责 Browser-backed Session Wake：

```text
BUSY → DEFER
IDLE → SUBMIT WAKE
DELIVERED → SUCCESS → END
```

不等待 Controller 整个 response。

## 3. Delivery boundary

Browser `SUBMIT_MESSAGE` 一旦确认真实 Delivery：

- execution 成功事实冻结；
- 后续 ChatGPT response 不属于该 Work；
- Action Allow / Tool Call / Controller 决策不再由 BHR response wait 持有；
- continuation 失败不能反向把 browser-submit 改 FAILED。

## 4. Scroll / Dynamic Conversation

Observation 不允许自动 `scrollToBottom()`。

页面位置使用语义：

```text
FOLLOWING_LATEST
USER_REVIEWING_HISTORY
AUTOMATION_REVEAL_TARGET
```

如执行需要 reveal 元素，只进行局部、显式、可审计的 viewport mutation。

聊天持续增长时优先依赖浏览器 scroll anchoring；如需恢复位置，使用 element/message anchor + relative offset，而不是固定 scrollTop。

## 5. Approval

Approval 是否由 Browser Module 自己 prepare 或由公共 Approval service 完成，需要 Phase 3 重新裁决；无论实现位置如何：

- Waiting approval 不持有 execution lease；
- Grant one-time；
- mutation fingerprint / target identity 可验证；
- mutation 后 no blind retry。

## 6. Browser Adapter Contract Test

真实网页之前至少有：

- recorded DOM fixtures；
- dynamic generation fixture；
- async send readiness；
- long conversation growth；
- user reviewing anchor；
- busy / idle continuation；
- reload / stale binding；
- delivery / uncertain crash point。
