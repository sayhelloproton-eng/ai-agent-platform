# Repository Scripts

本目录保存跨 workspace 的仓库级检查、本地链路验证和本地双服务编排。公网 Microsoft Dev Tunnels 的安装、资源管理、Host、状态、验证和 OpenAPI 逻辑属于 `apps/dev-tunnel/`，不在根脚本中复制。

当前脚本：

- `repo-check.mjs`：检查 Node.js、必要资产、workspace 契约和敏感文件跟踪状态；
- `platform-registry-check.mjs`：检查资产 ID、关系词表、Projection 安全策略和必要 Registry 文件；
- `local-chain-test.mjs`：在随机 loopback 端口验证 Gateway → Runtime 双层认证、Policy 和真实 TaskResult；
- `local-stack.mjs`：以前台方式依次启动 Runtime 与 Gateway，校验外部/内部 Key，并处理 SIGINT/SIGTERM；
- `local-stack-test.mjs`：验证配置失败、启动顺序、真实任务、日志脱敏、关闭、端口回收和无孤儿进程。

已淘汰的 Cloudflare Edge Bridge 脚本已删除。当前公网入口只由 `apps/dev-tunnel/` 管理，根入口包括：

```bash
npm run dev-tunnel:doctor
npm run dev-tunnel:install
npm run dev-tunnel:setup
npm run dev-tunnel:start
npm run dev-tunnel:status
npm run dev-tunnel:stop
npm run dev-tunnel:refresh
npm run dev-tunnel:verify
npm run dev-tunnel:openapi
```

本地验证入口：

```bash
npm run check:repo
npm run check:insights
npm run check:registry
npm run check:local-chain
npm run check:local-stack
npm run verify
```

根脚本不得读取或输出 Secret，不得把 Gateway/Runtime 改为非 loopback 监听，也不得自行管理远端 Tunnel 资源。
