# Tests

本目录使用 Node.js 内置 `node:test` 和 `node:assert/strict` 验证 Auth 公共 API。

测试不读取真实环境变量、不使用真实密钥，也不通过执行耗时断言恒定时间。当前覆盖 Bearer 解析、API Key 格式边界、错误密钥和 Header 脱敏。
