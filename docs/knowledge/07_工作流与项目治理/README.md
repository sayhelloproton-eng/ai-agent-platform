# 工作流与项目治理

> 核心结论：平台架构定义“建设什么”，上下文与知识系统保证参与者持续理解同一个目标、事实和状态；工作流与项目治理则把角色、上下文、任务、能力、工具、证据和正式资产串成一条可控制、可暂停、可恢复、可验证、可发布、可沉淀的执行线。

## 1. 本章定位

`07_工作流与项目治理` 负责回答：

> 一个目标、问题、机会或变更请求进入平台后，如何被理解、决策、任务化、执行、检查、审批、集成、发布和关闭，并在中断、失败、执行器切换或外部副作用存在时仍然保持可追踪、可恢复和可审计？

本章不是工具操作手册，也不是把所有业务流程放到同一层的流程清单。它定义的是平台通用工作流、横切控制工作流、治理反馈工作流，以及上层产品工作流接入平台的边界。

## 2. 与相邻章节的关系

```text
04_平台架构
  定义领域边界、状态所有权、模块职责、执行路径和演进依赖
          ↓
05_上下文与知识系统
  提供经过治理的事实、Context Package、Context Instance、知识与 Registry 引用
          ↓
07_工作流与项目治理
  把目标、角色、Task、Context、Execution、Evidence、Approval、Release 串成受控执行线
          ↓
08_实验与复盘
  定义实验、Evidence 质量、评估、Replay 和可重复性
```

硬边界：

- `04` 拥有 DDD 边界和状态所有权；`07` 不能自行改变架构。
- `05` 拥有 Context、Knowledge、Memory、Registry 语义；`07` 只定义何时请求、引用和反馈。
- `06` 拥有长期 Role、Agent Profile、Skill、Capability 和权限模型；`07` 只做任务内角色分配与协作。
- `08` 拥有 Evidence 的生成与质量方法；`07` 只定义阶段门如何消费 Evidence。
- `01` 拥有产品愿景、需求和业务对象；`07` 只定义产品机会如何立项及专项流程如何复用平台控制面。

## 3. 工作流体系

| 类型 | 作用 | Canonical 文档 |
|---|---|---|
| 系统总览 | 定义整套工作流拓扑、边界、不变量和完成判定 | `WFL-001` |
| 核心主线 | 把目标变成计划、Task Contract 和正式成果 | `WFL-002`、`WFL-005`、`WFL-006` |
| 横切控制 | 管理 Task 状态、连续性、审批和副作用 | `WFL-007`、`WFL-009` |
| 治理反馈 | 管理资产变更、发布、项目状态和正式基线 | `WFL-010`、`WFL-012` |
| 专项扩展 | 让产品孵化和业务流程复用平台通用能力 | `WFL-011` |

## 4. 平台主工作流

```text
Goal / Opportunity / Incident / Change Request
  → Intake
  → Context Recovery
  → Problem Framing
  → Decision and Plan
  → Task Decomposition
  → Task Contract Freeze
  → Approval / Resource Gate
  → Execution
  → Deterministic Verification
  → Semantic Review
  → Integration
  → Asset Change and Release
  → Readback
  → Task Closeout
  → Project Status / Context / Knowledge Feedback
```

这条主线同时包含三条互相关联但不能混为一体的线：

1. **目标与决策线**：为什么做、做什么、做到什么程度。
2. **任务与执行线**：谁按什么合同、在什么范围、用什么能力完成。
3. **状态与证据线**：当前到了哪里、发生了什么、是否通过、能否恢复、是否可以宣称完成。

## 5. Canonical 资产

| ID | 文档 | 唯一所有权 |
|---|---|---|
| `WFL-001` | [工作流与项目治理总体模型](./WFL-001-工作流与项目治理总体模型/README.md) | 工作流拓扑、类型、全局边界、三条线与完成定义 |
| `WFL-002` | [目标进入、决策规划与任务分解](./WFL-002-目标进入决策规划与任务分解/README.md) | Intake、事实恢复、问题定义、决策、Plan Freeze、Task Decomposition |
| `WFL-005` | [任务合同与多角色协作](./WFL-005-任务合同与多角色协作/README.md) | Task Aggregate、版本化合同、角色实例、Git Policy、Handoff Contract |
| `WFL-006` | [执行通道、验证复审与集成](./WFL-006-执行通道验证复审与集成/README.md) | Execution Lane、Executor Routing、验证、Review、Integration、Readback |
| `WFL-007` | [任务状态、Checkpoint、移交与恢复](./WFL-007-任务状态Checkpoint移交与恢复/README.md) | Task 状态机、Lease、Checkpoint、Pause、Resume、Cancel、Terminate |
| `WFL-009` | [审批、权限校验与副作用治理](./WFL-009-审批权限校验与副作用治理/README.md) | Approval 生命周期、执行前复核、Side-effect Ledger、回读与补偿 |
| `WFL-010` | [资产变更、发布与关联同步工作流](./WFL-010-资产变更发布与关联同步工作流/README.md) | Change Event、Impact Plan、Release、Projection、Migration、Drift |
| `WFL-012` | [项目状态、阶段复审与基线治理](./WFL-012-项目状态阶段复审与基线治理/README.md) | Project State、阶段复审、决策请求、Baseline Freeze |
| `WFL-011` | [产品孵化与专项业务工作流框架](./WFL-011-产品孵化与专项业务工作流框架/README.md) | 产品机会、Decision Gate、专项流程接入合同 |

## 6. 旧资产处理

- 旧 `WFL-003 AI 视频工作流` 被 `WFL-011` 的专项流程框架取代；AI 视频详细业务对象和生产流程由 `00_项目与产品` 及未来真实产品资产拥有。
- 旧 `WFL-004 多模型 Agent 执行治理与 Token 预算` 的执行器路由和预算规则进入 `WFL-006`；历史事故与经验应进入知识或工程洞见资产。
- 旧 `WFL-008 任务暂停恢复与安全终止` 合并进入 `WFL-007`，形成一个完整 Task Control 生命周期。
- 旧 `WFL-001` 的知识生命周期语义由 `05_上下文与知识系统` 承接；发布执行路径进入 `WFL-010`。

旧 ID 不重用，Git 历史继续保留来源。

## 7. 维护规则

- Workflow 只能协调领域状态，不能通过流程文档夺取领域所有权。
- Session 不等于 Task；Agent 不等于 Workflow；Task Contract 不等于 Context Package。
- Provider 和模型可以替换，角色、契约、状态、Evidence 和副作用边界必须稳定。
- 当前实现、人工机制、目标设计和正式占位必须分开表述。
- 外部副作用必须经过适用的 Policy、Approval、Lease、幂等检查和执行后回读。
- 执行器自然语言报告不是完成证据；完成必须由合同、验收、Evidence、集成状态和回读共同决定。
- 复杂多泳道、状态机、治理闭环和专项接入图在正文冻结后制作正式图片资产；Mermaid 只用于简单局部关系。
- 本目录保持 `unpublished`，直到独立授权 Git→Feishu 覆盖发布并完成回读。
