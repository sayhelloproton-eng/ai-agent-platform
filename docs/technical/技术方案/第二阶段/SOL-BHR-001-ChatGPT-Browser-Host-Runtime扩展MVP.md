# SOL-BHR-001｜ChatGPT Browser Host Runtime 扩展 MVP 技术方案

## 2026-08-09 实现与真实页面收口状态（当前有效）

| 项目 | 当前结论 |
|---|---|
| 状态 | **Implemented / Integrated；真实 OBSERVE 已 PASS；写路径进入收口评估** |
| 扩展版本 | `0.3.0` |
| Gateway Server Contract | `1.0.0`，入口 `/v1/browser-host/invoke` |
| Host Registry | 注册、心跳、TTL、Capability 过滤和过期阻断已实现 |
| Dispatch | Claim → Get → Delivery Ack → Report Token → Host Result/Uncertain 三阶段链路 |
| Approval | `/v1/approvals/grants` 签发；BHR Get/Consume；单次消费、绑定和过期校验 |
| 安全恢复 | 并发 Journal、裁剪保护、损坏记录隔离、Conversation 重验、`UNCERTAIN` 禁止盲重试 |
| 自动化 E2E | BHR `HttpGatewayClient`/`DispatchClient` 已通过真实 Gateway HTTP 边界串联 TSK |
| 真实页面 | MV3 加载、Host ONLINE、真实 ChatGPT Binding、`OBSERVE_PAGE` 已验证；`SUBMIT_MESSAGE` 已走到 Approval / Resume / EXECUTING，但旧 Task 最终 `UNCERTAIN / USER_CONTROL_ACTIVE` |

自动化测试证明的是生产 HTTP Adapter、凭证、状态和回报链路，不宣称已经在当前执行环境操作真实 ChatGPT 页面。

### 2026-08-09 真实写路径证据与当前边界

- 固定目标 Controller：`gpt_ref=g-6a751b0e08ec8191afb52ebfba72902a-ai-agent-platform-zong-kong-zhi-neng-ti-controller`，`conversation_ref=6a77d844-9830-83eb-ba9d-8c9043fa1133`。
- ordinary `SUBMIT_MESSAGE` 的 Platform Wake 误路由已由 `e9fb952` 修复。
- Approval Draft、用户明确批准、one-time Grant、same-command Resume 已在真实 Browser 流中发生。
- attempt-04 Journal 显示 `APPROVAL_PENDING → PREPARED → EXECUTING → UNCERTAIN → REPORTED`，最终错误 `USER_CONTROL_ACTIVE`；稳定 Browser/Approval identity 未漂移。
- `ca6bda0` 已把“用户正在操作/复核页面”提升为执行前 defer gate：在可知用户控制时不先消费 Grant、不进入副作用执行。
- `USER_CONTROL_ACTIVE` 的最终 post-delivery/response-lifecycle 语义、以及曾提出的 `action-confirmation-user-activity-fix`，目前必须由 Codex 从当前 HEAD 独立审计；该历史 Overlay 不是既定修复。
- 旧 Task `phase2-l3-real-20260809-0934-01` 已封存，禁止继续 retry；下一次真实写验收必须使用全新 Task，并把目标 Controller Conversation 当作**被测对象而不是诊断控制台**。

新的现场测试方法：Browser Work 创建后，不再通过同一个目标 Conversation 发送状态诊断消息；诊断应读取 Task/Event/Journal 或独立接口，避免观察行为改变 `generation_state / user_active / blocking_ui`。



| 字段 | 值 |
|---|---|
| 方案 ID | `SOL-BHR-001` |
| 状态 | Implemented / Integrated（真实页面待本机验收） |
| 版本 | `0.3.0` |
| 所属阶段 | 第二阶段 MVP-4 |
| 核心领域 | Browser Host / Browser Runtime Adapter |
| 第一宿主 | Chrome Manifest V3 扩展 |
| 第一适配页面 | ChatGPT 网页端及 Custom GPT 会话 |
| 一级页面分析器 | Local Vision Decision Service；MVP 先接 DeepSeek，手机模型可后置接入 |
| Task 与调度真源 | Task Control |
| 浏览器事实真源 | Browser Observation / Host Execution Result |
| 正式模型输出通道 | Custom GPT Action → 唯一 Gateway |
| 文档边界 | Git-only，不进入 `docs/knowledge/**`，不触发飞书发布 |

