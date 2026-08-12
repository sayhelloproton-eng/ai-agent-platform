# Phase 3｜智能体运行与协作领域（Agent Runtime & Collaboration Domain）

> 文档状态：**v0.2 DESIGN BASELINE / READY FOR CROSS-DOMAIN AUDIT**  
> 日期：2026-08-11  
> 适用项目：`ai-agent-platform` Phase 3  
> 目标：把本 Chat 关于 Agent Domain 的完整业务裁决、技术方案、跨域依赖、包结构、E2E 门禁固化为可实现真源。

---

# 0. 真源规则

本目录覆盖本领域 PRE-DESIGN / Phase 2 历史候选。优先级：

```text
1. 本目录 v0.2 已确认结论
2. 当前 Task Domain 正式真源（Task 自己的业务事实）
3. Phase 3 平台各领域约定
4. Agent 前置上下文
5. Phase 2 证据/旧方案
```

若 Agent Domain 新需求要求调整 Task/Execution/Deployment 公共合同，必须以 `CROSS-DOMAIN CHANGE` 明确提出，不能把提案写成其他领域“已经实现”。

---

# 1. 一句话领域定义

> **智能体运行与协作领域负责 Agent Package、Role/认证、Worker/Conversation identity、Custom GPT 公网 Gateway 与 logical Collaboration。Browser Extension 唯一归 Execution；Dev Tunnel 归 Deployment External Resource Module（ALIGN-008/029）。**

---

# 2. v1 实体与 Carrier

```text
Agent Package
= npm 中可版本化 Agent 定义

Role
= 用户在 ChatGPT Web 创建并本地注册的真实 Custom GPT g-id

Worker / Person
= 某一个 Task 内该 Role 的具体 Custom GPT Conversation c-id
```

不建：

```text
Agent business entity
Session
AgentRun
Worker Pool
```

---

# 3. 三个固定角色

```text
1. 运营 + 产品经理
2. 总控 = 项目管理 + 研发
3. 测试 + 运维
```

一个工作区：

```text
one Agent Package → one registered Role
```

一个 Task：

```text
Task A → Product-A / Dev-A / Test-A
Task B → Product-B / Dev-B / Test-B
```

不同 Task 不复用 Worker Conversation；同一 Task 内始终复用原 Worker，reopen 也不换人。

---

# 4. 产品前置主链

产品 Worker 很特殊，不由 Task/Extension 创建：

```text
用户主动进入新的 Product GPT Conversation
→ 充分沟通
→ 形成需求
→ 获取当前 worker identity；Carrier Context Action 是优先 PENDING_SPIKE 路径，当前不得假设 Action 能提供稳定 c-id/url，可靠来源由 Browser/Carrier E2E 证明
→ listRegisteredRoles
→ 按 agentPackageRef 找 product/dev/test roleRef
→ createTask(product role+worker, dev role, test role, requirement...)
→ Task 等待用户批准执行
```

产品聊天未充分形成需求时，不应提前创建 Task。

---

# 5. Task 批准后的 Worker 初始化

```text
用户批准执行
→ Browser Extension 创建并绑定 Dev Worker
→ Browser Extension 创建并绑定 Test Worker
→ 两个绑定均成功
→ 才开始正式 Node 执行
```

首次 `WORKER_BIND` 只能创建/识别/绑定 Worker，不得提前执行研发或测试业务。

若 Dev 成功、Test 失败：保留 Dev，后续只补 Test，不重建已成功 Worker。

Task API 精确顺序由跨域审计冻结。

---

# 6. Node / reopen

```text
Node READY
→ Extension 唤醒该 Task 已绑定 Worker
→ Worker 使用 Conversation history
→ 上下文不明确时按需查 Task / Execution / askPeer
→ completeNode / waitNode / reopenNode 等正式 Task intent
```

不要求每次 wake 强制先 `getNodeContext`。

reopen：

```text
runNo + 1
→ Task 正式 reopenContext
→ 原 Task role binding 不变
→ Extension 找回原 Worker
→ 原 Conversation 继续
```

---

# 7. Collaboration

角色只需要：

```text
askPeer
replyPeer
```

规则：

```text
只能同 Task 已绑定参与者之间通信
多轮，但严格 Q1 → A1 → Q2 → A2
A1 必须真实 Browser DELIVERED 回原 Worker，才允许 Q2
Message Center 不创建 Worker
协作不直接改变 Task/Node 状态
Task terminal 后不再处理消息，既有消息仅保留历史
```

---

# 8. Role Registry / 删除 / Key

```text
Public Runtime API:
- listRegisteredRoles
- getRegisteredRole
```

Role 管理通过本机包 CLI。

v1 Role 删除：

```text
physical delete only
no tombstone / logical delete
before delete → query Task Public API
non-terminal Task uses roleRef → ROLE_IN_USE
allowed → remove Registry entry + role secret
```

一个 Role 一个 Bearer Key；注册后立即生成；支持 `rotate-role-key`。

Browser Extension 不用 Role Key，使用 `local-platform-token`。

---

# 9. Gateway / 公网

```text
Custom GPT
→ Microsoft Dev Tunnel
→ Agent Gateway
→ Agent / Task / Execution Public Contracts
```

v1 只暴露 Gateway。

