# CAP-008 Agent 扩展与治理：AGENTS、Rules、Skills、Hooks、MCP 与 Plugins

## 1. 为什么必须区分这些机制

AGENTS、Rules、Skills、Hooks、MCP、Plugins 和 Actions 都能影响 Agent 行为，但它们解决的问题不同。

混用会产生典型错误：

- 把文档规则当安全边界；
- 把 Skill 当动态状态；
- 把 MCP 当业务流程；
- 把 Hook 当 CI 或 Sandbox；
- 把 Plugin 当项目真源；
- 把 Action 当本地工具配置。

## 2. 机制地图

| 机制 | 主要职责 | 典型输入 | 典型输出 | 信任边界 |
|---|---|---|---|---|
| `AGENTS.md` | 长期仓库指导和目录上下文 | Markdown 指令 | 合并后的 Agent 指导 | 只影响行为，不提供强制安全 |
| Rules | 控制命令越过 Sandbox 时 allow / prompt / forbidden | 命令前缀 | 权限决定 | 执行权限层，当前仍属实验能力 |
| Skills | 可复用任务流程、资源和脚本 | 任务与上下文 | 标准化工作结果 | 指导与程序性知识 |
| Hooks | 在生命周期事件上运行确定性逻辑 | Agent 事件 | 脚本结果或阻断 | 运行本机代码，需信任来源 |
| MCP | 连接外部工具和上下文 | Tool Call | 外部工具结果 | Server、认证和数据边界 |
| Plugins | 可安装分发包，可包含 Skills 与 Connectors | 安装与启用 | 一组共享能力 | Workspace 与发布治理 |
| Actions | Custom GPT 通过 OpenAPI 调用 HTTP API | GPT Action Call | API 响应 | 外部 API、认证、Policy |

## 3. AGENTS.md

适合：

- 仓库目标；
-目录职责；
-编码和文档规则；
-测试命令；
-安全底线；
-长期工作方式。

不适合：

- 单次任务范围；
-动态进度；
-Secret；
-必须由程序强制的权限；
-完整知识库正文。

本仓库的 `AGENTS.md` 是人类和 Agent 共同入口，但真实门禁仍由 Git、Schema、测试和执行权限实现。

## 4. Rules

Rules 控制 Codex 请求在 Sandbox 外运行命令时如何处理。

常见决定：

- `allow`；
- `prompt`；
- `forbidden`。

Rules 当前是实验能力，语法和行为可能变化。

Rules 适合限制明确命令前缀，不适合：

- 判断复杂业务权限；
-替代应用后端 Policy；
-保护未受 Sandbox 覆盖的外部系统；
-根据自然语言推断用户真实意图。

## 5. Skills

Skill 封装可重复的方法，包括：

- 触发描述；
-工作步骤；
-模板；
-示例；
-Schema；
-参考资料；
-可选脚本和 Evals。

Skill 适合“怎样稳定完成一类任务”，不适合保存：

- 当前 Task 状态；
-用户身份；
-Secret；
-运行时队列；
-审批记录。

### 5.1 Git 真源与 Host 安装

本仓库使用：

```text
skills/<skill-name>/SKILL.md
```

作为正式 Git Skill 资产。

Codex / ChatGPT Host 可能使用自己的安装、发现和 Plugin 目录。两者关系是：

```text
Git 正式 Skill
→ 校验和 Release
→ Host 安装或 Plugin 分发
```

不得因为 Host 路径变化而把正式真源迁出 Git。

## 6. Hooks

Hook 在 Agent 生命周期事件上运行确定性代码，可用于：

- 记录；
-格式化；
-验证；
-阻止不允许的动作；
-触发通知；
-补充证据。

Hook 不是：

- 安全 Sandbox；
-完整 CI；
-任务编排器；
-领域事件总线。

Hook 会执行代码，因此必须审查来源、输入和副作用。来自不受信任仓库的 Hook 不应自动启用。

## 7. MCP

MCP 为 Agent 暴露外部工具、资源和 Server Instructions。

本地 Codex 可以连接：

- STDIO Server；
- Streamable HTTP Server；
-需要认证的远程 Server。

