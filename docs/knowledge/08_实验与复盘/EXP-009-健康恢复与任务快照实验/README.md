# EXP-009 任务中断、健康恢复与快照续跑实验

> 结论：安全恢复不是重新执行整个任务，而是在固定 Task Version、Git SHA、Scope、Evidence 和副作用状态后，只修正已确认根因，并从明确执行点幂等续跑。

## 1. 实验定位

本文记录两个真实恢复场景：

1. Ruby 中文编码门禁连续停止后的最小修正恢复；
2. `07_工作流与项目治理` 完整冻结包在 35 路径未暂存工作区上的 Continuation。

这些是流程级实验，不表示统一 Health & Recovery 服务已经实现。

## 2. 场景一：Ruby 编码停止与恢复

Batch 05 在 Registry 校验阶段因 Ruby 编码环境停止。每次停止都保留：

- 固定 Git SHA；
- 31 文件工作区；
- 暂存数量 0；
- 未创建 Commit；
- 已完成门禁；
- 原始错误；
- 下一次允许的最小修正。

第一次只设置 `RUBYOPT=-EUTF-8:UTF-8`，证明 I/O 编码改变，但 `ruby -e` 源码中的中文仍在解析前失败。

第二次把中文路径通过 Shell 环境变量传入，Ruby 源码保持 ASCII，并对 JSON / YAML 显式 UTF-8 读取。门禁随后通过，任务从原工作区继续，没有重新解压、复制或修改交付正文。

## 3. 场景二：35 路径冻结包续跑

`07` v2 在错误的历史旧路径门禁停止后，工作区已经包含正确的：

- 23 个 Overlay 目标；
- 12 个已删除旧文件；
- 35 / 35 Git Scope；
- Index 为空；
- Extra / Missing 为 0。

v3 恢复前执行：

1. 验证 Branch、HEAD、Remote 和 ahead / behind；
2. 验证 v3 ZIP Hash 和安全路径；
3. 验证当前 23 个目标与 Overlay 逐字节一致；
4. 验证 12 个 Delete Path 不存在；
5. 验证只有允许的 35 个未暂存路径；
6. 把 16 行旧路径分类为 Migration 历史证据；
7. 从头运行完整校验；
8. 精确暂存、单 Commit、Push 和远端回读。

恢复没有回滚正确工作，也没有重复覆盖冻结内容。

## 4. 被验证的恢复原则

- 停止边界可以保护未提交工作区；
- Checkpoint 必须包含 SHA、范围、已完成门禁和副作用状态；
- 恢复授权只覆盖已确认根因；
- 继续前重新验证输入版本、Overlay 和 Scope；
- 可能已发生的外部副作用必须回读；
- 安全恢复不等于自动重试；
- 辅助检查脚本失败与冻结内容失败必须分类处理。

## 5. Task Snapshot 候选字段

```text
task_id / version
source_commit / remote_commit
workspace and branch
scope / delete paths
index / unstaged / untracked
completed_gates
failed_gate and raw_error
root_cause_status
approval / lease / side_effect refs
execution_point
allowed_next_change
integrity_hash
```

## 6. Cancel、Terminate 与 Resume 边界

- 可到达安全点且任务仍有价值：Pause / Resume；
- 用户不再需要任务：Cancel；
- 风险失控或无法安全继续：Terminate；
- 同一错误可重试：受 Retry Budget 和幂等约束；
- Scope、版本或目标变化：返回 Planner 生成新 Task Version。

## 7. 限制

当前快照仍主要由执行报告、Git 状态和冻结包人工形成；没有：

- 结构化 Task Store；
- 自动 Checkpoint Trigger；
- Lease 撤销服务；
- 通用 Recovery Service；
- 自动 Side-effect Ledger。

## 8. 对平台的影响

该实验为 `WFL-007` 的 Task Control 和 Continuity 提供真实流程证据，也证明完整恢复能力应建立在 Task、Version、Checkpoint、Evidence 和幂等读取之上，而不是建立在聊天会话连续性之上。

## 9. 关联资产

- [WFL-007 任务状态、Checkpoint、移交与恢复](../../07_工作流与项目治理/WFL-007-任务状态Checkpoint移交与恢复/README.md)
- [EXP-008 长上下文、冻结交付与知识综合复盘](../EXP-008-长上下文与知识综合复盘/README.md)
- [KNO-011 上下文运行、流转与恢复](../../05_上下文与知识系统/KNO-011-上下文运行流转与恢复机制/README.md)
