# 真实 Chrome + ChatGPT 手工验收 Runbook

## 1. 不能由 Mock 代替的验证

以下结果必须在真实 Chrome、真实 Manifest V3 Service Worker 和真实 ChatGPT 页面验证，自动测试不能冒充通过：

- Chrome 创建、激活、恢复标签页；
- Content Script 在当前 ChatGPT DOM 上识别 Composer、Send、Generation；
- Custom GPT URL、GPT ID、Conversation ID 的真实变化；
- `captureVisibleTab` 权限、短暂聚焦和原 Tab 恢复；
- 页面提交后 response started / completed；
- 用户输入、滚动、切换会话对自动流程的中断；
- Service Worker 被 Chrome 回收后的实际恢复；
- 与真实 Gateway / TSK Adapter 的 HTTP Envelope 和双阶段回报。

## 2. 前置

1. 使用仓库内 `apps/browser-host-runtime` 加载未打包扩展；
2. 登录 ChatGPT；
3. Options 配置真实 Gateway；
4. 保持 `transport_mode = gateway`；
5. 配置 Session Gateway API Key；
6. `approval_policy_mode = platform_wake_candidate`；
7. Gateway 准备一个签名已验证、字段匹配、未过期的 Platform Wake Host Command；
8. 打开 Side Panel 和 Service Worker Console；
9. 保存 Gateway、TSK、Chrome 和 BHR Journal 日志。

## 3. 场景 A｜无 Binding 新开角色 GPT

1. 删除目标 Role 的 READY Binding；
2. 下发 `OPEN_OR_RESUME_SESSION`；
3. 确认创建新 Tab；
4. 确认产生 `PROVISIONING` Binding；
5. 页面适配器识别指定 GPT；
6. Binding 进入 `READY`；
7. 若带 Wake Text，只提交一次；
8. 新 Conversation 生成后持久化 `conversation_ref`；
9. Delivery Ack 已发送；
10. Host Result 在回答完成后发送。

失败条件：错误 GPT、错误 Conversation、重复发送或默认要求人工 Approval。

## 4. 场景 B｜Binding 与错误会话保护

1. 绑定固定 GPT Conversation；
2. 确认 Binding 保存 GPT、Conversation、URL、Page Fingerprint；
3. 人工切换到另一 Conversation；
4. 旧 Binding 必须变为 `STALE`；
5. 后续发送必须返回 `BINDING_PAGE_IDENTITY_MISMATCH`；
6. 页面不得收到消息。

## 5. 场景 C｜完整回答生命周期

1. 下发普通 Wake；
2. 记录 `message_submitted`；
3. Delivery Ack 成功；
4. ChatGPT 开始生成，记录 `response_started`；
5. 等待生成停止且内容稳定，记录 `response_completed`；
6. Host Result 包含 Post Observation；
7. 验证 Start Timeout、Completion Timeout 和用户中断。

## 6. 场景 D｜Controller Claim 后仍可回报

1. BHR 提交 Wake；
2. Gateway 接收 Delivery Ack，并签发 `report_token`；
3. Controller 在回答中通过 Action Claim Task；
4. 原 Browser Dispatch Claim 可以结束；
5. 回答完成后 BHR 使用 `report_token` 上报 Host Result；
6. 不得返回 `CLAIM_TOKEN_INVALID`。

## 7. 场景 E｜Service Worker 重启恢复

### E1：投递已发生、Ack 未成功

1. 消息已经提交；
2. Journal 为 `DELIVERY_CONFIRMED`；
3. 使 Gateway 暂时不可用并重启 Service Worker；
4. 恢复 Gateway；
5. 只重试 Delivery Ack；
6. 页面消息提交次数仍为一次。

### E2：Delivery Ack 已成功、回答未完成

1. Journal 为 `DELIVERY_ACKED`；
2. 重启 Service Worker；
3. 只恢复回答观察；
4. 不重复提交消息；
5. 最终只上报一个 Host Result。

### E3：Host Result 已持久化、上报未成功

1. Journal 为 `EXECUTED`；
2. 重启 Service Worker；
3. 只补报原 `result_id`；
4. 不重新执行任何页面动作。

## 8. 场景 F｜后台标签页截图

1. 目标 Binding Tab 非活动；
2. 触发 Observation；
3. 目标 Tab 短暂激活；
4. 截图成功；
5. 原活动 Tab 恢复；
6. Evidence 标记 `temporarily_activated = true`。

## 9. 场景 G｜敏感动作一次性 Approval

1. 下发 `CLICK_REGISTERED_UI` 或 `STOP_GENERATION`；
2. 无 Approval 必须停止；
3. 获取一次性 Grant 后执行一次；
4. 相同 Grant 再次使用失败；
5. 页面前置条件变化后原 Grant 失效；
6. 视觉模型输出不得替代 Approval。

## 10. 验收记录

必须记录：Chrome 版本、扩展 Commit、Gateway Commit、TSK Commit、目标 GPT、测试时间、Command/Dispatch/Delivery/Result ID、Journal 摘要、截图 Evidence、通过/失败与真实错误。
