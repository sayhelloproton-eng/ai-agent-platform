# SKL-001 AI 知识技能

## 目的

为 Agent 提供索引优先、最小上下文、来源可追踪的项目知识能力，并受控地产生 Git Draft、Feishu Projection Plan 和回读验收。

## 能力边界

提供：`query_context`、`package_context`、`propose_asset`、`record_experiment`、`record_decision`、`update_project_state`、`publish_to_feishu`、`detect_drift`。

不提供：任意飞书 CRUD、自动接受 ADR、自动覆盖 Git、自动删除/移动/改权限、无依据宣布完成状态。

## 规范状态

- Git `CTX-002` 是项目动态状态的规范源。
- 飞书 Project Status 是 `CTX-002` 的 Projection，不是独立真源。
- Feishu Native 内容影响项目时，先生成 Git Draft，经 Review 后再投影。

## 输入与输出

- 输入：任务意图、Asset Index、最小相关正文、可选 Provider 证据。
- 输出：Context Package、Knowledge Draft、Write Plan、Validation Report 或 Drift Report。

## 实现

运行时资产位于 [`skills/ai-knowledge/`](../../../skills/ai-knowledge)。Provider 通过 `lark-cli` / OpenAPI 读取飞书；脚本只处理确定性工作，语义判断由 Agent 完成。

## 验证

```bash
cd skills/ai-knowledge
node scripts/validate_bundle.mjs
node tests/self-test.mjs
```

当前验证覆盖 Bundle 完整性、索引构建、检索和草稿生成；真实 Git → Feishu 投影仍属于后续实现。
