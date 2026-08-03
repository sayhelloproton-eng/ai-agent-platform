# 上下文与知识系统

## 目录职责

本目录描述 `ai-agent-platform` 如何把长期可信知识、项目 Context、Task State、Role、Runtime、Evidence、Memory 和 Session，按不同消费者与任务阶段编译为可执行 Context Package，并在任务生命周期中受控流转、恢复、分发和迭代。

本目录不是单一“知识库”说明，也不把 Feishu、Custom GPT Knowledge、RAG、Memory 或 Task Store 混为一类。

## Canonical 阅读顺序

| 顺序 | ID | 主题 | 核心问题 |
|---:|---|---|---|
| 1 | ARC-002 | [上下文与知识系统总体架构](./ARC-002-上下文与知识系统总体架构/README.md) | 五领域怎样组成并与平台其他领域协作？ |
| 2 | ARC-005 | [知识资产治理、单一真源与生命周期](./ARC-005-知识资产治理单一真源与生命周期架构/README.md) | 平台怎样维护可信、可追溯、可演进的知识？ |
| 3 | ARC-006 | [多消费者上下文编译与策略](./ARC-006-多消费者上下文编译与策略架构/README.md) | 不同消费者怎样获得最小充分 Context Package？ |
| 4 | KNO-011 | [上下文运行、流转与恢复](./KNO-011-上下文运行流转与恢复机制/README.md) | Context 怎样绑定、版本化、流转、失效和恢复？ |
| 5 | KNO-006 | [知识分发、Knowledge Pack 与多渠道投影](./KNO-006-知识分发Knowledge-Pack与多渠道投影/README.md) | Git 知识怎样派生为 Feishu、GPT Knowledge、Pack 和 RAG？ |
| 6 | KNO-009 | [记忆、反馈与知识自迭代](./KNO-009-记忆反馈与知识自迭代机制/README.md) | 经历和反馈怎样在防污染门禁下转化为可复用能力？ |

## 五个领域

```text
Knowledge Asset Governance
→ Context Compilation & Policy
→ Context Runtime & Continuity

Knowledge Distribution & Projection
Memory, Feedback & Learning
```

前三个领域构成可信知识、上下文编译和运行连续性的核心；后两个领域负责多渠道交付和受控自迭代。

## 外部协作领域

本目录通过 Contract 使用但不重新拥有：

- User & Interaction；
- Task Governance；
- Agent & Role；
- Execution Orchestration；
- Evidence & Approval。

## 核心边界

```text
DDD Bounded Context ≠ Runtime Context
Knowledge Base ≠ Context Package
Git Knowledge ≠ Feishu Projection
Git Knowledge ≠ Custom GPT Knowledge
Knowledge Pack ≠ Source of Truth
Memory ≠ Task State
Session ≠ Task
Evidence ≠ Knowledge
AGENTS ≠ Task Prompt
Context Builder ≠ Knowledge Store
```

## 当前实现边界

当前已具备 Git 唯一真源、项目 Context、正式知识与 Registry、六个活跃 Skill、人工 Planner–Executor Handoff、冻结 Artifact、Document Bundle 和 Feishu 单向投影规则。

通用 Context Builder、Context Runtime、持久 Task Store、Knowledge Pack Publisher、Agent Profile Publisher、外部 Knowledge Service / RAG 和自动 Memory 晋升仍属于目标设计。
