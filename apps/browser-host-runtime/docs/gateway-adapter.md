# Gateway Adapter

BHR 只依赖 Application Interface 语义名：

```text
browser.host.register
browser.host.heartbeat
browser.dispatch.listPending
browser.dispatch.claim
browser.dispatch.get
browser.dispatch.report
browser.payload.resolve
approval.grant.get
approval.grant.consume
```

`HttpGatewayClient` 当前把语义 Operation 发送到一个可配置聚合 Endpoint。该 Envelope 是 BHR Adapter 的实现细节，不代表总控已冻结最终 HTTP 路径。

在 Task Control / Gateway 领域落地后，只替换 `GatewayClient` 或 Endpoint Mapping，不修改 RuntimeCoordinator、Page Adapter 或公共语义。
