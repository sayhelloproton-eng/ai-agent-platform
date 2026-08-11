# 智能体运行与协作领域｜Custom GPT 官方能力与 v1 Carrier 约束

> 校对日期：2026-08-11。此文件只记录 v1 设计实际依赖的 OpenAI Custom GPT 产品事实，避免未来实现者把“平台决定”和“Carrier 当前能力”混为一谈。产品行为可能变化，Carrier 升级时必须重新核对官方文档。

---

# 1. 官方来源

本轮仅以 OpenAI 官方 Help Center 为依据，主要页面：

```text
Creating and editing GPTs
Configuring actions in GPTs
```

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
→ 上传文件中的参考材料
```

因此 v1 Carrier Mapping：

```text
package.json agent.instructions
→ Web Instructions

fixed-context.md / memory.md / knowledge/* 中适合参考的文件
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

产品 pre-Task Worker 需要在 createTask 前取得自身 `workerRef=c-id`。本项目业务方向已经确认通过 Action 获取当前链接/Carrier Context，但在真实验证完成前：

```text
不得假设 GPT Action HTTP request 天然携带 window.location.href
不得假设天然携带 current Conversation c-id
不得信任模型任意自报 URL 作为可信身份
```

必须用真实 Custom GPT + Gateway debug Action 验证可获得的 request metadata，再冻结 Carrier Context 的实现。

若需要本地页面 provider，也不得改变“产品 GPT 是 Task 前用户主动沟通”的业务流程。
