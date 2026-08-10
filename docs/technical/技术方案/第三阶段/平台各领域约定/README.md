# Phase 3｜平台各领域约定

> 状态：BASELINE v0.1 / EVOLVABLE  
> 日期：2026-08-10  
> 适用范围：Phase 3 五个正式领域及其 Public Contract、Module、Package、Application / Adapter 集成  
> 性质：平台级横切约定，不是独立领域，不拥有业务状态、Runtime、数据库或业务 API

---

# 1. 为什么需要这组约定

Phase 3 已收敛为五个正式领域：

```text
任务与编排领域
智能体运行与协作领域
执行领域
模型与推理领域
部署领域
```

五个领域必须可以独立演进，同时又必须稳定协作。

如果每个领域分别定义：

```text
ID / Ref
Version
Error
Event
Result
API
Package
Public / Internal
测试层级
变更方式
```

平台很快会出现多套互不兼容的“局部标准”，最终在跨域串联、拆 npm package、升级 Contract、构建前后台或部署时集中返工。

因此建立：

> **平台各领域约定**

它只负责统一跨领域共同语法、依赖边界和变更规则。

它不负责定义任何业务领域自己的：

```text
TaskStatus
AgentRole
ExecutionStatus
InferenceRoute
DeploymentStatus
业务状态机
业务错误码
业务事件类型
领域内部数据模型
```

核心原则：

> **平台统一共同语法；领域拥有业务语义。**

---

# 2. 本目录不是“平台治理领域”

本目录没有：

```text
Domain
Subdomain
Bounded Context
Module Registry
Runtime
Database
Service
Business State
```

它是一组扁平、可执行、可增量演进的横切规则。

目录刻意保持单层：

```text
平台各领域约定/
├── README.md
├── 01-领域边界与依赖约定.md
├── 02-公共契约与数据约定.md
├── 03-API与事件约定.md
├── 04-版本与兼容性约定.md
├── 05-包模块与代码边界约定.md
├── 06-测试与验收约定.md
└── 07-约定变更机制.md
```

原则：

> 能归入现有七类约定的内容，不新增文档类别。

---

# 3. 约定等级

本文统一使用：

| 关键词 | 含义 |
|---|---|
| `MUST` / 必须 | 违反即视为平台约定不兼容 |
| `MUST NOT` / 禁止 | 不允许出现 |
| `SHOULD` / 应该 | 默认遵循；偏离必须说明原因 |
| `SHOULD NOT` / 不应该 | 默认禁止；偏离必须说明原因 |
| `MAY` / 可以 | 可选能力 |

若领域文档与平台各领域约定冲突：

```text
平台各领域约定
    >
单一领域的局部工程约定
```

但平台各领域约定不得越权定义领域业务语义。

---

# 4. 五个领域的事实所有权

当前事实真源原则：

| 领域 | 唯一拥有的主要事实 |
|---|---|
| 任务与编排 | Task / Plan / Node / WorkItem / Claim / Business Wait / Workflow Progress |
| 智能体运行与协作 | Agent / Role / Agent Run / Session / Context / Memory / Agent Message / Delegation / Handoff |
| 执行 | Execution / Attempt / Dispatch / Delivery / Result / Receipt / Workspace / Sandbox / Execution Admission |
| 模型与推理 | Model / Provider / Inference Request / Inference Result / Route / Provider Health |
| 部署 | Module Installation / Configuration / Runtime Status / Installed Version / Verification Record / Manifest |

规则：

> 一个事实只能有一个业务 Owner。

其他领域可以保存：

```text
Ref
Snapshot
Read Model
Derived Projection
```

但不得成为第二事实真源。

---

# 5. 跨领域协作原则

所有跨领域协作遵循：

```text
Provides
    ↕
Public Contract
    ↕
Requires
```

允许的主要协作形式：

```text
Public API
Public Port
Versioned Contract
Domain Event
Result / Receipt Ref
Application Layer Orchestration
```

禁止：

```text
跨域直接查询数据库
跨域修改私有存储
跨域 import internal/**
依赖另一个领域的实现类
复制对方状态机后自行推导真相
```

