# Architecture Context

## 长期六层架构

```text
Agent Interface
  ↓
Agent Brain
  ↓
Agent Runtime
  ↓
Tool Layer
  ↓
Knowledge Layer
  ↓
Infrastructure
```

## 当前真实实现

```text
Custom GPT
  → Microsoft Dev Tunnels
  → Action Gateway
  → Local Runtime
  → gateway.ping / runtime.status
```

当前已实现：

- Interface：正式 Custom GPT 与 Action；
- Public Entry：Microsoft Dev Tunnels 开发期公网入口；
- Control Boundary：Gateway 认证、Policy、Task 构造和 Runtime 转发；
- Execution Boundary：Runtime 二次认证、二次 Policy、Capability 执行和 TaskResult；
- Shared Contracts：contracts、auth、policy；
- Knowledge and Skills：Git 文档、六个已验证或已接受 Skill、Project Knowledge Synthesis v0.1.0（in_review）与 Engineering Insight Registry；
- Evidence：测试、验收记录、Commit 和真实调用结果。

## 目标架构

### 认知平面

- Chat / 总控 Agent；
- 专业 Agent；
- Agent Profile；
- Knowledge Pack；
- Skills；
- 上下文选择与证据推理。

### 控制平面

- Task Contract；
- Task State；
- Agent / Executor Registry；
- Policy；
- Approval；
- Evidence；
- Side-effect Ledger；
- Health Event；
- Recovery；
- Resource Lease。

### 执行平面

- Codex / Work；
- Local Runtime；
- Browser / CLI / API Adapter；
- Git Branch / Worktree；
- 模型和外部 Provider；
- 可替换执行器。

### 知识与资产平面

- Git 正式知识；
- Platform Registry；
- Engineering Insight Registry；
- Agent Profile；
- Knowledge Pack；
- Feishu Projection；
- Release 与变更影响。

## 当前差距

最小 Runtime 已经存在，但完整执行生命周期、持久状态、重试、暂停、恢复、审批、证据和多执行器调度尚未实现。

Cloudflare Edge 是历史 superseded 路线。当前公网入口是 Microsoft Dev Tunnels，且只用于开发期 MVP。

## 架构原则

- 业务与模型、设备和 Provider 解耦；
- 上层依赖 Contract、Port 和稳定接口；
- 外部调用方只提交业务意图和必要参数；
- 身份、权限、路由和内部协议由受信任服务端生成；
- 默认拒绝、最小权限和双层校验；
- 当前与目标必须分开；
- 真实调用路径优先于 Mock；
- 阶段适配优先于永久平台承诺。
