# Roadmap

## Current Position

```text
Working Branch:
  main

Current HEAD:
  read from Git at runtime

Current Phase:
  Phase 2 — Core MVP Domain Implementation and Cross-domain Audit

Current Work:
  Apply and verify the Controller MVP implementation;
  keep Local Control, Task Control and Browser Host in separate domain iterations.
```

第二阶段技术方案为 Git-only。Feishu 对这些方案保持冻结，直到实现与串联证据稳定后再独立评估。

## Phase 1 — Knowledge Foundation

状态：**Completed at foundation level**

已形成 Git 真源、Context、正式知识、Registry、Document Bundle、视觉资产规则、Skill、Planner–Executor Handoff 和 Feishu 单向覆盖治理。正式投影状态必须以独立发布记录和 Readback 为准，不从方案文档推断。

## Phase 2 — Core Agent Platform MVPs

状态：**Controller Partial Implementation / Other Domains Pending**

### Required core sequence

```text
MVP-1 Controller Agent and Dynamic Context
→ MVP-2 Local Control / CLI
→ MVP-3 Task Control and Single-task Scheduling
→ MVP-4 Browser Host Runtime
→ Integrated single-task validation
```

当前里程碑：

- Controller Git Profile、Contracts、Action Adapter 和 Task Control Fixture 已形成实现候选；
- 本地测试覆盖 Context、Claim、Command、Plan 和 Event；
- 正式 Builder Preview 与 Node 20 仓库验证待完成；
- LCL、TSK、BHR 由各领域独立实现，总控负责合同审计。

核心目标：

- Custom GPT 总控可在新会话按 `task_id` 恢复；
- Task 包含结构化 Plan，总控先查后领并提交业务命令；
- Local Control 通过唯一 Gateway 和安全 CLI 返回真实本机事实；
- Task Control 持久化 Task / Plan / Claims / Event / Dispatch；
- Browser Host 在真实 ChatGPT 页面观察、唤醒和执行授权动作；
- 失败、冲突、不确定和暂停到达明确状态。

### Optional extension

```text
MVP-5 Optional — Mobile Single-model Multi-role Inference Provider
```

状态：**Runtime Integration Implemented**

SOL-MOB-001 已将 MLXHub 双 checkpoint（FAST / REASON）作为可选 Model Inference Provider 接入 Phase 2 Task Control / Action Gateway。手机模型互斥，进程内 MOB job 串行；FAST 优先，uncertain / low confidence / explicit conflict 时使用 REASON。MOB Endpoint 仅在 `ACTION_GATEWAY_MOB_BASE_URL` 设置时启用；未配置时现有 Gateway 行为不变。

下一轮 Live Gate 才运行真实手机 Task Context → FAST → mob.next.v1.2 → Local Control → ResultRef / Evidence → FAST verification → Controller 合法推进。

规则：

- 不阻塞核心四项；
- DeepSeek 先承担页面初判和结果解释；
- 手机实现同一 Model Inference Contract；
- 未达标或离线时继续使用 DeepSeek。

### Phase-2 exit gate

核心四项分别验收并跑通：

```text
Task with Plan
→ Controller Decision Context
→ Controller Claim
→ Local Result
→ Controller Command
→ Atomic Task / Plan / Event update
→ Work Item or Browser Dispatch
→ Result report
→ Controller wake and continuation
```

手机 MVP 不属于该 Gate。

## Phase 3 — Trusted Execution and Governance

状态：**Planned after core Phase 2**

在真实核心闭环之后扩展：

- 正式 Approval / Evidence / Side-effect Ledger；
- Safe Continuation 与 Recovery；
- Executor Adapter 与 Execution Attempt；
- 多角色 Handoff；
- Agent Profile / Knowledge Pack Publisher；
- 管理后台读写模型。

## Phase 4 — Multi-task and Multi-executor

状态：**Deferred**

- Task 依赖和 DAG；
- 多任务 Lane；
- Worktree / Workspace 隔离；
- 资源锁与冲突检测；
- 多执行器 Capability Routing；
- 生产消息与恢复治理。

## Phase 5 — Product Workflow

状态：**Planned**

完成可信任务闭环后，再推进 AI 视频工作流等真实产品。不得提前把仓库改成根级多产品总仓。

## Phase 6 — Portfolio Release

状态：**In preparation**

作品集只引用真实代码、测试、调用证据、评估、ADR、Registry、固定 Commit 和当前限制。

## Deferred

- 根级 `agents/`；
- 批量 Agent Profile；
- 正式 `knowledge-packs/**`；
- 完整 RAG / Memory 晋升；
- 通用 Agent SaaS；
- 根级 `products/`；
- 手机模型生产级接管；
- 无人监督任意网页自动化。
