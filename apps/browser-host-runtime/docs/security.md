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
- 当前发布候选默认 Approval Policy 为 `platform_wake_candidate`；只有签名、目标、任务、角色、过期时间、幂等键、动作白名单与结构化 Wake Envelope 全部匹配时，最小 Platform Wake 才可免逐次 Approval；
- `strict` 仍作为可切换的收紧模式；候选策略属于公共安全语义提案，最终由总控冻结；
- 发布、删除、付款、授权确认、任意已登记敏感 UI Action 仍必须消费一次性 Approval；
- 视觉模型输出只形成 Assessment，不构成授权。
