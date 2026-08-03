# AGT-007 Agent 评估、发布与生命周期治理

## 1. 文档定位

本文回答：

> 一个 Agent Profile 如何证明自己不仅“偶尔能做对”，而且能够稳定遵守边界、正确失败、可恢复、可回滚，并在不同 Host 与版本间受控发布？

发布对象不是模型名称，而是完整配置快照：Role、Profile、Skill、Knowledge Pack、Capability、Tool、Policy、模型、Host 和 Eval 的组合。

## 2. 生命周期

```text
candidate
→ designing
→ fixture_ready
→ pilot
→ released
→ monitored
→ revised / rolled_back
→ deprecated
→ archived
```

### 状态含义

| 状态 | 证据要求 |
|---|---|
| candidate | 有真实问题和潜在角色，不代表已有资产 |
| designing | Role、边界和 Profile 正在定义 |
| fixture_ready | Schema、Fixture、Contract 和基础检查可运行 |
| pilot | 在受控真实任务中验证，默认需要人工监督 |
| released | 通过规定 Eval，存在正式 Host Release 与回滚版本 |
| monitored | 有生产观察、失败记录和指标 |
| revised | 新版本修复问题，旧版本仍可追溯 |
| deprecated | 不再推荐新任务使用 |
| archived | 仅保留历史、证据和替代关系 |

## 3. Eval 层级

```text
Schema / Static Check
→ Fixture / Unit Eval
→ Scenario Eval
→ Boundary / Adversarial Eval
→ Integration Eval
→ Recovery Eval
→ Pilot
→ Production Observation
```

每层解决不同风险，不能用平均分或少量成功 Demo 代替。

## 4. 评价维度

| 维度 | 典型指标 |
|---|---|
| 目标质量 | 完成率、事实准确、产物完整性 |
| 范围遵守 | Scope 外动作、路径越界、隐式扩展 |
| 角色一致性 | 是否承担非职责、是否越权决策 |
| Skill 选择 | 触发正确率、非触发正确率、流程完整性 |
| Tool 使用 | 工具选择、参数、失败处理、幂等性 |
| 权限与安全 | 拒绝、审批、Secret、外部副作用 |
| 证据 | 来源、Diff、测试、Hash、回读 |
| 可恢复性 | Checkpoint、Handoff、续跑、重复动作防护 |
| 上下文质量 | 缺失、噪声、过期、串线、Token 成本 |
| 资源效率 | Token、时延、成本、人工介入率 |
| 用户价值 | 决策时间、返工、满意度、任务吞吐 |

确定性任务优先使用可执行断言；开放任务使用 Rubric，并保留 Reviewer 证据。

## 5. Release Manifest

每次发布至少记录：

```yaml
release_id: agent.knowledge-governor/custom-gpt/0.1.0
agent_profile_ref: agent.knowledge-governor@0.1.0
role_ref: role.knowledge-governor@1.0.0
source_commit: <sha>
skill_refs: []
knowledge_pack_refs: []
capability_refs: []
tool_bindings: []
policy_refs: []
model: <model/version>
host: custom-gpt
eval_suite_ref: eval.agent.knowledge-governor@0.1
result_summary: {}
known_limitations: []
rollback_release_ref: null
published_at: <timestamp>
readback_evidence_refs: []
status: pilot
```

## 6. 发布门禁

只有同时满足以下条件才能进入 `released`：

- Role 和 Profile 已 Review；
- 依赖资产版本可解析；
- Knowledge Pack 绑定 Source Commit 和 Manifest；
- Capability / Tool / Policy 通过静态检查；
- 必要 Eval 全部通过；
- 高风险边界测试没有被平均分掩盖；
- Host Preview 与实际发布配置一致；
- 有回滚版本和停止条件；
- 发布后完成回读或真实配置验证；
- Registry、Catalog 和 Release 状态一致。

## 7. 回归触发

以下变化触发最少必要回归：

- Role / Profile；
- Instructions / Behavior Policy；
- Skill；
- Knowledge Pack；
- Tool schema / API；
- Capability 或 Permission；
- Policy / Approval；
- 模型或 Provider；
- Host；
- Context Builder 策略；
- 严重 Incident 或用户纠正。

回归范围由影响关系决定，不能因为只改了“知识文件”就跳过行为测试。

## 8. 失败、Incident 与修订

失败应分类为：

- Profile 边界错误；
- Skill 触发或流程错误；
- Knowledge 缺失 / 过期；
- Context 编译错误；
- Tool / Capability 故障；
- Policy / Approval 错误；
- 模型能力不足；
- Host 配置漂移；
- Task / Workflow Contract 错误。

失败首先进入 Evidence / Incident。经过提炼后才可能修订 Profile、Skill、Knowledge Pack、Policy 或 Eval；不得直接靠 Prompt 补丁掩盖。

## 9. 退役和替代

Agent 在以下条件进入 deprecated / archived：

- 长期无真实调用；
- 已被更窄、更可靠的 Agent 替代；
- 风险不可接受；
- Host 或 Tool 已失效；
- 维护成本高于价值；
- 角色职责已经合并。

退役必须保留版本、Release、Eval、Incident、替代关系和迁移说明。

## 10. P0 评估方案

首个专业 Agent 的 P0 Eval 至少覆盖：

1. 3～5 个正向真实场景；
2. 2 个输入不完整场景；
3. 2 个 Scope / 权限拒绝场景；
4. 1 个 Context 过期或冲突场景；
5. 1 个中断恢复场景；
6. 1 个 Host 配置回读；
7. 与人工基线或无 Profile 配置的对照；
8. 一次回滚演练。

只有完成真实 Pilot 并达到边界、安全和恢复门槛，才考虑 `released`。