Agent Runtime、Task、Execution、Browser bridge、SQLite、Local Resource API 都不直接公网暴露。

---

# 10. [DEPRECATED OWNERSHIP / Superseded by ALIGN-008/029] 原七个独立发布/部署单元

```text
agent-runtime
agent-gateway
browser-extension
dev-tunnel
agent-product
agent-controller-dev
agent-test-ops
```

Role Registry / Collaboration Message Center 留在 agent-runtime 内部，不继续拆微服务。

所有独立包遵守统一 Package Lifecycle Protocol，也可以拥有自己的专有命令。

最新 Deployment 原则：

> **包自身完成自己的账号、登录、配置、绑定、生命周期和 verify/doctor 闭环；平台总 Deployment 负责统一发现、顺序编排和透传标准命令。**

这项需要与 Deployment Domain 早期 Planner/Executor 方案做跨域同步。

---

# 11. Agent Package 配置

名称、描述、对话开场白、Instructions 直接来自 `package.json` Agent 字段。

长期材料：

```text
context/fixed-context.md
memory/memory.md
knowledge/*
```

静态 Action：

```text
actions/custom-gpt.openapi.yaml
```

明确不做：

```text
agent.manifest.json
instructions.md
Capability Catalog
Schema Composer
dynamic Action schema
Agent 自动写永久 memory（v1）
```

长期资料更新：包升级 + 提示用户回 Custom GPT Web 手工同步。

---

# 12. Execution 依赖

Agent Domain 只提出本机能力需求；Execution Domain 冻结 API/实现/审批：

```text
File/Git/CodeGraph
Node/npm
Build/Test/Lint/Typecheck
Runtime/Process/Port/Logs/Health
Machine/Network
controlled runCommand
Browser real side effects/Delivery/Receipt
```

任何本地资源都不能因为“物理在本机”就绕过其领域 Public API。

---

# 13. 文档导航

| 文件 | 用途 |
|---|---|
| `00-完整技术方案与上下文真源.md` | 单文件完整上下文 |
| `01-领域模型与事实所有权.md` | Agent Package / Role / Worker / Context |
| `02-Agent-Package与Custom-GPT-Carrier规范.md` | package.json / Knowledge / static Actions / setup |
| `03-Role-Registry与认证.md` | Registry / physical delete / Role Key / local token |
| `04-Task与Browser-Extension驱动协议.md` | Product pre-Task、dev/test bind、Node/reopen |
| `05-Collaboration-Message-Center.md` | askPeer/replyPeer、DELIVERED gate、durability |
| `06-Gateway-Actions与本地资源依赖.md` | Gateway / tunnel / Execution boundary |
| `07-Public-API与跨领域接口矩阵.md` | Public API 与跨域矩阵 |
| `08-数据存储目录与包模块设计.md` | 七包、repo 目录、Runtime Home |
| `09-失败恢复版本安全与验收.md` | 安全/失败/E2E |
| `10-CROSS-DOMAIN-CHANGE-总纲审计清单.md` | Task/Execution/Deployment 改动提案 |
| `11-设计决策记录与已否决方案.md` | ADR 与禁止回退 |
| `12-实施顺序与落库门禁.md` | 实施批次与 GO/STOP |
| `13-Browser注入与Worker唤醒消息协议.md` | WORKER_BIND/NODE_READY/REOPEN/PEER_MESSAGE |
| `14-上下文来源与继承说明.md` | 来源、覆盖关系 |
| `15-Custom-GPT-官方能力与v1约束.md` | Carrier 外部约束 |
| `16-事务并发幂等与SQLite-DDL.md` | Collaboration durable design |
| `17-角色Action静态权限矩阵.md` | 三角色静态 Action surface |
| `18-未决项与总纲裁决点.md` | 仅剩真实未决 |
| `19-独立包生命周期与部署单元.md` | 七个发布单元 + lifecycle |
| `20-产品前置工作流与Carrier身份.md` | 产品 pre-Task + worker identity E2E |
| `API-依赖-模块清单.md` | 快速接手页 |

---

# 14. 当前 GO/STOP

**GO：** 可以进入 Phase 3 总纲跨域审计与仓库落位设计。

**STOP：** 在跨域裁决前，不允许直接静默修改 Task/Deployment/Execution 已冻结公共语义；尤其必须先处理：

```text
Task-level roleBindings / binding API
Task authorization→dev/test provisioning/bind→startTask→startNode→WAKE exact sequence
startNode↔NODE_READY idempotent/effectively-once（不承诺端到端 exactly-once）
Product current c-id/url Carrier E2E
Execution Local Resource contract
Package lifecycle common contract
Deployment “package self-loop vs planner-owned apply” conflict
```

<!-- OPENAI-CARRIER-ABSORPTION-20260812 -->

## Carrier reuse first｜2026-08-12

Custom GPT v1 数据通道收敛为：

```text
small control JSON → GPT Actions
documents/files    → GPT Actions File Bridge
Conversation/page  → Execution Browser
real effects       → Execution
```

Gateway 已正式吸收 `openaiFileIdRefs/openaiFileResponse`、Actions hard limits、Custom Header 限制和显式 `x-openai-isConsequential`。Always Allow、Multi-Action Turn、Conversation file search、Code Interpreter Context Pack/Patch 仍以真实 E2E 状态推进，不作为未经验证的业务保证。
