# AGT-003 Agent知识记忆与行为模型

## 1. 文档定位

本文定义 Agent 的知识、记忆、上下文、任务状态和行为规则如何组合。目标是让 Agent 获得足够信息，同时避免把聊天记忆当成精确项目数据库。

## 2. 信息分层

- Instructions / Behavior Policy：稳定行为和停止条件；
- Knowledge Pack：稳定角色参考；
- External Knowledge：实时共享与权限查询；
- User Memory：低风险长期偏好；
- Context Package：本次任务选中的最小证据；
- Task State：版本、状态、Approval 和 Evidence。

## 3. 行为模型

行为由 Goal、Role、Policy、Available Capability、Context、Risk 和 Feedback 决定。模型输出只能提出 Action；控制面负责检查状态、权限和审批后再执行。

## 4. 上下文装配

先加载项目 Constitution 与当前 Task，再按 Registry 关系选择领域资产、Skill 和证据。每个 Context Package 绑定 Source Commit、选择原因、敏感级别和预算。

## 5. 漂移与遗忘

Agent 必须在任务开始验证版本，在压缩或移交后保留目标、范围、决定、错误和下一步。无法确认信息是否仍有效时标记 Unknown，并从 Git 或外部真源重新读取。

## 6. 当前实现边界

当前项目以 Chat 项目上下文、Git Context、Skill 和人工摘要组合信息；精确 Task State、Context Package 服务和外部 Knowledge Service 尚未实现。

## 7. 目标设计边界

目标由 Profile 选择两层 Knowledge Pack，Task Control 生成最小 Context Package，外部服务提供实时查询；所有写动作仍受 Policy 与 Approval 控制。

## 8. 设计原则

- Knowledge、Memory、Context 与 State 分离。
- 稳定知识绑定 Git Commit。
- 精确任务状态不依赖模型记忆。
- 敏感上下文默认最小化。
- 上下文不足或冲突时停止并补证据。

## 9. 关联文档

- [KNO-002 多级领域上下文架构](../05_上下文与知识系统/KNO-002-多级领域上下文架构.md)
- [KNO-003 上下文Token与证据治理](../05_上下文与知识系统/KNO-003-上下文Token与证据治理.md)
- [KNO-004 Custom-GPT内置知识外部知识与记忆](../05_上下文与知识系统/KNO-004-Custom-GPT内置知识外部知识与记忆.md)
- [KNO-006 Knowledge-Pack设计](../05_上下文与知识系统/KNO-006-Knowledge-Pack设计.md)
- [AGT-002 Agent-Profile设计规范](AGT-002-Agent-Profile设计规范.md)
- [AGT-004 Agent工具权限与审批边界](AGT-004-Agent工具权限与审批边界.md)
