---
docId: AGENT-DOC-02-02
title: 智能体运行与协作领域｜Custom GPT 官方能力与 v1 Carrier 约束
docType: carrier-contract
authority: normative
lifecycle: frozen
domain: agent-runtime-collaboration
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 智能体运行与协作领域｜Custom GPT 官方能力与 v1 Carrier 约束

> 校对日期：2026-08-12。此文件只记录 v1 设计实际依赖的 OpenAI Custom GPT 产品事实，避免未来实现者把“平台决定”和“Carrier 当前能力”混为一谈。产品行为可能变化，Carrier 升级时必须重新核对官方文档。

---

# 1. 官方来源

当前设计只采用 OpenAI 官方 Developers / Help Center 已明确公开的能力，主要页面：

```text
Sending and returning files with GPT Actions
Production notes on GPT Actions
GPT Action authentication
Getting started with GPT Actions
GPT Actions introduction
Creating and editing GPTs
Configuring actions in GPTs
Scheduled Tasks in ChatGPT
```

未公开或未形成稳定官方 Contract 的行为，不作为平台硬依赖。

---

# 2. GPT editor 的配置面

当前官方说明中，GPT editor 支持创建/配置 GPT，并包含：

```text
Instructions
Knowledge
Recommended model
Capabilities
Actions
```

因此 Agent Package 的 Custom GPT setup CLI 应逐项映射这些真实字段，而不是抽象成一个无法操作的“export Agent”。

---

# 3. Instructions vs Knowledge

官方区分：

```text
Instructions
→ 行为、规则、语气、工作流指导

Knowledge
→ 上传文件中的长期 Knowledge 材料
```

因此 v1 Carrier Mapping：

```text
package.json agent.instructions
→ Web Instructions

fixed-context.md / memory.md / knowledge/* 中适合长期复用的文件
→ Web Knowledge 手动上传
```

Task/Node/reopen 动态事实不进入 Knowledge。

---

# 4. Recommended model / Capabilities

Recommended model 是 GPT 的推荐模型配置项；用户仍可能在可用时切换模型。

Capabilities 是 GPT 内置能力开关，具体可用项取决于账号/工作区/地区。

因此 Agent Package：

- 可以给出推荐值；
- CLI 应明确提示人工选择；
- 不应把“推荐模型一定被强制使用”写成平台安全前提；
- 关键边界仍靠 Actions/Owner 服务端校验。

---

# 5. Actions

官方当前定义：Actions 用于连接用户定义的外部 API。

Action 配置依赖两部分：

```text
Authentication
OpenAPI Schema
```

OpenAPI Schema 描述：

```text
server
endpoints
parameters
operationId
```

支持 JSON/YAML。

v1 对应：

```text
Custom GPT
→ Action
→ Agent Gateway
→ Domain Public APIs
```

---

# 6. Action Schema 导入

官方说明可：

```text
直接粘贴 Schema
从 URL 导入
从示例开始
```

v1 决策仍然是：

> 每个 Agent Package 静态维护一份 Action Schema。

即使使用 URL 导入，也不假设 GPT 会自动持续同步 URL 内容。包升级后仍由 CLI 提示用户更新 Web 配置并人工确认。

---

# 7. Action Authentication

官方 Action auth 支持：

```text
None
API Key
OAuth
```

API Key 可配置 Bearer 等模式。

v1 选择：

```text
API Key / Bearer
一个 Role 一个独立 Key
```

这是平台安全设计，不是 OpenAI 强制要求。

---

# 8. 用户控制与 Action approval

官方说明用户在 Action 使用时可能被要求批准/确认。

因此：

- v1 不假设 Custom GPT Action 永远无 UI confirmation；
- 平台自己的高风险副作用 Approval 仍由 Execution Domain 拥有；
- OpenAI UI 的 Action confirmation 与平台 Execution Approval 不是同一个事实。

---

# 9. v1 不依赖 Custom GPT management API

当前官方资料描述的创建/编辑流程是 GPT editor。

本设计没有把“通过 API 自动 create/update/publish Custom GPT”作为 v1 能力，也没有找到可作为本项目硬依赖的官方公开管理 Contract。

因此：

```text
Agent Package/CLI
→ 提供字段内容/上传文件/Schema/Auth 指引
→ 用户在 ChatGPT Web 人工创建/更新
```

