# AGT-005 Agent-Skill设计与治理

## 1. 文档定位

本文定义 Agent Skill 的设计、选择、评估、版本和治理。Skill 是可复用工作方法与资源包，不是角色、工具、知识正文或单次 Task。

## 2. Skill 构成

Skill 至少描述触发条件、非触发条件、输入、输出、流程、停止条件、安全边界、错误处理、依赖、Schema、测试和版本。复杂方法可以附带 references、scripts、templates 和 fixtures。

## 3. 选择规则

Agent 根据 Task 意图和输入资格选择 Skill。多个 Skill 同时匹配时，优先使用更具体、权限更小、证据更充分的方案；不存在匹配项时返回普通规划，而不是强行套用。

## 4. 生命周期与评估

```text
draft → pilot → released → revised → deprecated
```

发布前验证触发准确率、流程完整性、边界遵守、输出 Contract、失败停止和 Token 成本。版本变化必须记录兼容性。

## 5. Registry 与发布

Git `skills/` 保存运行时真源；知识正文解释设计；Registry 关联 Agent、Workflow、Eval 和 Release。Host Skill 或 Plugin 是发布目标，不反向覆盖 Git。

## 6. 当前实现边界

当前已有四个正式 Skill，其中 AI Knowledge 与 Engineering Insight 具有测试和真实使用证据；尚无统一 Skill Registry 查询、Profile 自动绑定或跨 Host Publisher。

## 7. 目标设计边界

目标先为现有 Skill 建立统一元数据与 Eval 引用，再由 Agent Profile 显式选择。新 Skill 只有在重复任务证明可复用后创建。

## 8. 设计原则

- Skill 解决重复工作方法，不替代领域决策。
- 触发和非触发条件同等重要。
- 程序性检查由脚本完成。
- Skill 版本与 Eval 证据绑定。
- Host 安装目录不是项目真源。

## 9. 关联文档

- [THY-003 Agent + Skills 开发范式](../03_架构思想与理论/THY-003-Agent与Skills开发范式.md)
- [CAP-008 Agent 扩展与治理：AGENTS、Rules、Skills、Hooks、MCP 与 Plugins](../02_基础产品与能力/CAP-008-Agent扩展与治理-AGENTSRulesSkillsHooksMCP与Plugins.md)
- [ARC-012 Agent-Profile与Skills资产化](../04_平台架构/ARC-012-Agent-Profile与Skills资产化.md)
- [KNO-010 工程洞见提炼与注册表治理](../05_上下文与知识系统/KNO-010-工程洞见提炼与注册表治理.md)
- [SKL-001 AI Knowledge Skill](../Agent与能力/Skill设计/SKL-001-AI知识技能.md)
- [SKL-002 Engineering Insight Distillation Skill](../Agent与能力/Skill设计/SKL-002-工程洞见提炼技能.md)
- [AGT-007 Agent评估测试与发布](AGT-007-Agent评估测试与发布.md)