## 一、本文拥有的问题

本文只回答一个问题：

> 如何把运行在用户真实 Chrome 环境中的扩展建设为 ChatGPT 网页端的 Browser Host Runtime Adapter，使它能够观察页面、恢复或打开会话、向正确角色注入最小唤醒信息，并把 Task Control 已授权的 Host Command 转换为一次可验证、可恢复、可审计的浏览器动作。

BHR 不是业务大脑、任务中心、审批系统、通用 RPA 或任意网页 Agent。

## 二、核心结论

```text
BHR：浏览器观察、会话路由、页面动作、宿主结果
DeepSeek / 手机模型：可替换的页面初判与验证 Provider
Controller / 专有 GPT：业务语义与计划决策
Task Control：Task、Plan、Dispatch、Claim、状态和调度真源
Approval：高风险动作一次性授权
Gateway：认证、校验、命名空间路由
```

固定原则：

1. BHR 主动观察、轮询和驱动网页；GPT 不直接调用扩展内部 API。
2. GPT 的正式机器结果走 Action，不从聊天正文解析 Controller Command。
3. BHR 只向 GPT 注入最小 Wake Envelope，完整 Task / Plan 由 GPT 再通过 Action 查询。
4. Screenshot、DOM、Visible Text 和 Page State 是浏览器事实，不是批准或业务完成证明。
5. 本地模型只形成观察、候选和验证建议，不修改 Task，不批准高风险动作。
6. DeepSeek 是当前基线和兜底；手机模型可按同一 Provider 合同后置替换，不是本 MVP 前置依赖。
7. 页面动作前重校验，动作后重新观察；不确定即停止，不盲目重试。

## 三、MVP 闭环

```text
扩展注册 Browser Host
→ 发现并绑定 ChatGPT 标签页 / Conversation
→ FOLLOW_LATEST 并采集 Observation
→ DeepSeek / 确定性规则初判
→ 需要总控时形成可审核 Wake Envelope
→ 人工批准后注入并发送
→ 总控通过 Action 查询 Decision Context、Claim 并提交 Controller Command
→ Task Control 原子更新 Task / Plan / Event
→ Task Control 生成 Browser Dispatch / Host Command
→ BHR 轮询、Claim、前置检查和审批校验
→ 执行一次真实网页动作
→ 再次观察与验证
→ 回报 Host Result
→ Task Control 决定继续、等待、阻塞、暂停或停止
```

第二阶段只验证单任务、单浏览器、少量预注册动作，不建设无人监督通用网页自动化。

## 四、领域边界

### 4.1 Browser Host 拥有

- Browser Host Instance；
- Window / Tab 发现与内部引用；
- Session Binding；
- ChatGPT Page Adapter；
- Browser Observation；
- Screenshot、Visible Text、DOM Summary、Interactive Element Snapshot；
- `FOLLOW_LATEST`；
- Browser Dispatch / Host Command 的宿主侧 Claim 与局部 Journal；
- Browser Action Executor；
- Host Execution Result；
- 页面 Adapter 健康与局部恢复；
- 用户暂停和 Emergency Stop。

### 4.2 Browser Host 不拥有

| 对象或决策 | 所属领域 |
|---|---|
| Goal、Requirement、业务验收 | Goal / Planning |
| Task、Task Version、Plan、Plan Node | Task Control |
| Controller Claim 与计划语义 | Controller / Task Control |
| 本机仓库和 Runtime 事实 | Local Control |
| 正式 Approval 与授权审计 | Approval |
| Artifact / Evidence 生命周期 | Artifact / Evidence |
| 模型、Role Profile、推理路由 | Model Inference |
| 代码修改、Commit、Push | Execution / Git Governance |
| 最终任务完成判定 | Controller / Task Control / Acceptance |

BHR 可以携带 `task_id`、`task_version`、`plan_node_id` 和 `dispatch_ref` 做关联，但不能解释或修改这些对象。

### 4.3 本地模型边界

本地模型只拥有一次推理结果中的：

- 页面状态分类；
- 可见信息摘要；
- 置信度与警告；
- 证据引用；
- 低风险补充观察请求；
- 候选动作；
- 动作后验证结论；
- 是否升级给总控或人工的建议。

