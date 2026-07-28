# Source

本目录保存 Cloudflare Edge Worker 的 TypeScript 源码。

`index.ts` 导出可直接测试的 `handleRequest` 函数，并通过 Workers 内置 Fetch
Handler 暴露同一处理逻辑。当前实现仅提供占位健康检查，不包含代理、认证、
持久化、定时任务或日志上报。
