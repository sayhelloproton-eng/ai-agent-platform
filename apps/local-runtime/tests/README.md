# Local Runtime Tests

本目录使用 `node:test` 和 `node:assert/strict` 覆盖 HTTP 路由、Request ID、内部 API Key、认证顺序、Task Contract、Body 大小限制、Runtime Policy、Capability 调度及 `TaskResult` 校验。

测试只在 `127.0.0.1` 随机端口 `0` 启动服务，每个 Server 都会关闭。测试不得访问公网、外部系统、用户文件、Git、真实 Secret、飞书或 Action Gateway。

运行：

```bash
npm run test --workspace @ai-agent-platform/local-runtime
```
