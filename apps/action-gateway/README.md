# Action Gateway

## 当前职责

`@ai-agent-platform/action-gateway` 是未来 Custom GPT Action 的 HTTP 入口。当前实现本地 HTTP 外壳和静态 API Key 认证基线，尚未接入公网、Local Runtime 或任务执行能力。

## 当前接口

```text
GET /health
GET /ready
GET /v1/capabilities
```

`/health` 与 `/ready` 保持公开。`/v1/capabilities` 是受保护路由，请求必须包含：

```text
Authorization: Bearer <api-key>
```

未认证请求统一返回 HTTP 401。

## 当前安全边界

- 默认只监听 `127.0.0.1`；
- 配置的 Host 仅允许 `127.0.0.1`、`localhost` 或 `::1`；
- 启动必须设置符合格式要求的 `ACTION_GATEWAY_API_KEY`，缺失或格式不合法时启动失败；
- 不接受任务执行；
- 不读取请求 Body；
- HTTP 错误响应不输出 Stack、环境变量或 Secret。

## 运行命令

```bash
npm run build --workspace @ai-agent-platform/action-gateway
npm run test --workspace @ai-agent-platform/action-gateway
npm run start --workspace @ai-agent-platform/action-gateway
```

## 当前限制

- 仅支持单一静态 API Key；
- 无权限策略；
- 无 Local Runtime；
- 无 Cloudflare Tunnel；
- 无 Custom GPT OpenAPI Schema。
