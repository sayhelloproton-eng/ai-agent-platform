# SOL-BHR-001｜ChatGPT Browser Host Runtime 扩展 MVP 技术方案

| 字段 | 值 |
|---|---|
| 方案 ID | `SOL-BHR-001` |
| 状态 | Candidate |
| 所属阶段 | 第二阶段 MVP-4 |
| 核心领域 | Browser Host |
| 宿主 | Chrome + ChatGPT 网页端 |
| 主要开源参考 | MCP-SuperAssistant |
| 上游 | Task Center Host Command |
| 辅助能力 | 本地视觉模型、测试审批 Fixture |

## 一、定位

Chrome 扩展的正式定位是：

> ChatGPT 网页端的 Browser Host Runtime Adapter。

它不是简单的自动填输入框工具，也不是总控 Agent。它负责把平台中的调度和经过授权的 Host Command 转换为真实浏览器行为：

```text
任务中心 Host Command
→ Chrome 扩展
→ ChatGPT 页面 / 会话 / DOM
→ Host Result
→ 任务中心
```

从用户体验看，它让 GPT “自调用”；从系统实现看，它是外部 Driver 让网页端角色再次进入下一轮。

## 二、需要回答的核心问题

1. 扩展能否持续发现任务中心的待处理 Host Command？
2. 能否定位或恢复正确的总控会话，而不是误发到其他 Chat？
3. 能否为固定测试审计角色打开新页面或新会话并完成绑定？
4. 能否只注入最小任务引导，让角色通过 Action 获取正式上下文？
5. 能否观察消息发送、生成开始、生成完成、超时和页面异常？
6. 扩展重启或页面刷新后能否恢复未完成投递？
7. 能否采集截图、DOM 与可访问性语义，并交给本地视觉模型分析？
8. 获得一次性正式授权后，能否重新校验精确 DOM 并执行一次受控点击？
9. 相同 Host Command 是否不会重复发送或重复点击？

## 三、领域边界

### 3.1 Browser Host 拥有

- 浏览器标签页；
- ChatGPT 页面状态；
- 角色与会话绑定；
- Content Script 页面适配；
- 输入、发送和响应观察；
- 截图与 DOM 采集；
- Host Command 的领取、执行和回报；
- 经过授权的一次性 UI Actuation；
- 扩展本地持久状态。

### 3.2 Browser Host 不拥有

| 对象 | 所属限界上下文 |
|---|---|
| Task 和工作流状态 | Task Control |
| Role 的业务职责 | Agent Governance |
| Goal / Context 正文 | Goal / Context |
| 是否需要审计 | 总控 Decision + Task Control |
| 是否允许敏感点击 | Approval |
| 本机资源 | Local Control |
| 结果是否合格 | 总控 / Reviewer |
| 截图的正式证据生命周期 | Evidence |

扩展不能直接写 Task 数据库，也不能根据 GPT 回复文本自行推进业务状态。

## 四、三类核心能力

### 4.1 继续已有角色会话

```text
Task Center：CONTINUE_SESSION
→ 扩展找到 conversation_ref
→ 校验角色、URL、页面状态
→ 注入最小 Wake Message
→ 发送
→ 观察响应
→ 回报 Host Result
```

最小消息：

```text
继续处理 task-001。请先通过 Action 获取最新任务状态。
```

扩展不需要知道为什么继续，也不把完整 Task、Context 或 Result 放进 DOM。

### 4.2 打开指定角色的新会话

用于固定测试审计角色：

```text
Task Center：OPEN_ROLE_SESSION
→ 扩展打开指定 Custom GPT 页面
→ 新建会话
→ 建立 role_ref / conversation_ref / tab_id 绑定
→ 注入 task_id + role_ref + dispatch_token
→ 发送
→ 回报 session_opened / response_started
```

完整 Goal、Task、Context 和结果不得直接塞入 DOM。角色通过 Action 获取正式数据。

### 4.3 经过授权的网页 UI 动作

```text
页面观察
→ 截图 + DOM + 可访问性信息
→ 本地视觉模型返回结构化候选
→ Approval Fixture / 领域生成一次性授权
→ Task Center 产生 EXECUTE_APPROVED_UI_ACTION
→ 扩展重新检查页面和 DOM
→ 点击一次
→ 回报动作结果和页面变化
```

