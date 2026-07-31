# Skills

## What

`skills/` 保存可复用的 Agent 能力工程资产。

## Why

Skill 将稳定的领域能力、运行时规则、Schema、示例和测试组织为可独立验证和演进的单元。

## Contains

- [`AGENTS.md`](AGENTS.md)：所有 Skill 共同遵守的工程规则；
- `ai-knowledge/`：知识语义、生命周期与 Feishu Projection；
- `deterministic-delivery/`：冻结 Contract 的校验、落库、Commit、Push 与续跑；
- `custom-gpt-actions/`：Custom GPT Action Schema、Builder 兼容性与适配端点规则；
- `microsoft-dev-tunnels/`：Microsoft Dev Tunnels 本机公网入口运行与安全规则；
- `engineering-insight-distillation/`：筛选并提炼证据支持的工程事件，形成可持续演进的工程判断、模式、反模式、启发式和检查项。

## Boundary

本目录允许 Skill 实现、最小运行说明、契约、示例和测试。

完整架构思想、ADR 和跨 Skill 治理应放入 `docs/`；真实凭据、运行缓存和与 Skill 无关的业务代码不得进入本目录。

## Structure

每个长期 Skill 至少应提供：

- `README.md`：面向人类开发者；
- `SKILL.md`：面向 Agent Runtime；
- Schema、Example 和 Test；
- 必要的 Provider / Adapter 或 References。

## Usage

修改任何 Skill 前，先读取根 `AGENTS.md`、本目录 [`AGENTS.md`](AGENTS.md) 和目标 Skill 自身说明。

## Maintenance

能力、输入输出、安全边界或 Provider 行为变化时，同步更新 README、SKILL、Schema、Example 和测试。

## Related Docs

- [项目宪法](../AGENTS.md)
- [Agent 工作协议](../docs/technical/治理规则/GOV-001-Agent工作协议.md)
- [Git / Feishu 治理](../docs/technical/治理规则/git-feishu-governance.md)
- [文档规范](../docs/technical/治理规则/GOV-002-文档与知识治理规则.md)
