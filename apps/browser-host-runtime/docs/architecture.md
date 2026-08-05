# BHR 内部架构

```text
Chrome MV3 Extension
├── Background Service Worker
│   ├── HostRegistry
│   ├── HttpGatewayClient
│   ├── DispatchClient / ApprovalClient
│   ├── BindingRegistry
│   ├── RoleSessionManager
│   ├── ObservationCoordinator
│   ├── CommandJournal
│   ├── RuntimeCoordinator
│   └── Model Inference Provider
├── Content Script
│   ├── ChatGPT Page Identity Adapter
│   ├── FOLLOW_LATEST
│   ├── DOM / Accessibility Observation
│   ├── Registered Action Executor
│   └── Full Response Lifecycle Tracker
├── Side Panel
└── Options / Session Credentials
```

## 角色会话建立

`OPEN_OR_RESUME_SESSION` 不再要求预先存在 READY Binding：

```text
Host Command
→ 查询现有 Target Binding
→ 不存在则创建 Chrome Tab
→ 写入 PROVISIONING Binding
→ 等待 ChatGPT Content Script Ready
→ 校验 role_ref / gpt_ref / conversation_ref
→ 计算 Page Fingerprint
→ 确认为 READY Binding
→ 可选注入最小 Wake
→ 响应完成后重新确认 conversation_ref
```

## 页面身份硬门禁

每次 Observation 必须携带：

```text
provider + gpt_ref + conversation_ref + page_url + page_fingerprint
```

动作前、动作后均比较：

```text
Host Command Target
↔ Browser Session Binding
↔ Current Page Identity
```

任一不一致时旧 Binding 进入 `STALE`，禁止继续发送。

## Journal 恢复

```text
RECEIVED
→ CLAIMED
→ PREPARED
→ EXECUTING
→ EXECUTED（Host Result 已持久化）
→ REPORTED
```

- 重启发生在 `EXECUTING`：结果为 `UNCERTAIN`，不得重做；
- 重启发生在 `EXECUTED`：只补报已持久化 Host Result；
- `command_id + idempotency_key + request fingerprint` 必须一致。

BHR 内部可以独立迭代，但 `Wake Envelope`、`Host Command`、`Approval Grant`、`Host Result` 的公共含义不能由本领域单方面改变。
