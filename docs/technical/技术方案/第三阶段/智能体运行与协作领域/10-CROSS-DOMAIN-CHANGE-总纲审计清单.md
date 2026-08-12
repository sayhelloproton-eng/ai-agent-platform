# 智能体运行与协作领域｜CROSS-DOMAIN CHANGE｜Phase 3 总纲审计清单

> **重要**：本文只列出本领域成立所依赖的跨领域最小变更。它们不是“Agent Domain 单方面已经冻结其他领域合同”。后续 Phase 3 总纲必须逐项审计、确定最终 API 名、字段和版本，再落入各 Owner 真源。

---

# 1. 为什么必须有这份清单

当前 Task Domain v0.1 已经是正式真源；Agent Domain 不能为了方便直接改其 SQLite/状态机。

但本 Chat 确认了新的真实业务：

```text
一个 Task 在开始后长期绑定：
产品 roleRef → product workerRef
研发 roleRef → dev workerRef
测试 roleRef → test workerRef
```

且 reopen 必须原人继续、Extension 需要稳定驱动投影、Agent Collaboration 需要找到 Task 已绑定目标 Worker。

这些能力超出当前 Task v0.1 只有 `Node.workerRef` 的表达范围，因此必须由总纲做最小合同升级。

---

# 2. Task Domain｜MUST AUDIT

## TSK-CHANGE-01｜Task-level Role Binding

### 当前 v0.1

Task/Node 已有：

```text
Node.requiredRoleRef
Node.workerRef
```

没有 Task-level：

```text
roleRef → workerRef
```

### 新需求

Task 必须保存稳定参与者关系：

```text
TaskRoleBinding
├── taskId
├── roleRef
├── workerRef?
├── boundAt?
└── boundByRef?
```

推荐关键约束：

```text
UNIQUE(taskId, roleRef)
workerRef 一次绑定，v1 不允许覆盖
Task SUCCEEDED/TERMINATED 后不可变
reopen 不清理 TaskRoleBinding
```

### Owner

**Task Domain**。

Agent Domain 不保存第二份 Task→Worker 真源。

---

## TSK-CHANGE-02｜createTask 接收 roleBindings

产品 Worker 创建 Task 时：

```text
产品 roleRef + 产品 workerRef 已知
研发 roleRef 已知 / workerRef null
测试 roleRef 已知 / workerRef null
```

建议：

```json
"roleBindings": [
  {"roleRef":"<product-g-id>","workerRef":"<product-c-id>"},
  {"roleRef":"<dev-g-id>","workerRef":null},
  {"roleRef":"<test-g-id>","workerRef":null}
]
```

总纲必须审计：

- createTask 是否直接承载；
- 是否要求 Plan `requiredRoleRef` 必须存在于 roleBindings；
- 产品不是 Task Node 时是否仍允许 participant role binding（本设计要求允许）；
- actorRef / workerRef 的格式与认证如何对齐。

---

## TSK-CHANGE-03｜一次性 bindTaskWorker

Task 启动后，Extension 创建研发/测试 Conversation，再写正式绑定。

建议语义：

```text
bindTaskWorker(taskId, roleRef, workerRef, expectedTaskVersion, actorRef, idempotencyKey)
```

规则必须至少：

```text
roleRef 必须是 Task 声明参与角色
当前 workerRef null → 允许写
当前 == same workerRef → 幂等
当前 != new workerRef → 冲突，禁止覆盖
Task terminal → 禁止修改
```

最终 operation 名由 Task Domain / 总纲裁决。

---

## TSK-CHANGE-04｜getTask 返回 roleBindings

Extension 和 Collaboration 都需要：

```text
taskId
roleBindings[]
```

但 Collaboration Service 不得读取 Task SQLite；它应通过 Task Public API/Port 获取。

建议 projection：

```json
{
  "roleRef":"g-...",
  "workerRef":"...",
  "boundAt":"..."
}
```

---

