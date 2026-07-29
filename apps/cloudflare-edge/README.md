# Cloudflare Edge Worker

本 Workspace 保存 `ai-agent-platform` 的 Cloudflare Edge 安全代理层。目前是
**代码与本地测试就绪**状态，尚未连接真实 Origin，也未在本批次部署 Worker、
设置 Secret 或启动 Tunnel。

## Routes

| Method | Path | 认证 | 行为 |
|---|---|---|---|
| `GET` | `/health` | 无 | Edge 本身的占位健康检查，不访问 Origin |
| `GET` | `/v1/capabilities` | Edge Bearer | 固定转发到同名 Origin 路径 |
| `POST` | `/v1/tasks` | Edge Bearer | 固定转发原始 Task JSON |

根路径和未知路径返回 `404`。已知路径的错误方法返回 `405`，并提供准确的
`Allow` Header。这里没有通配代理，客户端不能指定 Origin 或转发目标。

## Required bindings

运行代理前必须由 Cloudflare Secret/运行环境提供：

- `EDGE_CLIENT_API_KEY`：公网客户端访问 Edge 的独立凭据；
- `EDGE_ORIGIN_BASE_URL`：Quick Tunnel 的 HTTPS 基础地址；
- `EDGE_ORIGIN_API_KEY`：Edge 访问 Action Gateway 的独立凭据。

客户端 Key 与 Origin Key 属于两个独立安全域。Worker 不接触 Local Runtime
内部 Key，也不会把客户端 `Authorization` 转发给 Origin。两套 API Key 都必须
为 32～256 个字符且不得包含任何空白，并且 Client Key 与 Origin Key 必须不同；
配置无效时使用统一非敏感错误且不会调用 Origin。Wrangler 4.86.0 的常规配置
不能只声明必需 Secret 名称而不提供值，所以本批次只在此记录绑定名，没有向
`wrangler.jsonc` 写入 Secret 或占位值。

## Proxy boundaries

Origin 必须是无凭据、Query、Fragment 或子路径的 `https:` URL，且 Host 必须是
`.trycloudflare.com` 的严格子域。仅允许标准 HTTPS 端口；URL 标准化后的任何
非默认端口都会被拒绝。请求只允许一次 Origin Fetch，设置 `redirect: error`，
不跟随重定向，也不自动重试。

发往 Origin 的 Header 白名单为：

- `Authorization`：由 Edge 覆盖为 Origin Key；
- `Content-Type`：仅 Task 请求；
- `X-Request-Id`：只保留符合格式的客户端值，否则由 Edge 生成。

Cookie、Host、`X-Forwarded-*`、`CF-*` 和其他客户端 Header 均不转发。Origin
响应仅允许 `Content-Type`、`X-Request-Id`、`Retry-After` 返回给客户端；全部
Edge 响应使用 `Cache-Control: no-store`。

Request ID 最大为 128 个字符，必须匹配
`^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$`。缺失、空白、超长或含其他字符的客户端
值会被替换，不会导致业务请求失败。受保护代理的成功响应和代理错误都携带有效
`X-Request-Id`；认证成功后的受保护路由即使返回 `405` 也携带该 ID。合法
Origin ID 可以保留，缺失或非法 Origin ID 回退到 Edge 为本次请求确定的 ID。

Task 请求体和 Origin 响应体都限制为 65,536 字节，并在流式读取时执行限制。
Origin 固定超时为 5,000 ms：它高于 Gateway→Runtime 默认 3,000 ms，为内部
处理留出小幅余量，同时明显低于 Gateway 20,000 ms 的入站请求上限。超时、
网络失败、非法 JSON、重定向和响应超限均映射为稳定的非敏感 Edge 错误。该
5 秒预算是覆盖 Origin 连接、Fetch 以及响应 Body 完整流式读取的单一绝对截止
时间，不会为 Body 重新计时，也不依赖 Origin Fetch 或 Stream 配合中止信号。

## Commands

```bash
npm run test --workspace @ai-agent-platform/cloudflare-edge
```

`deploy` 脚本仍保留供后续受控部署使用，但本批次不执行部署、Secret 配置或
Tunnel 启动。账号标识、Token、域名实例值和认证信息不得写入本目录或 Git。

## Rollback

若后续接入验证失败，应通过 Git 回退代理实现，让 Worker 恢复为只处理公开
`GET /health`、其余路径返回错误的占位行为；不要通过放宽认证、Origin 校验、
大小限制或 Header 白名单临时绕过问题。

## Toolchain

仓库当前使用 Node.js 20，Wrangler 精确固定为 `4.86.0`，本批次未修改版本或
新增依赖。现有 npm 审计告警来自 Wrangler 的本地开发和部署依赖链；进入生产
阶段前仍需单独升级 Node.js 与 Wrangler 并重新完成依赖安全审计。