视觉模型只提供感知证据，不提供授权。

## 五、最小架构

```text
Chrome Extension
├── Background Service Worker
│   ├── Command Poller
│   ├── Claim / Ack
│   ├── Retry / Recovery
│   └── State Reconciliation
├── Session Registry
│   ├── role_ref
│   ├── conversation_ref
│   ├── tab_id
│   └── page fingerprint
├── ChatGPT Page Adapter
│   ├── detectPage
│   ├── locateComposer
│   ├── submitMessage
│   ├── observeResponse
│   └── readPageState
├── Page Observer
│   ├── DOM
│   ├── Accessibility Semantics
│   └── Screenshot Capture
├── Local Vision Bridge
│   └── structured page analysis
├── Authorized UI Actuator
│   └── exact DOM action
├── Side Panel / Debug UI
└── Host Result Reporter
```

Manifest V3 Service Worker 是事件驱动后台，不应依赖永久驻留死循环。MVP 使用：

- 定期轮询或短轮询；
- `chrome.alarms`；
- 本地持久状态；
- 页面事件；
- 启动和恢复时对账。

## 六、Host Command

### 6.1 命令类型

MVP 必须实现：

```text
CONTINUE_SESSION
OPEN_ROLE_SESSION
SUBMIT_WAKE_MESSAGE
OBSERVE_RESPONSE
```

受控验证实现：

```text
EXECUTE_APPROVED_UI_ACTION
```

未来预留：

```text
FOCUS_SESSION
RELEASE_SESSION
CAPTURE_PAGE_EVIDENCE
```

### 6.2 命令结构

```json
{
  "host_command_version": "1.0.0",
  "host_command_id": "hc-001",
  "command_type": "CONTINUE_SESSION",
  "task_id": "task-001",
  "task_version": 4,
  "target_role_ref": "controller@1.0.0",
  "conversation_ref": "conv-001",
  "dispatch_token": "...",
  "approval_ref": null,
  "expires_at": "2026-08-04T12:05:00Z",
  "idempotency_key": "..."
}
```

### 6.3 Host Result

```json
{
  "host_result_version": "1.0.0",
  "host_command_id": "hc-001",
  "status": "RESPONSE_COMPLETED",
  "conversation_ref": "conv-001",
  "tab_ref": "local-tab-ref",
  "page_state": "READY",
  "started_at": "...",
  "completed_at": "...",
  "error_code": null,
  "evidence_refs": []
}
```

Host Result 只描述浏览器宿主事实，不宣称 Task 已完成。

## 七、Session Registry

最小记录：

```text
binding_id
role_ref
conversation_ref
tab_id
chat_url_fingerprint
custom_gpt_fingerprint
task_id
binding_status
last_seen_at
```

绑定规则：

- 同一个 `conversation_ref` 只能指向一个有效页面；
- 页面 URL、Custom GPT 身份和会话特征必须一致；
- 找不到目标时停止，禁止回退到任意可用 ChatGPT 标签页；
- 新会话创建后必须把正式 `conversation_ref` 回报任务中心；
- 标签页关闭、刷新、丢弃或扩展重启后执行 Reconcile；
- `tab_id` 只是浏览器本地引用，不能作为跨设备稳定身份。

## 八、ChatGPT Page Adapter

DOM 选择器与 ChatGPT 页面变化必须封装在独立 Adapter 中：

```text
ChatGPTPageAdapter
├── identifyHost
├── identifyRole
├── identifyConversation
├── composerReady
├── setComposerText
├── submit
├── generationStarted
├── generationCompleted
├── approvalPromptVisible
└── captureSemanticSnapshot
```

页面 DOM 变化只能影响 Adapter 和相关测试，不能改变 Task Center Contract。

页面控制优先使用：

```text
DOM + role + text + accessibility semantics
```

截图用于：

- 浮层和遮挡；
- 图标缺少稳定文本；
- DOM 与视觉状态不一致；
- 确认动作前复核；
- 保存操作前后证据。

