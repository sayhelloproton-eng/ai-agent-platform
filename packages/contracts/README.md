# Contracts

## What

`@ai-agent-platform/contracts` 是 Gateway、Local Runtime 和 Capability 共同依赖的基础协议包，提供 TypeScript 类型、稳定常量和针对 `unknown` 输入的运行时校验。

Contract Version 当前为 `1.0`，npm 包版本为 `0.1.0`。

## Why

先定义协议再实现服务，可以让 Gateway 与 Runtime 依赖同一数据边界，避免 HTTP、执行器或 Provider 细节侵入核心 Contract。

## How

从仓库根目录运行：

```bash
npm run build --workspace @ai-agent-platform/contracts
npm run test --workspace @ai-agent-platform/contracts
npm run check:contracts
```

包构建到 `dist/`，消费者只从 `@ai-agent-platform/contracts` 公共出口导入。

`dist/` 是 `.gitignore` 覆盖的机器生成目录，不进入 Git，也不单独包含 README；其内容始终由 `src/` 重新构建。

## Public API

- `CONTRACT_VERSION`；
- `JsonPrimitive`、`JsonValue`、`JsonObject`、`isJsonValue()`、`isJsonObject()`；
- `CAPABILITY_NAMES`、`CapabilityName`、`isCapabilityName()`；
- `TaskRequest` 及 requester、metadata 类型；
- `ERROR_CODES`、`ErrorCode`、`ContractError`；
- `TASK_RESULT_STATUSES`、`TaskResult`、`EvidenceItem`；
- `ValidationIssue`、`ValidationResult<T>`；
- `validateTaskRequest()`、`validateTaskResult()`、`validateContractError()`。

## Contract v1

`TaskRequest` 包含：

- `contractVersion: "1.0"`；
- 非空 `taskId`；
- 白名单 `capability`；
- JSON Object `input`；
- `requestedBy.type` 与可选非空 `subject`；
- ISO-8601 `requestedAt` 与可选请求关联 ID。

`TaskResult` 包含：

- `contractVersion: "1.0"`、`taskId` 和状态；
- JSON Object 或 `null` 的 `output`；
- `ContractError` 或 `null`；
- JSON-safe Evidence 数组；
- 开始、完成时间，非负有限 `durationMs` 和可选 executor。

## Result Invariants

- `succeeded` 的 `error` 必须为 `null`；
- `failed`、`rejected`、`timed_out` 必须带合法 `ContractError`；
- `completedAt` 不得早于 `startedAt`；
- 时间字段必须是带时区的 ISO-8601 date-time；
- validator 返回所有已发现的重要问题，不抛出普通输入校验异常。

## Capability Allowlist

Contract v1 只允许：

- `gateway.ping`
- `runtime.status`
- `system.info.safe`

未知名称和危险名称（例如 `shell.exec`）会被拒绝。

## Security Boundary

- 运行时依赖为零；
- 只接受 JSON-safe 数据，拒绝 `undefined`、BigInt、Symbol、Function、非有限数字、Date、Map、Set、自定义类和循环引用；
- `ContractError` 不声明 stack 或原始 Error，validator 显式拒绝 `stack`；
- validator 不修改输入、不填默认值、不删除未知字段；
- v1 保留普通未知字段以支持渐进演进，但生产者仍必须在边界处完成 Secret 脱敏。

本包不实现 HTTP、认证、授权、日志、执行、重试、Provider、Git、飞书或 Codex 调用。

## Current Limitations

- v1 不强制 `taskId` 使用 UUID；
- v1 不拒绝所有未知字段；
- 未提供 Schema 文件或跨语言代码生成；
- 当前消费者为 `apps/action-gateway/` 与 `apps/local-runtime/`；跨语言 Schema 和代码生成仍未提供。

## Evolution

向后兼容字段可以在 Contract `1.0` 内审慎增加；破坏字段语义、状态或不变量的变更必须引入新的 Contract Version，并保留旧版本迁移策略和测试。

## Skill Boundary

`skills/ai-knowledge` 不属于 npm workspace，不依赖本包，也未因本包创建而迁移。Contracts 只服务平台运行时协议。

## Related Docs

- [SOL-006：Task / Result / Error Contract v1](../../docs/technical/技术方案/Gateway/SOL-006-Task-Result-Error-Contract-v1.md)
- [源码说明](src/README.md)
- [测试说明](tests/README.md)
