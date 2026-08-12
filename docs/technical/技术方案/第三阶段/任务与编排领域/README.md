# Phase 3｜任务与编排领域（Task & Orchestration Domain）

> 文档状态：**v0.1 DESIGN BASELINE / READY FOR IMPLEMENTATION DETAIL**  
> 日期：2026-08-10  
> 适用项目：`ai-agent-platform` Phase 3  
> 当前源码仓库：`/Users/agent/Desktop/ai-agent-platform`  
> 设计原则：**满足真实需求优先；少实体、少状态机、少服务、少进程；避免为未知未来过度设计。**

---

## 0. 本目录的用途

本目录不是“领域概念介绍”，而是 **Phase 3 任务与编排领域的正式上下文真源与第一版技术方案基线**。

它用于解决两个问题：

1. 后续任何 Chat / Agent / Codex / OpenCode 接手时，不需要重新回顾数小时聊天；
2. 实现人员可以直接从这里得到：领域边界、状态语义、Task / TaskGroup / Node 模型、reopen / wait / pause / fail 行为、Public API 及字段、SQLite 表结构、transaction / version / idempotency、Service 划分、npm 包划分、Git / Markdown / SQLite 存储职责、TODO 与验收门禁。

**若后续实现与本文冲突，应先更新本文并说明原因，不允许实现悄悄改变业务语义。**

---

# 1. Domain｜领域：解决什么问题

任务与编排领域负责所有长期、确定、可恢复的“工作推进事实”。

它回答：

```text
当前有哪些 Task？
Task 是否允许开始？
当前执行到哪个 Node？
哪个角色应该执行当前 Node？
当前 Node 由哪个具体 Worker 承担？
Task 是运行、等待、失败、暂停还是完成？
后续 Node 何时可以进入 READY？
出现问题后应该继续、等待、失败还是 reopen 前序 Node？
大型任务链中哪个 Task 当前允许执行？
任务相关需求 / PRD / 技术方案 / 测试结果应该给当前 Worker 哪些上下文？
```

核心职责：

> **持久化工作事实 + 校验合法推进 + 提供稳定查询。**

它不负责“智能判断下一步应该做什么”，也不负责真实世界副作用。

---

# 2. Phase 3 五领域中的位置

当前 Phase 3 正式领域：

```text
P0-1 任务与编排领域
P0-2 智能体运行与协作领域
P0-3 执行领域
P1-1 模型与推理领域
P1-2 部署领域
```

任务与编排领域是 P0 核心领域之一。

核心边界：

```text
任务与编排
= 工作是什么、做到哪里、是否允许推进

智能体运行与协作
= 哪个 Role / Worker / Custom GPT Conversation 来处理

执行
= Browser / Local / typed capability / controlled Shell 等真实动作做了什么（MCP 仅为 future/non-v1 adapter 例）

模型与推理
= 模型调用、FAST / REASON、Provider、Inference

部署
= 模块如何安装、启动、验证并进入平台
```

特别坚持：

```text
Task Orchestration != Agent Runtime
Task Orchestration != Execution Runtime
Plan != Execution Flow
```

---

# 3. Subdomain｜第一版子问题

第一版只拆 5 类业务问题，不为了 DDD 形式感继续拆细。

## 3.1 Task Lifecycle

负责 Task 创建、可执行性、开始、暂停 / 恢复、等待人工处理、技术失败、完成、终止。

## 3.2 Task Chain / TaskGroup

负责大型系统预先建立一组阶段 Task、顺序关系、`maxActiveTasks = 1` 的第一版约束、TaskGroup 人工 `READY → ACTIVE`、前序 Task 未完成时后序 Task 不可执行，以及当前 Task `WAITING / FAILED / PAUSED` 时停止继续释放后续 Task。

第一版不是通用 Task DAG。

## 3.3 Node Workflow

负责一个 Task 内的有序 Node、Node 角色要求、具体 Worker 绑定、输入 / 输出文档要求、自然向后推进和 `reopenNode` 受控回退。

第一版不是通用图工作流引擎。

## 3.4 Task Documents

负责 Requirement / PRD / Technical Design / Test Plan / Test Result / Release Result 等 Task-scoped Markdown；Node 明确声明 `inputDocuments / outputDocuments`；Worker 按 `taskId + nodeId` 获取该 Node 所需上下文；Git 管正文历史；SQLite 只保存当前文档索引 / 路径 / hash。

## 3.5 Message / Event / Audit

负责 WAITING / FAILED 等需要人关注的待处理消息、Task / Node 状态事件、审计与问题追踪。第一版不引入消息总线，由 SQLite 保存，扩展 / 前端轮询读取。

---

# 4. Bounded Context｜第一版边界

第一版采用一个主要 Bounded Context：

> **Task Orchestration Context**

原因是以下事实需要强一致 transaction：

```text
Task 状态
Node 状态
TaskGroup 状态
Node 当前 Worker
Node runNo
Event
Pending Message
Idempotency Record
```

该 Context 唯一拥有：

```text
TaskGroup
Task
Task Version
Plan Version
Node
Node Version
Node runNo
Node Execution History
Task Document Metadata
Task Message
Task Event
Idempotency Record
```

---

# 5. 明确不拥有

本领域 **MUST NOT** 拥有：

```text
Agent / Role 定义正文
Agent Worker / Conversation Context / Memory / Prompt
Worker Pool / Worker availability
模型 Provider / Inference Route
Browser DOM / Browser lifecycle
Local filesystem capability 语义
Shell command 执行
Execution Delivery / Receipt
Approval 授权规则
真实 Tool 副作用
产品源码内部结构
```

