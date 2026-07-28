# Tests

本目录使用 Node.js 内置 `node:test` 测试 Worker 的导出请求处理函数。

测试通过仓库已有的 TypeScript 编译器在内存中转换 `src/index.ts`，不启动本地
服务、不访问公网，也不读取 Cloudflare 认证信息。覆盖健康检查、响应 Header、
404、405、`Allow` Header 和响应内容安全边界。