本地模型不拥有 Task、Plan、Approval、Host Command 合法性和副作用授权。

## 五、标识与 Claim

| 标识 | 含义 | 所属 |
|---|---|---|
| `host_id` | Browser Host 实例 | Browser Host Registry |
| `tab_ref` | BHR 内部稳定标签页引用 | Browser Host |
| `gpt_ref` | Custom GPT Provider 资源引用 | Agent / Provider Registry |
| `conversation_ref` | ChatGPT Conversation 定位引用 | Browser Host Binding |
| `binding_id` | Role / Conversation 与 Tab 的绑定 | Browser Host |
| `task_id` | 业务 Task | Task Control |
| `dispatch_ref` | 一次 Browser 调度 | Task Control |
| `command_id` | Host Command | Task Control / Browser Contract |
| `approval_ref` | 正式审批引用 | Approval |
| `artifact_ref` | Screenshot / DOM / Evidence 引用 | Artifact / Evidence |

GPT URL 中的 `g-...` 和 Conversation URL 只用于定位，不是身份授权凭证。

三类租约必须分开：

```text
Controller Claim：总控获得 Task 语义推进权
Work Item Claim：专业执行者获得工作项处理权
Browser Dispatch Claim：某个 Host 获得一次投递或页面动作处理权
```

BHR Claim 不能赋予 Task / Plan 修改权；页面投递失败也不能直接把业务 Task 标为失败。

## 六、Session Binding

候选最小结构：

```json
{
  "binding_id": "binding-controller-001",
  "host_id": "bhr-mac-001",
  "provider": "chatgpt-web",
  "browser_profile_ref": "chrome-profile-ai",
  "window_ref": "window-001",
  "tab_ref": "tab-controller-001",
  "role_ref": "controller",
  "gpt_ref": "gpt-ai-agent-platform-controller",
  "conversation_ref": "conversation-controller-20260805",
  "mode": "FOLLOW_LATEST",
  "state": "READY",
  "last_seen_at": "2026-08-05T12:00:00+08:00"
}
```

规则：

- 一个 Binding 同时只绑定一个 Tab；
- 同一 GPT 可以有多个 Conversation；
- Task 不永久绑定 Conversation；
- Tab 关闭、导航或会话失效后 Binding 进入 `STALE`；
- 重新绑定必须重新确认 Provider、Role、GPT 和 Conversation，不静默转绑未知页面。

## 七、扩展内部结构

```text
Chrome Extension（Manifest V3）
├── Background Service Worker
│   ├── Host Registration / Heartbeat
│   ├── Gateway Client
│   ├── Dispatch Poller / Claim
│   ├── Window / Tab Registry
│   ├── Screenshot Coordinator
│   ├── Command Journal
│   ├── Approval Validation Client
│   └── Host Event Reporter
├── Content Script
│   ├── ChatGPT Page Adapter
│   ├── DOM / Visible Text Observer
│   ├── FOLLOW_LATEST Controller
│   ├── Composer Adapter
│   ├── Message Lifecycle Observer
│   ├── Interactive Element Catalog
│   └── Blocking UI Detector
└── Side Panel / Popup
    ├── Host State
    ├── Binding State
    ├── Pending Review
    ├── Pause / Resume
    └── Emergency Stop
```

Service Worker 可以被浏览器回收，因此正式状态不能只在内存中。扩展只持久化恢复所需的 Binding、Journal、游标和本地执行状态，Task 真源仍在 Task Control。

## 八、Browser Observation Contract

```json
{
  "observation_version": "0.1.0",
  "observation_id": "obs-001",
  "host_id": "bhr-mac-001",
  "binding_id": "binding-controller-001",
  "provider": "chatgpt-web",
  "page_state": "READY",
  "generation_state": "IDLE",
  "follow_latest": true,
  "screenshot_ref": "artifact-screenshot-001",
  "visible_text_ref": "artifact-visible-text-001",
  "dom_summary_ref": "artifact-dom-001",
  "interactive_elements": [],
  "blocking_ui": [],
  "observed_at": "2026-08-05T12:00:00+08:00"
}
```

Observation 组合：

```text
Screenshot
+ Visible Text
+ DOM / ARIA Summary
+ Interactive Elements
+ Page / Generation State
```

