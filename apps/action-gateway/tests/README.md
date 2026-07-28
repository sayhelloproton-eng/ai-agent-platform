# Tests

本目录使用 Node.js 内置 `node:test` 和 `node:assert/strict` 验证 Action Gateway。

测试在 `127.0.0.1` 的随机本地端口运行，不访问公网，也不读取 Secret。当前覆盖公开路由、Request ID、认证、Task Contract、Gateway Policy、Runtime Client 和安全错误映射。

## Task Pipeline Tests

测试使用可记录 Task、Request ID 和调用次数的 Fake Runtime Client，覆盖 Gateway Task Contract、外部认证、Policy、转发、Timeout、非法响应和 Transport Error 映射。Fake 不保存 API Key。根级 `scripts/local-chain-test.mjs` 负责真实双服务本地链路测试。
