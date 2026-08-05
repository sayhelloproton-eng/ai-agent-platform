# Gateway / Dispatch Adapter

## 正式运行模式

默认：

```text
transport_mode = gateway
POST /v1/browser-host/invoke
```

Envelope：

```json
{
  "request_id": "bhr-request-...",
  "operation": "browser.dispatch.listPending",
  "payload": {}
}
```

该聚合 Endpoint 是 BHR Adapter 的实现方式，不代表最终 HTTP 路径已经冻结。

## BHR 所需 Application Operations

```text
browser.host.register
browser.host.heartbeat
browser.dispatch.listPending
browser.dispatch.claim
browser.dispatch.get
browser.dispatch.ack
browser.dispatch.fail
browser.payload.resolve
approval.grant.get
approval.grant.consume
```

## 幂等与恢复

- Dispatch Claim Token 只用于当前一次领取；
- Host Command 使用 `command_id + idempotency_key + request fingerprint` 去重；
- Host Result 在调用 ack/fail 之前写入 Journal；
- ack/fail 失败时 Journal 保持 `EXECUTED`；
- Dispatch 再次可领取后只补报原 `result_id`，绝不重复页面动作。

## Fixture

`FixtureGatewayClient` 只保留给单元测试和显式本地测试：

```text
transport_mode = fixture
fixture_test_mode = true
```

生产配置不会自动回退到 Fixture。

## 等待总控冻结

- TSK DispatchSignal → Host Command 的物化位置；
- `hostCommandRef` 的解析方式；
- ack / fail / report 的最终 Operation 名称；
- Host Result 写回 TSK Event、Dispatch 和 Evidence 的映射；
- Claim 过期、重领与结果补报规则。
