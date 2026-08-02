# EXP-006 Gateway、Local Runtime 与 Dev Tunnels 实验

## 1. 文档定位

本文记录本地双服务、公网开发入口和安全链路的工程验证，重点说明各组件真实承担的职责。

## 2. 实验对象

- `apps/action-gateway/`：外部认证、第一层 Policy、限流和转发；
- `apps/local-runtime/`：本机 Task 校验、第二层 Policy 和 Capability；
- `apps/dev-tunnel/`：Microsoft Dev Tunnels 生命周期、OpenAPI 和公网验证；
- `packages/contracts/`、`auth/`、`policy/`：共享边界。

## 3. 安全验证

验证覆盖：

- Runtime 和 Gateway 只监听 Loopback；
- Tunnel 只转发 Gateway 端口；
- 外部 Key 与内部 Key 分离；
- Runtime URL 禁止非 Loopback 与附加凭据；
- 请求、响应、并发和超时受限；
- 未知 Capability 默认拒绝；
- 错误响应不泄漏 Stack 和 Secret；
- 停止后端口回收且没有孤儿进程。

## 4. 结果与证据

仓库完整验证、各 Workspace 测试、本地链路测试和 Dev Tunnel 验证均通过。`gateway.ping` 与 `runtime.status` 是当前默认允许的两项能力。

Dev Tunnels 只是开发期入口；公开 URL 稳定性、Public Preview 状态和资源生命周期不能被描述为生产承诺。

## 5. 边界

当前没有队列、动态路由、持久状态、Secret 轮换、生产级边缘防护或多 Runtime 调度。单实例内存限流也不能代替生产网关。

## 6. 当前事实边界

Gateway、Runtime 和 Dev Tunnels 已形成可运行最小链路，并进入 `npm run verify`。Cloudflare Edge Bridge 和旧 Worker 路线已退出当前执行路径。

## 7. 后续边界

后续在不破坏 Loopback 和双层 Policy 的前提下，引入 Task Control、Evidence 和可替换公网 Adapter。

## 8. 结论与原则

- 公网只暴露最小入口。
- 本机 Runtime 永不直接公网监听。
- Gateway 与 Runtime 分别校验权限。
- 开发入口不冒充生产基础设施。

## 9. 关联资产

- [ARC-010 Execution Lane](../04_平台架构/ARC-010-Execution-Lane执行通道模型/README.md)
- [ARC-013 审批证据与副作用](../04_平台架构/ARC-013-审批证据与副作用账本/README.md)
- [EXP-005 Actions 链路](./EXP-005-Custom-GPT-Actions链路实验/README.md)
