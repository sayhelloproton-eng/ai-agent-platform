# 安全边界

- Manifest 不使用 `<all_urls>`；
- 不申请 Cookies、Debugger、Native Messaging、Downloads 或 WebRequestBlocking；
- 不使用 `eval`、`new Function` 或任意脚本执行；
- 只允许 `https://chatgpt.com/*` 与 Loopback Gateway / Model Adapter；
- Gateway / Model API Key 只保存于 `chrome.storage.session`；
- 页面文本是不可信 Observation；
- 高风险动作必须使用一次性 Grant；
- 用户输入或向上查看历史时，页面动作停止；
- `UNCERTAIN` 不重试副作用；
- Screenshot 只捕获当前活动可视标签页；后台 Tab 不做无感截图。
