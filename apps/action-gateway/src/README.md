# Source

本目录保存 Action Gateway 的 TypeScript 源码：

| 文件 | 职责 |
|---|---|
| `app.ts` | HTTP 路由、Request Listener 和 Server 创建 |
| `response.ts` | JSON Envelope、响应 Header 和 Request ID |
| `server.ts` | 本地启动入口与 Host、Port 校验 |

当前源码只实现本地 HTTP 外壳，不包含认证、Runtime 或执行能力。
