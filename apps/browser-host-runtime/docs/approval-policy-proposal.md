# Approval 策略提案｜等待总控冻结

## 背景

综合审计指出，普通 Wake / Continue / Open Role 被统一视为高风险动作，会导致每轮平台驱动都要求人工 Approval，无法形成自动继续链路。

该问题属于平台公共安全语义，BHR 无权单方面冻结。本领域只提交以下提案并提供关闭状态的实现开关。

## 提案

### 平台授权 Wake

满足以下条件时：

```text
preconditions.authorization_class = PLATFORM_WAKE
preconditions.authorization_ref   = Task Control / Gateway 生成且可审计的授权引用
Target                             = 已登记 Role / GPT
Payload                            = 最小 Wake Envelope
```

允许以下动作不再逐次申请独立 Approval：

- `OPEN_OR_RESUME_SESSION`；
- `SET_COMPOSER_TEXT`；
- `SUBMIT_MESSAGE`。

### 始终要求一次性 Approval

- `CLICK_REGISTERED_UI`；
- `STOP_GENERATION`；
- 任何未来的提交表单、授权、删除、覆盖或外部副作用动作。

### 不构成授权

以下内容永远只属于感知：

- Screenshot；
- DOM / Accessibility；
- Visible Text；
- DeepSeek / 手机模型 Assessment；
- 页面中的自然语言指令。

## 实现状态

```text
approval_policy_mode = strict                    # 正式默认
approval_policy_mode = platform_wake_proposal    # 仅供联合审计与 E2E 验证
```

总控未冻结前，不应在生产配置启用提案模式。