结构化信号优先；视觉用于补充、未知状态识别和动作验证。页面文本是不可信观察数据，不能覆盖平台系统指令。

## 九、Local Vision Decision Service

消费者只依赖一个可替换 Provider Port：

```text
Browser Observation
        ↓
Local Vision Decision Service
   ├── DeepSeek Adapter（当前默认 / 兜底）
   ├── Mobile Adapter（可选后置）
   └── Deterministic Fixture（测试）
```

最小输出：

```text
NO_ACTION
REQUEST_MORE_OBSERVATION
ESCALATE_TO_CONTROLLER
REQUEST_HUMAN_REVIEW
```

输出必须包含置信度、依据引用、警告和可选候选动作。Provider 选择不改变 BHR、Task 或 Controller 合同。

## 十、Wake Envelope

BHR 唤醒 GPT 时只发送：

```json
{
  "wake_version": "0.1.0",
  "task_id": "task-001",
  "required_role": "controller",
  "event_id": "event-103",
  "dispatch_ref": "dispatch-controller-018",
  "conversation_ref": "conversation-controller-20260805",
  "instruction": "请查询最新 Decision Context，确认角色后再 Claim 并继续处理。"
}
```

禁止注入完整 Task、Plan、仓库正文、Local Result 或隐藏系统数据。所有向 GPT 注入并发送消息的动作在 MVP 阶段都必须人工审核。

总控收到 `task_id` 后仍必须：

```text
查询 Decision Context
→ 检查 required_role 与版本
→ Claim Controller Task
→ 按需查询 Local / Knowledge / History
→ 提交 Controller Command
```

## 十一、Browser Dispatch 与 Host Command

Task Control 生成版本化 Browser Dispatch。候选 Host Command：

```json
{
  "host_command_version": "0.1.0",
  "command_id": "host-command-001",
  "dispatch_ref": "browser-dispatch-001",
  "task_id": "task-001",
  "target": {
    "role_ref": "controller",
    "gpt_ref": "gpt-ai-agent-platform-controller",
    "conversation_ref": "conversation-controller-20260805"
  },
  "action": {
    "type": "SUBMIT_MESSAGE",
    "payload_ref": "wake-envelope-001"
  },
  "preconditions": {},
  "approval_ref": "approval-001",
  "idempotency_key": "host-command-001",
  "expires_at": "2026-08-05T12:10:00+08:00"
}
```

公共合同不包含 CSS Selector、Chrome Tab ID、坐标或任意 JavaScript。Page Adapter 在宿主内部把语义动作映射到当前页面。

## 十二、动作目录与风险

MVP 只允许预注册动作：

- 观察页面和生成状态；
- `FOLLOW_LATEST`；
- 打开或恢复指定 GPT / Conversation；
- 设置 Composer 文本；
- 发送已经审核的消息；
- 停止生成；
- 点击少量预登记、可验证的 UI 动作。

禁止：任意 JavaScript、任意 DOM Patch、任意坐标点击、Cookie 导出、私有网络 API 逆向、浏览器外 Shell。

风险分级：

- 低风险纯观察：无需副作用授权；
- 页面状态改变、发送消息、确认、删除、发布等：必须一次性 Approval Grant；
- 无法确定风险：停止并请求人工。

## 十三、Approval Grant

```json
{
  "approval_ref": "approval-001",
  "grant_id": "approval-grant-001",
  "action_fingerprint": "sha256:...",
  "binding_id": "binding-controller-001",
  "task_id": "task-001",
  "command_id": "host-command-001",
  "allowed_action_type": "SUBMIT_MESSAGE",
  "page_precondition_hash": "sha256:...",
  "single_use": true,
  "expires_at": "2026-08-05T12:10:00+08:00"
}
```

执行前校验：审批已通过、未过期、未使用、动作指纹一致、Binding/Task/Command 一致、页面前置条件仍成立、未暂停或撤销。

页面变化导致指纹失配：

```text
APPROVAL_PRECONDITION_CHANGED
→ 不执行
→ 重新观察
→ 重新申请审批
```

MVP 可使用本地 Approval Fixture，但必须保留引用、一次性消费和审计字段，不能用普通布尔开关代替。

## 十四、ChatGPT Page Adapter

最小接口：

