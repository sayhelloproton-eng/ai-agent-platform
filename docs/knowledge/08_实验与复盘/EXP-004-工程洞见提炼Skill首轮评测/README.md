# EXP-004 工程洞见提炼 Skill 首轮评测

> 结论：`engineering-insight-distillation` 的主要价值不是写出更长的总结，而是稳定执行证据门禁、抽象边界、成熟度和处置判断；首轮 7 个案例中，平均评分由 5.7 / 16 提升到 14.7 / 16。

## 1. 实验问题

工程洞见提炼 Skill 是否能把普通问题总结提升为可追踪、可执行、可持续演进的工程洞见，并在证据不足或价值过低时正确拒绝？

## 2. 方法

参考 Skill Creator 的迭代循环：

```text
Skill 草案
  → 真实测试案例
  → 无 Skill / 有 Skill 同题结果
  → 固定 Rubric
  → 负例和证据不足例
  → 修改 Skill
  → 回归测试
```

首轮选择 7 个真实案例：

- 5 个高价值工程事件；
- 1 个证据不足故障；
- 1 个低价值一次性错误。

评分维度包括：

- 证据纪律；
- 抽象质量；
- 适用边界；
- 可执行性；
- 可追踪性；
- 成熟度治理；
- 查重与演进；
- 处置正确性。

## 3. 结果

```text
无 Skill 基线平均：5.7 / 16
使用 Skill 平均：14.7 / 16
平均提升：9.0
Schema 校验：7 / 7
```

处置结果：

- 5 个 `insight_proposed`；
- 1 个 `needs_evidence`；
- 1 个 `reject`。

## 4. Screening 评测

完整 Full 输出成本较高，因此后续版本增加 Screening：

- 5 个 `proceed_full`；
- 1 个 `needs_evidence`；
- 1 个 `reject`；
- 处置全部符合预期；
- 字符量约为 Full 的 16.7%。

Screening 的作用是先判断“值不值得进入完整提炼”，而不是用短输出替代 Full 资产。

## 5. 被验证的能力

Skill 能较稳定地：

- 不伪造根因；
- 不强迫所有事件形成洞见；
- 不把一次事件写成普遍定律；
- 明确适用和不适用边界；
- 生成可执行检查项；
- 保留来源和修订历史；
- 在缺少索引时不声称唯一；
- 不过度提升成熟度。

## 6. 产出

- Skill `0.2.0`；
- Engineering Insight Registry `1.0.0`；
- 综合方法文档；
- 5 条初始工程洞见；
- Trigger、Rubric、Pilot 和离线 Eval Harness。

## 7. 限制

尚未完成：

- 真实 Agent Skills 客户端自动触发；
- 独立 Comparator 盲评；
- 多次采样方差分析；
- 跨项目重复验证。

因此首轮洞见保持 `candidate` 或 `provisional`，不能从 7 个案例外推为生产级稳定性。

## 8. 复现

复现应使用同一案例集、Rubric、Schema 和 Skill 版本，分别保存无 Skill / 有 Skill 输出，并对处置、分数和字符量做程序化比较。

## 9. 关联资产

- [`skills/engineering-insight-distillation/`](../../../../skills/engineering-insight-distillation/)
- [`platform-registry/registries/engineering-insights/`](../../../../platform-registry/registries/engineering-insights/)
- [KNO-009 记忆、反馈与知识自迭代](../../05_上下文与知识系统/KNO-009-记忆反馈与知识自迭代机制/README.md)
