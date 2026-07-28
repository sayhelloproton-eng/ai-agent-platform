# SOL-006: Task / Result / Error Contract v1

## 1. 背景

Phase 2 AI Coding Workflow 需要在实现 Action Gateway 和 Local Runtime 之前确定稳定的数据边界。若服务各自定义请求、结果和错误，认证、策略、执行与审计会建立在不一致的语义上。

本方案的实现位于 `packages/contracts/`。

## 2. 目标

- 为 Gateway、Runtime 和 Capability 提供共享的编译期类型；
- 对外部 `unknown` 输入执行无依赖运行时校验；
- 固定 Contract Version、Capability 白名单、错误码和 Result 不变量；
- 保持协议与 HTTP、Provider、设备和执行实现解耦。

## 3. 非目标

本方案不实现 HTTP、Gateway、Runtime、认证、权限、日志、重试、Capability 执行、Provider 适配或任何外部系统调用。

## 4. Contract Version

第一版固定为：

```text
1.0
```

每个 `TaskRequest` 和 `TaskResult` 都必须包含 `contractVersion: "1.0"`。npm 包自身版本为 `0.1.0`，与协议版本分别演进。

## 5. Task Request

`TaskRequest` 定义：

```typescript
interface TaskRequest {
  readonly contractVersion: "1.0";
  readonly taskId: string;
  readonly capability: CapabilityName;
  readonly input: JsonObject;
  readonly requestedBy: {
    readonly type: "custom-gpt" | "internal" | "test";
    readonly subject?: string;
  };
  readonly metadata: {
    readonly requestedAt: string;
    readonly requestId?: string;
    readonly correlationId?: string;
  };
}
```

`taskId`、可选 subject 和关联 ID 必须非空。`requestedAt` 必须为带时区的 ISO-8601 date-time。v1 不绑定 UUID 生成策略。

## 6. Task Result

Result 状态为：

```text
succeeded
failed
rejected
timed_out
```

`TaskResult` 包含 JSON Object 或 `null` 的 output、Contract Error 或 `null`、Evidence 数组，以及开始时间、完成时间、执行耗时和可选 executor。

Evidence 类型限定为 `log`、`metric`、`reference`，其 value 必须是 JSON Value。

## 7. Error Contract

稳定错误码：

```text
INVALID_TASK
UNAUTHENTICATED
FORBIDDEN
CAPABILITY_NOT_FOUND
RUNTIME_UNAVAILABLE
EXECUTION_FAILED
TIMEOUT
INTERNAL_ERROR
```

`ContractError` 包含 code、非空 message、retryable 和可选 JSON Object details。协议不包含 stack 或原始 Error；运行时校验显式拒绝 `stack` 字段。

错误 message 和 details 在进入 Contract 前必须脱敏。Validator 不尝试猜测哪些业务字符串是 Secret。

## 8. Capability

Contract v1 白名单：

```text
gateway.ping
runtime.status
system.info.safe
```

未知名称会被拒绝。`shell.exec`、文件写入、Git 写入和 Codex 执行不属于本版本。

## 9. 运行时校验

公共 API：

```typescript
validateTaskRequest(input: unknown): ValidationResult<TaskRequest>
validateTaskResult(input: unknown): ValidationResult<TaskResult>
validateContractError(input: unknown): ValidationResult<ContractError>
isJsonValue(input: unknown): input is JsonValue
isJsonObject(input: unknown): input is JsonObject
```

Validator：

- 接收 `unknown`，不使用 `any`；
- 不抛出普通输入校验异常；
- 返回路径、代码和消息组成的问题列表；
- 不修改输入、不填默认值；
- 返回原始合法对象；
- 不静默删除未知字段。

v1 允许普通未知字段，以便渐进增加兼容信息；`ContractError.stack` 属于明确安全例外，会被拒绝。

## 10. 状态与错误不变量

- `succeeded` 必须使用 `error: null`；
- 非 `succeeded` 状态必须携带合法 Contract Error；
- `durationMs` 必须是非负有限数字；
- `completedAt` 不得早于 `startedAt`；
- output 非空时必须是 JSON Object；
- Evidence 必须为数组且每项类型、名称和值都合法。

## 11. JSON 与安全考虑

协议只接受 JSON primitive、JSON Object 和 JSON array。

运行时校验拒绝：

- `undefined`、BigInt、Symbol、Function；
- `NaN` 与正负 Infinity；
- Date、Map、Set、自定义类实例；
- 循环对象；
- 非白名单 Capability；
- Error stack。

Contracts 包无运行时依赖，不读取环境变量、用户目录、网络、Git 或飞书。

## 12. 兼容性与演进

- 增加可选、向后兼容字段前必须同步类型、validator、测试和文档；
- 破坏字段、状态、错误码或不变量的变更必须引入新 Contract Version；
- 未知字段在 v1 保留，但消费者不得依赖未进入公共 API 的字段；
- 包版本与 Contract Version 独立管理。

## 13. 测试策略

测试使用 Node.js 20 内置 `node:test` 与 `node:assert/strict`，从编译后的公共入口导入。

当前覆盖：

- 合法和非法 Task；
- Capability 白名单；
- JSON 数据边界；
- 合法 Result；
- Result/error 不变量；
- duration 和时间顺序；
- Error Code 与 stack；
- validator 不修改输入。

测试不访问网络、用户目录、Git 写操作、飞书或真实 Secret。

## 14. 当前限制

- 尚未创建 Gateway 或 Runtime；
- 尚无跨语言 Schema 或代码生成；
- 未严格拒绝所有未知字段；
- 未绑定 taskId 生成格式；
- Validator 不负责业务级 Secret 识别或脱敏。

## 15. 下一步

下一阶段创建 `apps/action-gateway`，让本地 `/health`、`/ready` 和统一 JSON 响应使用本包的公共边界。Runtime 和真实 Capability 仍在后续阶段实现。

SOL-006 是已实现并通过测试的协议基础，但不代表 Gateway 或 Runtime 已完成。