## TSK-CHANGE-05｜Extension 可驱动投影

Extension 不能自己复制 Task Workflow 规则。

至少需要 Owner 返回：

```text
taskId
status
currentNodeId
currentNode.status
currentNode.requiredRoleRef
boundWorkerRef
canStart / canDrive
blockedReason
versions
```

总纲可选：

```text
A. 扩展 listTasks projection
B. listTasks + getTask
C. 新的专用只读 drive projection
```

本文不强行冻结 API 形状，但必须保证 Extension 只消费 Owner 判定。

---

## TSK-CHANGE-06｜reopenContext

当前 Task v0.1 已有 reopen reason/event/runNo/history；Agent v1 需要一个正式可消费投影。

建议：

```json
"reopenContext": {
  "fromRunNo": 1,
  "runNo": 2,
  "reason": "测试不通过，需要重新研发",
  "reopenedByRef": "...",
  "reopenedAt": "...",
  "relatedRefs": ["document:TEST_RESULT"]
}
```

可放在：

```text
getNodeContext
或 getTask/currentNode projection
```

要求：

> Extension 只透传正式 reopen 信息，不自己发明 reason。

---

## TSK-CHANGE-07｜reopen 保持原 Worker 的兼容方式

用户要求：**reopen 必须复用原人员。**

当前 Task v0.1 `reopenNode`：

```text
Node.workerRef = null
Node.runNo + 1
Node READY
```

不必为了这个需求破坏现有 run-level 语义。

建议兼容：

```text
TaskRoleBinding.workerRef 保持不变
Node.workerRef 在 reopen 后清空
Extension 取 TaskRoleBinding.workerRef
startNode(new run, same workerRef)
```

总纲应优先采用这一最小变化。

---

## TSK-CHANGE-08｜Task completed/archive 后绑定不可变

用户已明确：完成 Task 归档，不再次开启。

因此 Task-level role bindings 在终态仅作为历史事实保留，不释放、不重新分配。

---

## TSK-CHANGE-09｜绝不重新引入 WorkItem / Claim

以上新增需求不能作为重新引入：

```text
WorkItem
Claim
Lease
Worker reassign
```

的理由。

Task role binding + Node run worker 已足够表达 v1。

---

## TSK-CHANGE-10｜用户批准后先完成 Dev/Test Worker 初始化，再开始正式 Node work

本 Chat 已确认业务顺序：

```text
user approves Task execution
→ create/bind Dev Worker
→ create/bind Test Worker
→ both bindings complete
→ formal first Node execution
```

Task Domain 与 Execution Task Driver/application flow 共同对齐 `startTask` 的精确调用位置，但必须保证：

- 两个 Worker 未绑定完成前不得产生正式 Node work；
- Dev success/Test failure 时只补 Test，不重复 Dev；
- 优先不新增额外 Task 业务状态；
- initialization/recovery 必须幂等；
- `WORKER_BIND` 不等于 `NODE_READY`。

这是 Task Public Contract / Browser protocol 的跨域接线问题，不允许 Extension 私自制造第二套 Task 状态。

---

# 3. Browser Extension / Browser Execution｜MUST AUDIT

Browser Extension 是 v1 主驱动 Adapter，当前新的强依赖必须进入其后续技术方案。

## BHR-CHANGE-01｜产品 pre-Task Carrier Context / workerRef

产品 Worker 在 Task 创建时必须写入自己的 `workerRef`，但它是用户主动创建的 pre-Task Conversation，**不由 Task-driven Extension 创建或调度**。

原业务偏好是尽量通过 Action 获取当前链接/Carrier Context；ALIGN/OpenAI audit 后该实现路径降为 `PENDING_SPIKE`。平台当前合同只要求可靠取得/验证 `roleRef + workerRef(c-id)`，不得假设 Custom GPT Action 能提供稳定 `g-id/c-id/conversationUrl`。

