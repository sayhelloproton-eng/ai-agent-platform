# EXP-004 工程洞见提炼 Skill 首轮评测

## 目标

验证 `engineering-insight-distillation` 是否能把普通问题总结提升为可追踪、可执行、可持续演进的工程洞见。

## 方法

参考 Skill Creator 的核心循环：

```text
Skill 草案
  → 真实测试案例
  → 无 Skill / 有 Skill 同题结果
  → 固定 Rubric
  → 负例和证据不足例
  → 修改 Skill
  → 回归测试
```

首轮选择 7 个真实案例：5 个高价值工程事件、1 个证据不足故障和 1 个低价值一次性错误。评分包括证据纪律、抽象质量、适用边界、可执行性、可追踪性、成熟度治理、查重演进和处置正确性。

## 结果

```text
无 Skill 基线平均：5.7 / 16
使用 Skill 平均：14.7 / 16
平均提升：9.0
Schema 校验：7 / 7
```

Skill 正确输出 5 个 `insight_proposed`、1 个 `needs_evidence` 和 1 个 `reject`。

## 主要价值

Skill 不只是生成更完整的文字，而是稳定做到：不伪造根因、不强迫所有事件形成洞见、不把一次事件写成定律、明确适用边界、生成可执行检查项、保留来源和修订历史、无索引时不声称唯一、不过度提升成熟度。

## Screening 优化

完整 Full 输出成本过高，因此后续版本增加 Screening。7 个案例中 5 个 `proceed_full`、1 个 `needs_evidence`、1 个 `reject`，处置全部符合预期，字符量约为 Full 的 16.7%。

## 局限

尚未完成真实 Agent Skills 客户端自动触发、独立 Comparator 盲评、多次采样方差分析和跨项目重复验证。因此初始洞见保持 `candidate` 或 `provisional`。

## 产出

- Skill `0.2.0`
- Engineering Insight Registry `1.0.0`
- 一篇合并工程判断、模式、反模式、启发式、检查清单和演进规则的综合文档
- 五条初始工程洞见
- Trigger、Rubric、Pilot 和离线 Eval Harness
