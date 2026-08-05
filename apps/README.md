# Applications

`apps/` 保存可以独立启动的平台应用。当前应用：

- `action-gateway`：公网 Action 入口与认证、Policy 边界；当前包含总控 MVP 的窄化 Controller Action 和内存 Task Control Fixture；
- `local-runtime`：本机 Task 校验、Capability 调度和执行结果。
- `dev-tunnel`：Microsoft Dev Tunnels 官方 CLI、本地进程编排、公网验证与 Custom GPT Action Schema。

Action Gateway 已通过独立内部 API Key 连接 Local Runtime；Dev Tunnel 只发布 Gateway 的 loopback 8787 端口。

与其他顶层工程目录的边界：

- `apps/`：可启动、可部署的应用入口；
- `packages/`：可被多个应用复用的共享协议与库；
- `capabilities/`：受控能力的具体实现；
- `skills/`：供 Agent 使用的独立可执行能力，不属于应用 workspace。

应用可以依赖 `packages/` 中的共享包，但共享包不应反向依赖应用。
