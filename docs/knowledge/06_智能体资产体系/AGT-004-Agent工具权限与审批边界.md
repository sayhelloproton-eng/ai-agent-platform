# AGT-004 Agent工具权限与审批边界

## 1. 文档定位

本文定义 Agent 使用工具、Capability、凭证和高风险动作时的权限与审批边界。自然语言指令只能表达意图，最终执行必须经过程序性 Policy。

## 2. 权限层次

```text
Role Permission
→ Task Scope
→ Capability Allowlist
→ Tool / Resource Scope
→ Environment Sandbox
→ Approval
→ Runtime Enforcement
```

任一层拒绝都不得由更上层自然语言授权绕过。

## 3. 风险分类

只读和可重复计算属于低风险；Git 写入、外部发布和通知属于中高风险；删除、公开权限、支付、凭证和不可逆操作属于高风险。风险决定审批、证据、幂等和回滚要求。

## 4. 审批绑定

Approval 绑定 task_id、task_version、action、target、scope、risk 和过期时间。任务内容或目标发生变化后必须重新请求，不能复用模糊的“全部允许”。

## 5. 拒绝与降级

权限不足时返回结构化 Denial，说明缺少的 Capability、审批或 Scope。允许提出只读 Preview、缩小范围或人工执行方案，但不能静默换工具或扩大访问。

## 6. 当前实现边界

当前 Gateway 与 Runtime 已实现 API Key、Capability 默认拒绝和双层 Policy；Git、Push 与飞书写入仍依靠显式任务授权。统一 Approval Store 尚未实现。

## 7. 目标设计边界

目标把 Profile 权限、Task Scope、Approval 和 Side-effect Ledger 联动，由 Runtime 在执行前后记录证据。高风险操作默认人工审批。

## 8. 设计原则

- 默认拒绝和最小权限。
- 审批绑定具体任务版本与动作。
- Secret 不进入 Prompt、Profile 或知识正文。
- 外部副作用必须幂等并可审计。
- 权限不足时明确停止，不伪装成功。

## 9. 关联文档

- [THY-005 可信 Agent 系统基本原则](../03_Agent工程架构思想与方法论/THY-005-可信Agent系统基本原则/README.md)
- [ARC-013 审批证据与副作用账本](../04_平台架构/ARC-013-审批证据与副作用账本/README.md)
- [CAP-008 平台核心能力模型与目标对齐：AGENTS、Rules、Skills、Hooks、MCP 与 Plugins](../02_基础产品与能力/CAP-008-平台核心能力模型与目标对齐/README.md)
- [AGT-002 Agent-Profile设计规范](AGT-002-Agent-Profile设计规范.md)
- [WFL-009 审批工作流](../07_工作流与项目治理/WFL-009-审批工作流.md)
