# BHR 领域合同说明｜第二轮候选

本文只描述 BHR 客户端和领域内实现需要的候选形态。公共 Dispatch、Claim、Approval、Result 语义仍由总控冻结。

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
    "conversation_ref": null
  },
  "action": {
    "type": "OPEN_OR_RESUME_SESSION",
    "payload_ref": "payload-001"
  },
  "preconditions": {},
  "approval_ref": null,
  "idempotency_key": "idem-001",
  "expires_at": "2026-08-06T10:00:00.000Z"
}
```

BHR 支持的语义动作包括：

- `OPEN_OR_RESUME_SESSION`；
- `CONTINUE_ROLE_SESSION`；
- `SUBMIT_MESSAGE`；
- `SET_COMPOSER_TEXT`；
- `WAIT_FOR_RESPONSE`；
- `OBSERVE_PAGE`；
- `FOLLOW_LATEST`；
- `CLICK_REGISTERED_UI`；
- `STOP_GENERATION`。

## Platform Wake Authorization 候选

候选字段位于：

```text
host_command.preconditions.platform_wake_authorization
```

BHR 校验签名已验证声明、Task、Role、GPT、Idempotency、Expiry、Action Allowlist 和 Wake Envelope 一致性。字段最终名称等待总控冻结。

## Delivery Fact

```json
{
  "delivery_version": "0.1.0",
  "delivery_id": "host-command-001:delivery",
  "command_id": "host-command-001",
  "dispatch_ref": "browser-dispatch-001",
  "task_id": "task-001",
  "binding_id": "binding-001",
  "action_type": "SUBMIT_MESSAGE",
  "status": "DELIVERED",
  "submitted_at": "...",
  "response_expected": true,
  "details": {}
}
```

Delivery Fact 只表示浏览器侧投递已经发生，不表示 Controller 已完成业务处理。

## Delivery Ack

Gateway 返回：

```json
{
  "delivery_receipt": "delivery-receipt-001",
  "report_token": "report-token-001",
  "status": "RECORDED"
}
```

`report_token` 允许 Dispatch Delivery Claim 结束后继续回报回答观察。

## Host Result

```json
{
  "host_result_version": "0.1.0",
  "result_id": "host-result-001",
  "command_id": "host-command-001",
  "dispatch_ref": "browser-dispatch-001",
  "task_id": "task-001",
  "binding_id": "binding-001",
  "status": "ACTION_SUCCEEDED",
  "pre_observation_ref": "observation-before",
  "post_observation_ref": "observation-after",
  "error": null,
  "details": {
    "delivery": {},
    "response_lifecycle": {},
    "assessment": {}
  },
  "completed_at": "..."
}
```

Host Result 只陈述浏览器事实，不修改 Task、Plan，不判断业务完成。

## Journal

```text
RECEIVED
→ CLAIMED
→ PREPARED
→ EXECUTING
→ DELIVERY_CONFIRMED
→ DELIVERY_ACKED
→ EXECUTED
→ REPORTED
```

`DELIVERY_CONFIRMED` 后禁止重复提交；`EXECUTED` 后只允许补报原结果。
