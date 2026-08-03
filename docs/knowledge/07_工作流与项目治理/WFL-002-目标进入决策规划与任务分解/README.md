# WFL-002 目标进入、决策规划与任务分解

> 核心结论：执行之前必须先把原始意图转化为事实可追溯、边界可说明、决策已确认、依赖可管理的计划；Planner 的产物是可冻结任务候选，不是未经确认的正式事实。

## 1. 文档定位

本文负责从目标入口到 Task Contract 候选之间的规划工作流。它拥有 Intake、Context Recovery Request、Problem Framing、Decision Gate、Plan Freeze 和 Task Decomposition。

本文不定义完整 Task Contract，不执行仓库写入，不拥有 Context 真源，也不替代产品、架构或证据专题。

## 2. 入口类型

| 类型 | 说明 | 典型后续 |
|---|---|---|
| Goal | 希望达成的结果 | 规划并拆成 Task |
| Opportunity | 可能值得投入的产品或工程机会 | 先进入 `WFL-011` |
| Incident | 运行异常、安全问题或失败 | 先止损、恢复事实，再规划 |
| Change Request | 对现有资产、行为或边界的变更 | 做影响分析与 Task 化 |
| Recovery Request | 会话、执行器或任务中断后的接续 | 引用 `WFL-007` Checkpoint |

## 3. Intake 最小字段

- `request_id`
- 原始目标或问题
- 发起者与最终 Owner
- 期望结果
- 已知约束
- 时间或资源边界
- 可接受风险
- 已知 Source Commit / Asset ID / Task ID
- 是否涉及外部副作用
- 尚未确认的假设

信息不足不等于拒绝。Planner 可以形成“缺口清单”，但不能在事实缺失时直接把猜测写成 Task 输入。

## 4. Context Recovery

Planner 向 `05_上下文与知识系统` 请求与当前目标最相关的最小上下文：

```text
Request
  → 确认项目、领域、资产和时间范围
  → 固定 Source Commit
  → 获取 Canonical 文档、Context、Registry 与历史决策引用
  → 标记冲突、过期和未知
  → 形成任务前 Context Package / Instance
```

Context Recovery 的输出必须区分：

- 已确认事实；
- 已接受决策；
- 当前状态；
- 历史或 Superseded 内容；
- 推断；
- 未知项；
- 需要 Owner 决定的事项。

Planner 可以引用 Context，不得修改其语义所有权。

## 5. Problem Framing

规划不能从“我要改什么文件”开始，而应先回答：

1. 当前问题是什么？
2. 谁受到影响？
3. 目标状态是什么？
4. 哪些边界已经确定？
5. 哪些事实仍不确定？
6. 不行动的代价是什么？
7. 哪些变化会触发架构、产品、知识或安全 Review？

输出为 Problem Statement、Scope、Non-scope、Constraints 和 Success Signals。

## 6. 决策分级

| 决策级别 | 说明 | 处理 |
|---|---|---|
| 无需新决策 | 已有规则足以确定执行 | 进入 Task Decomposition |
| 局部执行决策 | 路径、顺序或实现选项 | Planner 提案，Owner 或授权角色确认 |
| 架构决策 | 改变状态所有权、模块边界或 Adapter | 回到 `04_平台架构` Review |
| 产品决策 | 改变用户、价值、范围或立项 | 进入 `WFL-011` |
| 高风险决策 | 权限、安全、删除、外部发布 | 形成 Decision 与后续 Approval 要求 |

决策记录至少包含选项、依据、约束、被拒绝方案和适用范围。

## 7. Plan Freeze

Plan 在进入任务合同前必须冻结：

- 目标和成功标准明确；
- 关键事实有来源；
- Scope 与 Non-scope 明确；
- 依赖和并行关系明确；
- 需要 Owner 决定的事项已关闭；
- 需要的 Context、Capability、Evidence 和 Approval 已识别；
- 计划没有把目标设计描述成当前实现；
- 架构冲突已处理或阻断。

Plan Freeze 之后，任何会改变目标、范围、输入版本、验收或风险的变化都必须生成新版本，而不是在执行中口头追加。

## 8. Task Decomposition

拆分原则：

1. 每个 Task 只有一个清晰主目标。
2. Task 结果可以独立验收。
3. 依赖通过稳定 ID 和版本表达。
4. 内容判断与机械落盘尽量分离。
5. 高不确定性任务与确定性任务分离。
6. 高风险副作用与普通修改分离。
7. 跨目录共享资产修改尽量集中，避免并行覆盖。
8. 并行 Task 必须有明确 Integration Task 或集成责任人。
9. 小改可以进入“下一步前置”，但必须仍在授权范围和验收内。
10. 无法可靠验证的任务不得假装可自动执行。

## 9. 输出给 WFL-005

规划阶段输出 `Task Contract Candidate`，至少包含：

- Goal、Task Type、Parent / Child；
- Source Commit；
- Scope、Allowed、Forbidden；
- Inputs、Dependencies；
- 建议角色和 Capability；
- Context 引用；
- Approval 与 Evidence 要求；
- Acceptance；
- Stop Conditions；
- Git Operating Policy 候选；
- 预算、风险与报告格式。

完整合同由 `WFL-005` 冻结。

## 10. 停止与回退

以下情况不得进入执行：

- 关键事实互相冲突；
- Source Commit 不确定；
- 架构或产品决策未完成；
- Scope 无法界定；
- 删除、发布或权限动作没有风险说明；
- 验收无法观察；
- 多窗口并行会修改同一共享资产且无集成顺序；
- Context 可能包含未审查的私密信息；
- 用户要求的目标与当前安全或治理边界冲突。

## 11. 当前实践与目标能力

当前由用户和 Chat Planner 人工完成事实恢复、决策、目录规划、逐篇冻结和交付包设计。目标能力是让 Planner Service 能读取固定版本上下文、生成结构化 Plan 和 Task Candidate，但最终产品、架构和高风险决策仍由 Project Owner 控制。
