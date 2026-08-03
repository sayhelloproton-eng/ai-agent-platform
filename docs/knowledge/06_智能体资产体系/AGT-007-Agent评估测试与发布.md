# AGT-007 Agent评估测试与发布

## 1. 文档定位

本文定义 Agent、Profile 和 Skill 从离线测试到受控发布的评估体系。发布判断同时关注任务质量、边界遵守、可靠性、成本和可恢复性。

## 2. 评估层级

```text
Schema / Static Check
→ Fixture / Unit Eval
→ Scenario Eval
→ Adversarial / Safety Eval
→ Integration Eval
→ Pilot
→ Production Observation
```

每层解决不同风险，不能用少量成功案例代替完整评估。

## 3. 评价维度

评价目标完成、事实准确、范围遵守、工具选择、权限、停止条件、证据、可恢复性、Token、时延和人工介入率。开放任务保留定性 Rubric，确定任务使用可执行断言。

## 4. 发布门禁

发布记录 Profile 版本、Skill、Knowledge Pack、模型、Tool、Policy、Eval 数据集、结果、已知限制和回滚版本。未通过安全或边界测试时不得仅因平均得分高而发布。

## 5. 回归与退役

Instructions、Knowledge、Tool、模型或 Policy 变化都可能触发回归。重大失败进入 Incident 与 Insight；长期无调用、被替代或风险不可控的 Agent 进入 deprecated / archived。

## 6. 当前实现边界

当前六个正式 Skill 具有自测或验证证据，其中 Handoff v0.4.0 还覆盖严格八类 Artifact 校验、跨 Artifact 一致性、Manifest、Feedback、Executor Switch Checkpoint、Git Operating Policy 和负向测试。Gateway / Runtime 具有完整测试；Agent Profile、端到端 Agent Eval 和发布 Registry 尚未实现。

## 7. 目标设计边界

目标先为首个专业 Agent 建立可重复 Fixture、场景 Rubric、边界测试和发布记录，再逐步扩展真实 Pilot 指标。

## 8. 设计原则

- 评估覆盖成功质量和失败行为。
- 发布绑定完整配置版本。
- 安全门禁不能被平均分抵消。
- 真实 Pilot 与离线 Eval 分开记录。
- 失败必须推动 Profile、Skill 或 Policy 修订。

## 9. 关联文档

- [THY-005 可信 Agent 系统基本原则](../03_Agent工程架构思想与方法论/THY-005-可信Agent系统基本原则/README.md)
- [ARC-013 审批证据与副作用账本](../../technical/归档/历史资产/04_平台架构_整合前观点与后续处理候选/README.md)
- [KNO-010 工程洞见提炼与注册表治理](../05_上下文与知识系统/KNO-009-记忆反馈与知识自迭代机制/README.md)
- [AGT-002 Agent-Profile设计规范](AGT-002-Agent-Profile设计规范.md)
- [AGT-005 Agent-Skill设计与治理](AGT-005-Agent-Skill设计与治理.md)
