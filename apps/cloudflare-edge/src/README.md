# Source

本目录保存 Cloudflare Edge Worker 的 TypeScript 源码。

`index.ts` 实现公开健康检查和两个固定的受保护代理路由。它负责 Bearer 认证、
32～256 字符无空白 Key 校验、Web Crypto 摘要比较和双 Key 隔离、严格 Quick
Tunnel Origin 与标准 HTTPS 端口校验、路径/方法/Header 白名单、请求与响应
流式大小限制、覆盖响应 Body 的 5 秒超时、禁止重定向和稳定错误映射。

客户端与 Origin Request ID 都按 128 字符 ASCII 白名单校验，非法客户端值会被
替换；认证成功后的受保护路由响应（包括 `405`）始终返回本次有效
`X-Request-Id`。Origin 操作使用覆盖 Fetch 与 Body 读取的单一 5 秒绝对截止
时间，即使底层 Promise 或 Stream 忽略 `AbortSignal` 也会按时返回安全 504。

处理函数显式接收 Binding 与可替换 Fetch，生产 Worker 使用 Cloudflare
Binding 和内置 Fetch，测试则注入完全本地的 Origin 替身。实现不记录请求体、
凭据、Origin URL 或异常详情，不包含持久化、重试和日志平台。

当前代码尚未连接真实 Origin，也未在本批次部署、设置 Secret 或启动 Tunnel。
