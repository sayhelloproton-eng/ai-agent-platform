---
docId: EXECUTION-EXECUTION-BROWSER-EXTENSION-TECH-DESIGN
title: 04 · execution-browser-extension 详细技术方案
docType: module-design
authority: normative
lifecycle: frozen
domain: execution
moduleRef: execution-browser-extension
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs:
- EXECUTION-EXECUTION-BROWSER-EXTENSION-TECH-DESIGN
- EXECUTION-DOC-02-01
- EXECUTION-DOC-02-02
---

# 04 · execution-browser-extension 详细技术方案

## 1. 定位

Browser Extension 完全归 Execution Domain。

它是：

> **Browser Executor + Evidence Provider + Task Driver carrier coordinator + P0 Side Panel**

它不是：Task/Agent 业务真源、通用 scheduler、Approval 业务服务。

## 2. 顶层组件

推荐结构：

```text
extension/
├── background/            # MV3 service worker
│   ├── runtime-session
│   ├── task-driver
│   ├── worker-lanes
│   ├── recovery-scan
│   ├── browser-executor
│   ├── verifier
│   └── system-observer
├── content/
│   ├── page-runtime
│   ├── chatgpt-dom
│   ├── action-permission
│   └── evidence
├── side-panel/
├── shared/
└── manifest.*
```

不要求按这些目录原样实现，但职责必须保持。

## 3. Task Driver = 唯一业务驱动线

触发来源只有：

1. Task Node polling（未来可替换 event）；
2. 当前 Worker Lane 的 Browser events；
3. Collaboration formal input；
4. Human Decision result；
5. Extension/Chrome/Runtime 恢复时的一次性 Recovery Scan。

明确删除：周期扫描 Task/Agent/Execution/Browser 全系统并重新推导业务状态。

## 4. Worker Lane

每个 `(taskId, roleRef, workerRef)` 形成逻辑 Worker Lane。

Worker Lane 保存的是运行 view，不是新的业务实体。

Lane 需要表达：

```text
worker identity
current tab/content session
page state
current activity
current executionRef
continuationRef（如等待人工）
last progress
```

同 Worker Browser 写串行。

Worker BUSY 只说明 GPT 正在生成，不长期占用全局 Browser 写锁。

## 5. Stable vs Transient Identity

Stable：

```text
roleRef
workerRef
```

Transient：

```text
tabId
windowId
extensionInstanceId
contentInstanceId
```

Tab/Content binding 必须 freshness 校验；旧 persisted READY 无权威性。

## 6. Extension Runtime Session

Extension background 启动：

```text
new extensionInstanceId
→ connect execution-runtime
→ handshake
→ heartbeat
```

Runtime ONLINE 判断只看活 session + heartbeat freshness。

Content Script 每次 load/navigation 生成新 `contentInstanceId`；同 tab reload 后旧 content instance 必须失效。

向页面发写命令前至少校验：

```text
tab exists
current contentInstanceId matches
URL matches expected roleRef/workerRef
```

## 7. CREATE

前置：Task 没有对应 workerRef。

流程：

```text
open role URL /g/<role>
→ page ready
→ submit minimal bootstrap/bind message
→ observe same-tab navigation
→ capture new /c/<workerRef>
→ verify role + worker URL
→ optional harmless bootstrap-check Action（只读、不得触发人工 permission；用于校验 Instructions/Action/Gateway readiness，不作为 c-id 真源）
→ call Task API bind worker
→ stop
```

注意：

- c-id 的权威 evidence 来自真实 URL/navigation；
- bootstrap Action 不替代 c-id；
- CREATE 后不立即开始 Node；
- 中断且可能已创建 → UNKNOWN，恢复已有 conversation，绝不盲建第二个。

## 8. RESTORE

前置：已有 workerRef。

```text
open /g/<role>/c/<workerRef>
→ load
→ verify exact role/worker identity
→ ensure content session
→ transient bind
```

缺 Tab 不是 CREATE 条件。

## 9. WAKE

```text
ensure RESTORE
→ verify page is writable/not BUSY in conflicting action
→ build small identity/trigger payload
→ input
→ submit
→ verify message inserted in target conversation
→ Worker uses Actions/File Bridge for large dynamic context
→ optional observe generation/action signal
```

trigger 应携带可追踪的语义：node/run/reopen/peer reply 等。

WAKE SUCCEEDED = 指令真实送达 Worker；不是 Node complete。

## 10. Page State / Progress

运行状态：`IDLE/BUSY/BLOCKED/UNKNOWN`。

`activityKind` 可示例：

```text
GENERATING
ACTION_PERMISSION
ACTION_RUNNING
WAITING_HUMAN
WAITING_PEER
RECOVERING
```

不要把 activityKind 变成业务状态机。

Progress events 包括：

- GPT 内容继续生成；
- Action 开始/permission/result；
- Execution 状态变化；
- Task/Agent formal fact 变化；
- Human continuation resolved。

## 11. Progress Gap / Runtime Stall

Progress Gap：page IDLE + Node still IN_PROGRESS。

允许少量安全 continuation，但不能无限 WAKE。

重复无进展：deterministic evidence → FAST → REASON → 必要 Human。

Runtime Stall：page BUSY + 长时间无真实 progress + 排除了模型/Execution/Approval/Peer 的合法等待。

## 12. GPT Action Permission

Static OpenAPI 对 routine query/control/intent operation 必须显式 `x-openai-isConsequential:false`。OpenAI Carrier confirmation 与 Execution Approval 是两层独立语义。

