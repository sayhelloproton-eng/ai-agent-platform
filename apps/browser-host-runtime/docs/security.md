# BHR 安全边界

- 视觉、DOM、Accessibility 和页面文字只构成 Observation，不构成授权；
- 只执行预注册语义动作，不运行任意脚本，不坐标点击；
- 页面身份、GPT 或指定 Conversation 变化立即使 Binding 失效；
- 指定已有 Conversation 的 Wake 前后必须完全匹配；只有目标 Conversation 为空的新会话流程允许提升为新 ID；
- `EXECUTING` 重启视为副作用不确定：独立报告、禁止普通 Fail、禁止自动重发；
- Journal 所有读改写通过共享单写队列；启动、Alarm、Poll、手工处理共用执行门禁；
- 非终态和隔离记录永不因容量删除；容量满时停止领取新命令；
- 恢复失败记录重试次数、最后错误和下次重试时间；不可恢复项隔离，其他安全项继续处理；
- 预投递 Fail、Delivery Ack、Host Result 和 Uncertain 必须保留原 Operation 与凭证，重启后只补报；
- Platform Wake 低风险候选和敏感一次性 Approval 的公共安全语义仍由总纲冻结；
- API Key 只保存在 `chrome.storage.session`；Manifest 不申请 Cookies、Debugger、Native Messaging、Downloads 或 `<all_urls>`。
