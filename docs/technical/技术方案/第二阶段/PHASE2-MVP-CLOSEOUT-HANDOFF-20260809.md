# Phase 2 四域 MVP 串联收口交接（2026-08-09）

> 目的：让新的 ChatGPT 与 Codex 在不依赖旧聊天历史的情况下，准确接管 Phase 2 MVP 串联评估。本文记录的是**当前收口上下文和真实证据**；当前仓库代码仍以实际 HEAD 为最终真源。
>
> Git-only：本文不进入 `docs/knowledge/**`，不触发飞书发布。

## 1. 接管原则

当前暂停真实 Browser 测试。先由新 ChatGPT + Codex 对最新 HEAD 做集中审计，再决定是否还有代码修改。

职责：

- ChatGPT：持有现场历史、证据可信度、测试状态、stop/go 和 MVP 结项裁决；
- Codex：读取完整仓库，负责跨域代码审计、状态机逻辑判断、自动化验证；
- 用户：只执行不可替代的本机动作（运行命令、Reload、点击明确的人类确认、上传必要包/截图）。

禁止恢复过去的模式：

```text
现场失败 → 立即打窄补丁 → 保留旧 Task → 继续 retry
```

若需要修复，应先把真实失败固化为代码/测试证据，再做一次累计修复。

## 2. 最近已确认仓库基线

最近一次明确记录：

```text
branch       = main
HEAD         = c2bded0fbe9b6c6bf5940d890b1e90a4588929e9
origin/main  = c2bded0fbe9b6c6bf5940d890b1e90a4588929e9
ahead/behind = 0/0
worktree     = clean
```

关键 Commit：

```text
c2bded0 fix(phase2): filter inadmissible controller commands
ca6bda0 fix(phase2): defer browser execution during user control
b99f49e fix(phase2): defer approval resume while controller is busy
d8cd8b2 fix(phase2): stabilize browser approval preconditions
e9fb952 fix(phase2): separate platform wake from human approval
42e90c7 fix(phase2): harden production browser approval flow
595c209 fix(phase2): harden browser execution protocol
3847c7d fix(phase2): separate browser executor and page target roles
```

Codex 必须先执行 `git fetch origin && git rev-parse HEAD && git rev-parse origin/main && git status --short`；若 HEAD 已更新，以实际 HEAD 为准，并审计增量。

## 3. 哪些是硬证据

证据优先级：

1. 当前仓库源码与自动化测试；
2. Browser Host Command Journal 原始记录；
3. Task Control 原始 Event / Store 状态；
4. 明确的 Browser 页面截图/可见结果；
5. Custom GPT Action 的原始返回；
6. ChatGPT 对 Action 返回的二次归纳。

过去现场有过把第 6 类“二次归纳”当底层 Store 真相的错误。Codex 不得据此反推状态机。

## 4. Level 2：正式 PASS，不再重跑

Task：`phase2-l2-real-20260808-0040-02`。

```text
task_status  = COMPLETED
task_version = 43
plan_version = 11
plan          = COMPLETED
current_node  = null
```

Local：

```text
local-health = COMPLETED
Local Result Ref = local-result:ce8699e2c6fc4ca41503f87148543a29
```

Browser Observe：

```text
browser-observe = COMPLETED
Browser Result Ref = browser-host-result:host-result-615b8b35-d63e-48d5-a6ee-143663693205
WorkItem = work-9c5b1f5d-1d25-4cfd-9218-ff99cfb0feaf
Dispatch = dispatch-ac1815d0-05ce-4606-8144-6e00b0e68400
```

存在完整事件：`TASK_CREATED / ROLE_WORK_REQUESTED / ROLE_WORK_SUCCEEDED / HOST_DISPATCH_CREATED / HOST_DISPATCH_DELIVERED / HOST_RESULT_REPORTED / TASK_COMPLETED`。

**结论：四域 READ PATH 已通过。**

## 5. Level 3 目标与固定 Browser Binding

目标 Controller：

