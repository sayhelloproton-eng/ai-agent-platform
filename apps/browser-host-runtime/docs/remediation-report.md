# SOL-BHR-001｜第二轮综合审计整改报告

## 输入

- 综合审计参考：`main@353a9ff39af6582e33f0ea8078af75f40c64380c`；
- 连续实现基线：上一轮 BHR 整改包应用后的实现；
- 本轮范围：`apps/browser-host-runtime/**`；
- 未修改 Task、Plan、Gateway 服务端、TSK、LCL 或公共 Contracts。

## 已关闭

1. HTTP Client 正确解析 `{ ok, requestId, data }`；
2. 错误 Envelope、空 Data、无 Request ID、Envelope Version 不兼容具有确定错误；
3. 增加真实 Node HTTP Fixture Server Contract Test；
4. 正式 HTTP 不可用时清晰失败，不回退 Fixture；
5. 默认配置启用 Platform Wake Candidate；
6. Platform Wake 校验签名验证声明、目标、Task、Role、Expiry、Idempotency、Allowlist 和 Wake Envelope；
7. 敏感 UI Action 继续要求 Single-use Approval；
8. 新增 `CONTINUE_ROLE_SESSION`；
9. Dispatch 分为 Delivery Ack 与 Host Result；
10. Delivery Ack 后 Host Result 使用独立 `report_token`，不再依赖原 Dispatch Claim；
11. Journal 新增 `DELIVERY_CONFIRMED / DELIVERY_ACKED`；
12. Ack 失败、回答观察中重启和 Host Result 上报失败均不会重复发送；
13. Service Worker 启动时主动尝试恢复补报；
14. Runbook 明确真实 Chrome + ChatGPT 必验项；
15. BHR Package Version 更新为 `0.2.1`，交付工具要求同步根锁文件中唯一 BHR Workspace 版本。

## 自动化验证

```text
42 tests passed
0 failed
```

覆盖 HTTP Envelope、正式无服务端失败、平台 Wake、敏感 Approval、双阶段回报、Controller Claim 后 Report、重复 Ack/Report、重启补报、错误会话、过期 Command、后台截图和响应生命周期。

## 公共合同提案

本领域只提交以下候选，等待总控冻结：

- Platform Wake Authorization v0.1.0；
- `browser.dispatch.deliveryAck`；
- `browser.dispatch.hostResult`；
- `delivery_receipt` 与 `report_token`；
- Delivery Claim 与 Response Observation 的双阶段生命周期。

## 剩余跨领域阻断

- Gateway 尚需实现正式 Browser Host Operation；
- TSK 尚需物化 Host Command；
- TSK 尚需冻结 Delivery Ack 与 Controller Claim 的交互；
- Approval 服务端合同未冻结；
- 四领域真实 E2E 与根级 BHR 门禁由总控完成；
- 真实 Chrome + ChatGPT 手工验收尚需在用户环境执行。
