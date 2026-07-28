# Source

本目录保存 Action Gateway 的 TypeScript 源码：

| 文件 | 职责 |
|---|---|
| `app.ts` | HTTP 路由、外部认证、Task Contract、Gateway Policy 和 Server 创建 |
| `response.ts` | JSON Envelope、响应 Header 和 Request ID |
| `runtime-client.ts` | 连接 Loopback Local Runtime、内部认证、Timeout、响应限制和 `TaskResult` 校验 |
| `server.ts` | 本地启动入口、Host / Port 与 Runtime Client 配置 |

当前源码已实现本地 Gateway → Runtime 任务链路，不包含 Tunnel、OpenAPI 或危险 Capability。
