# 正式知识库

## 定位

`docs/knowledge/` 是面向人和 Agent 的正式长期知识，也是 Feishu 唯一发布源。它不保存临时任务状态、完整命令日志或未经 Review 的会话原文。

## 最小阅读入口

新用户：

```text
00_项目与产品/CTX-001 智能体工程探索录
→ 00_项目与产品/CTX-005 当前能力与演进差距
→ 04_平台架构/ARC-001 总体架构与执行路径
```

新 Agent：

```text
根 README
→ 根 AGENTS
→ context/current-status
→ context/roadmap
→ 目标目录 README
→ 目标正文、代码、测试和证据
```

不要默认扫描整个知识库。只有全量审计、目录聚合、影响分析或知识发布任务才扩大范围。

## 知识树

| 目录 | 职责 |
|---|---|
| `00_项目与产品/` | 项目背景、当前状态、决策演进、产品定义、用户价值和产品组合边界 |
| `02_基础产品与能力/` | ChatGPT 生态与配置、组件能力差异、平台核心能力和任务执行闭环 |
| `03_Agent工程架构思想与方法论/` | Agent 工程平台化、复杂度演进、Skills、DDD 边界建模、可信系统和项目方法论 |
| `04_平台架构/` | 平台总体架构、控制面、执行面和能力依赖 |
| `05_上下文与知识系统/` | Context、Memory、Knowledge Pack、Registry 和知识生命周期 |
| `06_智能体资产体系/` | Agent Profile、Skill、权限和发布资产 |
| `07_工作流与项目治理/` | Goal、Task、Handoff、Git 隔离、审批、证据和恢复治理 |
| `08_实验与复盘/` | 真实实验、复盘、Evidence、限制和学习反馈 |
| `09_作品集/` | 从真实代码、实验和正式知识派生的 Portfolio 证据视图 |
| `10_术语与来源/` | 统一语言、来源治理和事实核验入口 |

原 `00_项目入口` 与 `01_产品体系` 已合并为 `00_项目与产品`。保留后续目录编号，避免为连续编号制造大规模无价值路径迁移。

## 按问题导航

| 问题 | 首选入口 |
|---|---|
| 项目是什么、为什么存在 | `00_项目与产品/CTX-001-智能体工程探索录/README.md` |
| 当前真实做到什么 | `context/current-status.md`、`00_项目与产品/CTX-005-当前能力与演进差距.md` |
| 为什么采用当前路线 | `00_项目与产品/DEC-001-架构决策演进摘要.md`、`docs/adr/` |
| 产品如何定义 | `00_项目与产品/PRD-003-ai-agent-platform产品定义与用户价值/README.md` |
| 产品怎样演进 | `00_项目与产品/PRD-005-平台能力地图与产品成熟度/README.md`、`PRD-007` |
| 当前与目标架构如何区分 | `04_平台架构/ARC-001-ai-agent-platform总体架构/README.md` |
| 某个机制怎样实现 | `docs/technical/`、代码和测试 |
| Agent 怎样执行任务 | 根/目录 `AGENTS.md`、对应 Skill |
| 是否可用于求职展示 | `09_作品集/`，并回查代码、实验和 Commit |

## Feishu 阅读结构

飞书是 Git 的阅读投影，不机械复制 Git 目录：

- `CTX-001《智能体工程探索录》` 覆盖知识库根首页；
- 其余 CTX、DEC 和 PRD 页面进入“项目与产品”；
- 其他正式知识目录按栏目投影；
- 目录 README 只用于 Git / Agent 导航，不作为独立正文页面。

## 事实与证据纪律

当前实现事实优先参考：

```text
真实调用与外部回执
→ 测试
→ 代码与配置
→ Registry / Release / Migration
→ Context
→ 正式知识解释
→ 学习笔记与会话推断
```

目标、优先级和治理决策优先参考 Project Owner 最新明确确认、已接受 ADR / 治理规则和 Context。

发现冲突时报告 Drift，不自行选择最方便的版本。

## 维护与发布

- 每个目录 README 负责本目录导航；
- 多文档重复、冲突和落位问题使用 Project Knowledge Synthesis；
- 正式写入必须经过总控 Planner 语义确认和必要的用户 Review；
- Feishu 只接受 Git → Feishu 的逐篇覆盖投影；
- 不读取 Feishu 旧正文做合并或反向同步；
- 资源型文章使用 `文档目录/README.md + assets/`；
- 复杂图使用同目录正式 SVG / PNG，并通过 `./assets/...` 引用；
- 每张图片下方立即提供 `### AI 可读语义镜像`，确保 Human-first、AI-lossless；
- Publisher 在 Feishu 投影时上传本地图片，Feishu 媒体链接不回写 Git。