## 九、网页截图与本地视觉模型

从产品能力看，截图分析属于扩展模块；从内部职责看：

```text
扩展：采集、传输、消费分析结果、执行动作
本地视觉模型：页面语义识别
```

### 9.1 视觉输入

```text
screenshot_ref
page_url_fingerprint
conversation_ref
DOM candidates
accessibility snapshot
expected_ui_state
```

### 9.2 视觉输出

```json
{
  "page_state": "APPROVAL_REQUIRED",
  "candidates": [
    {
      "role": "button",
      "text": "允许",
      "candidate_selector": "...",
      "confidence": 0.97
    }
  ],
  "warnings": []
}
```

视觉输出不能直接触发点击，也不能把“页面上存在按钮”解释为“审批已经通过”。

## 十、受控 UI Actuator

### 10.1 授权要求

执行前必须同时校验：

```text
approval_ref
one_time_token
task_id
task_version
conversation_ref
command_type
expected_button_role
expected_button_text
expected_page_state
expires_at
not_used
```

### 10.2 动作前重新校验

视觉分析和真实点击之间页面可能变化，因此扩展必须重新读取当前 DOM：

```text
匹配唯一候选
+ 页面仍处于预期状态
+ 会话未变化
+ Token 未过期
+ 动作未执行
```

任何一项不确定立即停止。

### 10.3 明确禁止

- 通用自动点击“允许”“确认”“继续”；
- 仅按屏幕坐标点击；
- 视觉模型直接批准；
- 一个 Token 重复使用；
- 无法确认 DOM 时猜测；
- 声称普通 Content Script 可以直接控制 Chrome 原生权限气泡或 macOS 系统弹窗。

## 十一、开源参考策略

主参考：

```text
srbhptl39/MCP-SuperAssistant
```

适合审计和复用的部分：

- Manifest V3 扩展结构；
- ChatGPT Site Adapter；
- Content Script；
- DOM Observer；
- 输入框定位；
- 文本插入和表单提交；
- Tool Call Card；
- 扩展与本地 Proxy 通信；
- SSE / WebSocket / Streamable HTTP；
- Side Panel；
- 多网站 Adapter 架构；
- Auto Execute / Auto Submit 的技术实现。

本项目必须新增：

- Task Center Host Command；
- `task_id / role_ref / conversation_ref`；
- 会话注册与恢复；
- 多 Custom GPT 标签页路由；
- Dispatch Claim / Ack；
- 幂等与防重；
- 页面截图和本地视觉桥；
- 一次性授权 UI Actuator；
- Evidence 引用；
- 与总控 Action 正式数据通道分离。

采用流程：

```text
许可证核验
→ 依赖、权限和数据流审计
→ ChatGPT 相关模块代码审计
→ 决定局部复用、裁剪或独立实现
→ 最小权限
→ 接入 Task Center
```

不得未经审计直接将整个项目并入主仓库。

## 十二、MVP 验证链路

### 12.1 链路 A：继续总控

```text
Task Center 创建 CONTINUE_SESSION
→ 扩展领取
→ 定位原总控会话
→ 注入最小 Wake Message
→ 发送一次
→ 观察生成开始和结束
→ Ack
```

### 12.2 链路 B：打开固定审计角色

```text
Task Center 创建 OPEN_ROLE_SESSION
→ 扩展打开指定 Custom GPT
→ 新建会话并绑定
→ 注入 task_id / role_ref / dispatch_token
→ 审计 GPT 调用 Mock 或真实 Action
→ 扩展观察一轮响应
→ Ack
```

该链只验证 Host 路由，不代表通用多角色编排已实现。

### 12.3 链路 C：受控确认

在受控测试页面或可重复的 ChatGPT 测试状态中：

```text
截图与 DOM 采集
→ Vision Fixture 识别
→ Approval Fixture 生成 Token
→ Host Command
→ DOM 再校验
→ 点击一次
→ Token 作废
→ 回报
```

该链只验证 Browser Host 的授权执行能力，不代表正式 Approval 领域已经完成。

## 十三、恢复与防重

扩展需持久化：

```text
claimed_host_command
last_action
conversation_binding
response_observation_state
used_action_tokens
```

