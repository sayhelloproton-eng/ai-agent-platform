# 智能体运行与协作领域｜Gateway、Actions 与 Execution 依赖

> 文档状态：**v0.2 CONFIRMED BOUNDARY**

---

# 1. Gateway 的领域归属

**Agent Gateway 属于智能体运行与协作领域，并且必须是独立 npm 安装/发布包。**

Gateway 不是独立 Domain，也不是 Deployment Domain 的业务能力。

业务职责：

```text
Custom GPT Action public ingress
authentication
role identity
request/schema validation
Action routing
protocol adaptation
result normalization
```

Deployment 只对该独立包进行统一生命周期编排/透传。

---

# 2. v1 唯一公网入口

```text
Custom GPT
→ Microsoft Dev Tunnel public domain
→ Agent Gateway
→ local domain public contracts
```

v1 公网 **只暴露 Gateway**。

禁止公网直接暴露：

```text
Agent Runtime
Task Service
Execution Service
Browser Extension local bridge
SQLite
Local Resource APIs
```

多个 Role 共用同一个 Gateway/Public Base URL，通过不同 role-specific Bearer Key 识别身份。

---

# 3. Microsoft Dev Tunnels

Microsoft Dev Tunnels 适配/管理能力属于 Agent Domain 的 Public Ingress / Carrier connectivity 层，并且必须独立 npm 化：

```text
dev-tunnel package
→ account/login guidance
→ configure
→ bind Gateway
→ start/stop/status
→ public URL
→ verify/doctor
```

Gateway 不把 Microsoft CLI 细节写进业务代码；Gateway 只需要自己的 local listener/public base URL 配置。

---

# 4. Gateway 不拥有下游业务

Gateway：

```text
Custom GPT
  ↓
Gateway
  ├── Agent Runtime Public API
  ├── Task Domain Public API
  └── Execution Domain Public API
```

严格禁止：

```text
Gateway 直接查 Task SQLite
Gateway 直接查 Collaboration SQLite 以绕过 Agent Service
Gateway 直接执行 shell/git
Gateway 直接写文件
Gateway 自己推进 Task
```

即使 v1 为节省资源把多个逻辑模块放在同一 Node process 中，也只能通过 Public Ports/Contracts 连接。

---

# 5. Role 身份

Custom GPT：

```text
Authorization: Bearer <role-specific-key>
```

Gateway：

```text
key → authenticatedRoleRef
```

请求 body 的 `roleRef` 不能覆盖认证身份。

Browser Extension 不使用 Role Key，而使用本机：

```text
local-platform-token
```

---

# 6. Action 三层防误调用

LLM 可能选错工具，v1 必须三层防御：

```text
1. Agent Package 静态 Schema：只暴露该角色需要的 Actions
2. OpenAPI：operationId/summary/description/params 清晰区分
3. Gateway + downstream domain：最终身份/状态/权限/版本合法性
```

原则：

> 模型选择意图；包缩小选择空间；OpenAPI 解释能力；真正 Owner 决定是否合法。

避免：

```text
updateTask
changeStatus
advanceTask
executeAnything
```

使用：

```text
completeNode
waitNode
reopenNode
askPeer
replyPeer
readFile
getGitDiff
getTestResults
...
```

---

# 7. askPeer / replyPeer 路由

这两个 Action 调 Agent Runtime Collaboration Public API。

`askPeer` 目标应表达稳定参与者语义（推荐 `targetAgentPackageRef`），由 Agent Runtime 结合 Task bindings 解析实际 role/worker。

`replyPeer` 根据 `threadId` 自动确定目标。

Gateway 不自己解析 Task participant table。

---

# 8. Task Actions

产品/研发/测试包按角色责任只暴露其实际需要的 Task Actions。

示例：

```text
产品：
- listRegisteredRoles（Agent）
- current carrier context（Agent/Carrier，E2E待定实现）
- createTask（Task）
- Task document actions（按最终权限）
- askPeer/replyPeer

研发：
- getTask/getNodeContext
- completeNode/waitNode
- reopenNode（若总控+研发职责允许）
- askPeer/replyPeer
- Execution typed resources

测试：
- getTask/getNodeContext
- completeNode/waitNode
- test/runtime Execution resources
- askPeer/replyPeer
```

最终精确矩阵见 `17-角色Action静态权限矩阵.md`，Task operation 名以 Task 总纲最终 Contract 为准。

---

# 9. Local Resource 能力归 Execution

Agent Domain 提需求，不拥有真实本机副作用。

角色需要的资源包括：

```text
workspace files
Git
CodeGraph
Node/npm environment
build/test/lint/typecheck
services/processes/ports
health/logs
machine/network
authorized LAN data sources
controlled command execution
```

具体 API、审批、安全边界、path rooting、command policy、Result/Receipt 全部由 Execution Domain 设计和实现。

Agent Package 只决定“该角色可见哪些已注册能力”。

---

# 10. Typed API 优先

优先：

```text
readFile
listFiles
searchFiles
getGitStatus
getGitDiff
getRuntimeVersions
getProjectScripts
getTestResults
readLogs
checkHealth
...
```

`runCommand` 只作为受控 escape hatch，不作为所有查询的统一入口。

---

# 11. Approval / Policy

真实副作用是否需要 Approval 属于 Execution Domain。

Agent/Gateway 不能绕过：

```text
capability registration
path boundary
side-effect classification
approval policy
authorization
```

Agent 可以请求动作，Execution 决定动作能否真实执行。
