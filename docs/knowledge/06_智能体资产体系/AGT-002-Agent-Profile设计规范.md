# AGT-002 Agent-Profile设计规范

## 1. 文档定位

本文定义 Agent Profile 的机器可读与人类可审查规范。Profile 是 Git 中的稳定角色资产，Host 配置只是由它派生的发布物。

## 2. Profile 字段

```text
agent_id
role_id
version
mission
responsibility_scope
input_contract
output_contract
skill_refs
knowledge_pack_refs
capability_refs
tool_refs
approval_policy_ref
evaluation_ref
release_status
```

Profile 不包含对话历史、运行中 Task、访问令牌或环境专属 Secret。

## 3. 组合规则

Profile 通过稳定引用组合 Role、Skill、Knowledge Pack、Tool、Capability、Policy 和 Eval。自然语言说明负责解释，机器字段负责可校验绑定；不得在 Instructions 中维护第二套权限清单。

## 4. 生命周期

```text
draft → review → released → deprecated → archived
```

版本变化记录兼容性、受影响 Host 和迁移方案。职责、权限或输出 Contract 发生破坏性变化时必须发布新版本。

## 5. 发布

Publisher 从固定 Git Commit 生成 Custom GPT、Codex、Plugin 或 Runtime 所需配置，执行格式和大小适配，并记录目标、Hash、Preview、Eval 和回滚信息。

## 6. 当前实现边界

当前 Registry 已规划 Agent 资产，仓库具有 Skills、Knowledge 和治理文档，但尚无 `agents/` 目录、Profile Schema 或 Publisher。

## 7. 目标设计边界

首个真实专业智能体进入配置阶段时创建最小 Schema 和一份 Profile；没有实际 Host 与评估需求前不批量生成空 Profile。

## 8. 设计原则

- Git Profile 是真源，Host 配置是派生物。
- Profile 使用资产引用，不复制正文。
- 权限和审批必须机器可校验。
- 版本发布绑定 Source Commit 与 Eval。
- 没有真实角色需求时不创建占位资产。

## 9. 关联文档

- [ARC-012 Agent-Profile与Skills资产化](../04_平台架构/ARC-012-Agent-Profile与Skills资产化.md)
- [KNO-006 Knowledge-Pack设计](../05_上下文与知识系统/KNO-006-Knowledge-Pack设计.md)
- [KNO-007 平台资产关联模型](../05_上下文与知识系统/KNO-007-平台资产关联模型.md)
- [AGT-001 Agent角色体系](AGT-001-Agent角色体系.md)
- [AGT-003 Agent知识记忆与行为模型](AGT-003-Agent知识记忆与行为模型.md)
- [AGT-007 Agent评估测试与发布](AGT-007-Agent评估测试与发布.md)