如果未来 OpenAI 提供稳定官方管理接口，可以新增 Carrier automation Adapter，但不改变 Agent Package / Role / Worker 核心语义。

---

# 10. validate-role 的现实边界

因为 v1 不依赖官方管理读回接口，CLI 自动验证不能声称读取完整 GPT Web 配置。

必须区分：

```text
可自动：
roleRef/url 格式
package version
key/config
Gateway reachability
auth probe
local OpenAPI validation

需人工：
Instructions 是否最新
Knowledge 是否上传正确
推荐模型/Capabilities 是否选择正确
Web Action Schema 是否已更新
```

这也是 v1 setup CLI 要逐步引导用户的原因。


---

# 11. Current page URL / Conversation c-id 不是已冻结的官方 Action metadata

产品 pre-Task Worker 需要在 `createTask` 前取得自身 `workerRef=c-id`。Action/current-link 是轻量优化候选，但在真实验证完成前只属于 `PENDING_SPIKE`：

```text
不得假设 GPT Action HTTP request 天然携带 window.location.href
不得假设天然携带 current Conversation c-id
不得信任模型任意自报 URL 作为可信身份
```

必须用真实 Custom GPT + Gateway debug Action 验证可获得的 request metadata，再冻结 Carrier Context 的实现。

若需要本地页面 provider，也不得改变“产品 GPT 是 Task 前用户主动沟通”的业务流程。

---

## OpenAI Carrier 能力状态与 v1 边界

OpenAI Carrier 已提供的能力直接纳入 Agent/Gateway/Deployment 合同；平台只保留自身必须拥有的事实、执行、身份与恢复能力。

### A. VERIFIED_CONTRACT｜v1 Carrier 正式合同

#### A1. `openaiFileIdRefs`：Conversation → Action 文件输入

GPT Action 的文件输入参数名固定为：

```text
openaiFileIdRefs
```

单次最多 10 个 Conversation 文件。来源可包括用户上传文件、DALL·E 生成图片、Code Interpreter 创建文件。

Gateway 的 OpenAI transport boundary 必须把该字段先按 `unknown` 接收，再做专门 runtime normalization。ChatGPT 实际运行时对象形状按官方说明为：

```ts
export interface OpenAIActionFileInputRef {
  name: string;
  id: string;
  mime_type: string;
  download_link: string;
}

export type OpenAIFileIdRefsRuntime = OpenAIActionFileInputRef[];
```

注意：官方 OpenAPI 示例可能把 `openaiFileIdRefs` 声明为 `string[]`，但运行时填充为对象数组。**Gateway 不能用普通静态 DTO 直接假设二者相同。**

约束：

- `download_link` 约 5 分钟有效，只能作为瞬时下载 locator；
- 不得把 `download_link` 持久化为 TaskDocument / Evidence 的长期地址；
- OpenAI `id` 只能作为 transport provenance / externalRef，不能成为 TaskDocument、Execution Artifact 或 Worker 的业务主键；
- 文件 bytes 的真实下载、大小/MIME/hash 校验与材料化属于 Execution mechanics；Gateway 不成为业务文件 Owner。

#### A2. `openaiFileResponse`：Action → Conversation 文件输出

Action 可以返回：

```text
openaiFileResponse
```

一次最多 10 个文件；每文件最大 10 MB；不能返回 image/video。

支持两种 item：

```ts
export type OpenAIFileResponseItem =
  | {
      name: string;
      mime_type: string;
      content: string; // base64
    }
  | string;            // OpenAI 可获取的 HTTPS URL

export interface OpenAIFileResponseEnvelope {
  openaiFileResponse: OpenAIFileResponseItem[];
}
```

URL 模式的文件响应必须包含：

```text
Content-Type
Content-Disposition
```

OpenAI 对每个返回文件的获取超时为 10 秒。

v1 规则：

- 小文件可 inline；
- 非平凡文件优先使用 Gateway 的短期 opaque relay URL；
- relay 只是 OpenAI transport adapter，不新建 File Service / Artifact Domain；
- relay 不暴露真实本机 path、credential 或业务内部 locator。

#### A3. Actions production hard limits

GPT-facing Gateway / OpenAPI conformance 必须纳入：

```text
45s round-trip hard ceiling
request < 100,000 chars
response < 100,000 chars
TLS 1.2+
public HTTPS / port 443
real HTTP 429/5xx
raw structured response
```

因此：