---

# 6. Application / Adapter / UI 边界

以下不是领域：

```text
Gateway
BFF
Management Backend
前台
后台
CLI
ChatGPT Adapter
AG-UI Adapter
MCP Adapter
A2A Adapter
Browser Adapter
Local Adapter
```

Application / Adapter 可以组合多个领域的 Public API，但：

> **不能成为领域业务事实真源。**

后台跨域查询可以使用：

```text
BFF
Query Layer
Read Model
Projection
```

但写操作必须回到真实 Owner 的 Public API。

---

# 7. 当前约定状态

| 约定 | 版本 | 状态 | 说明 |
|---|---:|---|---|
| 领域边界与依赖 | v0.1 | BASELINE | 立即适用 |
| 公共契约与数据 | v0.1 | BASELINE | 立即适用；业务字段由领域定义 |
| API 与事件 | v0.1 | BASELINE | 立即适用 |
| 版本与兼容性 | v0.1 | BASELINE | 立即适用 |
| 包模块与代码边界 | v0.1 | BASELINE | npm 最终 scope 暂不冻结 |
| 测试与验收 | v0.1 | BASELINE | 立即适用 |
| 约定变更机制 | v0.1 | BASELINE | 立即适用 |

`BASELINE` 表示：

> 后续领域设计默认以此为起点；若发现真实公共需求不满足，通过 `07-约定变更机制.md` 修改，而不是由某个领域私自创建第二套规则。

---

# 8. v0.1 设计原则

v0.1 优先冻结高返工成本原则：

```text
领域所有权
Public / Internal
Provides / Requires
跨域引用
Contract Version
兼容性
API / Event 边界
幂等
并发版本
Error / Result
依赖方向
Contract Test
变更治理
```

暂不提前冻结低收益细节：

```text
最终 npm scope
统一代码格式细节
完整 ESLint rule
统一 tsconfig 全量参数
统一 Shared Kernel package
所有领域枚举
所有领域 Endpoint
所有领域 Event Type
```

原则：

> **先冻结跨域语义和边界，不提前冻结领域内部实现。**

---

# 9. 每个领域设计时必须同步回答

每个正式领域至少要维护：

```text
Domain / Scope
Subdomain
Bounded Context
真实 Module / Service

State Ownership

Provides
Requires

Public Contract
Public Event

明确不属于本领域的内容

Module Registry
Status / TODO
```

领域设计过程中若出现公共问题：

```text
只影响一个领域
→ 领域自己决定

影响两个及以上领域的共同交互
→ 进入平台各领域约定

改变既有跨域语义
→ 必须走约定 / Contract Change
```

---

# 10. 与部署领域的关系

部署领域负责：

```text
模块如何安装
如何配置
如何启动
如何停止
如何验证
如何查询版本与状态
```

平台各领域约定负责：

```text
Module / Package 怎么表达 Owner
Public / Internal 怎么划
版本如何兼容
跨域 Contract 如何演进
测试与 Conformance 的最低要求
```

两者不能互相替代。

---

# 11. Shared Kernel 原则

v0.1 不预先建立大型 Shared Kernel。

只有满足以下全部条件才允许提取共享实现：

```text
至少两个正式领域已经真实使用
语义完全相同
Owner 清晰
公共 Contract 已稳定
消费者可枚举
变更影响可分析
有 Contract / Conformance Test
```

禁止用 Shared Kernel 收容：

```text
common/utils
common/helpers
业务 enum
领域状态
Adapter util
仅为了减少重复而共享的实现
```

> 允许少量重复，优先于错误共享。

---

# 12. 后续成熟路线

```text
v0.1 文档基线
    ↓
五领域真实设计
    ↓
公共需求反馈
    ↓
约定增量修正
    ↓
五域接口矩阵审计
    ↓
v1.0 稳定约定
    ↓
Machine-readable Schema / Conformance / CI Gate
```

目标不是永远靠 Markdown 管理。

长期方向：

```text
约定
→ Schema / Config
→ Validator
→ Conformance
→ CI Gate
```

但自动化只能实现已经验证稳定的约定，不能反过来替代领域建模。