```text
gpt_ref = g-6a751b0e08ec8191afb52ebfba72902a-ai-agent-platform-zong-kong-zhi-neng-ti-controller
conversation_ref = 6a77d844-9830-83eb-ba9d-8c9043fa1133
```

原测试消息：

```text
继续处理任务 phase2-l3-real-20260809-0934-01。必须先重新查询最新 Decision Context。
```

该旧 Task 不再继续使用。下一次干净 Happy Path 必须新建 Task，并使用新 Payload / Approval Ref。

## 6. 旧 Level 3 Task：封存

Task：`phase2-l3-real-20260809-0934-01`。

它已经经历多个代码版本、失败 WorkItem、过期/重领 Dispatch、Approval Draft/Grant 和 UNCERTAIN，不再适合验证 Happy Path。

### attempt-01

```text
WorkItem = work-9020f682-09f2-4858-951f-e548ea3feac0
Dispatch = dispatch-d73dc01a-9796-467c-996f-f5575cf9b5ff
失败 = Platform Wake requires authorization_class=PLATFORM_WAKE
```

无 Delivery / Result / 可见消息副作用。`e9fb952` 后续修复 ordinary `SUBMIT_MESSAGE` 与 Platform Wake 的授权路由。

### attempt-02

```text
WorkItem = work-a5c426d2-67e3-41ad-a259-6d05bbf89e49
Dispatch = dispatch-3b4d6d1d-47a7-414d-987d-b30c8933d47a
approvalRef = approval:phase2-l3-real-20260809-0934-01:browser-submit
```

真实 Draft 与 Grant 已生成；随后失败 `Approval Draft already exists with different preconditions or action fingerprint`。无 Delivery / Result / 可见消息副作用。

### attempt-03

```text
WorkItem = work-2dc21c8b-83a1-463c-831b-640b2a385515
Dispatch = dispatch-cf6edfa7-74c4-4e54-b6ef-a4e110f3240c
approvalRef = approval:phase2-l3-real-20260809-0934-01:browser-submit:attempt-03
```

失败 `The page or planned action changed after the Approval Draft was prepared`。无 Delivery / Result / 可见消息副作用。

### attempt-04：最重要的 Browser Journal 证据

```text
WorkItem = work-69adb240-7577-4400-b37e-b49e323fbf0b
Dispatch = dispatch-1d23bf1d-de3c-4cac-aba2-cd0362202b77
approvalRef = approval:phase2-l3-real-20260809-0934-01:browser-submit:attempt-04
commandId = host-command:dispatch-1d23bf1d-de3c-4cac-aba2-cd0362202b77
```

Journal：

```text
RECEIVED
→ CLAIMED
→ APPROVAL_PENDING
→ 多次 CLAIMED / APPROVAL_PENDING（lease reclaim）
→ PREPARED
→ EXECUTING
→ UNCERTAIN
→ REPORTED
```

最终：

```text
status = UNCERTAIN
error.code = USER_CONTROL_ACTIVE
error.message = User is currently controlling or reviewing the page.
```

从 Draft 到最终 Observation 以下值稳定：

```text
binding_id = binding-be88c29e-7f11-438d-ba92-129ef91d9ba3
conversation_ref = 6a77d844-9830-83eb-ba9d-8c9043fa1133
gpt_ref = g-6a751b0e08ec8191afb52ebfba72902a-ai-agent-platform-zong-kong-zhi-neng-ti-controller
page_fingerprint = sha256:1783e28205a2ec8050417970698dbbc3c57246da7e0e7afa98dac80314225c42
action_fingerprint = sha256:d31f8a32fc4577cc0b2fbdba539b041d44f20c18effb81a1c1fed1fb5b70b110
page_precondition_hash = sha256:5dcdff9d51e99708347cd38e6cf012733c99c079cc9d1b63070a4c1110627a46
```

因此 attempt-04 **不能再归因于 durable approval identity 漂移**。页面未观察到目标消息。

