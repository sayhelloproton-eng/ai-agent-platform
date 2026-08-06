# Browser Host Runtime

`@ai-agent-platform/browser-host-runtime` 是仓库内正式维护、由 Chrome 直接加载的 Manifest V3 扩展。当前领域版本：`0.3.0`。

## 最终领域整改完成项

- 正式 HTTP Gateway Client；Fixture 仅显式测试；
- `list / claim / get / payload resolve / delivery ack / host result / uncertain / fail / approval get / consume` 客户端；
- 无 Binding 新建或恢复 Custom GPT 会话；
- GPT、Conversation、URL 与 Page Fingerprint 硬校验；
- Delivery Ack 与 Host Result 双阶段回报；
- 独立 `UNCERTAIN_SIDE_EFFECT` 候选回报，绝不降级为普通 Fail；
- Journal 共享单写队列，所有写入和恢复串行化；
- `idempotency_key + logical fingerprint` 跨 Command ID 唯一；
- 非终态与隔离记录永不因容量裁剪；容量满时停止 Claim；
- 恢复记录具备重试次数、最后错误、下次重试和隔离；
- 单条坏恢复记录不阻塞后续安全补报；
- 预投递 Fail、Delivery Ack、Host Result 和 Uncertain 均可在重启后按原 Operation 补报；
- 指定 Conversation 在 Wake 前后完整复核；
- Service Worker 启动、Alarm Poll 和手动处理共用执行门禁。

## 领域边界

BHR 不拥有或修改 Task、Plan、WorkItem、Approval 决策和业务完成状态；不调用 Local Control；不从 Chat 正文解析正式 Controller Command；不执行任意 JavaScript 或坐标点击。

公共 `HostCommandV1 / DeliveryAckV1 / HostResultV1 / UncertainSideEffectV1 / ClaimCredentialV1 / ReportCredentialV1` 仍由第二阶段总纲冻结。本包只提供 BHR 候选客户端与兼容性证据。

## 验证

```bash
npm run verify --workspace @ai-agent-platform/browser-host-runtime
```

## Chrome 加载

打开 `chrome://extensions`，启用开发者模式，选择仓库内：

```text
apps/browser-host-runtime
```