恢复规则：

- Service Worker 重启后读取本地状态；
- 与任务中心对账；
- 已 Ack 的命令不重发；
- 已提交消息但未观察完成时，只恢复观察，不再次提交；
- 已使用 UI Token 不再次点击；
- 状态无法确定时标记 `HOST_STATE_UNCERTAIN` 并停止。

## 十四、错误模型

```text
HOST_NOT_SUPPORTED
ROLE_PAGE_NOT_FOUND
CONVERSATION_NOT_FOUND
SESSION_BINDING_MISMATCH
PAGE_NOT_READY
COMPOSER_NOT_FOUND
MESSAGE_SUBMIT_FAILED
RESPONSE_NOT_STARTED
RESPONSE_TIMEOUT
PAGE_STATE_MISMATCH
SCREENSHOT_FAILED
VISION_UNAVAILABLE
APPROVAL_REQUIRED
APPROVAL_INVALID
ACTION_TARGET_NOT_UNIQUE
UI_ACTION_FAILED
HOST_STATE_UNCERTAIN
```

错误只描述 Host / 页面事实。是否重试、暂停或终止由任务中心和总控按各自职责处理。

## 十五、Side Panel 与调试视图

MVP 可以提供轻量 Side Panel，用于：

- 查看 Gateway / Task Center 连接状态；
- 查看当前角色和会话绑定；
- 查看待处理 Host Command；
- 查看最近 Host Result；
- 手动触发 Reconcile；
- 在测试模式中确认固定角色页面；
- 展示待审批 UI 动作，但不绕过正式授权。

Side Panel 不是任务中心管理后台，也不能直接修改 Task。

## 十六、权限最小化

扩展实现前必须审计并限制：

- `host_permissions`；
- `tabs`、`activeTab`、`scripting`、`storage`、`alarms` 等权限；
- 本地 Gateway 访问范围；
- 截图能力使用条件；
- Content Script 匹配域；
- 日志中敏感内容；
- 扩展本地存储中的 Token 和会话数据。

MVP 优先只支持 ChatGPT 相关域，不因参考项目支持多个网站而扩大权限。

## 十七、交付物

```text
Manifest V3 Extension Skeleton
Background Service Worker
Task Center Command Client
Session Registry
ChatGPT Page Adapter
Content Script
Response Observer
Screenshot / DOM Observer
Local Vision Bridge Fixture
Authorized UI Actuator
Side Panel / Debug View
Host Result Reporter
Recovery / Idempotency Tests
Open-Source Audit Report
MVP Runbook
```

## 十八、验收标准

- 同一总控会话只被唤醒一次；
- 错误会话绝不接收消息；
- 能打开固定审计角色新会话并绑定；
- 注入内容只有最小引导；
- 业务结果仍通过 Action 写回；
- 能识别响应开始和完成；
- 扩展重启后不重复发送；
- 截图和 DOM 能交给本地视觉分析；
- 视觉感知与审批授权分离；
- UI 动作只在 Token 和 DOM 全部匹配时执行；
- 不能确定时停止；
- Host Result 能被任务中心记录。

## 十九、非目标

- 不做通用浏览器 Agent；
- 不读取 GPT 输出并自行做业务决策；
- 不直接修改 Task；
- 不自动批准所有网页操作；
- 不控制 Chrome 原生 UI 或 macOS 系统弹窗；
- 不实现完整多角色调度；
- 不实现正式 Approval / Evidence 领域；
- 不支持所有 AI 网站；
- 不承诺无人值守长期运行；
- 不依赖永久后台死循环。

## 二十、外部事实来源

最后复核：2026-08-04。

- Chrome for Developers：Manifest
  https://developer.chrome.com/docs/extensions/reference/manifest
- Chrome for Developers：Extension Service Workers
  https://developer.chrome.com/docs/extensions/develop/concepts/service-workers
- Chrome for Developers：Content Scripts
  https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts
- Chrome for Developers：Tabs API
  https://developer.chrome.com/docs/extensions/reference/api/tabs
- MCP-SuperAssistant
  https://github.com/srbhptl39/MCP-SuperAssistant
