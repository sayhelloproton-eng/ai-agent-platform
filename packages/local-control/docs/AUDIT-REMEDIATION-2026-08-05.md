# SOL-LCL-001 综合审计整改记录

## Baseline

```text
main@eb1444044b50c9a8e00d7da9283d9999e3256d9e
Audit date: 2026-08-05
```

## Audit finding addressed

整改目标是解决：

```text
现有 Local Control 只有 CLI 与未来接入文档，
缺少可直接复用的 Gateway Process Adapter 和 Work Consumer Runner。
```

本轮保留现有 CLI、Capability、Registry、Policy 和 Adapter，不重写 Local Control Core。

## Added implementation

- `result-validator.ts`
  - 运行时验证 Canonical Local Result；
  - 验证 Result Version、Status、Error、Evidence 和 Meta；
  - 验证 `request_id` / `capability` 与原请求一致。
- `gateway-process-adapter.ts`
  - 固定 CLI 参数；
  - `shell:false`；
  - stdin / stdout 单 JSON；
  - 环境白名单；
  - Timeout、stdout、stderr 预算；
  - 区分领域 Result 和 Transport Error。
- `work-consumer-adapter.ts`
  - 接收 LocalRequest；
  - 调用 LocalControlClient；
  - 通过外部 Persistence Port 生成 Result Ref；
  - 返回稳定集成报告；
  - 不拥有 WorkItem 状态。

## Fields verified

| 字段 | 本轮规则 |
|---|---|
| `capability_ref` | Work Consumer Report 使用；值映射自 `LocalRequest.capability` |
| `request_id` | 从请求到 CLI Result 和 Work Report 全程一致 |
| `correlation_id` | 可选透传，不解释其业务语义 |
| `idempotency_key` | 副作用请求必须存在；Runner 只透传 |
| `result_ref` | 必须由调用方注入 Persistence Port 生成 |
| `error_code` | 来自 Canonical Local Result |
| `retryable` | 来自 Canonical Local Error；Transport Error 独立 |
| `summary` | LCL 生成确定性摘要 |
| `evidence_refs` | 由调用方 Persistence Port 返回 |

## Governance boundary

本轮没有：

- 新增 Gateway HTTP Route；
- 修改 Task Control 状态；
- 创建 WorkItem；
- 实现调度或重试；
- 生成公共 Result Ref；
- 修改公共 Contracts；
- 实现 Browser 操作；
- 增加任意 Shell。

## Remaining integration work

总控仍需组织：

1. Gateway 领域把 HTTP `local.*` 路由接到 `createLocalControlProcessClient()`；
2. TSK Worker 把正式 WorkItem Payload 转换成 LocalRequest；
3. Result / Evidence 领域实现 Persistence Port；
4. 冻结公共 Error 和 Result Ref；
5. 增加四领域端到端测试。
