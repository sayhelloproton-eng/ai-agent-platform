# Browser Host Candidate Contracts

合同版本仍为 `0.1.0 Candidate`。本文件描述 BHR 已实现并等待总控与 TSK 联合冻结的 Adapter 边界，不把候选合同提升为平台正式合同。

## Host Command

```json
{
  "host_command_version": "0.1.0",
  "command_id": "host-command-001",
  "dispatch_ref": "browser-dispatch-001",
  "task_id": "task-001",
  "target": {
    "role_ref": "controller",
    "gpt_ref": "g-...",
    "conversation_ref": "optional"
  },
  "action": {
    "type": "OPEN_OR_RESUME_SESSION | SET_COMPOSER_TEXT | SUBMIT_MESSAGE | WAIT_FOR_RESPONSE | ...",
    "payload_ref": "payload-001"
  },
  "preconditions": {},
  "approval_ref": "optional",
  "expires_at": "ISO-8601",
  "idempotency_key": "..."
}
```

Host Command 不包含 CSS Selector、坐标、Chrome Tab ID 或任意 JavaScript。

## Browser Observation

Observation 新增页面身份字段：

```text
gpt_ref
conversation_ref
page_url
page_fingerprint
```

其余证据仍使用引用：

```text
screenshot_ref
visible_text_ref
dom_summary_ref
interactive_elements
blocking_ui
```

Observation 是浏览器事实，不是 Task 或 Approval 事实。

## Host Result

```json
{
  "host_result_version": "0.1.0",
  "result_id": "host-result-001",
  "command_id": "host-command-001",
  "dispatch_ref": "browser-dispatch-001",
  "task_id": "task-001",
  "binding_id": "binding-001",
  "status": "ACTION_SUCCEEDED | BLOCKED | UNCERTAIN | EXPIRED | ...",
  "pre_observation_ref": "optional",
  "post_observation_ref": "optional",
  "error": null,
  "details": {},
  "completed_at": "ISO-8601"
}
```

Host Result 只描述宿主动作事实，不声明 Task 成功。

## Ack / Fail

BHR Adapter 当前按 Host Result Status 路由：

```text
ACTION_SUCCEEDED / DELIVERED → browser.dispatch.ack
BLOCKED / UNCERTAIN / EXPIRED / ACTION_FAILED → browser.dispatch.fail
```

TSK 是否采用这两个操作名、是否保留统一 `report`，由总控冻结。

## Approval Grant

严格模式下，高风险动作仍匹配：

```text
binding_id + task_id + command_id + action_type
+ page_precondition_hash + action_fingerprint
```

并且为未消费、未过期的一次性 Grant。

## Wake 授权提案

代码支持但默认不启用 `platform_wake_proposal`：

```text
preconditions.authorization_class = PLATFORM_WAKE
preconditions.authorization_ref   = 已冻结平台授权引用
```

在该提案模式下，仅 `OPEN_OR_RESUME_SESSION / SET_COMPOSER_TEXT / SUBMIT_MESSAGE` 可免单独 Approval；敏感 UI 点击、停止生成等仍需一次性 Grant。最终语义由总控裁决。
