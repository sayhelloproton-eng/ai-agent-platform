# Browser Host Runtime

`@ai-agent-platform/browser-host-runtime` 是 Chrome Manifest V3 扩展形式的 Browser Host Runtime MVP。

## 它做什么

- 绑定一个真实 ChatGPT / Custom GPT 标签页；
- 保持 `FOLLOW_LATEST` 并观察最新页面；
- 采集 Screenshot、Visible Text、DOM / ARIA、交互元素和阻塞 UI；
- 将 Observation 交给可替换 Model Inference Port；
- 从 Task Control 的 Browser Dispatch Application Interface 领取一次 Host Command；
- 校验 Binding、Expiry、Idempotency、Approval Grant 和页面前置条件；
- 执行预注册页面动作；
- 重新观察并回报 Host Result；
- 提供 Pause、Resume、解绑和 Emergency Stop。

## 它不做什么

- 不拥有 Task、Plan 或业务状态；
- 不解析聊天正文为正式 Controller Command；
- 不执行任意 JavaScript 或坐标点击；
- 不读取 Cookie、Session Token 或密码；
- 不直接调用 Git、Shell 或 Local Control；
- 不将页面完成等同于业务任务完成。

## 开发验证

```bash
npm run verify --workspace @ai-agent-platform/browser-host-runtime
```

## 加载扩展

1. 打开 `chrome://extensions`；
2. 开启开发者模式；
3. 选择“加载已解压的扩展程序”；
4. 选择 `apps/browser-host-runtime`；
5. 打开 ChatGPT 页面，点击扩展图标打开 Side Panel；
6. 选择“绑定当前标签页”。

默认是 Fixture Transport，不会调用真实 Gateway。详细步骤见 `docs/manual-test-runbook.md`。
