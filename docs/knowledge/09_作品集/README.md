# 作品集

> 核心结论：作品集不是新的事实源，而是从代码、架构、工作流、实验、测试、Registry 和 Commit 中派生的证据视图；任何对外声明都必须能回到真实资产，并明确“已实现、已验证、已接受设计和计划中”的差别。

## 1. 本章定位

`09_作品集` 负责把 `ai-agent-platform` 的真实工程成果组织为可用于 README、展示页、简历和面试的叙事与证据索引。

本章不拥有：

- 产品、架构或项目状态；
- 代码和测试结果；
- Experiment 结论；
- Registry 生命周期；
- Portfolio Release 状态。

它只消费稳定资产，不允许为了展示效果修改事实。

## 2. 证据来源

```text
Product and Architecture
  + Context and Knowledge
  + Agent and Workflow
  + Code and Tests
  + Experiments and Retrospectives
  + Registry / Release / Commit
        ↓
Portfolio Claim
        ↓
Demo / README / Resume / Interview
```

证据优先级：

1. 可运行代码、测试和真实回读；
2. 固定 Commit、Registry 和正式实验；
3. 已接受架构与工作流；
4. 执行报告和人工说明；
5. 计划和假设。

低优先级材料不能覆盖高优先级事实。

## 3. 声明等级

| 等级 | 可使用表述 | 禁止表述 |
|---|---|---|
| Verified | 已通过真实调用、测试或回读验证 | 直接扩展为生产级或规模化经验 |
| Implemented | 已有代码、Contract 和测试 | 隐藏仍缺少的持久化、运营或自动化 |
| Accepted Design | 已完成架构和边界设计 | 写成“平台已经支持” |
| Planned | 已进入 Roadmap 或产品计划 | 写成 Demo、成果或已掌握生产能力 |

## 4. 阅读路径

### 招聘者快速阅读

`PRT-001 → PRT-003 → PRT-004`

### 技术面试深入阅读

`PRT-003 → PRT-005 → PRT-006`

### Demo 和发布准备

`PRT-002 → PRT-006 → 08_实验与复盘`

## 5. Canonical 资产

| ID | 文档 | 作用 |
|---|---|---|
| `PRT-001` | [ai-agent-platform 项目故事与价值主线](./PRT-001-ai-agent-platform项目故事/README.md) | 用问题、判断、建设和结果解释项目为什么存在 |
| `PRT-002` | [可演示纵向切片与 Portfolio Release 路线图](./PRT-002-Demo路线图/README.md) | 区分当前可演示证据、下一 Demo 和正式发布门槛 |
| `PRT-003` | [核心架构判断与可信边界](./PRT-003-核心架构亮点/README.md) | 展示关键架构取舍及每项能力的真实边界 |
| `PRT-004` | [工程能力与证据映射](./PRT-004-工程能力证明/README.md) | 把项目成果映射到可验证工程能力 |
| `PRT-005` | [关键问题、失败与架构收敛](./PRT-005-关键问题与解决过程/README.md) | 用真实失败说明问题分析、决策和恢复能力 |
| `PRT-006` | [项目成果与证据索引](./PRT-006-项目成果索引/README.md) | 提供代码、测试、实验、文档和未完成项导航 |

## 6. 当前发布边界

当前 Portfolio Source 已经包含可使用的项目故事、架构判断、工程能力和证据索引；正式对外 `Portfolio Release` 仍是独立阶段，至少需要：

- 最终知识内容和链接验收；
- Git → Feishu 覆盖发布与回读；
- 至少一个稳定可运行 Demo 入口；
- 代码、测试和真实调用证据；
- 失败案例和安全治理说明；
- 展示页、简历和面试材料；
- Release Tag；
- 敏感信息和公开仓库检查。

正式 Release 未完成，不影响内部使用这些 Canonical 作品集源文档，但不得对外声称已发布完整产品。

## 7. 维护规则

- 作品集声明只引用真实资产，不复制机器状态。
- 当前能力与目标设计必须并列说明。
- 失败和未完成项是可信度的一部分，不隐藏。
- Provider、模型品牌和临时工具不作为长期能力本身。
- 当代码、实验、Registry 或正式决策变化时，作品集同步降级、更新或删除声明。
- 本目录保持 `unpublished`，直到独立 Portfolio Release 和 Feishu 发布授权完成。