`ca6bda0` 后续增加执行前 user-control defer gate。

### attempt-05：实际不存在

创建尝试中 Controller Claim 成功，但 `submitControllerCommand` 返回：

```text
CONTROLLER_COMMAND_NOT_ALLOWED
Current Plan Node is not executable.
```

没有 `command_id / WorkItem / Dispatch / createdRefs`。`c2bded0` 后续修正 Controller 公共 Context 的 admissible-command filtering。

## 7. 已落库与未落库必须分开

已确认落库：

- `595c209` Browser execution protocol hardening；
- `42e90c7` production Approval Draft / Grant；
- `e9fb952` Platform Wake 与 human approval 分流；
- `d8cd8b2` Approval precondition 稳定化；
- `b99f49e` busy Resume defer；
- `ca6bda0` user-control execution gate；
- `c2bded0` Controller admissible-command filtering。

历史提案、不得机械应用：

- `approval-readiness-stability-final-fix`：attempt-04 Journal 已证明 durable identity/hash 未漂移；
- `action-confirmation-user-activity-fix`：曾基于 post-delivery Allow/Deny 生命周期提出，但截至该交接没有用户确认其落库。Codex 必须从当前 HEAD 独立验证是否存在真实缺陷。

## 8. 调试方法修正

过去最大的测试污染是：**同一个 Controller Conversation 同时承担被测对象与诊断控制台**。

以后必须：

- 创建 Browser Work 后，不再通过目标 Conversation 发送额外状态诊断消息；
- 状态诊断读取 Task/Event/Journal 或独立只读接口；
- 用户只做协议明确要求的人类操作；
- 不在同一个旧 Task 上连续创建多个 attempt 来证明 Happy Path；
- 真实失败先固化成离线自动化测试，再改代码。

## 9. Codex 第一轮必须回答的问题

第一轮只审计，不改代码、不 commit、不 push、不跑真实 Browser。

必须审计：

```text
Task Control
→ Controller Decision Context / Claim / Command
→ WorkItem / Browser Dispatch
→ BHR Claim / Journal
→ Approval Draft / Grant / one-time consume
→ same-command Resume
→ user-control gate
→ SUBMIT_MESSAGE DOM mutation / send confirmation
→ Delivery Ack / Report Token
→ WAIT_FOR_RESPONSE / Action confirmation
→ Host Result / UNCERTAIN
→ Task Control projection / recovery
```

并对最近 hardening Commit 判断：正确 / 多余 / 重复 / 位置不合理 / 仍缺测试。

最终只应给出三种评估之一：

```text
READY_FOR_ONE_FINAL_L3
NEEDS_ONE_CUMULATIVE_FIX
ARCHITECTURE_OR_CONTRACT_REVIEW
```

## 10. MVP 收口候选边界（待共同裁决）

当前候选做法，不是已批准的新 ADR：

- Phase 2 MVP：Level 2 已 PASS + 一次全新干净 Level 3 写 Happy Path；
- Browser Service Worker interruption、replay suppression、conversation mismatch、grant replay、复杂 recovery 等专项 resilience，评估是否进入 Phase 2.1 Browser Protocol Hardening；
- 已经真实产生的 `UNCERTAIN / USER_CONTROL_ACTIVE` 历史保留为 Level 4/no-blind-retry 证据，但不把旧 Task 强行修回 Happy Path。

若最终干净 Level 3 失败：停止现场 attempt 循环，判定当前实现尚未通过写路径 MVP，并转离线专项修复。

## 11. 相关文档

- [ADR-004](../../../adr/ADR-004-phase-2-four-mvp-validation.md)
- [第二阶段 README](./README.md)
- [SOL-INT-001](./SOL-INT-001-第二阶段四域综合集成与验收.md)
- [SOL-BHR-001](./SOL-BHR-001-ChatGPT-Browser-Host-Runtime扩展MVP.md)
- [SOL-TSK-001](./SOL-TSK-001-任务消息中心与单任务调度MVP.md)
