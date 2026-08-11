# Phase 3 · Model & Reasoning Domain（模型与推理领域）冻结技术真源

- **项目**：学习 / ai-agent-platform Phase 3
- **领域**：Model & Reasoning Domain（模型与推理领域）
- **状态**：**FROZEN / v1 P0 基线**
- **冻结日期**：2026-08-12
- **目标**：把本 Chat 从进入模型与推理领域后形成的已确认、已修正、已冻结结论，整理成可直接指导新仓库实现、跨域接线、部署验收、模型替换和后续 Chat 续接的技术真源。

> 核心定义：**Model & Reasoning Domain 是平台的认知计算层。它把其他领域已经形成的上下文、证据和问题，交给满足能力约束的模型，以受控推理强度完成一次可观测、可验证的认知计算，再把结构化结果返回调用方。**
>
> 核心原则：**模型不是自由 Agent，而是受协议约束的认知函数。**
>
> 稳定性原则：**Small-model-first：平台正确性不得依赖模型开放式自主智能；关键推理必须由版本化 Reasoning Spec、强类型输入、受约束输出、runtime validation、有界升级和有限循环共同约束。**

## 1. 文档真源层级

后续实现、审计、跨域讨论按以下优先级读取：

1. `00-完整技术方案与上下文真源.md`：领域总纲、最终边界、术语、包/服务、运行模型和冻结结论。
2. `01`~`15`：可直接实施的专项详细技术方案。
3. `90-决策演进与覆盖清单.md`：记录讨论过程中哪些方案被修正、删除或覆盖，以及最终为什么这样定。
4. `91-聊天讨论主题索引与结论映射.md`：从本 Chat 进入该领域后的讨论主题与文档落点。
5. `92-冻结结论覆盖检查表.md`：逐项核对本 Chat 的关键冻结结论是否已经落入文档。
6. `99-下一Chat交接上下文.md`：下一 Chat 快速恢复 Model Domain 完整上下文。
7. 旧 SOL-MOB-001、手机模型实验、`experiments.zip` 或其他历史 MVP：**仅可在领域冻结后做复用审计，不能覆盖本目录领域设计。**

如本目录内部存在表述冲突：以 `00` 的最终冻结结论与 `90` 的覆盖关系为准；专项文档用于展开实施细节，不得自行修改领域语义。

## 2. Greenfield-first 治理规则

本领域采用 **domain-first / greenfield-first**：

```text
真实业务需求
+ 已冻结 Task / Agent / Execution 边界
+ 模型 API 的客观能力与限制
        ↓
独立冻结 Model & Reasoning Domain
        ↓
再审计旧 MVP
        ↓
REUSE AS-IS / REFACTOR & ADAPT / REWRITE / DROP
```

本冻结包**未把 `experiments.zip` 作为领域设计输入**。后续若复用旧代码，必须先按本冻结设计审计；旧实现与本设计冲突时，以本设计为准。

## 3. v1 包 / 服务结论

```text
Model & Reasoning Domain v1

├── model-contracts       # TypeScript npm library；不部署
└── model-runtime         # 唯一平台 Runtime Service
    ├── Inference API
    │   ├── Reasoning Spec Resolver
    │   └── Prompt Renderer
    ├── Resource Coordinator
    ├── Reasoning Router
    ├── API Provider Adapter
    ├── Output Validator
    └── Health & Observability
```

**结论：2 个包 / 1 个平台服务 / 6 个内部模块。**

模型算力来自配置的 API 模型，可能位于本机、手机、局域网服务器、云 API 或企业内部 API；这些部署形态不是领域概念。

## 4. v1 对外能力

对其他领域暴露的是逻辑算力语义：

```text
FAST    # 高频、低延迟、no-thinking 逻辑角色
REASON  # 低频、深推理、thinking 逻辑角色
AUTO    # 仅在 Reasoning Spec 允许时由 Runtime 有界选择/升级
```

