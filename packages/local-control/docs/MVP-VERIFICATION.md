# SOL-LCL-001 Integration Readiness Verification

## Baseline

```text
Audited repository baseline:
main@353a9ff39af6582e33f0ea8078af75f40c64380c

Audit date:
2026-08-06
```

## Implemented scope

在既有 Local Control MVP 和第一轮 Adapter 上增量增加：

- Canonical Local Result 运行时验证；
- Gateway 安全 CLI Process Adapter；
- Local Work v1 候选纯映射；
- Result Sink、Evidence Sink 和 Report Port；
- 请求指纹冲突与持久引用恢复；
- Process Adapter `AbortSignal` 取消；
- Transport Error；
- Gateway / Work Consumer 正式接入文档；
- 审计整改测试。

没有修改 Task、Plan、Claim、WorkItem 或 Controller 语义。

## Local Control verification

当前领域测试：

```text
34 passed
0 failed
```

新增测试覆盖：

- 真实 CLI 子进程调用；
- CLI 与直接调用结果一致；
- 重复只读请求；
- Timeout；
- Cancellation；
- 非零进程退出；
- stdout / stderr 预算；
- 非单一 JSON；
- Result 身份不一致；
- Invalid Path；
- Sensitive File；
- 受信任绝对路径和环境白名单；
- Work Consumer Result/Evidence Ref 注入；
- 报告失败后稳定引用复用；
- duplicate request 与 fingerprint conflict；
- 大结果和完整 `local_result` 的跨域隔离；
- Error、Retryable、Summary 和 Evidence Ref 回报。

原有测试继续覆盖：

- 10 个 Capability；
- Git / File / Runtime / Executor / Service；
- 路径穿越和软链逃逸；
- Batch；
- `ensure_running`；
- npm pack；
- 离线安装和 `aap-local` Binary。

## Environment note

本轮在真实仓库使用 Node 20 / npm 10 执行：

```bash
npm ci
npm run verify --workspace @ai-agent-platform/local-control
npm run pack:check --workspace @ai-agent-platform/local-control
npm run verify
```

## Integration status

```text
Local Control implementation: ready
Gateway Process Adapter: implemented
Work Consumer Adapter and Ports: implemented
Gateway HTTP local.* route: not implemented by LCL
Unified Worker WorkItem mapping: pending outside LCL
Public Result Ref: pending total-control freeze
Four-domain E2E: pending total-control integration
```
