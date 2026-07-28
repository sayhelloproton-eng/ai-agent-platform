# Tests

本目录使用 Node.js 内置 `node:test` 和 `node:assert/strict` 验证 Capability Policy。

测试不读取环境变量，也不执行 Capability。当前覆盖默认拒绝、未知能力、去重、Contracts 顺序和输入隔离。
