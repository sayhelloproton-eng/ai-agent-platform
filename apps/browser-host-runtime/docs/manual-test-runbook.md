# 最终真实 Chrome + ChatGPT 验收 Runbook

以下必须使用真实 Chrome、真实 ChatGPT 和正式 Gateway/TSK Adapter，Mock 不能标记为通过。

## A. 新角色与 Binding

1. 无 READY Binding 下发 `OPEN_OR_RESUME_SESSION`；
2. 创建 Tab 和 `PROVISIONING` Binding；
3. 校验 GPT 后进入 `READY`；
4. 首条 Wake 只发送一次；
5. 新 Conversation 创建后仅在目标原为空时提升并持久化。

## B. 指定 Conversation 防误发

1. Host Command 指定已有 Conversation；
2. Wake 前确认 GPT、Conversation、URL 和 Fingerprint；
3. Wake 后再次读取页面身份；
4. 人工或页面跳到同 GPT 另一 Conversation 时，Binding 必须 `STALE`，停止后续动作和等待；
5. 错误页面不得收到第二条消息。

## C. 双阶段报告

1. 提交 Wake；
2. Delivery Ack 使用 Claim Credential；
3. Controller 可在回答中 Claim Task；
4. BHR 使用 Report Credential 等待 `started/completed` 并上报 Host Result；
5. Ack、Result 重复请求返回同一稳定 Receipt。

## D. Service Worker 安全恢复

分别在以下时点强制终止 Service Worker：

- `EXECUTING`：恢复后只发 Uncertain，不 Fail、不重发；
- `DELIVERY_ACK_PENDING`：只重发 Ack；
- `DELIVERY_ACKED`：只继续观察；
- `HOST_RESULT_PENDING`：只补报原 Result；
- `PRE_DELIVERY_FAILURE_PENDING`：只重发原 Fail。

核对页面消息提交次数始终为一次。

## E. Journal 压力与隔离

1. 并发触发启动、Alarm Poll 和手工处理；
2. Journal 不丢 Command、Credential、Delivery 或 Result；
3. 注入一条损坏恢复记录和一条有效记录；
4. 损坏项进入 `QUARANTINED`，有效项仍成功补报；
5. 填满受保护非终态后，不再 Claim 新命令并产生可见告警；
6. 只有超过保留期的终态可以清理。

## F. Approval

- Platform Wake 候选只允许签名、目标、任务、角色、期限、幂等和白名单全部匹配的最小动作；
- 发布、删除、付款、授权确认等敏感动作必须消费一次性 Grant；
- 页面变化后旧 Grant 失效；视觉模型不得替代授权。

## 验收记录

记录 Chrome 版本、扩展 Commit、Gateway/TSK Commit、Command/Dispatch/Delivery/Result/Uncertain ID、Journal 阶段、页面身份、真实截图证据和结果。
