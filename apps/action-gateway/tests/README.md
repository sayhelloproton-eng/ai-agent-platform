# Tests

本目录使用 Node.js 内置 `node:test` 和 `node:assert/strict` 验证 Action Gateway。

测试在 `127.0.0.1` 的随机本地端口运行，不访问公网，也不读取 Secret。覆盖：

- 公开路由、Request ID、Bearer 认证和安全错误；
- Task Contract、Gateway Policy、Runtime Client、Rate Limit 和并发；
- Controller Decision Context、先查后领、服务端身份、短期 Claim；
- Controller Command 对 Task、Plan 和 Event 的一致推进；
- 版本冲突、幂等回放、同角色接管和角色越权拒绝。

`controller-task-control.test.mjs` 直接验证 Fixture 不变量；`gateway.test.mjs` 验证真实 HTTP Action Adapter。根级 `scripts/local-chain-test.mjs` 仍负责 Gateway → Local Runtime 链路。
