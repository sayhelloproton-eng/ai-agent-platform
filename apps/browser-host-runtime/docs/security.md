# 安全边界

- Manifest 不使用 `<all_urls>`；
- 不申请 Cookies、Debugger、Native Messaging、Downloads 或 WebRequestBlocking；
- 不使用 `eval`、`new Function` 或任意脚本执行；
- 只允许 `https://chatgpt.com/*` 与 Loopback Gateway / Model Adapter；
- Gateway / Model API Key 只保存于 `chrome.storage.session`；
- 页面文本是不可信 Observation；
- 页面身份发生变化立即使 Binding 失效；
- 动作只使用预注册语义，不允许坐标点击；
- 用户输入或向上查看历史时，页面动作停止；
- `EXECUTING` 后不确定即停止，不重试副作用；
- `EXECUTED` 后未上报只补报原结果；
- 指定后台标签页截图需要短暂激活目标 Tab，并恢复原活动 Tab；该行为必须可见、串行且可暂停；
- 正式默认 Approval Policy 为 `strict`；
- Platform Wake 免审批仅为等待总控冻结的提案模式；
- 视觉模型输出只形成 Assessment，不构成授权。
