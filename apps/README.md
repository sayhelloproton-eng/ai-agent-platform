# Applications

`apps/` 保存可以独立启动的平台应用。当前应用是 `action-gateway`。

与其他顶层工程目录的边界：

- `apps/`：可启动、可部署的应用入口；
- `packages/`：可被多个应用复用的共享协议与库；
- `capabilities/`：受控能力的具体实现；
- `skills/`：供 Agent 使用的独立可执行能力，不属于应用 workspace。

应用可以依赖 `packages/` 中的共享包，但共享包不应反向依赖应用。
