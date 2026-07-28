# Action Gateway

## 当前职责

`@ai-agent-platform/action-gateway` 是未来 Custom GPT Action 的 HTTP 入口。当前实现本地 HTTP 外壳、外部 API Key、Gateway Policy，以及连接 Local Runtime 的受保护任务链路。

## 当前接口

```text
GET /health
GET /ready
GET /v1/capabilities
POST /v1/tasks
```

`/health` 与 `/ready` 保持公开。`/v1/capabilities` 和 `/v1/tasks` 是受保护路由，请求必须包含外部 Gateway Key：

```text
Authorization: Bearer <api-key>
```

未认证请求统一返回 HTTP 401。

Gateway 使用 `@ai-agent-platform/policy` 控制可见和可转发的 Capability。`/ready` 与认证后的 `/v1/capabilities` 只返回策略允许的能力；默认允许：

```text
gateway.ping
runtime.status
```

`system.info.safe` 当前仍默认拒绝。Capability 出现在 Contract 中不代表自动允许。

`POST /v1/tasks` 只接受 `requestedBy.type = "custom-gpt"`。Gateway 校验 Task Contract、覆盖不可信的 Task Request ID、执行 Gateway Policy，再通过 Runtime Client 转发。外部 Authorization Header 永不转发；Runtime Client 使用独立的 `ACTION_GATEWAY_RUNTIME_API_KEY`。

Runtime Client 只连接 Loopback HTTP URL，默认超时 3000 ms，并把连接失败、Header 前或 Body 读取阶段超时、非法 Runtime 响应映射为安全 Transport Error。合法 Runtime `TaskResult` 还必须与原 Task 的 `taskId` 一致才会原样返回；Transport Error 与 Task 的 succeeded、failed、rejected 状态是不同层次。Runtime 超时统一安全映射为 HTTP 504。

## 当前安全边界

- 默认只监听 `127.0.0.1`；
- 配置的 Host 仅允许 `127.0.0.1`、`localhost` 或 `::1`；
- 启动必须设置符合格式要求的 `ACTION_GATEWAY_API_KEY`，缺失或格式不合法时启动失败；
- Runtime 内部 Key 必须与外部 Gateway Key 分离配置，允许完全不同；
- Runtime URL 仅允许 Loopback `http:`，禁止凭据、Path、Query 和 Fragment；
- Task Request 与 Runtime Response 均限制为 65,536 字节；
- 提前返回时会排空未读请求 Body，避免破坏 Keep-Alive 连接复用；
- Gateway 固定设置 10 秒 Header、20 秒 Request、5 秒 Keep-Alive 和 20 秒 Socket 空闲超时；
- HTTP 错误响应不输出 Stack、环境变量或 Secret。

## 运行命令

```bash
npm run build --workspace @ai-agent-platform/action-gateway
npm run test --workspace @ai-agent-platform/action-gateway
npm run start --workspace @ai-agent-platform/action-gateway
```

启动需要：

```text
ACTION_GATEWAY_API_KEY
ACTION_GATEWAY_RUNTIME_API_KEY
ACTION_GATEWAY_RUNTIME_URL
ACTION_GATEWAY_RUNTIME_TIMEOUT_MS
```

Runtime URL 与 Timeout 可省略，默认分别为 `http://127.0.0.1:8790` 和 `3000`。

## 当前限制

- 仅支持静态外部与内部 API Key，无轮换；
- 无动态策略管理；
- 无 Rate Limit 或 Gateway / Runtime 任务并发上限，完成这些防护前不应直接暴露公网；
- 无 Cloudflare Tunnel；
- 无 Custom GPT OpenAPI Schema。
