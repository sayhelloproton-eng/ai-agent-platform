# Agent 工程架构思想与方法论

## 1. 本栏目到底讲什么

本栏目沉淀的是 **Agent 工程系统的架构思考方式与可复用方法**，不是某一家厂商的产品说明，也不是 `ai-agent-platform` 当前模块清单。

它回答六个连续问题：

1. 为什么“模型 + 工具”还不是可交付的 Agent 系统；
2. 系统复杂度为什么、何时从脚本升级到任务控制与平台；
3. Agent、Skill、Tool、Script、Workflow、Policy 与 Knowledge 怎样分工；
4. 怎样用领域驱动设计（Domain-Driven Design，DDD）建立统一语言、限界上下文和一致性边界；
5. 怎样让 Agent 的意图、身份、权限、状态、执行、证据与恢复形成可信链；
6. 怎样从真实项目事件提炼可复用、可证伪、带适用条件的工程方法。

## 2. 与下一章的边界

| 本栏目：方法论 | `04_平台架构`：具体设计 |
|---|---|
| 解释为什么需要边界 | 给出 `ai-agent-platform` 的实际边界 |
| 给出划分限界上下文的方法 | 当前总体架构由 ARC-001 承接，能力依赖与阶段路线由 ARC-016 承接 |
| 解释聚合、不变量、领域事件 | 给出 Task Control、Execution Lane 等实际模型 |
| 解释端口与适配器 | 给出 Codex、Runtime、Git、Feishu 等适配关系 |
| 给出可信系统原则 | 给出 Approval、Evidence、Recovery 等目标架构 |

因此，THY 文档可以使用项目作为例子，但不应把目标设计伪装成已实现，也不替代 ARC 文档对当前平台结构的所有权。

## 3. 阅读顺序

| 顺序 | 资产 | 核心问题 |
|---:|---|---|
| 1 | [THY-001 从 AI 工具到 Agent 工程平台](./THY-001-从AI工具到Agent工程平台/README.md) | 平台化究竟增加了什么系统责任？ |
| 2 | [THY-002 AI 开发范式演进](./THY-002-AI开发范式演进/README.md) | 什么时候应该升级复杂度？ |
| 3 | [THY-003 Agent 与 Skills 开发范式](./THY-003-Agent与Skills开发范式/README.md) | 动态判断、程序性知识与确定性执行怎样分工？ |
| 4 | [THY-004 DDD 与 Agent 系统边界建模](./THY-004-DDD与Agent系统边界建模/README.md) | 怎样建立统一语言、上下文、聚合和端口？ |
| 5 | [THY-005 可信 Agent 系统基本原则](./THY-005-可信Agent系统基本原则/README.md) | 怎样限制错误、验证结果并安全恢复？ |
| 6 | [THY-006 项目方法论与可复用工程启发](./THY-006-项目方法论与可复用工程启发/README.md) | 怎样把事件变成可复用方法而不是口号？ |

## 4. 事实与状态规则

- **外部理论**：引用第一方或经典原始来源，并记录核验日期；
- **历史底稿**：用于恢复项目最初意图，不自动升级为当前事实；
- **仓库实现**：以代码、测试、Registry 和真实 Commit 为准；
- **接受设计**：必须明确标为目标设计或已接受决策；
- **当前实现**：只能写入已有代码、测试或真实链路证明的内容；
- **图片**：正文与信息地图先冻结；每张图只回答一个明确问题。`VIS-019`～`VIS-027` 已按高密度白皮书风格单独生成、单独 Review，并紧邻 AI 可读语义镜像。

## 5. 本轮来源

本轮综合使用：

- 当前 `THY-001～THY-006` 正文；
- `DOM-001`、`ARC-008～ARC-014` 等历史设计输入，以及当前 Canonical `ARC-001`、`ARC-016` 与 `07_工作流与项目治理` 的 WFL 资产；
- Contracts、Auth、Policy、Action Gateway、Local Runtime 与六个正式 Skill 的代码和测试；
- 2026-07-24 的 v1.0～v1.2 历史架构底稿，用于恢复 `DDD First / API First / Adapter Pattern`、Task / Agent / Capability / Workflow / Result 等初始设计意图；
- Eric Evans 的 DDD Reference、Alistair Cockburn 的 Hexagonal Architecture、OpenAI 的 Agent 工程指南等外部原始来源。

## 6. 当前状态

六篇文档均保留稳定资产 ID，不进行内容聚合；其中 `THY-004` 是本章核心，其他五篇为它提供平台化动机、复杂度判断、资产分工、可信约束和项目实践证据。本章正文与 `VIS-019`～`VIS-027` 已通过人工 Review；正式落库同时更新 Registry、Context、交叉链接与 Skill 生产规则。


## 正式图片

本审阅稿已插入 `VIS-019`～`VIS-027` 共 9 张经用户确认的正式 PNG。图片依据冻结文章信息地图生成，均位于对应 Document Bundle 的 `assets/` 目录，并紧邻 AI 可读语义镜像。
