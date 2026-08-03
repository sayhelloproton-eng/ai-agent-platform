# 实验与复盘

> 核心结论：架构和工作流只能说明“准备怎样做”，实验与复盘必须回答“真实发生了什么、证据是否足够、结论能推广到哪里，以及失败如何改变下一次执行”。

## 1. 本章定位

`08_实验与复盘` 是平台的证据与学习层，负责把真实环境中的调用、测试、失败、恢复、替代路线和评测结果整理成可追踪 Evidence，并把可复用经验反馈给架构、工作流、Skill、知识和作品集。

本章不拥有：

- 平台架构和领域状态；
- Task、Approval 或 Release 的运行状态；
- Knowledge、Context 或 Registry 的机器真源；
- Portfolio 的对外叙事；
- 生产能力声明。

它只记录经过观察或验证的事实、方法、限制和影响。

## 2. 与相邻章节的关系

```text
04_平台架构
  提出边界、能力和目标设计
        ↓
07_工作流与项目治理
  定义何时需要 Evidence、怎样消费 Evidence
        ↓
08_实验与复盘
  设计验证、运行实验、保存结果、分析失败和限制
        ↓
05_上下文与知识系统
  接收经过门禁的反馈和知识候选
        ↓
09_作品集
  只消费稳定、可解释、可回查的证据
```

硬边界：

- `07` 决定阶段门需要什么 Evidence；`08` 决定 Evidence 怎样产生、复现和解释。
- `08` 可以验证或挑战架构假设，但不能自行改写 `04` 的正式边界。
- 复盘可以提出知识候选，是否晋升由 `05` 的知识治理决定。
- `09` 可以压缩和组织 Evidence，但不能改变实验结论、隐藏限制或把目标设计包装为已实现。

## 3. 两类正式资产

| 类型 | 目的 | 必须包含 |
|---|---|---|
| Experiment | 在明确问题、环境和方法下验证假设或能力 | 问题、假设、环境、方法、观察、结果、限制、复现、影响 |
| Retrospective | 从真实阶段、事故、替代路线或恢复过程提炼决策经验 | 背景、时间线、事实、根因、决定、效果、限制、后续变化 |

复盘不是受控实验，不能使用“已证明”替代真实证据；实验也不能只写成功结论而省略环境、失败和适用边界。

## 4. 证据链

```text
Question / Incident
  → Hypothesis or Review Scope
  → Environment and Source Version
  → Method and Guardrails
  → Raw Observation
  → Result
  → Limitation and Confidence
  → Decision Impact
  → Reproduction or Audit Path
  → Knowledge / Workflow / Portfolio Feedback
```

最低要求：

- 固定时间、版本、Commit、工具或外部资源；
- 区分观察、推断、决定和计划；
- 保存失败结果和部分成功；
- 给出可复现步骤或明确说明不可复现部分；
- 结论不得超出实验对象；
- 执行摘要不能替代真实文件、测试、日志和回读。

## 5. Canonical 资产

### 5.1 外部知识与知识系统

| ID | 文档 | 作用 |
|---|---|---|
| `EXP-001` | [公开飞书知识库读取与权限边界实验](./EXP-001-公开飞书知识库读取实验/README.md) | 验证公开页面、身份访问和 OpenAPI 权限边界 |
| `EXP-002` | [飞书异构知识节点递归导出与完整性实验](./EXP-002-公开飞书知识库递归导出实验/README.md) | 验证递归枚举、对象路由、失败占位和完整性报告 |
| `EXP-003` | [知识系统初始化与单一真源收敛复盘](./EXP-003-知识系统初始化阶段复盘/README.md) | 复盘从双源设想收敛到 Git 单一真源和派生投影 |

### 5.2 Skill 与可信执行链

| ID | 文档 | 作用 |
|---|---|---|
| `EXP-004` | [工程洞见提炼 Skill 首轮评测](./EXP-004-工程洞见提炼Skill首轮评测/README.md) | 比较无 Skill / 有 Skill 的证据纪律和工程抽象质量 |
| `EXP-005` | [Custom GPT Actions 最小可信执行链实验](./EXP-005-Custom-GPT-Actions链路实验/README.md) | 验证 Custom GPT 到本机窄 Capability 的真实调用 |
| `EXP-006` | [Gateway、Local Runtime 与 Dev Tunnels 安全链路实验](./EXP-006-Gateway-Local-Runtime与Dev-Tunnels实验/README.md) | 验证组件职责、Loopback、双层 Policy 和开发公网入口 |

### 5.3 路线替代、确定性交付与恢复

| ID | 文档 | 作用 |
|---|---|---|
| `EXP-007` | [Cloudflare 到 Dev Tunnels 路线替代复盘](./EXP-007-Cloudflare路线替代复盘/README.md) | 记录为什么替换开发期公网入口及哪些边界继续保留 |
| `EXP-008` | [长上下文、冻结交付与知识综合复盘](./EXP-008-长上下文与知识综合复盘/README.md) | 复盘任务书漂移、完整 Scope、历史引用分类和冻结包治理 |
| `EXP-009` | [任务中断、健康恢复与快照续跑实验](./EXP-009-健康恢复与任务快照实验/README.md) | 验证安全停止、Checkpoint、最小修正和脏工作区续跑 |

## 6. 证据成熟度

本章沿用 Registry 的 Evidence Level：

- `hypothesis`：尚未形成足够真实运行证据；
- `observed`：在明确环境中观察到结果，但复现范围或样本有限；
- `verified`：有重复检查、机器校验或多来源回读支持。

Evidence Level 只描述证据强度，不等于产品成熟度或生产级能力。

## 7. 维护规则

- 每篇正文采用 Document Bundle；需要图片时与正文共置，并紧邻 AI 可读语义镜像。
- 实验必须保存失败、限制和非目标，不只保存成功路径。
- 复盘必须推动 Decision、Workflow、Skill、Check 或知识候选中的至少一种变化。
- 历史路径、旧方案和 Superseded 事实可以保留在 Migration / Archive，不得被误判为活跃依赖。
- 实验结果变化时同步 Registry 关系和作品集声明。
- 本目录保持 `unpublished`，直到独立授权 Git → Feishu 覆盖发布并完成回读。