- 长任务不能阻塞一个 Action 请求等待全部执行结束；
- 大型 Task 文档/产物不再默认塞进 Action JSON；
- Gateway 不用 `200 + error object` 隐藏 overload/server failure；
- static OpenAPI endpoint summary/description 与 parameter description 必须遵守 OpenAI 当前长度约束并进入 conformance。

#### A4. GPT-facing transport 不依赖 Custom Headers

OpenAI Actions 不支持平台任意自定义 request headers。GPT-facing contract 不得要求：

```text
Idempotency-Key
X-Correlation-Id
X-Task-Version
X-Node-Version
X-Worker-Ref
```

这些平台字段放入 typed body/path/query；Gateway 再转换为内部 canonical request。Authentication header 仍由 OpenAI Action auth 配置负责。

#### A5. `x-openai-isConsequential` 必须显式设置

每一个 GPT Action operation 都必须显式声明：

```yaml
x-openai-isConsequential: true
```

或：

```yaml
x-openai-isConsequential: false
```

禁止依赖 OpenAI 对 GET / 非 GET 的默认推断。

平台内部 query/control/intent Action 若自身不直接完成不可逆真实 Effect，默认设计为 `false`；真正 Effect 是否允许执行继续由 Execution Policy / Approval 决定。

```text
OpenAI Carrier confirmation
!=
Execution Effect Approval
```

不得把二者合并，也不得为了同一个真实 Effect设计两套重复审批。

#### A6. Agent Package / Role capability truth

Custom GPT v1 继续使用 Actions；Apps 与 Actions 不同时作为同一个 GPT 的 P0 工具链。

Recommended model 只是 advisory，不是 Role READY 的强绑定；当前带 Actions 的 GPT 还必须使用 Action-compatible model（不把 Pro mode 作为 Actions Carrier 运行前提）。Role READY 应依据：

```text
GPT/Role exists
Actions schema installed
Action auth valid
required capabilities enabled
Gateway reachable
real Preview/E2E PASS
```

而不是 `recommendedModel == 某精确 model id`。

Custom GPT 创建/编辑仍按 Web-only 流程处理；Deployment 继续使用既有 `ACTION_REQUIRED`，并以 `actionRequired.kind=WEB` 表达 Web 人工步骤，不能承诺 CLI 全自动修改 GPT。

### B. PENDING_SPIKE｜官方能力存在，但本平台使用方式仍需真实 E2E

下面只验证“在我们的 Role / Worker / Task Driver 主链中是否稳定”，不是验证 OpenAI 文档是否存在：

```text
1. x-openai-isConsequential:false 后选择 Always Allow，后续 routine Actions 是否稳定无确认；
2. 一次 Worker Turn 内连续 Action A → result → Action B 是否稳定，无需 Browser 中途再次 WAKE；
3. openaiFileResponse 返回 Task documents 后，Conversation-native file search 是否稳定满足动态 Task Context；
4. Code Interpreter 读取 bounded Context Pack → 生成 patch/artifact → openaiFileIdRefs 回传是否稳定。
```

通过后可把 Browser 的 routine permission click、大型上下文注入、逐 Action WAKE、无界逐文件 Action 往返进一步从 happy path 裁掉。

### C. REJECTED_OR_UNSUPPORTED｜明确不作为 v1 主路径

```text
不得假设 GPT Action request 自动提供稳定 Conversation c-id
不得用 ChatGPT Scheduled Tasks 替代 GPT Worker Task Driver
不得用 Code Interpreter 替代真实本机/Browser Execution
不得因 File Bridge 删除 Browser/Vision
不得把 Custom GPT native Actions/Function Calling 等同于 Model Runtime native tool_calls
不得新增 File Domain / Artifact Domain / OpenAI Files DB
```

平台 → GPT 图片/视频不能依赖 `openaiFileResponse`；Browser screenshot / Model Vision 路径继续保留。

### D. v1 Carrier/Data Movement 原则

```text
小型结构化控制数据     → GPT Action JSON
文档 / 文件 / 大型上下文 → GPT Actions File Bridge
Conversation identity/lifecycle → Execution Browser
页面真实状态 / screenshot → Execution Browser + Vision
真实本机 / 浏览器 Effect → Execution
业务事实               → owning Domain
```

这条规则的目标是复用 ChatGPT 已有能力并减少自研 transport，而不是新增一层平台架构。
