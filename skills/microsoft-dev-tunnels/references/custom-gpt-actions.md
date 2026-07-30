# Custom GPT Actions

Custom GPT Action Schema、Builder 兼容性、零参数适配端点和 Preview 排障统一使用 [`custom-gpt-actions`](../../custom-gpt-actions/SKILL.md) Skill；本文只保留 Microsoft Dev Tunnel 运行入口相关步骤。

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
6. 在 Preview 输入“查询本机 Runtime 当前状态。”。

Action 只调用零参数 `POST /v1/runtime/status`。不要让 Custom GPT 生成平台内部 `TaskRequest`；Gateway 必须在服务端生成 `taskId`、`capability`、`requestedBy`、`input` 和 `requestedAt`，再复用通用 Policy 与 Runtime Client 边界。通用 `POST /v1/tasks` 继续保持严格 Contract 校验，不作为 Custom GPT Action Schema。

验收必须看到真实 Action 调用，而不是模型文本回答；请求不应包含 request body，响应应为 succeeded、runtime 为 local-runtime、status 为 ready，并用服务端 taskId 在 Gateway 与 Runtime 日志中对照。若出现 HTML，检查请求方法、Accept 和防钓鱼跳过规则；若 401，检查 Builder Bearer 配置，不轮换 Key。
