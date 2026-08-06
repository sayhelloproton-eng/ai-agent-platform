# Browser Host Gateway Server Adapter 接线说明

## 1. 传输

```text
POST /v1/browser-host/invoke
```

请求：

```json
{"requestId":"bhr-request-...","operation":"browser.dispatch.claim","payload":{}}
```

成功：

```json
{"ok":true,"requestId":"bhr-request-...","data":{}}
```

错误：

```json
{"ok":false,"requestId":"...","error":{"code":"...","message":"...","details":{}}}
```

BHR 对空 `data`、错误 Envelope、缺失 Request ID、非法 JSON 和版本不兼容给出确定错误；不会静默切换 Fixture。

## 2. 三阶段凭证与不确定阶段

```text
Claim Host Command
→ 浏览器执行
→ Delivery Ack（claim_token）
→ 服务端签发 delivery_receipt + report_token，Claim 结束
→ 回答/页面观察
→ Host Result / Uncertain（report_token）
```

如果 Service Worker 在 `EXECUTING` 或副作用开始后重启：

```text
→ browser.dispatch.uncertain
→ 不调用 browser.dispatch.fail
→ 不重新提交消息
→ 等待总控/TSK 复核或人工接管
```

## 3. 服务端最低要求

- 每个 Operation 按其业务 ID 幂等；
- Delivery Ack 签发独立 `report_token`；
- Controller Claim 不得使有效 Report Credential 失效；
- Uncertain Receipt 必须阻止自动重发；
- Fail 只接受确认未发生网页副作用的情况；
- 同 `idempotency_key + fingerprint` 的新 Command ID 不得产生第二个逻辑动作；
- Claim、Delivery Receipt、Report Token 和 Approval Grant 已按 Phase 2 Integration Contract `1.0.0` 冻结。
- Host 必须先注册并保持心跳，且声明与 Command Action 匹配的 Capability。
- Delivery/Result/Uncertain 的 Task、Dispatch、Command 身份不一致时服务端拒绝。

## 4. 可执行 Contract Fixture

`tests/gateway-server-adapter-contract.test.mjs` 验证 BHR 客户端合同；生产 Server Adapter 位于 `apps/action-gateway/src/browser-host-server-adapter.ts`。`apps/action-gateway/tests/phase2-four-domain-e2e.test.mjs` 已通过真实 Gateway HTTP 边界验证 Host 注册、Claim、Get、Delivery Ack、Report Token 与 Host Result。