如果原生 Action metadata 不足，Browser Extension 可以作为候选的**被动 Carrier page-context provider**，但是否采用必须 E2E 后冻结，并且不得把产品流程改造成：

```text
Task polling → Extension create Product Worker
```

正确业务仍是：

```text
User ↔ Product Conversation
→ requirement complete
→ current Carrier identity
→ createTask
```

---

## BHR-CHANGE-02｜用户批准后立即创建 dev/test Workers，绑定完成后才正式 Node work

冻结业务顺序：

```text
用户批准 Task execution
→ Extension 打开 dev Role / 创建 dev Conversation / bind dev
→ Extension 打开 test Role / 创建 test Conversation / bind test
→ 两个 Worker 都绑定成功
→ 才开始正式 Node work / NODE_READY
```

`startTask` API 在此序列中的精确位置由 Task+BHR 合同审计，不在 Agent Domain 单方面定死。

不是等 dev/test Node 第一次 READY 才创建。

需要防重复：Extension 重启/重复轮询不得再次创建已绑定 Worker；dev 成功/test 失败时只补 test。

---

## BHR-CHANGE-03｜Worker bootstrap 消息

由于创建 Custom GPT Conversation 通常需要一次页面交互/消息，建议 v1 定义 Browser 注入 envelope：

```text
WORKER_BIND
```

其目的仅：

- 建立具体 Conversation；
- 告诉 Worker taskId / role / worker identity；
- 建立基本 Task 工作上下文；
- 明确“当前不是 Node 执行指令时不要提前处理未 READY Node”。

这是实现建议，Browser 专题必须通过真实 ChatGPT Web 验证最终文案/触发方式。

---

## BHR-CHANGE-04｜统一 Browser 注入触发类型

建议最小协议：

```text
WORKER_BIND
NODE_READY
REOPEN
PEER_MESSAGE
```

每类消息必须结构化包含必要 refs，而不是靠自由文本猜场景。

其中：

- `NODE_READY`：当前正式 Node 可执行；
- `REOPEN`：必须包含 Task owner 返回的 reopenContext；
- `PEER_MESSAGE`：包含 threadId/messageId/from role+worker/content。

---

## BHR-CHANGE-05｜Role/Worker target 解析

Extension 不直接解析 `.ai-agent-platform`。

调用 Agent Domain：

```text
getRegisteredRole(roleRef)
```

获得 carrier URL / carrier type。

v1 Custom GPT Carrier Adapter 根据：

```text
roleRef + workerRef
```

构造/解析具体 Conversation target。

只有 Agent Carrier Adapter 可以理解 GPT URL 结构；Task Domain 不理解。

---

## BHR-CHANGE-06｜多类轮询，不建超级队列

Extension 运行循环至少消费：

```text
Task Domain → task/node drive work
Agent Domain → collaboration delivery work
```

未来可新增其他类别。

接口保持分域，不建立一个“所有 pending work”的统一事实 Owner。

---

## BHR-CHANGE-07｜Browser Delivery 必须可回报

Extension 投递协作消息后，需要把真实 Delivery/Result/Receipt 返回 Message Center。

最终字段与 Execution Domain Browser 语义对齐，不能仅靠“tabs.sendMessage 成功”或“脚本执行没抛错”推导已送达。

---

# 4. Execution Domain｜MUST AUDIT

## EXE-CHANGE-01｜Local Resource Capabilities

Agent v1 强依赖 Execution 提供结构化本地资源接口。

至少按第一版实现优先级审计：

```text
File:
readFile / listFiles / searchFiles / getFileMetadata

Git:
getGitStatus / getGitDiff / getGitLog / getCurrentBranch

Dev Environment:
getRuntimeVersions / getInstalledDependencies / getProjectScripts

Build/Test:
getBuildStatus / getTestResults / getLintResults / getTypecheckResults

Runtime/Logs:
getServiceStatus / getProcessStatus / getPortStatus / readLogs / checkHealth

Machine/Network:
getMachineResources / checkNetwork / checkEndpointReachability

Authorized LAN/Data Source（按真实需求/注册 Adapter）：
registered internal HTTP/API/database/LAN resource access

Controlled escape hatch:
runCommand
```