Vision 是输入模态，不是第三种模型角色：

```text
FAST + image
REASON + image
```

v1 **不依赖模型 API 原生 Tool Calling / function calling**。需要工具时采用：

```text
Reasoning Spec
→ 结构化 Capability Proposal
→ 调用领域/中间控制层严格校验
→ Execution Domain 真实执行
→ 结构化 Capability Result 回灌（如需要）
```

## 5. 文档目录

| 文件 | 用途 |
|---|---|
| `00-完整技术方案与上下文真源.md` | Model Domain 总纲与最终冻结基线 |
| `01-领域职责边界与非目标.md` | 与 Task / Agent / Execution / Deployment 的职责边界、v1 非目标 |
| `02-总体架构-包-服务-运行拓扑.md` | 2 包 / 1 服务 / 6 模块、API 算力拓扑 |
| `03-model-runtime-详细技术方案.md` | Runtime 内部模块、请求生命周期与调用路径 |
| `04-Reasoning-Spec与Small-Model-First规范.md` | 版本化推理规范、Prompt 渲染、强类型输入输出 |
| `05-Model-Capability-Profile与Provider适配.md` | FAST/REASON 映射、thinking/no-thinking、Vision、structured output、API Provider |
| `06-Public-Contract与TypeScript类型规范.md` | `infer()` / `getRuntimeStatus()`、DTO、runtime validation |
| `07-路由-单Lane-队列-超时-取消.md` | FAST/REASON/AUTO、business/background、串行调度、timeout/cancel |
| `08-Capability-Proposal与Execution桥接.md` | 非原生 Tool Calling、Proposal 限制、Result 回灌、有限轮次 |
| `09-Vision与多模态输入.md` | image 输入合同、能力校验、Provider 转换、失败语义 |
| `10-Runtime-Health与推理可观测性.md` | READY/DEGRADED/UNAVAILABLE、日志、延迟、错误与真实健康 |
| `11-跨领域接口依赖矩阵.md` | Agent / Execution / Browser System Observer / Deployment 依赖 |
| `12-错误语义与失败恢复.md` | 最小错误码、retry/repair、无 UNKNOWN_SIDE_EFFECT |
| `13-测试验收-M1到M4.md` | Contract、Capability、Scenario Regression、Stability/Performance Gate |
| `14-TypeScript-Node20-工程约束.md` | TS-first、Node 20.20.1、tsx、`tsc --noEmit`、边界 runtime validation |
| `15-新仓库实现顺序与停止门.md` | 最小实施顺序、每阶段停止门与防过度设计规则 |
| `90-决策演进与覆盖清单.md` | 关键修正、删除项、被覆盖旧想法 |
| `91-聊天讨论主题索引与结论映射.md` | 本 Chat 主题顺序和文档落点 |
| `92-冻结结论覆盖检查表.md` | 关键结论覆盖审计 |
| `99-下一Chat交接上下文.md` | 下一 Chat 续接用上下文 |
| `MANIFEST.json` | 文件 SHA256、字节数、冻结状态 |

## 6. 标签约定

- **[FROZEN]**：本 Chat 已确认且未被后续推翻的正式结论。
- **[RECOMMENDED]**：为把冻结语义落成工程实现而补充的最小建议；不得改变冻结边界。
- **[DEFERRED]**：明确留给 Deployment、跨域总审计或未来版本。
- **[REMOVED]**：讨论过但后续明确删除/覆盖。

## 7. 最小充分停止规则

> **满足真实需求 + 保证稳定性，就停止设计。**

若某组件、实体、服务不是当前真实调用链、稳定性、部署或验收的必要条件，则不进入 v1。禁止因为“以后可能有用”而新增 Router Service、Provider Service、Prompt Service、Tool Service、Model Registry、持久化 Queue、推理数据库、多 Lane 调度、独立 Health/Logging/Evaluation 服务等。
