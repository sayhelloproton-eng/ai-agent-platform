# CAP-005 Custom GPT Instructions、Knowledge、Actions 与发布配置

## 1. 本文目标

本文说明如何把一个专业 Custom GPT 拆成可治理的配置部分，并解释本项目未来如何从 Git 派生 Builder 配置。

本文不把 Custom GPT 描述为已有完整 Agent Profile、Knowledge Pack 或任务状态系统。

## 2. 配置对象

一个可维护的 GPT 至少包含：

```text
Identity
+ Name / Description
+ Conversation Starters
+ Instructions
+ Knowledge
+ Capabilities
+ Apps 或 Actions
+ Sharing / Release
+ Verification
```

这些对象的变化频率和真源不同，不能全部堆在 Instructions 中。

## 3. Instructions

Instructions 定义 GPT：

- 服务谁；
-解决什么问题；
-如何分步工作；
-哪些资料优先；
-输出格式；
-何时调用工具；
-何时停止；
-禁止做什么。

推荐结构：

```text
角色和目标
→ 输入解释
→ 工作流程
→ 证据和来源
→ Tool / Action 使用规则
→ 输出 Contract
→ Stop Rules
```

原则：

- 使用明确步骤；
-优先写正向、可执行规则；
-为分类和边界提供例子；
-稳定行为进入 Instructions；
-当前任务和进度不进入长期 Instructions。

## 4. Knowledge

Knowledge 是上传给 GPT 的参考文件。

适合：

- 产品手册；
-术语；
-稳定项目共识；
-角色方法；
-评价标准；
-经过 Review 的案例。

不适合：

- 高频变化状态；
-Secret；
-完整聊天历史；
-未经审计的原始材料；
-行为规则；
-实时共享数据库。

本项目采用“两层 Knowledge Pack”设计：

1. 通用基础知识包；
2. 角色专属知识包。

这是 `ai-agent-platform` 的发布治理决策，不是 Custom GPT saved memory。Git 仍是正式真源，Knowledge Pack 只是派生发布资产。

当前仓库尚未物化 `knowledge-packs/`，不能把目标设计描述为现有实现。

## 5. Capabilities、Apps 与 Actions

### Capabilities

Builder 中启用的内置能力。具体列表随产品版本和计划变化。

### Apps

连接用户授权的外部服务，适合读取或操作用户已有工具。

### Actions

调用开发者定义的 HTTP API。Action 由两部分组成：

- Authentication；
- OpenAPI Schema。

一个 GPT 不能同时使用 Apps 和 Actions。

## 6. Actions 的认证

官方当前支持：

- None；
- API Key；
- OAuth。

API Key 可配置为：

- Basic；
- Bearer；
- Custom Header。

OAuth 用于需要用户身份的外部系统，涉及 Client ID、Client Secret、Authorization URL、Token URL、Scope 和回调地址。

原则：

- 密钥保存在 Builder 认证配置，不写入 OpenAPI；
- OpenAPI 不包含真实 Secret；
- 无认证只用于真正公开且无风险的接口；
- 用户级数据优先使用 OAuth；
-后端仍要验证身份和授权。

## 7. OpenAPI Schema

Schema 告诉 ChatGPT：

- 调用哪个 Server；
-有哪些 Endpoint；
-参数是什么；
-响应结构；
-每个操作的 `operationId`。

Schema 使用 JSON 或 YAML。

本项目当前采用窄 Adapter：

```text
POST /v1/runtime/status
```

外部 GPT 不提供内部 Task 字段。Gateway 负责生成：

- `taskId`；
- `capability`；
- `requestedBy`；
- `input`；
- `metadata`。

原因是这些字段属于可信后端边界，不能由模型自由生成。

## 8. 用户确认、Workspace 与隐私

用户可能需要在 Action 执行或数据发送前确认。是否提示还受 Action 类型、产品策略和 Workspace 限制影响。

Public GPT 使用 Actions 时需要有效 Privacy Policy URL。

设计者必须说明：

- 发送什么数据；
-第三方如何处理；
-是否产生副作用；
-如何撤销授权；
-错误和日志保留什么；
-用户何时需要确认。

本项目不会依赖“用户已经点过一次允许”来替代后端安全。

## 9. Preview 与真实验证

验证顺序：

```text
本地 Schema 检查
→ Builder 解析
→ Preview
→ 正式 GPT 自然语言调用
→ Gateway / Runtime 证据
```

不能因为 OpenAPI 本地合法就声称 Builder 兼容，也不能因为 Preview 显示一个按钮就声称真实调用完成。

当前已验证：

- Builder 需要明确的 `components.schemas: {}`；
- Bearer Authentication 可工作；
- GPT 通过自然语言调用 `getRuntimeStatus`；
- Gateway 创建内部 Task；
- Runtime 返回结构化状态。

## 10. 分享、版本和发布

发布前检查：

- Name、Description 和 Conversation Starters 是否清楚；
-Instructions 是否无动态任务状态；
-Knowledge 是否经过 Review；
-无私人和 Secret 内容；
-Apps / Actions 选择正确；
-Action 域名和 Privacy Policy 完整；
-Preview 通过；
-Version History 可恢复；
-分享范围符合权限；
-测试结果和已知限制有记录。

Builder 是发布目标，不是配置真源。

## 11. Git 派生模型

未来目标：

```text
Git Agent Profile
  ├─ Instructions
  ├─ Tools / Actions
  ├─ Approvals
  ├─ Output Contract
  └─ Release

Git Knowledge
  → 通用基础 Pack
  → 角色专属 Pack

Publisher
  → Builder 配置
  → Knowledge 上传
  → 人工 Preview
  → Release 记录
```

当前只确定了原则，Agent Profile 和 Knowledge Pack 尚未物化。

## 12. 当前实现证据

- [`skills/custom-gpt-actions/SKILL.md`](../../../skills/custom-gpt-actions/SKILL.md)
- [`skills/custom-gpt-actions/references/action-adapter-pattern.md`](../../../skills/custom-gpt-actions/references/action-adapter-pattern.md)
- [`skills/custom-gpt-actions/references/openapi-builder-compatibility.md`](../../../skills/custom-gpt-actions/references/openapi-builder-compatibility.md)
- [`apps/dev-tunnel/openapi/custom-gpt-action.openapi.template.yaml`](../../../apps/dev-tunnel/openapi/custom-gpt-action.openapi.template.yaml)
- [`apps/action-gateway/`](../../../apps/action-gateway/)

## 13. 关联文档

- [CAP-004 Custom GPT 产品能力与边界](./CAP-004-CustomGPT产品能力与边界.md)
- [CTX-005 当前能力与演进差距](../00_项目入口/CTX-005-当前能力与演进差距.md)
- [ARC-001 平台总体架构](../04_平台架构/ARC-001-ai-agent-platform总体架构/README.md)
- [DEC-001 架构决策演进摘要](../00_项目入口/DEC-001-架构决策演进摘要.md)

## 14. 产品事实核验基线

核验日期：2026-07-31。

- [OpenAI：Creating and editing GPTs](https://help.openai.com/en/articles/8554397-creating-a-gpt)
- [OpenAI：Configuring actions in GPTs](https://help.openai.com/en/articles/9442513-configuring-actions-in-gpts)
- [OpenAI：GPTs in ChatGPT](https://help.openai.com/en/articles/8554407-gpts-in-chatgpt)

Builder 配置、模型支持、文件限制和发布规则会变化，实际发布时必须重新核验。