本领域只保存跨域 opaque refs：

```text
requiredRoleRef
workerRef
actorRef
relatedRef
```

不解析对方内部格式。

---

# 6. 第一版最重要的收敛决策

第一版明确 **不做**：

```text
WorkItem
Claim
Lease
Worker reassignment
一个 Node 多 Worker 并行
并行 Node
通用 Workflow DAG
通用 Edge / Condition Engine
通用循环引擎
自动无限回环
每个 Node 的审批门
Completion Rule Engine
Redis / Kafka / BullMQ
Temporal / DBOS
XState
ORM
独立 Event Store
多 Task daemon
```

原因：

> 当前真实需求可以由 Task + Node + Worker + reopen + Markdown + SQLite 完成。

---

# 7. 第一版角色输入

当前平台第一版只有 3 个复合角色：

```text
1. 运营 + 产品经理
2. 总控 = 项目管理 + 研发
3. 测试 + 运维
```

Task Domain 不拥有这些 Role / Worker 的身份定义；Task 只保存 opaque `requiredRoleRef/workerRef`，并唯一拥有 TaskRoleBinding。Execution Browser 真实 CREATE/RESTORE Conversation，Agent 校验 Worker identity，Task 通过 `bindTaskWorker` 固化 TaskRoleBinding；`startNode` 只从该 binding 自动解析当前 run 的 `workerRef`。

---

# 8. 第一版技术选择

## 8.1 Runtime

```text
Node.js 20.20.1
TypeScript
npm / npm workspaces
```

不为了数据库或框架升级整个 Node major。

## 8.2 Database

```text
SQLite
sqlite3@6.x
原生 SQL
```

第一版不使用 ORM / Query Builder。

建议连接初始化：

```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
```

## 8.3 Contract Validation

```text
JSON Schema + Ajv
```

## 8.4 HTTP / Adapter

优先复用现有 Gateway / Node HTTP 运行形态。

> 领域独立 ≠ 必须独立进程。

## 8.5 Task Document

```text
Markdown + Git
```

Git 负责正文历史，SQLite 负责结构化运行事实和当前文档引用。

## 8.6 Queue / Workflow Engine

第一版没有 Queue 和 Workflow Engine。任务推进发生在明确 Public API 调用 + SQLite transaction 中。

---

# 9. 第一版核心对象关系

```text
TaskGroup / TaskChain
        │
        └── Task
             │
             ├── ordered Node 1
             ├── ordered Node 2
             ├── ordered Node 3
             │
             ├── Node Execution History
             ├── Task Documents → Markdown / Git
             ├── Task Messages
             └── Task Events
```

Node 直接绑定具体 Worker：

```text
Node
├── requiredRoleRef
├── workerRef
├── status
├── runNo
└── version
```

第一版没有 `Node → WorkItem → Claim → Worker`。

---

# 10. 文档索引

| 文件 | 用途 |
|---|---|
| `01-领域模型与状态语义.md` | TaskGroup / Task / Node / Document / Message 核心语义 |
| `02-关键流程与状态转换.md` | start / pause / wait / fail / reopen / complete 等流程 |
| `03-Public-API-契约.md` | 第一版完整 Public API、出入参、字段释义 |
| `04-数据模型与SQLite-DDL.md` | 8 张业务表 + migration 表 + 索引 + DDL |
| `05-事务-版本-幂等与恢复.md` | transaction / expectedVersion / idempotency / 文档恢复 |
| `06-Service与npm模块设计.md` | 3 个逻辑 Service、3 个 npm 包、Provides / Requires |
| `07-存储-Git与任务文档.md` | `.ai-agent-platform`、Markdown、Git、SQLite、CodeGraph 边界 |
| `08-TODO-实施顺序与验收门禁.md` | P0 实施顺序、测试、Stop/Go |
| `09-设计决策记录与明确非目标.md` | 已确认、已撤回、未来触发条件 |
| `10-技术选型调研与取舍.md` | 开源候选、Mac/Node 约束、选型原因与未来触发器 |
| `11-上下文继承与跨领域边界.md` | Phase 2 语义、Custom GPT/Worker 载体、扩展/总控/执行边界 |
| `API-依赖-模块清单.md` | 快速总览 |

---

# 11. 当前状态

```text
Domain semantics            BASELINE READY
TaskGroup semantics         BASELINE READY
Task lifecycle              BASELINE READY
Node lifecycle              BASELINE READY
reopen semantics            BASELINE READY
Task Document               BASELINE READY
Public API draft            BASELINE READY
SQLite schema               BASELINE READY
transaction/version/idemp   BASELINE READY
Service boundary            BASELINE READY
npm package boundary        BASELINE READY
repository workspace rule   BASELINE READY

Implementation              NOT STARTED / TO BE PLANNED
Production Ready            NO
```

---

# 12. 下一步

本文之后不应继续重新发散领域模型。

下一轮应进入：

```text
1. 将本文档落入 Phase 3 正式目录
2. 对当前仓库 package / package.json 做实现前审计
3. 创建 3 个 npm 包骨架
4. 实现 migration runner
5. 实现 task-store-sqlite
6. 实现 task-orchestration domain/service
7. Contract tests
8. SQLite transaction / crash / idempotency tests
9. Gateway / Browser Extension 最小接线
10. 用平台自身 Phase 3 Task 做真实 dogfooding
```
