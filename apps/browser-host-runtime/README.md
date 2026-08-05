# Browser Host Runtime

`@ai-agent-platform/browser-host-runtime` 是仓库内正式维护、由 Chrome 直接加载的 Manifest V3 Browser Host Runtime。

## 当前整改版本

本版本针对第二阶段综合审计中的 BHR-H01～H04 和 B-04～B-07 做领域内收敛：

- 真实 Gateway Transport 成为默认；Fixture 仅在显式 `fixture_test_mode` 下可用；
- Browser Dispatch 支持 list / claim / get / ack / fail / Host Result；
- 无既有 Binding 时可以创建标签页并建立角色会话；
- Observation 携带当前 GPT、Conversation、URL 和 Page Fingerprint；
- ChatGPT 内切换会话会使旧 Binding 失效；
- `SUBMIT_MESSAGE` 默认观察 message submitted → response started → response completed；
- Journal 明确区分 `PREPARED / EXECUTING / EXECUTED / REPORTED`，已执行未上报只能补报；
- 指定后台标签页截图通过临时激活目标标签页并恢复原标签页完成；
- 普通 Platform Wake 的低审批策略仅作为可选提案实现，正式默认仍为 `strict`。

## 它做什么

- 注册 Browser Host 并发送 Heartbeat；
- 绑定、创建或恢复 ChatGPT / Custom GPT 标签页；
- 保持 `FOLLOW_LATEST` 并观察最新页面；
- 采集 Screenshot、Visible Text、DOM、Accessibility、交互元素和阻塞 UI；
- 将 Observation 交给可替换 Model Inference Port；
- 从正式 Gateway / Task Center Adapter 领取一次 Host Command；
- 校验 Binding、页面身份、Expiry、Idempotency、Approval Grant 和页面前置条件；
- 执行预注册页面动作并观察完整响应生命周期；
- 重新观察并通过 ack / fail 回报 Host Result；
- 提供 Pause、Resume、解绑和 Emergency Stop。

## 它不做什么

- 不拥有或修改 Task、Plan、WorkItem；
- 不解释聊天正文为正式 Controller Command；
- 不判断业务任务是否成功；
- 不决定审批；
- 不执行任意 JavaScript 或坐标点击；
- 不读取 Cookie、Session Token 或密码；
- 不直接调用 Git、Shell 或 Local Control；
- 不扩展成通用无人监督浏览器 Agent。

## 开发验证

```bash
npm run verify --workspace @ai-agent-platform/browser-host-runtime
```

## 加载扩展

1. 打开 `chrome://extensions`；
2. 开启开发者模式；
3. 选择“加载已解压的扩展程序”；
4. 选择仓库内 `apps/browser-host-runtime`；
5. 在 Options 中配置正式 Gateway；
6. 打开 Side Panel 查看 Host、Binding、Journal 和 Observation。

Fixture Transport 只用于自动测试或明确的本地测试，不再是默认运行模式。
