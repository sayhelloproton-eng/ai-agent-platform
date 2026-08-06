# Gateway / Dispatch Adapter｜第二轮接线合同

## 1. 正式 HTTP 模式

默认运行模式：

```text
transport_mode = gateway
POST /v1/browser-host/invoke
```

Fixture 只允许显式测试：

```text
transport_mode = fixture
fixture_test_mode = true
```

正式 HTTP 无服务端时返回 `GATEWAY_UNAVAILABLE`，不会静默切换 Fixture。

## 2. 统一 HTTP Envelope

请求候选格式：

```json
{
  "requestId": "bhr-request-...",
  "operation": "browser.dispatch.listPending",
  "payload": {}
}
```

成功响应必须是：

```json
{
  "ok": true,
  "requestId": "bhr-request-...",
  "data": {}
}
```

客户端不再读取 `body.result`。以下响应会确定失败：

- `ok !== true`：Gateway Error Envelope；
- 缺少 `requestId`：`GATEWAY_REQUEST_ID_MISSING`；
- 缺少或为空的 `data`：`GATEWAY_DATA_MISSING`；
- 可选 `gatewayEnvelopeVersion` 不兼容：`GATEWAY_ENVELOPE_VERSION_UNSUPPORTED`；
- 非 JSON：`GATEWAY_RESPONSE_INVALID_JSON`。

`gatewayEnvelopeVersion` 是 BHR 客户端兼容检查字段候选，不代表公共合同已由本领域冻结。

## 3. Operation 客户端形态

### list

```text
browser.dispatch.listPending
request:  { host_id, limit }
response: DispatchSummary[]
```

### claim

```text
browser.dispatch.claim
request:  { dispatch_ref, host_id }
response: { claim_token, expires_at? }
```

### get

```text
browser.dispatch.get
request:  { dispatch_ref, claim_token }
response: HostCommand v0.1.0
```

### payload resolve

```text
browser.payload.resolve
request:  { payload_ref }
response: non-null resolved payload
```

### delivery Ack

```text
browser.dispatch.deliveryAck
request:  { dispatch_ref, claim_token, delivery }
response: { delivery_receipt, report_token, status? }
```

Delivery Ack 只确认页面投递或宿主动作已经发生。成功后，原 Dispatch Claim 可以结束；后续回答观察通过 `report_token` 回报，不再依赖原 `claim_token`。

### Host Result

```text
browser.dispatch.hostResult
request:  { dispatch_ref, report_token, result }
response: { status, result_id? }
```

这允许 Controller 在网页回答中 Claim Task 后，BHR 仍能合法上报回答观察结果。

### pre-delivery fail

```text
browser.dispatch.fail
request:  { dispatch_ref, claim_token, result }
response: { status, result_id? }
```

只有页面投递尚未确认时使用。投递已经发生后，不得把 Ack 网络失败误报成页面执行失败。

## 4. 双阶段幂等与恢复

```text
页面动作执行
→ Journal: DELIVERY_CONFIRMED
→ delivery Ack
→ Journal: DELIVERY_ACKED + report_token
→ 回答 started/completed 观察
→ Journal: EXECUTED + Host Result
→ hostResult report
→ Journal: REPORTED
```

恢复规则：

- `DELIVERY_CONFIRMED`：只重试 delivery Ack，不重复提交消息；
- `DELIVERY_ACKED`：只恢复回答观察并上报 Host Result；
- `EXECUTED`：只补报原 `result_id`；
- `EXECUTING`：动作是否发生无法确认，转 `UNCERTAIN`，绝不自动重做。

Delivery Ack、Host Result 和 Dispatch Fail 都必须由服务端按其 ID 幂等记录。

## 5. 等待总控冻结

本领域没有单方面冻结：

- TSK DispatchSignal → HostCommand 的物化位置；
- `delivery_receipt` / `report_token` 最终名称与签发规则；
- Dispatch Claim 与 Controller Claim 的正式子生命周期；
- Host Result 写入 TSK Event、Evidence 与 Result Ref 的映射；
- Approval 正式服务端 Operation。
