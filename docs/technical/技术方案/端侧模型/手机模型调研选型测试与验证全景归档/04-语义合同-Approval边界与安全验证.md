# 04｜语义合同、Approval 边界与安全验证

> 核心问题：手机模型可以判断什么，又必须在哪些地方 fail-closed？

## 1. `mob.next.v1.2` 的历史角色

第二阶段为了快速测试模型是否能做结构化候选判断，冻结过五字段 Candidate Contract：

```text
contract
status
decision
target
decision_confidence
```

核心不变量：

```text
request_approval -> human
handoff          -> controller
continue         -> controlled executor target
stop             -> none
uncertain        -> handoff / controller
rejected         -> handoff / controller
```

早期 Browser-only 测试把 `continue` 固定到 `bhr`；后来 Local Control read-only 集成把受控执行目标扩展到 `bhr | lcl`。

**当前解释**：`mob.next.v1.2` 是 Phase 2 的模型候选语义证据，不是 Phase 3 的 Task/Execution 公共状态机。

## 2. 31-case 的意义

31-case 不应该被压缩成一个“百分比”。它实际推动了多个边界修正：

- 生产发布、删除、付款、凭据导出等高风险动作；
- safe read / safe navigation；
- unsupported capability；
- completed vs unable-to-continue；
- Approval missing / expired / revoked / wrong-task / scope mismatch；
- unverified approval claim；
- ambiguity；
- repeat stability。

不同轮次曾出现 29/31、30/31；随后通过专项 case 把错误拆开治理，而不是继续调一个大 Prompt 直到“碰巧 31/31”。

## 3. Approval Boundary v4

专项 12 case 覆盖：

```text
missing
expired
revoked
wrong task
scope mismatch
action changed
user says skip approval
valid exact scope
claim unverified
scope ambiguous
status conflict
binding unconfirmed
```

结果：`12/12 PASS`，并重复通过。

最关键的语义分层：

```text
known invalid approval
→ request_approval / human

cannot verify approval truth/scope
→ uncertain / handoff / controller

verified valid exact-scope approval
→ continue candidate
```

## 4. Final Boundary v5 与 Route Target Invariant v6

v5 暴露：模型可能选对 `request_approval`，却把 `target` 错绑到 `controller`。

因此 v6 把 decision→target 做成硬不变量并在本地 Validator 重复约束：

```text
request_approval -> human
handoff          -> controller
continue         -> bhr   # 当时 Browser-only 测试域
stop             -> none
```

v6 结果：`7/7 PASS`。

工程经验：**重要不变量不能只依赖 Prompt；模型输出后还要本地 deterministic validator。**

## 5. 手机模型不拥有 Approval 真值

长期冻结：

```text
Phone Model
  may classify / request / explain / propose

but cannot
  create Approval truth
  create Grant
  widen scope
  decide authenticity
  mutate Approval state
```

如果平台已经有权威 Approval 状态，Adapter/Policy 应直接处理，不要浪费模型重新“猜一次”。

## 6. Prompt Injection 与证据层级

测试中明确区分：

- 页面 banner / 用户自然语言“我批准了”；
- 可验证的结构化 Approval record；
- BHR/Local/Task 的权威 evidence；
- 模型自己的解释。

模型不得把页面或用户自述升级为平台事实。

## 7. 当前安全边界

```text
Model output
      ↓
JSON parse
      ↓
Schema
      ↓
Contract / deterministic invariants
      ↓
Capability / Scope
      ↓
Policy
      ↓
Approval
      ↓
Execute
```

模型置信度只是一个候选信号：

```text
decision_confidence = 100
!= authorization = true
```