CodeGraph：

```text
queryCodeGraph / findSymbol / findReferences / getCallers / getCallees / impact
```

可以是后续能力；如果 Execution v1 未采用，必须明确 `CAPABILITY_UNAVAILABLE`，不要 Agent Domain 假实现。

---

## EXE-CHANGE-02｜Query 与 Mutation 分离

只读资源与副作用动作必须有不同 capability / permission 语义。

`runCommand` 不得成为所有查询的万能入口。

---

## EXE-CHANGE-03｜Browser injection / Delivery 事实

Browser Extension 的真实页面操作属于 Execution/Browser adapter 副作用。

需要复用 Phase 2 已验证原则：

```text
Observation != Mutation
Delivery 是不可逆事实边界
副作用不确定不能盲 Retry
Result/Receipt 可追踪
```

Agent Collaboration Message Center只保存其 own message 状态 + opaque delivery/result refs。

---

## EXE-CHANGE-04｜Approval

Agent 只表达 Action Intent。

文件写、Shell、Git mutation、发布、真实 Browser mutation 等是否需人工批准，由 Execution Admission / Policy / Approval 决定。

不要把 Approval 状态复制进 Agent Domain。

---

# 5. Deployment Domain｜MUST AUDIT

## DEP-CHANGE-01｜[RESOLVED / SUPERSEDED] 原 Agent Domain 七个独立发布/部署单元

**Historical proposal（已由 ALIGN-008/029/111～130 改写 ownership）：** 原提案要求以下七个单元独立管理：

```text
agent-runtime
agent-gateway
browser-extension
dev-tunnel
agent-product
agent-controller-dev
agent-test-ops
```

Browser Extension 是独立 npm 管理 + Chrome Extension 发布物；Dev Tunnel 是独立 npm adapter/manager；Gateway 是独立 npm service。

Role Registry / Collaboration Message Center 继续是 agent-runtime 内部模块，不再额外拆服务。

---

## DEP-CHANGE-02｜统一 Package Lifecycle Protocol

所有独立包必须让 Deployment 能机器发现自己支持的标准生命周期能力，例如：

```text
describe / requirements
setup
configure
login
bind
start
stop
status
verify
doctor
```

并允许 package-specific commands。

Deployment Domain 必须冻结：

```text
package.json descriptor
command naming
JSON request/response/error contract
MUST/OPTIONAL capability rules
Platform CLI pass-through/orchestration rules
```

---

## DEP-CHANGE-03｜包自身部署闭环，总 Deployment 透传编排

本 Chat 最新用户裁决覆盖此前较弱方案：

> **包自己负责与自身能力相关的 setup/config/account/login/bind/start/stop/status/verify/doctor 细节；总 Deployment 只统一发现、依赖顺序编排并透传标准 package commands。**

例如：

```text
dev-tunnel package
→ 自己检查微软 devtunnel CLI
→ 引导创建账号
→ login
→ configure/bind Gateway
→ start/verify

agent-product package
→ 自己引导 GPT Web 创建
→ copy package.json fields
→ Knowledge upload
→ Action Schema/Auth
→ register role
```

因此需要审计并修正早期文档中：

```text
module only exposes primitives
Platform Planner/Executor owns concrete install/apply
```

这种把模块自身安装/认证细节上提到总 Deployment 的设计。

总 Deployment 仍拥有**平台级组合编排和统一入口**，但不复制 package-specific knowledge。

---

## DEP-CHANGE-04｜Dev Tunnel / Gateway 边界

```text
Custom GPT
→ Microsoft Dev Tunnel
→ local Agent Gateway
```

公网只暴露 Gateway。

Deployment 负责通过两个独立 package 的 lifecycle contract 启动/验证部署；业务 Owner 仍是 Agent Domain。

