# Phase 3 · Execution Domain（执行领域）冻结技术真源

- **项目**：学习 / ai-agent-platform Phase 3
- **领域**：Execution Domain（执行领域）
- **状态**：**FROZEN / v1 P0 基线**
- **冻结日期**：2026-08-11
- **目标**：把本 Chat 从开始讨论 Execution Domain 起形成的已确认、已修正、已冻结结论，整理成可直接指导新仓库实现、测试、跨域接线和后续 Chat 续接的技术真源。

> 核心定义：**Execution Domain 是平台的 real-world effect plane。它把已经形成的 Intent 变成受控、可验证、可追踪、可恢复的真实 Effect，并把 Result + Evidence 返回给调用方。**
>
> 核心句：**From Intent to Effect, from Effect to Evidence.**

## 1. 文档真源层级

后续实现、审计、跨域讨论按以下优先级读取：

1. `00-完整技术方案与上下文真源.md`：领域总纲、冻结范围、术语和文档优先级。
2. `01`~`14`：可实施的专项详细技术方案。
3. `90-决策演进与覆盖清单.md`：记录“为什么这样定”、哪些旧方案被覆盖/删除。
4. `99-下一Chat交接上下文.md`：用于新 Chat 快速恢复完整 Execution 上下文。
5. Phase 2 Browser Host / Local Control / Mobile / Flow 等旧文档：**仅作为历史证据，不得覆盖本目录冻结结论。**

如本目录内部存在表述冲突：**编号更高的专项文档不自动覆盖总纲；以 `00` 明确的最终冻结结论及 `90` 的覆盖关系为准。**

## 2. 文档目录

| 文件 | 用途 |
|---|---|
| `00-完整技术方案与上下文真源.md` | Execution Domain 全局真源、职责、架构、冻结结论 |
| `01-领域职责边界与非目标.md` | 与 Task / Agent / Model / Deployment 的边界、v1 非目标 |
| `02-总体架构-包-服务-运行拓扑.md` | 4 包 / 1 服务 / 2 Executor、调用拓扑 |
| `03-execution-runtime-详细技术方案.md` | Runtime 控制面、Policy、路由、Approval、记录、恢复 |
| `04-execution-browser-extension-详细技术方案.md` | Task Driver、Worker Lane、CREATE/RESTORE/WAKE、权限、协作、恢复 |
| `05-execution-local-详细技术方案.md` | File/Git/Package/Test/Process/Network/Shell、安全边界 |
| `06-Public-Contract与TypeScript类型规范.md` | 强类型 Public API、Capability discriminated union、DTO |
| `07-Execution-Record-持久化-幂等-状态.md` | SQLite、状态、side-effect state、幂等、恢复 |
| `08-Policy-FAST-REASON-Human-Effect-Approval.md` | Deterministic / FAST / REASON / Human 决策链 |
| `09-Result-Evidence-UNKNOWN与恢复.md` | Result/Evidence、Pre/Postcondition、UNKNOWN_SIDE_EFFECT |
| `10-Side-Panel-System-Observer-日志可观测性.md` | Side Panel P0、System Observer、落盘日志 |
| `11-跨领域接口依赖矩阵.md` | Execution ↔ Task/Agent/Model/Deployment 接口与所有权 |
| `12-测试验收-E2E-故障注入.md` | E1~E5 Gate、真实 Browser/Local、恢复测试 |
| `13-TypeScript-Node20-工程约束.md` | Node 20.20.1 + TS + tsx + tsc --noEmit + runtime validation |
| `14-新仓库实现顺序与停止门.md` | 实施顺序、最小切片、每阶段停止门 |
| `90-决策演进与覆盖清单.md` | 从讨论到冻结的关键修正与删除项 |
| `91-聊天讨论主题索引与结论映射.md` | 从开始讨论 Execution 起的主题顺序、结论与文档落点 |
| `92-冻结结论覆盖检查表.md` | 对当前上下文中的关键结论做逐项覆盖审计 |
| `99-下一Chat交接上下文.md` | 下一 Chat 可直接复制/读取的上下文 |
| `MANIFEST.json` | 文件 SHA256 与状态，便于后续校验 |

## 3. 冻结后的包/服务结论

```text
Execution Domain v1

├── execution-contracts          # npm library；不部署
├── execution-runtime            # 唯一后端 Runtime Service
├── execution-local              # 进程内 Local Executor library
└── execution-browser-extension  # Chrome Extension / Browser Executor
```

**v1 不做 MCP。** `execution-mcp` 已明确删除，不保留空壳包、接口或测试。

**Knowledge Access / Retrieval** 只作为未来跨 Agent/Task/Execution 的能力扩展位记录，v1 不实现、不建立知识库服务、不进入 `execution-local` P0 能力。

## 4. 文档标签约定

- **[FROZEN]**：本 Chat 已确认/未被后续推翻的正式结论。
- **[RECOMMENDED]**：为把冻结语义落成工程方案而补充的实现建议；不得改变冻结边界。
- **[DEFERRED]**：明确留给 E2E、Deployment 或未来版本的事项。
- **[REMOVED]**：曾讨论但后续明确删除/覆盖。

## 5. 实施原则

> 这套文档不是旧 Phase 2 实现的“修补说明”，而是 Phase 3 新仓库的工程输入。旧实现只用于解释为什么某些可靠性/可观测性规则必须存在。

后续若发现真实实现冲突，应提交跨领域 Contract Change / Architecture Change，不得在单个包内偷偷改公共语义。
