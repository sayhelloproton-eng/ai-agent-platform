# 上下文与知识系统

## 目录职责

维护知识资产架构、单一真源与投影、AGENTS、上下文分层、Context 所有权、Token 与证据、Custom GPT Knowledge、Knowledge Pack、Registry、影响分析、会话综合和工程洞见。

## 正式资产

| ID | 主题 |
|---|---|
| ARC-002 | 智能体平台知识资产架构 |
| ARC-005 | 单一真源与知识投影架构 |
| ARC-006 | 项目知识分层与 Agent 上下文架构 |
| KNO-001～KNO-010 | 上下文、知识、Registry、影响分析与综合治理 |
| KNO-011 | Context 所有权、Planner 维护权、Executor 完整覆盖与用户 Review 机制 |
| INS-001 | 工程洞见方法与实践 |

跨平台发布工程方案 `SOL-004` 已迁入 `docs/technical/技术方案/知识系统/`，不属于飞书知识正文。

## 维护规则

- Git 是唯一真源；
- Knowledge Pack、Feishu 和 Host 配置是派生发布；
- Memory、Context、Knowledge 和 Task State 分概念；
- `context/**` 由总控 Planner 维护语义，其他 Agent 只报告，Executor 只按完整覆盖文件执行；
- 重要 Context 变化由用户最终确认；
- Private Context 进入 Public Git 前必须最小化和 Review；
- 机器状态只在 Platform Registry 维护；
- 本目录内容在正式发布前保持 `unpublished`。
