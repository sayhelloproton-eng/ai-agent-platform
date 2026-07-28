# Tests

本目录使用 Node.js 内置 `node:test` 和 `node:assert/strict` 验证 Action Gateway。

测试在 `127.0.0.1` 的随机本地端口运行，不访问公网、不连接 Local Runtime，也不读取 Secret。当前覆盖 `/health`、`/ready`、Request ID、404、405 和安全 JSON 响应。
