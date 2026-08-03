# AGT-005 Skill、Capability、Tool、Permission 与 Policy 资产治理

## 1. 文档定位

本文回答：

> Agent 的“会什么、能做什么、用什么做、允许做到哪里、何时必须审批”如何建模为不同资产，并由 Profile 安全组合？

这五类概念不能混在一份 Instructions 中：

- Skill：可复用工作方法；
- Capability：平台抽象能力；
- Tool：具体调用实现；
- Permission：当前主体可访问的资源范围；
- Policy：风险、审批、停止和证据规则。

## 2. 资产关系

```text
Role / Task Intent
  ↓ Skill Selection
Skill
  ↓ requires
Capability
  ↓ resolved by
Tool / Adapter
  ↓ constrained by
Permission + Resource Scope + Sandbox
  ↓ governed by
Policy + Approval + Runtime Enforcement
  ↓ produces
Result + Evidence + Side-effect Record
```

任一层拒绝都不能被上层自然语言绕过。

## 3. Skill 资产

### 3.1 定义

Skill 是精确触发、可复用、可验证的工作方法与资源包，不是角色、工具、知识正文或单次任务。

### 3.2 最小合同

- 触发条件；
- 非触发条件；
- 输入资格；
- 输出 Contract；
- 处理流程；
- 停止规则；
- 安全边界；
- 错误与恢复；
- 依赖和版本；
- Schema、脚本、模板、Fixture 与 Eval。

### 3.3 当前活跃 Skill

| Skill | 唯一核心问题 | 当前状态 |
|---|---|---|
| `planner-executor-handoff` | 如何安全交给 Executor、收证据、复审和续跑 | accepted |
| `project-knowledge-synthesis` | 如何恢复多源事实、重复、冲突和目标知识结构 | in_review |
| `engineering-document-authoring` | 如何写成 Human-first、AI-lossless 正式文档 | in_review |
| `project-knowledge-governance` | 如何落位、登记、校验、检索和单向发布正式知识 | in_review |
| `engineering-insight-distillation` | 如何把有证据事件提炼为有边界的复用洞见 | verified / explicit trigger |
| `custom-gpt-actions` | 如何保持 Custom GPT Action 兼容和服务端安全 | verified |

`skills/**` 是运行时真源。本目录不再为每个 Skill 复制完整设计正文。

## 4. Capability 资产

Capability 描述“平台可以完成什么”，例如：

- Repository Read / Write；
- Runtime Status；
- Browser Read / Action；
- Knowledge Retrieve；
- Document Authoring；
- Feishu Publish；
- Git Commit / Push；
- Test / Eval；
- Task State Read / Update。

Capability 不绑定某个工具品牌。它应声明输入输出、风险、幂等性、证据要求、健康状态和兼容版本。

## 5. Tool 与 Adapter

Tool 是 Capability 的具体实现，例如：

| Capability | Tool / Adapter 候选 |
|---|---|
| Git Read / Write | Git CLI、GitHub API |
| Code Execution | Codex、脚本、Local Runtime |
| Browser Action | Browser Extension、Playwright Adapter |
| Knowledge Publish | Feishu Publisher |
| Custom GPT Host | GPT Builder / Actions Publisher |
| Web Research | Web Search / Browser |

Profile 绑定 Capability，运行时再根据环境和 Policy 选择 Tool。不要把 `Codex`、`MCP` 或 `API` 名称直接当成角色能力。

## 6. 权限链

```text
Role Permission
→ Task Scope
→ Agent Profile Allowlist
→ Capability Allowlist
→ Tool / Resource Scope
→ Environment Sandbox
→ Approval
→ Runtime Enforcement
```

### 6.1 Permission 的最小维度

- action；
- resource type；
- target / path / branch；
- read / write / delete / publish；
- environment；
- duration / expiry；
- task_id / task_version；
- evidence requirement；
- approval reference。

### 6.2 风险等级

| 等级 | 示例 | 默认要求 |
|---|---|---|
| 低 | 只读查询、纯计算、静态校验 | 最小权限、记录结果 |
| 中 | 本地文件写入、Git Commit、受控配置更新 | 明确 Scope、测试、证据 |
| 高 | Push、外部发布、通知、公开权限 | 人工审批、回读、回滚 |
| 极高 | 删除、支付、凭证、不可逆操作 | 独立批准者、强审计、默认拒绝 |

## 7. Policy 与 Approval

Profile 引用长期 Policy；一次性 Approval 绑定：

```text
task_id
+ task_version
+ action
+ target
+ scope
+ risk
+ expires_at
```

Task 目标、Scope 或版本变化后，旧 Approval 默认失效。模糊的“全部允许”不能覆盖具体 Policy。

权限不足时返回结构化 Denial：缺少哪项 Capability、Approval 或 Resource Scope，并可提出只读 Preview、缩小范围或人工执行方案。

## 8. Profile 组合规则

- 只绑定完成角色职责所需的最小 Skill；
- Skill 与 Tool 分离，允许替换实现；
- Capability 和 Policy 使用稳定 ID；
- Tool Secret 只存在于 Runtime Secret Store；
- Skill 不自动获得写入、Commit、Push 或发布权限；
- Profile 不维护第二套权限清单；
- 多 Skill 冲突时优先更具体、风险更低且证据更充分的方案；
- 没有匹配 Skill 时返回普通规划或停止，不强行套用。

## 9. 生命周期与回归

Skill、Capability、Tool、Policy 任一变化都可能影响 Agent Release：

- Skill 主版本变化；
- Tool schema / API 变化；
- Capability 健康或兼容性变化；
- Permission 扩大；
- Policy 风险等级变化；
- Approval 模型变化。

这些变化必须触发影响分析和相关 Agent Eval，而不是只更新某个 Host 的 Instructions。

## 10. P0 落地

P0 不需要完整 Capability Marketplace，只需要：

1. 为首个 Profile 声明真实 Skill 引用；
2. 建立最小 Capability / Tool Binding；
3. 建立默认拒绝的 Permission / Policy；
4. 验证只读、写入、审批和拒绝四类场景；
5. 证明更换 Tool 或 Executor 不改变 Role Contract；
6. 把结果和拒绝都纳入 Eval。
