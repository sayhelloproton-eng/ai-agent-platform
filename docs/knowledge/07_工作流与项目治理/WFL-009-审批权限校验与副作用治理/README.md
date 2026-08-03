# WFL-009 审批、权限校验与副作用治理

> 核心结论：Approval 是对某个 Task Version 下具体动作、目标、范围和期限的一次治理决定；真正执行仍需同时通过 Policy、Permission、Lease、幂等和执行后回读。

## 1. 文档定位

本文拥有 Approval Request、Decision、Expiry、Revoke、Runtime Preflight、Side-effect Ledger、Readback 和 Compensation。

长期权限属于 `06`；Task 状态属于 `WFL-007`；Evidence 方法属于 `08`。本文只协调它们。

## 2. Permission、Policy 与 Approval

| 概念 | 回答的问题 |
|---|---|
| Permission | 该主体原则上是否有资格使用某能力 |
| Policy | 当前任务、环境和风险规则是否允许该动作 |
| Approval | 有权决策者是否批准这一次具体动作 |
| Confirmation | 用户是否确认预览内容；可作为 Approval 的交互形式，但不是全部治理模型 |
| Lease | 当前 Executor 是否仍拥有执行权 |

任意一项缺失都不能由另一项替代。

## 3. 需要审批的典型动作

- Commit、Push、PR、Merge 等超出默认合同的 Git 动作；
- 删除文件、分支、Worktree、远端资源；
- 外部发布、覆盖 Feishu、更新 Custom GPT Knowledge；
- 修改权限、Secret、网络暴露和安全策略；
- 高成本模型或长时间资源使用；
- 不可逆业务动作；
- 超出原范围的 Migration；
- 代表用户发送外部消息或提交结果；
- 其他由 Policy 标记为高风险的副作用。

是否需要审批最终由 Capability Policy 和 Task Contract 决定。

## 4. Approval Request

至少包含：

```text
approval_id
task_id / task_version
action
target
scope
reason
risk
preview
expected_side_effect
rollback_or_compensation
evidence_refs
requested_by
expires_at
idempotency_key
```

缺少目标、范围、预期影响或有效期时，不得请求笼统批准。

## 5. Decision

Approver 可以：

- `approve`
- `reject`
- `request_changes`
- `approve_with_reduced_scope`

Decision 记录身份、时间、理由、条件、批准范围和有效期。

以下变化使旧 Approval 失效：

- Task Version；
- Action；
- Target；
- Scope；
- Preview 实质内容；
- Risk；
- 环境或外部状态；
- 期限。

## 6. 等待、过期与撤销

等待审批时 Task 进入 `waiting_approval`，不占用不必要的执行资源。Approval 过期、撤销或条件变化时，Task 返回 `blocked`、重新规划或生成新请求；不能自动沿用。

## 7. Runtime Preflight

执行前再次校验：

1. Task 和 Expected Version；
2. Actor Permission；
3. Capability Policy；
4. Approval 状态、范围和期限；
5. Lease；
6. Target 当前状态；
7. 幂等键；
8. Secret / Credential 可用性；
9. Preview 与实际动作一致；
10. Rollback / Compensation 准备。

Approval 只允许尝试，不保证动作成功。

## 8. Side-effect Ledger

每个副作用记录：

- Task / Version；
- Execution；
- Actor / Executor；
- Approval；
- Action / Target；
- Request / Response 摘要；
- 开始与完成时间；
- 幂等键；
- 结果状态；
- 外部资源 ID；
- Readback；
- 补偿状态；
- Evidence 引用。

Ledger 不存明文 Secret。

## 9. Readback

执行后必须从目标系统重新读取真实状态。例如：

- Push 后读取远端 SHA；
- Feishu 发布后读取文档版本与内容；
- 创建资源后读取实际 ID；
- 删除后确认资源不存在；
- 权限修改后重新读取授权状态。

“API 返回成功”不等于目标状态已经符合预期。

## 10. 部分成功与补偿

外部动作可能出现：

- 请求超时但实际已成功；
- 多步骤中部分完成；
- 本地成功、远端失败；
- 发布成功、Registry 未同步；
- 无法完全回滚。

处理顺序：

1. 停止重复提交；
2. 使用幂等键和目标 Readback 确认真实状态；
3. 写入 Partial Success；
4. 执行可用补偿；
5. 记录不可补偿影响；
6. 进入人工 Review 或 Recovery Task。

## 11. 当前实践与目标

当前 Git Commit / Push、Feishu 写入和部分高风险操作使用明确授权、确认短语、预览和回读，但尚无统一 Approval Store、自动过期和 Side-effect Ledger。目标优先覆盖 Git 和外部发布，再扩展其他高风险能力。
