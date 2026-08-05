# Custom GPT Actions

Custom GPT Action Schema、Builder 兼容性、零参数适配端点和 Preview 排障统一使用 [`custom-gpt-actions`](../../../skills/custom-gpt-actions/SKILL.md) Skill；本文只保留 Microsoft Dev Tunnel 运行入口相关步骤。

先运行：

```bash
npm run dev-tunnel:openapi
```

Builder 使用忽略文件 `apps/dev-tunnel/.runtime/custom-gpt-action.openapi.yaml`：

1. 在 Action 中粘贴解析后的 YAML；
2. Authentication 选择 API Key；
3. Auth Type 选择 Bearer；
4. 从本机私有配置读取现有 Gateway Client Key并录入 Builder，不在聊天或日志中复制；
5. 选择支持 Actions 的模型；
6. 先在 Preview 调用 `getRuntimeStatus` 验证公网链路；
7. 再调用 `getTaskDecisionContext` 查询 `task-ctl-001`；
8. 使用最新 Task Version 调用 `claimControllerTask`；
9. 使用 Claim Token 调用 `submitControllerCommand` 创建最小 Plan。

Schema 暴露五个窄化 Operation：四个 Controller 业务入口和零参数 Runtime Status。不要让 Custom GPT 生成通用内部 `TaskRequest`，也不要让模型提交 `profileId`、`roleId`、Actor、Task 字段 Patch 或 Plan Node 运行状态。Gateway 根据 Builder Bearer Key 绑定具体 Profile 和 Role。

验收必须看到真实 Action 调用，而不是模型文本回答。Runtime Status 应返回真实本机状态；Controller 调用应严格遵循“先查上下文，再 Claim，再提交带版本和幂等键的业务命令”。若出现 HTML，检查请求方法、Accept 和防钓鱼跳过规则；若 401，检查 Builder Bearer 配置，不轮换 Key。Builder Preview 未实际完成前，不得宣称线上总控闭环已验证。
