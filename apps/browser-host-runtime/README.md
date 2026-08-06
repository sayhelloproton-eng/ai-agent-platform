# Browser Host Runtime

`@ai-agent-platform/browser-host-runtime` 是仓库内正式维护、由 Chrome 直接加载的 Manifest V3 Browser Host Runtime。

## 当前版本

```text
0.2.1
```

第二轮综合审计整改重点：

- 正式 HTTP Client 解析 Gateway `{ ok, requestId, data }` Envelope；
- 正式 HTTP 不可用时明确失败，Fixture 仅显式测试；
- Platform Wake Candidate 成为默认候选策略；
- 敏感 UI Action 继续使用一次性 Approval；
- Browser Dispatch 使用 Delivery Ack + Host Result 双阶段回报；
- Controller Claim 后，BHR 使用独立 `report_token` 回报回答观察；
- Journal 可恢复 Delivery Ack、回答观察与 Host Result 补报，禁止重复发送；
- 无 Binding 新开角色、会话身份校验、后台截图和完整响应生命周期继续保留。

## 它做什么

- 注册 Browser Host 并发送 Heartbeat；
- 绑定、创建或恢复 ChatGPT / Custom GPT 标签页；
- 采集 Screenshot、Visible Text、DOM、Accessibility 和 Blocking UI；
- 调用可替换的本地视觉模型 Port；
- 从正式 Gateway 领取 Host Command；
- 校验 Binding、Page Identity、Expiry、Idempotency 和授权；
- 执行预注册网页动作；
- 分阶段回报 Delivery Ack 与 Host Result；
- 提供 Pause、Resume、解绑和 Emergency Stop。

## 它不做什么

- 不拥有或修改 Task、Plan、WorkItem；
- 不解释聊天正文为正式 Controller Command；
- 不判断业务任务是否成功；
- 不决定审批；
- 不调用 Local Control；
- 不执行任意 JavaScript 或坐标点击；
- 不扩展成通用无人监督浏览器 Agent。

## 开发验证

```bash
npm run verify --workspace @ai-agent-platform/browser-host-runtime
```

该命令同时运行静态检查和全部测试。

## 加载扩展

1. 打开 `chrome://extensions`；
2. 开启开发者模式；
3. 选择“加载已解压的扩展程序”；
4. 选择仓库内 `apps/browser-host-runtime`；
5. 在 Options 中配置正式 Gateway；
6. 打开 Side Panel 查看 Host、Binding、Journal 和 Observation。

公共 Dispatch、Approval 和 Platform Wake 语义仍由总控最终冻结。
