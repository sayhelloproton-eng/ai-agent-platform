# ai-agent-platform 平台架构

> **本章定义**：`04_平台架构` 是整个项目知识体系的结构中心。前面章节提供产品目标、生态能力、Agent 工程理论、DDD 与可信系统原则；本章把这些原则落成可执行的平台边界和演进路径；后面章节再对 Context、Agent、Workflow、实验和 Portfolio 进行专题深化。

## Canonical 资产

| ID | 文档 | 唯一所有权 |
|---|---|---|
| `ARC-001` | [ai-agent-platform 总体架构与执行路径](ARC-001-ai-agent-platform总体架构/README.md) | System Context、DDD Bounded Context、模块责任、运行闭环、数据状态证据流、Adapter / Deployment、实现映射与正式占位 |
| `ARC-016` | [能力依赖、多任务并行与分阶段 MVP 路线图](ARC-016-能力依赖多任务并行与分阶段MVP路线图/README.md) | 当前证据、MVP-0～MVP-7、强依赖、可并行建设轨道、多任务不变量、阶段门、风险与最近落点 |

## 文档体系关系

```text
00 项目入口 / 01 产品体系 / 02 基础产品与能力 / 03 Agent 工程思想与方法论
                                  ↓
04 平台架构
├── ARC-001：结构、领域、运行、部署与信任视图
└── ARC-016：依赖、证据、并行和演进视图
                                  ↓
05 Context 与 Knowledge   06 Agent 资产   07 Workflow 与 Governance
08 Experiment Evidence    09 Portfolio
```

后续文档是 ARC 的重要补充：它们展开具体 Schema、流程、治理和实验，但不能改变 ARC 已确定的状态所有权、核心不变量和 Adapter 边界；需要改变时必须先回到 ARC Review。

## 旧资产处理

旧 `ARC-007～015`、`ARC-017～018` 与 `DOM-001` 的核心观点已按以下方式处理：

- DDD、Task Control、Execution Lane、Agent Profile、Approval / Evidence、Recovery 和多执行器位置已进入 ARC-001；
- 能力依赖、多角色、多任务、Worktree、阶段门和执行器扩展已进入 ARC-016；
- 详细 Schema、状态机、流程和产品治理由 05～09 后续专题承接；
- 旧文章和视觉资产保存在[平台架构整合前观点与后续处理候选](../../technical/归档/历史资产/04_平台架构_整合前观点与后续处理候选/README.md)，用于来源追踪和未来恢复，不再作为 Canonical 架构。

## 维护规则

- 平台架构必须同时包含结构视图和运行视图，不能退化为工具清单；
- DDD 边界由状态和规则所有权决定，不按 Host、模型或 Agent 名称切分；
- 当前实现、部分实现、目标设计、阶段计划和正式占位必须分开；
- 低优先级能力可以不展开，但不能在 Canonical 架构中消失；
- 复杂图使用确定性正式图片资产，并紧跟 AI 可读语义镜像；
- 任何实现状态、路径和关系变化同步更新 Context、Registry、Migration 和证据；
- 本目录保持 `unpublished`，直到独立授权 Git→Feishu 覆盖发布并完成回读。
