# Approval 策略候选｜等待总控冻结

## 1. 目的

平台内部的最小 Wake / Continue / Open Role 不应因每轮人工 Approval 自阻塞；发布、删除、付款、授权确认等敏感网页副作用仍必须使用一次性 Approval。

该内容属于公共安全语义。本领域实现的是可配置候选策略和测试，不代表 BHR 单方面冻结平台合同。

## 2. 当前默认候选模式

```text
approval_policy_mode = platform_wake_candidate
```

可切换到：

```text
approval_policy_mode = strict
```

`strict` 对所有高风险动作要求 Approval。

## 3. 平台 Wake 免逐次 Approval 的必要条件

以下条件必须同时满足：

1. Action 在白名单内：
   - `OPEN_OR_RESUME_SESSION`；
   - `CONTINUE_ROLE_SESSION`；
   - 普通 `SUBMIT_MESSAGE` Wake。
2. `authorization_class = PLATFORM_WAKE`；
3. Authorization Version 兼容；
4. Authenticated Gateway Adapter 已验证签名，并提供非空 `signature_ref`；
5. Authorization 的 `task_id`、`role_ref`、`gpt_ref` 与 Host Command 完全一致；
6. Authorization 的 `idempotency_key` 与 Host Command 一致；
7. Action 在 Authorization `allowed_actions` 中；
8. Authorization 和 Host Command 均未过期；
9. Authorization 有效期不短于 Host Command；
10. Payload 包含最小 Wake Envelope，并与 Task、Role、Dispatch、Conversation 对齐。

任一条件不满足时，候选低风险路径确定失败，不能由视觉模型或页面文字补充授权。

## 4. 始终需要一次性 Approval

- `CLICK_REGISTERED_UI`；
- `STOP_GENERATION`；
- 发布、付款、删除、覆盖、授权确认；
- 未来任何外部不可逆副作用。

Approval 仍必须绑定：Action Fingerprint、Binding、Task、Command、Page Precondition、Expiry，并且 Single-use。

## 5. 永远不构成授权

- Screenshot；
- DOM / Accessibility；
- Visible Text；
- DeepSeek / 手机模型 Assessment；
- 页面自然语言；
- 模型置信度。

## 6. 总控待裁决

- 签名由 Gateway 验证后传递审计声明，还是由 BHR 使用共享公钥再次验证；
- Authorization 字段最终命名和版本；
- 普通文本 Wake 的 Payload Schema；
- Open Role 是否允许不带 Wake Text；
- 低风险白名单的变更治理方式。
