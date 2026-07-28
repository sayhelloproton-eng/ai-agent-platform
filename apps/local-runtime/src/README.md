# Local Runtime Source

本目录保存 Local Runtime 的最小 HTTP 与任务执行实现：

- `app.ts`：HTTP 边界、路由、Content-Type、Body 限制和 Task 校验；
- `executor.ts`：Policy 二次校验、Task 执行流程与 `TaskResult`；
- `handlers.ts`：两个安全 Capability Handler；
- `response.ts`：Request ID 和安全 JSON 响应；
- `server.ts`：本地启动与 Host / Port 校验。

代码不得扩展为 Shell、文件、Git、Codex 或系统设置执行层。新增 Handler 必须先进入 Contracts Capability 白名单，并具有明确 Policy 与测试。
