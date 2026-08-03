# EXP-005 Custom GPT Actions 最小可信执行链实验

> 结论：Custom GPT 可以通过正式 Action、开发期公网入口和两层 Policy 调用本机窄 Capability；该实验只证明受控的 `runtime.status` 链路，不证明 Shell、文件、Git、持久 Task 或完整 Agent 平台已经实现。

## 1. 实验目标

验证自然语言请求能否沿以下链路到达本机受控 Capability：

```text
Custom GPT
→ Action
→ Microsoft Dev Tunnels
→ Action Gateway
→ Local Runtime
→ TaskResult
```

## 2. 正式视觉资产

![Custom GPT 到 Local Runtime 真实链路](./assets/VIS-002-Custom-GPT到Runtime真实链路.png)

### AI 可读语义镜像

```text
Custom GPT
  → Action：POST /v1/runtime/status
  → Microsoft Dev Tunnels：只暴露 Gateway
  → Action Gateway：Bearer、Schema、Policy、Rate / Concurrency / Timeout
  → Local Runtime：独立 Key 与第二层 Policy
  → runtime.status Capability
  → 结构化 TaskResult
```

安全边界：公网不能直接访问 Runtime；未授权 Capability、错误 Key、超时和异常响应必须被拒绝。

- Visual Asset ID：`VIS-002`；
- 可编辑源文件：[`./assets/VIS-002-Custom-GPT到Runtime真实链路.svg`](./assets/VIS-002-Custom-GPT到Runtime真实链路.svg)；
- 人类预览：[`./assets/VIS-002-Custom-GPT到Runtime真实链路.png`](./assets/VIS-002-Custom-GPT到Runtime真实链路.png)。

## 3. 假设与门禁

如果 Action Schema、Gateway Auth / Policy、Runtime Auth / Policy 和开发公网入口均正确，则 Custom GPT 可以调用明确授权的窄 Capability，同时拒绝未授权动作。

门禁：

- 使用 OpenAPI 描述 Action；
- 公网只暴露 Gateway；
- Gateway 与 Runtime 使用不同 API Key；
- 两层 Policy 默认拒绝；
- 当前只允许 `gateway.ping` 与 `runtime.status`；
- Builder Preview 与自然语言调用分别验证；
- 通过真实回读而不是只看进程日志判定结果。

## 4. 结果

实验确认：

- Custom GPT 可以通过正式 Action 调用 Gateway；
- Gateway 完成认证、Contract 和第一层 Policy；
- Runtime 对同一 Task 再次校验内部 Key 和 Capability Policy；
- `runtime.status` 返回结构化受控状态；
- 未授权 Capability、错误 Key 和异常响应被安全拒绝；
- 当前链路不提供 Shell、文件、Git 或系统修改能力。

## 5. Evidence

- Custom GPT Builder / Preview 与自然语言调用结果；
- Gateway、Runtime 和 Dev Tunnel 代码；
- Workspace 测试、本地链路测试和 `npm run verify`；
- `VIS-002` 的人类图示和 AI 语义镜像。

## 6. 局限

当前仍是开发期窄链路：

- 没有持久 Task State；
- 没有 Approval Store；
- 没有 Evidence Registry；
- 没有生产公网域名和 SLA；
- Action 调用仍受 ChatGPT 产品侧确认和规则影响；
- 没有证明多执行器、长期运行或自动恢复。

## 7. 对平台的影响

该实验把“Custom GPT 可以调用本机服务”的假设提升为可验证最小链路，并确认：

- 公网入口、Gateway 和 Runtime 必须分层；
- Runtime 不能直接暴露公网；
- Capability 必须窄化和默认拒绝；
- 目标平台的 Task Control、Approval 和 Evidence 仍需单独实现。

## 8. 关联资产

- [EXP-006 Gateway、Local Runtime 与 Dev Tunnels 安全链路实验](../EXP-006-Gateway-Local-Runtime与Dev-Tunnels实验/README.md)
- [ARC-001 ai-agent-platform 总体架构与执行路径](../../04_平台架构/ARC-001-ai-agent-platform总体架构/README.md)
- [PRT-003 核心架构判断与可信边界](../../09_作品集/PRT-003-核心架构亮点/README.md)
