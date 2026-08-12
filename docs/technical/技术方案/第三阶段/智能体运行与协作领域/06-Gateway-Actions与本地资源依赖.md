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

# 3. Microsoft Dev Tunnels（MOVED TO DEPLOYMENT）

**Superseded by ALIGN-029：** Microsoft Dev Tunnels 是 Deployment-owned External Resource Module，不属于 Agent Domain package ownership。Agent Gateway 只声明/消费稳定的 public-ingress logical capability / `moduleRef`，不拥有 tunnel account/login/lifecycle：

```text
Deployment External Resource Module (Dev Tunnel adapter)
→ account/login/configure/start/stop/status/verify/doctor（仅暴露现实支持的 lifecycle）
→ provides public-ingress capability / current public URL

Agent Gateway
→ requires public-ingress moduleRef / logical capability
→ owns only Gateway local listener + Carrier ingress protocol
```

Gateway 不把 Microsoft CLI 细节写进业务代码，也不把 Dev Tunnel 保存为 Agent-owned deployment unit。

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

OpenAI `x-openai-isConsequential` 只控制 Carrier UI confirmation，不取代 Execution Approval。Routine platform control/intent Action 通过静态 Schema 显式标记 consequential=false；真实副作用仍由 Execution owner 判定。

---

<!-- OPENAI-CARRIER-ABSORPTION-20260812 -->

# 12. OpenAI Actions Transport Contract

Gateway 是 OpenAI Carrier Anti-Corruption Layer，因此 **GPT-facing DTO 与内部 Domain DTO 可以不同**。Carrier 限制只停留在 Gateway adapter，不污染 Task / Agent / Execution / Model Public Contract。

## 12.1 GPT-facing request 不依赖 Custom Headers

GPT Action 不要求平台自定义 Header。以下字段必须在 typed body/path/query 中表达：

```text
idempotencyKey
correlationId
expectedTaskVersion
expectedNodeVersion
taskId
nodeId
workerRef
```

Gateway 完成认证与 normalize 后，再转换为内部 canonical request。Role API-key/Bearer auth 继续由 Action Authentication 配置提供。

## 12.2 Production hard limits

Gateway / Deployment conformance 必须检查：

```text
45s Action round-trip hard ceiling
request/response < 100,000 chars
TLS 1.2+
public HTTPS port 443
real HTTP 429/5xx
structured raw response
```

长时间 Execution 采用“快速接受/返回 ref → 后续查询/Worker continuation”，不让一个 Action HTTP request 阻塞到真实任务完全结束。

## 12.3 `x-openai-isConsequential`

每个 operation 必须显式声明 `true/false`，禁止依赖 HTTP method 默认值。

平台 query/control/intent operation 若自身不直接完成不可逆真实 Effect，静态 Schema 设为：

```yaml
x-openai-isConsequential: false
```

真正 Local/Browser Effect 仍经过 Execution Policy / Approval。若未来存在 Action endpoint 自身直接完成高风险外部 Effect，才把该 operation 设为 `true`。

`Always Allow` 在目标 Custom GPT 主链中的实际稳定行为仍需真实 Preview/E2E；在验证通过前，Browser permission recovery 不能删除。

# 13. GPT Actions File Bridge

## 13.1 Ingress：`openaiFileIdRefs`

Gateway 必须专门 normalize：

```ts
interface OpenAIActionFileInputRef {
  name: string;
  id: string;
  mime_type: string;
  download_link: string;
}
```

规则：

- 最多 10 个 Conversation 文件；
- `download_link` 是约 5 分钟瞬时 locator，不持久化；
- OpenAI file id 只记 provenance/externalRef，不作为领域实体 ID；
- Gateway 不直接把不受信任 URL bytes 写入业务目录；
- 需要导入真实 bytes 时通过 Execution 的受控 File/Network mechanics 做 MIME/size/hash/scope 校验。

## 13.2 Egress：`openaiFileResponse`

Gateway 支持：

```text
inline base64 item
HTTPS relay URL item
```

约束：

```text
最多 10 files
每文件 <= 10 MB
不得返回 image/video
URL fetch 需要 Content-Type + Content-Disposition
OpenAI 单文件 fetch timeout = 10s
```

非平凡文件优先短期 opaque relay URL。Relay 只解决 Carrier transport，不拥有 TaskDocument / Execution Artifact 的业务语义。

## 13.3 Ownership

```text
Gateway   → OpenAI file protocol / normalize / relay
Task      → TaskDocument truth
Execution → physical fetch/materialization/hash/evidence
Agent     → Carrier/Role/Worker/Collaboration
Deployment→ capability/config/verify
```

不新增 File Service / Artifact Domain。

## 13.4 Dynamic Context

Custom GPT Worker 的大型 Task Context 优先：

```text
Worker
→ getNodeContext / getTaskDocument Action
→ Gateway
→ Task Public API
→ openaiFileResponse
→ current Conversation
```

Browser WAKE 只传小型 identity/trigger。File Bridge 失败时允许小型 bounded text fallback，但不得重新把完整 PRD/日志/代码包恢复为 DOM 注入主路径。

<!-- ALIGNMENT-PATCH-20260812 -->

## ALIGN-001～250 增量修复：Gateway / Execution / Deployment

- Gateway 是 Custom GPT Actions 公网 Anti-Corruption Layer，不拥有下游业务状态，不直接触达 Local/Browser Effect。
- Dev Tunnel 改由 Deployment External Resource Module 管理；Gateway 只 Requires 一个满足 public ingress capability 的 moduleRef/逻辑能力。
- 本地/浏览器真实能力统一通过 Execution Public Contract；Gateway 不 import execution-local/browser internal implementation。
- GPT-facing transport 的 OpenAI hard limits 与 File Bridge 官方协议进入 Agent Carrier conformance；只有 Always Allow / Multi-Action Turn / Conversation file search / Context Pack 的目标环境行为保持 `PENDING_SPIKE`。
