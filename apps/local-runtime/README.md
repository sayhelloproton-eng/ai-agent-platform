# Local Runtime

## What

`@ai-agent-platform/local-runtime` 是仅监听本机 Loopback 的最小任务执行服务。它接收 Contract v1 `TaskRequest`，在执行前再次应用 Runtime Policy，并返回 Contract v1 `TaskResult`。

## Why

执行层与公网 Action Gateway 分离，使外部认证和流量边界不直接拥有本机执行能力。Gateway 负责公网入口、认证和第一层 Policy；Runtime 负责 Task 校验、第二层 Policy、Capability 调度和结果构造。

Action Gateway 已通过独立 Runtime Client 连接 Local Runtime。本地链路使用与外部 Gateway Key 分离的内部 API Key；两者可以完全不同，不会自动复制、推导或输出。

## HTTP 接口

- `GET /health`：进程健康状态；
- `GET /ready`：Contract 版本和 Runtime Policy 当前允许的 Capability；
- `POST /v1/tasks`：需要内部 Bearer API Key，校验并执行 `TaskRequest`，返回原始 `TaskResult`。

`/health` 与 `/ready` 保持公开；`/v1/tasks` 使用 `LOCAL_RUNTIME_API_KEY`。请求体最大为 65,536 字节，同时校验 `Content-Length` 与实际流式读取大小。未知路径和错误方法返回安全 JSON Envelope；所有响应带 Request ID、禁用缓存且不暴露 Stack。

## Capability 与执行顺序

默认 Policy 只允许：

- `gateway.ping`：返回 Runtime 可用状态；
- `runtime.status`：返回 Runtime 版本、状态和 Policy Capability。

执行顺序为：Task Contract 校验 → Runtime Policy 二次校验 → Handler 查找 → 空对象输入检查 → Handler 执行 → `TaskResult`。`system.info.safe` 当前没有实现且默认拒绝。

Runtime 默认最多执行 1 个已通过 Contract 与 Runtime Policy 的 Task，可通过 `LOCAL_RUNTIME_MAX_CONCURRENT_TASKS` 配置为 1～16。达到上限时不排队、不调用 Executor，立即返回 HTTP 503 `BUSY` 和 `Retry-After: 1`；执行成功、失败或异常后都会释放槽位。

## 使用

```bash
npm run build --workspace @ai-agent-platform/local-runtime
npm run test --workspace @ai-agent-platform/local-runtime
npm run start --workspace @ai-agent-platform/local-runtime
```

默认监听 `127.0.0.1:8790`。`LOCAL_RUNTIME_HOST` 只接受 `127.0.0.1`、`localhost` 或 `::1`；`LOCAL_RUNTIME_PORT` 必须为 1～65535 的整数。

启动必须设置符合格式要求的 `LOCAL_RUNTIME_API_KEY`。它应与外部 `ACTION_GATEWAY_API_KEY` 分离，并与 Gateway 侧的 `ACTION_GATEWAY_RUNTIME_API_KEY` 匹配。`LOCAL_RUNTIME_MAX_CONCURRENT_TASKS` 可省略，默认值为 `1`。

## 安全边界

本 Runtime 不支持 Shell、文件读写、Git 写入、Codex 调用或系统设置修改，也不读取真实 Secret。它仅依赖 Contracts 和 Policy，不依赖 Auth 或 Action Gateway。