不得直接公网暴露 Agent Runtime / Task / Execution / Browser bridge。

---

## DEP-CHANGE-05｜Secret / local-platform-token 物化

Agent Domain 已选择 v1 本地受限 secret file，并区分：

```text
role-specific Bearer Key → Custom GPT/Gateway
local-platform-token → Browser Extension/local services
```

Deployment 需要提供 Runtime Home / secret permission / Git-ignore 等统一物理约定，但不能改变两个 credential 的业务身份语义。

# 6. Model & Inference Domain｜NO REQUIRED v1 CHANGE

v1 Custom GPT 自己运行在 ChatGPT Carrier 内，其“推荐模型”只是 Custom GPT Carrier 配置材料。

它不等于 Phase 3 自己的 FAST/REASON Provider 路由。

Agent Domain 未来接自建 runtime / MLXHub 时，才通过 Model & Inference Public API 表达：

```text
FAST
REASON
Vision
structured output
```

v1 不因 Custom GPT 推荐模型字段去修改 Inference Domain。

---

# 7. Platform Conventions｜需要总纲确认的 transitional refs

平台规则要求跨域 ref opaque。

v1 用户明确选择：

```text
roleRef   = real Custom GPT g-id
workerRef = real Conversation c-id
```

这两个值本身带 Carrier 形态，但跨域消费者必须：

```text
只当 opaque string
不得 parse
不得拼 URL
不得根据 g-/c- 前缀推断业务
```

解析只在 Agent `custom-gpt` Carrier Adapter 内。

总纲需要明确：这是否满足 v1 “opaque value / provider-neutral consumer”规则；如果未来需要彻底隐藏 provider-shaped ID，可在 Agent Domain 内增加映射层，但**不得阻塞当前 v1**。

---

# 8. 跨领域依赖矩阵

| Consumer | Provider | 依赖 | 所有权要求 |
|---|---|---|---|
| 产品 Worker | Agent | `listRegisteredRoles` | Agent owns Role Registry |
| 产品 Worker | Task | `createTask` | Task owns Task/role binding |
| Execution Task Driver/application flow | Task | `listTasks/getTask/authorizeTask/startTask/startNode/bindTaskWorker` | Task owns drive eligibility；Extension 不直连 Task |
| Execution Runtime/application flow | Agent | `getRegisteredRole` / Worker identity | Agent owns role→carrier |
| Execution Runtime/application flow | Agent | pending Collaboration | Agent owns logical messages |
| Browser Extension | Execution Runtime | page observation/effect protocol | Execution owns side effect facts |
| Worker | Task | context/document/node commands | Task owns workflow |
| Worker | Agent | ask/reply | Agent owns collaboration |
| Worker | Execution | local/tool/browser capabilities | Execution owns real actions |
| Agent Gateway | Deployment | runtime URL/config/lifecycle | Deployment owns deployed runtime facts |

---

# 9. 总纲审计输出要求

总纲完成本清单后，应明确输出：

```text
ACCEPT AS-IS
ACCEPT WITH CONTRACT CHANGE
DEFER
REJECT / REPLACE
```

逐项覆盖：

```text
TSK-CHANGE-01..09
BHR-CHANGE-01..07
EXE-CHANGE-01..04
DEP-CHANGE-01..05
opaque ref transitional decision
```

未审计前，Agent Domain 实现不得直接跨域修改对方内部代码/数据库来“先跑起来”。

---

<!-- ALIGNMENT-PATCH-20260812 -->

## 2026-08-12 总纲裁决回填

本文件原列出的 Cross-domain CHANGE 已经由 ALIGN-001～250 完成裁决。Task roleBindings/bindTaskWorker/startNode worker resolution、Browser ownership、Dev Tunnel ownership、platform-host、Deployment Module Governance、Collaboration physical delivery ownership 等不再是开放问题；实施时以最终 ALIGN traceability 为准。本文件继续保留作为“提案如何被裁决”的历史证据。
