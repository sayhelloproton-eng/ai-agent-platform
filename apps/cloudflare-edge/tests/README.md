# Tests

本目录使用 Node.js 内置 `node:test` 验证 Worker。测试通过仓库已有 TypeScript
编译器在内存中转换 `src/index.ts`，并注入本地 Fetch 替身；不启动服务、不访问
公网、不读取 Cloudflare 认证信息。

覆盖范围包括：

- 公开健康检查、404、受保护路由方法与准确的 `Allow`；
- 缺失、畸形、错误和未配置的 Edge Bearer 认证，以及 32～256 字符无空白规则；
- Client/Origin Key 隔离和相同 Key 的安全拒绝；
- HTTPS `.trycloudflare.com` 子域、标准端口约束及危险 URL 拒绝；
- 固定路径、请求/响应 Header 白名单、Request ID 格式与 128 字符边界；
- 认证后 `405` 的 Request ID 保留或替换；
- 单次 Fetch、禁止重定向、不重试、网络失败和单一 5 秒硬截止时间；
- Fetch/Body 忽略中止、永不完成或截止后完成时仍安全映射为 504；
- Task JSON Content-Type、65,536 字节请求/响应流式限制；
- Gateway JSON 状态与 Body 保留，以及稳定错误不泄露内部信息。

所有 Key 和域名都是固定测试夹具，不是真实 Secret 或真实 Tunnel 地址。本批次
不做 Cloudflare 部署、Secret 配置、Tunnel 启动或真实 Origin 测试。
