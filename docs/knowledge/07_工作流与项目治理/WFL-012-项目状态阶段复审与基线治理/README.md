# WFL-012 项目状态、阶段复审与基线治理

> 核心结论：项目状态必须从固定版本的 Git、Task、Registry、测试、Release、Migration 和外部回读中形成；汇报是事实的治理结果，不是用漂亮摘要替代真实状态。

## 1. 文档定位

本文拥有 Project State、Reporting Window、状态归一化、Drift / Gap / Risk、Phase Review、Decision Request、Baseline Candidate 和 Baseline Freeze。

Task State 属于 `WFL-007`。本文汇总多个 Task 和资产的事实，但不直接修改 Task，也不允许报告生成器覆盖正式 Context。

## 2. Project State 与 Task State

- Task State 回答单个工作单元当前在哪里。
- Project State 回答一个阶段、能力域或项目整体已经形成什么正式成果、还缺什么、风险在哪里、下一基线是什么。
- 一个 Task 成功不等于项目阶段完成。
- 一个 Task 失败也不必然等于项目失败；需要看替代路径、影响和阶段门。

## 3. Reporting Window

每次汇总必须明确：

- 时间范围；
- 起始与结束 Commit；
- 目标分支；
- 涉及的 Task / Release / Migration；
- 项目阶段或能力范围；
- 外部依赖；
- 报告受众。

“最近”“当前”必须对应可定位的日期和 Commit。

## 4. 事实来源

优先级：

1. Git Commit、Diff、Tag 和 Remote SHA；
2. Task Contract、状态与 Result；
3. Registry / Relations；
4. Test / Evidence；
5. Release、Migration、Projection Readback；
6. Runtime / Gateway 实际状态；
7. Executor 自然语言报告。

自然语言报告是候选证据，必须与真实文件或系统回读核对。

## 5. 状态归一化

建议使用：

- `completed`：满足验收并已进入正式基线；
- `in_progress`：存在有效 Task 和当前执行状态；
- `blocked`：有明确阻塞和解除条件；
- `planned`：已进入 Roadmap，但尚未形成执行 Task；
- `placeholder`：架构中保留位置，尚未进入实现；
- `superseded`：已被新资产或决策替代；
- `retired`：不再使用并完成治理关闭；
- `unknown`：证据不足，不得猜测。

不同资产可以有不同状态，但必须说明状态 Owner 和来源。

## 6. Drift、Gap 与 Risk

- **Drift**：正式状态、Context、Registry、代码或 Projection 之间不一致。
- **Gap**：目标能力与当前证据之间的缺口。
- **Risk**：未来可能影响目标、成本、安全或时间的因素。
- **Issue**：已经发生并需要处理的问题。
- **Dependency**：必须先满足的外部或内部条件。

报告不得把它们混成“待优化”。

## 7. 阶段复审

Phase Review 检查：

- 阶段目标；
- 必需资产；
- 必需 Evidence；
- 完成的 Task；
- 未关闭阻断项；
- Context 和 Registry 一致性；
- Release / Migration；
- 安全与副作用；
- 资源和预算；
- 下一阶段依赖。

输出可以是：

- Close Phase；
- Close with Follow-up；
- Continue；
- Replan；
- Pause；
- Reject Baseline。

## 8. Decision Request

需要 Owner 决定时，报告必须给出：

- 决策问题；
- 已确认事实；
- 候选选项；
- 影响；
- 推荐；
- 不决定的后果；
- 最迟决策点。

不能只写“请确认下一步”。

## 9. Baseline Candidate

Baseline Candidate 至少包含：

- 分支与 Commit；
- 正式资产清单；
- 当前能力状态；
- 关键架构和治理结论；
- 完成与未完成；
- Release / Migration；
- 重要 Evidence；
- 已知风险；
- 下一主线；
- Superseded 内容；
- 仓库洁净状态。

Candidate 经 Planner 语义 Review 和用户确认后才成为正式基线。

## 10. Context 与 Roadmap 更新

Project Status 可以生成更新提案，但：

- `context/**` 仍由 Planner 维护；
- Executor 只按完整覆盖文件执行；
- 重要变化由用户最终确认；
- Roadmap 更新必须区分 accepted、planned、placeholder；
- 报告不得把计划自动写成已完成；
- 并行窗口对共享 Context 的修改必须在最新共同 Commit 上集成。

## 11. 项目汇报结构

```text
范围与基线
目标与阶段
已完成事实及证据
当前进行中
阻塞与风险
漂移与缺口
资产、Release 与 Migration
需要决策
下一阶段和依赖
仓库与外部系统回读
```

摘要可以按受众变化，底层事实不能变化。

## 12. 当前实践与目标

当前通过归档与基线 Chat、Git 状态、Commit、回读报告和人工确认维护项目状态。目标是让 Project Governance Agent 自动汇总候选状态、识别 Drift 和生成 Baseline Candidate；它仍不能绕过 Git、Planner 和用户确认。
