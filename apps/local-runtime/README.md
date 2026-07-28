# Local Runtime

## What

`@ai-agent-platform/local-runtime` 是仅监听本机 Loopback 的最小任务执行服务。它接收 Contract v1 `TaskRequest`，在执行前再次应用 Runtime Policy，并返回 Contract v1 `TaskResult`。

## Why

执行层与公网 Action Gateway 分离，使外部认证和流量边界不直接拥有本机执行能力。Gateway 负责公网入口、认证和第一层 Policy；Runtime 负责 Task 校验、第二层 Policy、Capability 调度和结果构造。

当前 Action Gateway 尚未连接 Local Runtime，Custom GPT 端到端链路仍未打通。Runtime 暂无内部 API Key；本批次依靠 Loopback 监听隔离，Gateway → Runtime 的内部认证留待后续设计。

## HTTP 接口

- `GET /health`：进程健康状态；
- `GET /ready`：Contract 版本和 Runtime Policy 当前允许的 Capability；
- `POST /v1/tasks`：校验并执行 `TaskRequest`，返回原始 `TaskResult`。

请求体最大为 65,536 字节，同时校验 `Content-Length` 与实际流式读取大小。未知路径和错误方法返回安全 JSON Envelope；所有响应带 Request ID、禁用缓存且不暴露 Stack。

## Capability 与执行顺序

默认 Policy 只允许：

- `gateway.ping`：返回 Runtime 可用状态；
- `runtime.status`：返回 Runtime 版本、状态和 Policy Capability。

执行顺序为：Task Contract 校验 → Runtime Policy 二次校验 → Handler 查找 → 空对象输入检查 → Handler 执行 → `TaskResult`。`system.info.safe` 当前没有实现且默认拒绝。

## 使用

```bash
npm run build --workspace @ai-agent-platform/local-runtime
npm run test --workspace @ai-agent-platform/local-runtime
npm run start --workspace @ai-agent-platform/local-runtime
```

默认监听 `127.0.0.1:8790`。`LOCAL_RUNTIME_HOST` 只接受 `127.0.0.1`、`localhost` 或 `::1`；`LOCAL_RUNTIME_PORT` 必须为 1～65535 的整数。

## 安全边界

本 Runtime 不支持 Shell、文件读写、Git 写入、Codex 调用或系统设置修改，也不读取真实 Secret。它仅依赖 Contracts 和 Policy，不依赖 Auth 或 Action Gateway。
