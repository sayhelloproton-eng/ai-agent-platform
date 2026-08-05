# Source

本目录保存 Action Gateway 的 TypeScript 源码：

| 文件 | 职责 |
|---|---|
| `app.ts` | HTTP 路由、外部认证、Task Contract、Controller Action Adapter、Gateway Policy 和 Server 创建 |
| `controller-task-control.ts` | `SOL-CTL-001` 专用内存 Task Control Fixture；验证 Decision Context、Claim、Command、Task/Plan/Event 一致性，不作为正式任务中心实现 |
| `rate-limit.ts` | 单实例固定窗口 Rate Limiter |
| `concurrency.ts` | Gateway 在途任务并发 Gate |
| `response.ts` | JSON Envelope、响应 Header 和 Request ID |
| `runtime-client.ts` | 连接 Loopback Local Runtime、内部认证、Timeout、响应限制和 `TaskResult` 校验 |
| `server.ts` | 本地启动入口、Host / Port、Controller Profile 绑定与 Runtime Client 配置 |

Controller 调用身份由 Gateway 配置绑定，外部请求不能提交或覆盖 Profile、Role 和 Actor。Fixture 只模拟 `SOL-TSK-001` 未来公开合同，不保存到正式数据库，也不实现 WorkItem、Dispatch 或 Browser Host 内部模型。
