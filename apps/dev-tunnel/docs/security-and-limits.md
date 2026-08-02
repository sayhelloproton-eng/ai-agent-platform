# Security and Limits

- Tunnel Host 仅建立出站连接；本机 Gateway 和 Runtime 继续绑定 loopback。
- 只公开 Gateway 8787，不公开 Runtime 8790。
- 匿名 Tunnel 访问仅绕过 Microsoft 身份层；Gateway Bearer Key 始终必需。
- 自动请求使用 `Accept: application/json` 和 `X-Tunnel-Skip-AntiPhishing-Page: true`；正式 Action 使用 POST。
- CLI 登录 Token 由系统安全存储管理，不能复制到仓库或环境文件。
- `.runtime/` 保存 CLI、URL、PID、日志和解析 Schema，全部忽略。
- 私有 Key 文件必须为 0600，现有 Client Key 在 MVP 完成前不轮换。

官方当前限制包括每用户每月 5 GB、每用户 10 个 Tunnel、每 Tunnel 10 个端口、每端口 1000 个活动连接、每端口每分钟 1500 个 HTTP 请求、每 Tunnel 20 MB/s 和 16 MB Web Forwarding 请求体。

持久 Tunnel 连续 30 天无活动可能被删除。建议在连续闲置 20 天前人工执行 `npm run dev-tunnel:refresh`；不要未经授权安装 launchd 或定时任务。
