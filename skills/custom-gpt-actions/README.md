# Custom GPT Actions Skill

## What

本 Skill 固化 `ai-agent-platform` 已通过 GPT Builder 和 Preview 验证的 Custom GPT Action 设计、OpenAPI 兼容性与排障规则。

## Why

通用 OpenAPI 校验通过不代表 GPT Builder 一定接受。仓库需要独立保存 Builder 的严格结构约束、窄业务适配端点模式和真实 Preview 验收流程。

## Boundary

本 Skill 负责 Schema 设计与结构校验、Action Adapter 边界、Builder 解析和 Preview 排障。它不管理 Tunnel 生命周期，不读取或轮换 Key，不替代 Gateway Contract，也不操作 Custom GPT Builder。

## Structure

- [`SKILL.md`](SKILL.md)：Agent 运行流程与停止规则；
- [`references/openapi-builder-compatibility.md`](references/openapi-builder-compatibility.md)：Builder 兼容约束；
- [`references/action-adapter-pattern.md`](references/action-adapter-pattern.md)：零参数适配端点模式；
- [`references/testing-and-debugging.md`](references/testing-and-debugging.md)：三阶段验证流程；
- [`references/troubleshooting.md`](references/troubleshooting.md)：稳定症状与修复路径。

## Usage

在设计、修改、导入或排查 Custom GPT Action Schema 时使用本 Skill。公网入口运行与 Microsoft Dev Tunnel 操作继续使用 `microsoft-dev-tunnels` Skill。

## Security

Bearer Key 只在 Builder 的 Authentication 配置中录入，不进入 OpenAPI、日志、测试 Fixture 或 Git。不得让模型选择内部 Capability 或生成平台内部 Task Contract。

## Maintenance

只有经过本地结构校验、Builder 解析和 Preview 真实调用的规则才能记录为“已验证”。Builder 行为变化时保留失败症状、最小修复与回归测试。
