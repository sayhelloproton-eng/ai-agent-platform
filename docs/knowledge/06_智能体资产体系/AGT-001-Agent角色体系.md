# AGT-001 Agent角色体系

## 1. 文档定位

本文定义 `ai-agent-platform` 的 Agent 角色体系。角色描述责任、判断标准和交付物；模型、Codex、Work、Runtime 或脚本属于执行器，两者不能混为一谈。

## 2. 角色分层

角色分为治理角色、专业角色、执行角色和监督角色。治理角色决定目标、优先级和授权；专业角色完成产品、架构、调研、工作流、知识等判断；执行角色在受控范围内调用工具；监督角色负责 Review、评估、健康和风险升级。

## 3. 角色合同

每个角色至少定义：role_id、mission、responsibilities、inputs、outputs、decision_rights、forbidden_actions、skill_refs、knowledge_refs、tool_refs、approval_policy 和 evaluation。角色不保存当前 Task 状态或 Secret。

## 4. 职责分离

提案者、批准者、执行者和验收者在高风险任务中应分离。小型低风险任务可以合并角色，但必须在 Task Contract 中明确，不能隐式让执行器自行扩大决策权。

## 5. 角色选择

Task Control 根据任务类型、风险、能力和验收方式选择角色。没有合适角色时进入人工规划，不通过创建含糊的“通用超级 Agent”规避边界设计。

## 6. 当前实现边界

当前 Chat 承担大脑、规划与复审，Codex / DeepSeek 承担本地执行，Project Owner 保留最终授权。这些分工已在实践中使用，但尚未物化为 Agent Profile。

## 7. 目标设计边界

目标建立可注册的角色目录和 Profile Schema，由 Task Contract 绑定角色、执行器与权限；同一角色可更换执行器而不丢失职责和验收标准。

## 8. 设计原则

- 角色与执行器分离。
- 决策权、工具权和验收权显式化。
- 一个角色只承担可解释的一组责任。
- 高风险任务优先职责分离。
- 没有证据时不自动增加自治等级。

## 9. 关联文档

- [THY-003 Agent + Skills 开发范式](../03_架构思想与理论/THY-003-Agent与Skills开发范式.md)
- [ARC-008 ai-agent-platform-DDD领域蓝图](../04_平台架构/ARC-008-ai-agent-platform-DDD领域蓝图.md)
- [ARC-012 Agent-Profile与Skills资产化](../04_平台架构/ARC-012-Agent-Profile与Skills资产化.md)
- [ARC-013 审批证据与副作用账本](../04_平台架构/ARC-013-审批证据与副作用账本.md)
- [AGT-002 Agent-Profile设计规范](AGT-002-Agent-Profile设计规范.md)
- [AGT-006 多Agent协作角色模型](AGT-006-多Agent协作角色模型.md)