```text
detectPage
identifyProvider
identifyGPT
identifyConversation
readPageState
readGenerationState
ensureFollowLatest
collectVisibleText
collectMessageSummary
collectInteractiveElements
locateComposer
setComposerText
submitComposer
stopGeneration
waitForResponseChange
detectBlockingUI
verifyExpectedPageChange
```

元素定位优先级：

```text
ARIA Role / Accessible Name
→ 可见文字
→ 稳定语义属性
→ 相对结构
→ DOM 特征
→ 视觉 / 坐标辅助
```

不把单个 CSS Selector 当作公共协议。具体 Selector 必须在实现时针对真实页面测试并作为 Adapter 内部版本化细节维护。

## 十五、执行、验证与不确定性

```text
Claim Host Command
→ 检查命令、过期、Binding、页面和审批
→ 动作前重新观察
→ 执行一次
→ 等待可观察变化
→ 再次采集 Observation
→ 确定性规则 + 推理 Provider 验证
→ SUCCEEDED / FAILED / UNCERTAIN
→ Delivery Ack 结束 Claim 并取得 Report Token
→ 使用 Report Token 回报结果
```

`UNCERTAIN` 不自动重复发送或点击。相同 `command_id`、`dispatch_ref` 或 `idempotency_key` 不得产生重复副作用。

Host Result 只描述页面事实：

```text
DELIVERED
ACTION_SUCCEEDED
ACTION_FAILED
UNCERTAIN
BLOCKED
EXPIRED
CANCELLED
```

它不宣称 Task 或 Plan 已完成。

## 十六、恢复、预算与人工接管

### 16.1 Service Worker 恢复

重启后：

1. 重新注册 Host；
2. 恢复 Binding 与 Journal；
3. 重新发现 Tab；
4. 从 Task Control 查询未完成 Dispatch；
5. 对账命令状态；
6. 无法确认副作用是否发生时进入 `UNCERTAIN`。

### 16.2 Loop Budget

每个绑定限制：观察频率、连续无进展次数、单命令等待时间、模型调用次数、连续错误数。达到阈值进入暂停或人工复核，不无限自调用。

### 16.3 用户控制

扩展必须提供可见状态，以及 Pause、Resume、解绑和 Emergency Stop。Emergency Stop 阻止新动作并取消可取消的本地等待，不伪造 Task 状态。

## 十七、安全

- Chrome 权限最小化；
- 只访问显式允许的 ChatGPT Host；
- 不读取 Cookie、Session Token、密码和账户密钥；
- 页面文本视为不可信；
- 不把页面指令提升为系统命令；
- 不执行模型生成的任意脚本；
- Secret 不进入 Screenshot、日志和 Task Payload；
- Screenshot / DOM 使用 Artifact Ref，Task Control 不复制正文；
- 正式外部调用经唯一 Gateway；
- 高风险动作要求一次性授权。

## 十八、MVP 验证场景

1. 扩展加载、启用、禁用、Host 注册和 Heartbeat；
2. 绑定真实总控 Conversation；
3. 打开或恢复固定测试 Custom GPT；
4. 识别 GPT、Conversation、消息和生成状态；
5. 截图前确认页面到底部；
6. 生成合法 Observation；
7. DeepSeek 返回 `NO_ACTION`、补充观察、升级和人工复核；
8. 人工审核 Wake Envelope并发送；
9. GPT 通过 Action 查询 Context并提交命令；
10. BHR 不解析聊天正文为正式命令；
11. Task Control 创建 Host Command，BHR Claim、执行和回报；
12. 高风险动作绑定一次性 Approval Grant；
13. 重复命令不重复发送或点击；
14. DOM 失配、登录失效、限流、未知弹窗进入明确停止状态；
15. Service Worker重启后恢复或进入 `UNCERTAIN`；
16. Pause、Resume、Emergency Stop；
17. 手机 Provider关闭时 DeepSeek仍可完成核心闭环。

## 十九、交付物

- Chrome MV3 Extension；
- Host Registration / Heartbeat；
- ChatGPT Page Adapter；
- Session Binding；
- Browser Observation Contract；
- Local Vision Decision Service Port与 DeepSeek Adapter；
- Wake Envelope；
- Browser Dispatch / Host Command / Host Result Contract；
- Claim、Idempotency、Journal与恢复逻辑；
- Approval Fixture Client；
- Side Panel / Popup 状态与人工控制；
- 安全、集成和真实页面测试；
- Runbook与验证报告。