目标 happy path：

```text
routine non-consequential Action
→ 若目标环境已验证 Always Allow，则不需要 Browser 每次自动点击
→ Action 直接进入 Gateway
```

Browser permission handler 保留为 fallback：

```text
unexpected prompt / changed schema-domain-auth / consequential prompt / Always Allow 尚未验证
→ do not Deny first
→ preserve page
→ screenshot/log/evidence
→ lane WAITING_HUMAN or bounded known-action handling
→ result returns
→ revalidate page/task/execution/fingerprint
→ resume same continuation
```

因此“自动 Allow 每个正常 Action”从目标主路径裁掉，但在 Always Allow Spike 通过前不能删除恢复能力。

## 13. Human Decision

Decision request 应至少带：

```text
task/node/run
role/worker
executionRef
page identity
screenshot/log evidence
model judgement
exact question/options
continuationRef
```

人工回来后不能机械点击，必须重新校验现实前置条件。

用户可能已经手动在页面解决问题；Task Driver 应能识别“现实已经 resolved”并继续。

通知渠道 P0 不锁死；未来可接飞书机器人，但 Browser Task Driver 不依赖具体通知渠道。

## 14. Collaboration Delivery

Agent Message Center owns message semantics。

Task Driver 子流程：

```text
Agent 有 pending peer message
→ restore target worker
→ execution-runtime authorizes browser delivery
→ submit message
→ verify delivered in conversation
→ report Delivery evidence
→ Agent API 更新 formal message delivery fact
```

reply 必须物理 DELIVERED 后才能允许下一问。

## 15. Candidate Revalidation 与 Browser Execution Stage Facts

任何从 Task polling / Collaboration / lane event 生成的 execution candidate，在越过 effect 前都要重新读取必要 authoritative facts；如果 task/node/run/worker/precondition 已变化，直接丢弃 stale candidate，不继续执行。Node trigger / message delivery 的幂等必须最终链接到同一 `executionRef`。

### 15.1 Stage Facts

内部阶段：

```text
COMMAND_ACCEPTED
PRECONDITION_VERIFIED
EFFECT_STARTED
RESULT_REPORTED
```

不要拆成 Attempt/Delivery entity。

`EFFECT_STARTED` 应在真实副作用前可靠记录；实现上建议由 runtime durable acknowledge 后再执行 effect。

EFFECT_STARTED 前可证明 not applied → 同 executionRef 重新校验后继续。

EFFECT_STARTED 后失联 → UNKNOWN；先 reality check。

## 16. Precondition / Verifier

Precondition 是 semantic fingerprint：

```text
role/worker URL
Task/node/run
page state
expected control
critical content fingerprint
permission/action state
```

不要整页 hash。

Verifier 按 Capability 定义 postcondition，例如：

- submit：消息存在、fingerprint 匹配；
- allow：dialog 消失 + Action state changed；
- create：新 c-id + role 验证；
- restore：URL/identity/content healthy；
- wake：trigger message 存在。

## 17. Recovery Scan

仅启动/reload/reconnect 时执行一次：

```text
new extension session
→ discover tabs
→ parse /g + /c
→ recreate content sessions
→ rebuild worker runtime bindings
→ query unfinished browser executions
→ query waiting human continuations
→ reality reconcile
→ resume safe lane states
→ end scan
```

恢复示例：

- WAKE 已成功、Worker BUSY → 不再 WAKE；
- permission 等人工 → 恢复 WAITING_HUMAN；
- effect_started + result missing → UNKNOWN + observe；
- Task 有 workerRef、Tab 丢了 → RESTORE，不 CREATE。

## 18. System Observer

只读，最低优先级。

轻量 heartbeat/state/log summary 可以定期；截图、日志 review、FAST/REASON 深评只在资源空闲时。

一旦 business work 到来立即让路。

Observer 输出报告/建议，不自行点击、修复或推进 Task。

## 19. Side Panel

P0 必须实现，详见 `10`。

它应该成为第一排障入口，而不是漂亮 dashboard。

---

## 当前正式约束：唯一 Browser Owner

Execution Browser 唯一拥有 CREATE / RESTORE / WAKE / page runtime state / permission / screenshot / click-type-submit / collaboration physical delivery / recovery。Task Driver 只能通过 Task Public API 读取/推进，不得直接写 Task Store；Role/Worker identity 通过 Agent Public API。WAKE 成功不等于 Node/Action/Effect 成功；大型动态上下文不再默认经 DOM 注入，GPT Actions File Bridge 已进入 Carrier transport contract；其 Conversation file search/Code Interpreter 使用效果留 Agent Carrier E2E。

## 20. Browser 与 GPT Actions File Bridge 的职责分层

Browser 不负责大型文件/上下文传输。

```text
Browser → Conversation identity/lifecycle/page state/submit/recovery
Gateway → OpenAI Actions/File Bridge protocol
Task    → TaskDocument
Execution Local/Network → physical file fetch/materialization
```

一次 WAKE 只需送达一个小型 trigger；Worker Turn 内可以继续调用多个 Action，Browser 不在每个 Action 之间机械 WAKE。该 Multi-Action 行为需真实 Carrier E2E，但不再把“一 Action 一 WAKE”写成默认流程。

`openaiFileResponse` 不能返回 image/video，因此 Browser screenshot + Model Vision 继续保留，不被 File Bridge 替换。