ChatGPT Web 通过 Plugin 或远程连接使用 MCP 工具，不读取本地 Codex 配置。

MCP 负责“能调用什么”，不负责完整业务 Workflow。业务状态、审批、幂等、补偿和证据仍属于平台控制面。

## 8. Plugins

Plugin 是可安装分发单元，可以包含：

- Skills；
- Connectors；
-MCP Server；
-可选 UI。

适合团队共享能力，不应成为：

-项目唯一真源；
-未经 Review 的自动代码入口；
-绕过 Workspace 管理的安装方式。

当前 `ai-agent-platform` 尚未实现 Plugin 发布系统。

## 9. Actions 与 MCP

| Actions | MCP |
|---|---|
| Custom GPT 面向 HTTP API | 通用 Agent Tool / Context 协议 |
| 使用 OpenAPI | 使用 MCP Server 协议 |
| Builder 中配置认证 | Host 或 Plugin 中配置连接 |
| 适合窄业务 Adapter | 适合多工具与资源集合 |
| 当前项目已有真实 MVP | 当前项目尚未实现 MCP 接入 |

二者都必须有认证、数据边界和后端 Policy。

## 10. 选型规则

| 需求 | 优先机制 |
|---|---|
| 告诉 Agent 仓库长期规则 | AGENTS |
| 控制命令是否可越过 Sandbox | Rules |
| 复用稳定任务方法 | Skill |
| 在生命周期点运行确定性脚本 | Hook |
| 连接外部工具和上下文 | MCP |
| 分发一组 Skills / Connectors | Plugin |
| 让 Custom GPT 调用窄 HTTP API | Action |
| 保存动态任务状态 | Task Store，而不是以上机制 |
| 强制业务权限 | 后端 Policy，而不是文档指令 |

## 11. 本项目当前实例

- `skills/ai-knowledge/`：知识治理和飞书投影方法；
- `skills/custom-gpt-actions/`：Action Schema、认证和真实路径验证；
- `skills/microsoft-dev-tunnels/`：开发期 Tunnel 管理；
- `skills/engineering-insight-distillation/`：工程洞见提炼与 Evals；
- 根 `AGENTS.md`：项目宪法；
- Custom GPT Action：`runtime.status`；
- MCP、Plugin、项目级 Rules 与 Hooks：尚未正式实现。

## 12. 组合示例

### 知识发布

```text
AGENTS
→ AI Knowledge Skill
→ lark-cli / Publisher Tool
→ Git Registry
→ 人工写入批准
```

### 本地编码任务

```text
AGENTS
→ Task Contract
→ Codex
→ Sandbox / Rules
→ Skill
→ Tests / Hooks
→ Git Evidence
```

### 未来共享工具

```text
Git Skill
→ Plugin
→ MCP Connector
→ Workspace 安装
→ Policy / Approval
```

## 13. 关联文档

- [CAP-005 Custom GPT 配置与 Actions](./CAP-005-CustomGPT-Instructions-Knowledge-Actions与发布配置.md)
- [CAP-006 Codex 产品与执行体系](./CAP-006-Codex产品与执行体系.md)
- [CAP-007 Codex 配置、权限与执行基线](./CAP-007-Codex配置权限与执行基线.md)
- [THY-003 Agent + Skills 开发范式](../03_架构思想与理论/THY-003-Agent与Skills开发范式.md)
- [PRD-007 平台与上层产品边界](../01_产品体系/PRD-007-平台与上层产品边界.md)

## 14. 产品事实核验基线

核验日期：2026-07-31。

- [OpenAI：AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [OpenAI：Rules](https://learn.chatgpt.com/docs/agent-configuration/rules)
- [OpenAI：Build skills](https://learn.chatgpt.com/docs/build-skills)
- [OpenAI：Hooks](https://learn.chatgpt.com/docs/hooks)
- [OpenAI：MCP](https://learn.chatgpt.com/docs/extend/mcp)
- [OpenAI：Skills & Plugins](https://learn.chatgpt.com/docs/skills-and-plugins)

产品格式、安装路径和成熟度会变化；正式资产真源仍由本仓库决定。