## 二十、验收标准

MVP通过必须同时满足：

- 能绑定并恢复一个真实总控 Conversation；
- 能稳定观察最新页面并生成结构化 Observation；
- DeepSeek / Fixture 可通过统一 Port返回合法 Assessment；
- 本地模型不能修改 Task、批准动作或直接执行任意脚本；
- 发送 GPT 消息经过人工审核；
- Wake Envelope只包含最小 Task / Role / Dispatch信息；
- 总控通过 Action查询正式 Context；
- BHR不从聊天正文提取正式 Controller Command；
- Task Control能生成 Host Dispatch；
- BHR可 Claim、前置校验、执行一次并回报；
- 高风险动作绑定一次性授权；
- 动作前后都有可引用 Observation；
- 重复命令无重复副作用；
- 不确定结果停止而非盲目重试；
- 重启可恢复或明确 `UNCERTAIN`；
- 用户可暂停和紧急停止；
- 不存在任意 JS、任意 Shell、Cookie导出和 Task直接写入；
- 手机模型缺席不阻塞本 MVP。

## 二十一、非目标

不实现通用互联网 Agent、多浏览器调度、无人监督任意网页操作、私有 API 逆向、完整 Approval/Evidence/Recovery 产品、完整管理后台、正式手机部署或多任务并发。

## 二十二、与其他 MVP 的合同

### 22.1 对 `SOL-CTL-001`

只提供 `task_id`、`required_role`、`event_id / dispatch_ref` 和可选 `conversation_ref`。总控被唤醒后重新查询 Decision Context、Claim并提交 Controller Command。

### 22.2 对 `SOL-LCL-001`

BHR不通过 DOM搬运 Local Result，Browser操作不进入 `aap-local`。本机资源读取和浏览器交互是两个领域。

### 22.3 对 `SOL-TSK-001`

Task Control提供 Browser Dispatch、Host Command版本、Target引用、Dispatch Claim、Expiry、Approval Ref、Result Ref、幂等和取消状态。BHR不读取 Task内部表。

### 22.4 对 `SOL-MOB-001`

BHR只依赖 Model Inference Port，不依赖手机设备或模型品牌。DeepSeek为当前默认和兜底；手机模型先影子评测，达标后才处理低风险页面观察。

### 22.5 对 Approval / Artifact / Evidence

BHR消费一次性 Grant并产生观察引用；审批决定与 Artifact 生命周期由各自领域拥有。

## 二十三、联合审计结论与剩余人工项

已经冻结并实现：

- 扩展包名与版本：`apps/browser-host-runtime` / `0.3.0`；
- Browser Host Server、Dispatch Credential 和 Approval Grant 公共合同：`1.0.0`；
- 正式入口：`POST /v1/browser-host/invoke`；
- Dispatch 作为 Task Control 协调对象，并可关联 Browser Work Item；
- Claim Token、Delivery Receipt、Report Token 三阶段字段和失效规则；
- Payload Resolver、Host Registry、Approval Grant Get/Consume；
- 合同提升到 `packages/contracts/src/phase2-integration.ts`；
- 自动化 Gateway HTTP、TSK 和 BHR Client 端到端证据。

仍需用户本机人工验收或后续产品化：

- ChatGPT 真实 DOM、Conversation/GPT Binding 和页面身份证据；
- Screenshot / Observation Ref 的长期保留与 Artifact Store 接管；
- 多标签页、窗口焦点、Side Panel 与 Native Messaging 的产品化策略；
- 真实高风险页面动作的一次性 Approval Grant 消费与 `UNCERTAIN` 恢复演练。

## 二十四、来源与相关文档

- [ADR-004｜第二阶段核心四个 MVP 与可选端侧推理扩展](../../../adr/ADR-004-phase-2-four-mvp-validation.md)
- [第二阶段技术方案目录](./README.md)
- [SOL-CTL-001](./SOL-CTL-001-总控Agent与动态上下文MVP.md)
- [SOL-LCL-001](./SOL-LCL-001-Local-Control与CLI-MVP.md)
- [SOL-TSK-001](./SOL-TSK-001-任务消息中心与单任务调度MVP.md)
- [SOL-MOB-001](./SOL-MOB-001-手机端单模型多角色服务MVP.md)
