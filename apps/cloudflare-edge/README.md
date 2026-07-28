# Cloudflare Edge Worker

本 Workspace 保存 `ai-agent-platform` 的最小 Cloudflare Workers 占位入口。

当前 Worker 只提供 `GET /health`，用于验证一个由 Cloudflare 托管的固定
`workers.dev` HTTPS 地址。它不代理 Action Gateway，不连接 Tunnel，也不包含
Task、认证、Secret、OpenAPI、Custom GPT 或其他 Cloudflare 产品绑定。

## Commands

```bash
npm run test --workspace @ai-agent-platform/cloudflare-edge
npm run deploy --workspace @ai-agent-platform/cloudflare-edge
```

部署使用 `wrangler.jsonc` 中的 `workers_dev` 配置。账号标识、Token、域名和其他
认证信息不得写入本目录或 Git。

## Routes

| Method | Path | Status |
|---|---|---|
| `GET` | `/health` | `200` |
| `GET` | 其他路径 | `404` |
| 非 `GET` | 任意路径 | `405`，并返回 `Allow: GET` |

## 当前部署

固定 HTTPS 地址：

```text
https://edge.ai-agent-platform.workers.dev
```

当前仅部署占位健康检查，不连接 Tunnel、Action Gateway 或 Local Runtime。

## 工具链约束

仓库当前使用 Node.js 20，因此 Wrangler 精确固定为 `4.86.0`。该版本仅用于
部署本仓库中的可信 Worker 源码，不运行 `wrangler dev`，也不使用它处理不可信
输入。

当前 npm 审计中的告警来自 Wrangler 的本地开发和部署依赖链，不属于已部署
Worker 的运行时依赖。在进入生产阶段前，需要单独升级至 Node.js 22 及兼容的
最新 Wrangler，并重新完成依赖安全审计。
