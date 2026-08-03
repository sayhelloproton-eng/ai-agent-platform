# EXP-006 Gateway、Local Runtime 与 Dev Tunnels 安全链路实验

> 结论：Gateway、Runtime 和 Dev Tunnels 已形成可运行的开发期最小链路；已验证的是分层认证、双层 Policy、Loopback 和受限 Capability，不是生产级网关、持久任务系统或完整 Agent Runtime。

## 1. 实验问题

本地双服务和开发公网入口能否在不直接暴露 Runtime 的前提下，稳定完成认证、Policy、限流、转发、Capability 执行和安全失败？

## 2. 实验对象

- [`apps/action-gateway/`](../../../../apps/action-gateway/)：外部认证、第一层 Policy、限流和转发；
- [`apps/local-runtime/`](../../../../apps/local-runtime/)：本机 Task 校验、第二层 Policy 和 Capability；
- [`apps/dev-tunnel/`](../../../../apps/dev-tunnel/)：Microsoft Dev Tunnels 生命周期、OpenAPI 和公网验证；
- [`packages/contracts/`](../../../../packages/contracts/)、[`auth/`](../../../../packages/auth/)、[`policy/`](../../../../packages/policy/)：共享边界。

## 3. 方法

1. 分别启动 Runtime 与 Gateway；
2. 验证两者只监听 Loopback；
3. 验证 Gateway 使用内部 Key 调用 Runtime；
4. 通过 Dev Tunnels 只暴露 Gateway 端口；
5. 调用允许的 `gateway.ping` 和 `runtime.status`；
6. 注入错误 Key、未知 Capability、超时、过大请求和异常响应；
7. 停止服务并检查端口、进程和资源回收；
8. 运行 Workspace 测试、本地链路测试和完整 `npm run verify`。

## 4. 安全观察

验证覆盖：

- Runtime 和 Gateway 只监听 Loopback；
- Tunnel 只转发 Gateway；
- 外部 Key 与内部 Key 分离；
- Runtime URL 禁止非 Loopback 和附加凭据；
- 请求、响应、并发和超时受限；
- 未知 Capability 默认拒绝；
- 错误响应不泄漏 Stack 和 Secret；
- 停止后端口回收且没有孤儿进程。

## 5. 结果与 Evidence

仓库完整验证、各 Workspace 测试、本地链路测试和 Dev Tunnel 验证均通过。当前默认允许的两项 Capability 为：

- `gateway.ping`；
- `runtime.status`。

Dev Tunnels 是开发期入口。公开 URL 的稳定性、Public Preview 状态和资源生命周期不能被描述为生产承诺。

## 6. 与 EXP-005 的边界

- `EXP-005` 证明 Custom GPT 用户入口可以真实走完整链路；
- `EXP-006` 重点验证组件职责、安全边界、错误路径和工程可运行性。

两者共同验证最小可信链路，但不等于 Task Control 或 Agent 自动化已经实现。

## 7. 限制

当前没有：

- 队列和持久 Task / Execution / Result；
- 动态 Executor Routing；
- Approval、Evidence 和 Side-effect Ledger；
- Secret 轮换；
- 多 Runtime 调度；
- 生产级边缘防护和 SLA。

单实例内存限流不能替代生产网关。

## 8. 对平台的影响

- 固定 Gateway / Runtime 信任边界；
- 固定公网只暴露最小入口；
- 证明 Adapter 可以替换而内部 Contract 保持稳定；
- 为后续 Task Control、Evidence 和 Approval 纵向切片提供真实 Runtime 基础。

## 9. 关联资产

- [EXP-005 Custom GPT Actions 最小可信执行链实验](../EXP-005-Custom-GPT-Actions链路实验/README.md)
- [ARC-001 ai-agent-platform 总体架构与执行路径](../../04_平台架构/ARC-001-ai-agent-platform总体架构/README.md)
- [WFL-006 执行通道、验证复审与集成](../../07_工作流与项目治理/WFL-006-执行通道验证复审与集成/README.md)
