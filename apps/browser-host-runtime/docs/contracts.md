# Candidate Contracts

合同版本均为 `0.1.0 Candidate`，实现位于 `src/shared/contracts.js`。

## Wake Envelope

只允许：`task_id`、`required_role`、`event_id`、`dispatch_ref`、可选 `conversation_ref` 和固定查询指令。任何额外字段均被拒绝。

## Host Command

公共命令只包含语义 Target 和 Action，不包含 CSS Selector、Chrome Tab ID、坐标或 JavaScript。

## Approval Grant

高风险动作必须匹配：

```text
binding_id + task_id + command_id + action_type
+ page_precondition_hash + action_fingerprint
```

并且为未消费、未过期的一次性 Grant。

## Host Result

只报告页面投递和动作事实：`ACTION_SUCCEEDED / ACTION_FAILED / UNCERTAIN / BLOCKED / EXPIRED / CANCELLED`。不声明 Task 成功。
