# SOL-LCL-001 Integration Readiness Verification

## Baseline

```text
Audited repository baseline:
main@eb1444044b50c9a8e00d7da9283d9999e3256d9e

Audit date:
2026-08-05
```

## Implemented scope

在既有 Local Control MVP 上增加：

- Canonical Local Result 运行时验证；
- Gateway 安全 CLI Process Adapter；
- 无状态 Task Work Consumer Adapter；
- Result Persistence Port；
- Transport Error；
- Gateway / Work Consumer 正式接入文档；
- 审计整改测试。

没有修改 Task、Plan、Claim、WorkItem 或 Controller 语义。

## Local Control verification

当前领域测试：

```text
20 passed
0 failed
```

新增测试覆盖：

- 真实 CLI 子进程调用；
- CLI 与直接调用结果一致；
- 重复只读请求；
- Timeout；
- stdout / stderr 预算；
- 非单一 JSON；
- Result 身份不一致；
- Invalid Path；
- Sensitive File；
- 受信任绝对路径和环境白名单；
- Work Consumer Result Ref 注入；
- Error Code、Retryable、Summary 和 Evidence Ref 回报。

原有测试继续覆盖：

- 10 个 Capability；
- Git / File / Runtime / Executor / Service；
- 路径穿越和软链逃逸；
- Batch；
- `ensure_running`；
- npm pack；
- 离线安装和 `aap-local` Binary。

## Environment note

当前生成环境使用 Node.js `v22.16.0` 和 npm `10.9.2`。正式仓库门禁要求 Node 20 / npm 10，因此落库执行器必须在正式 Git Worktree 重跑：

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
Work Consumer Adapter: implemented
Gateway HTTP local.* route: not implemented by LCL
TSK WorkItem mapping: not implemented by LCL
Public Result Ref: pending total-control freeze
Four-domain E2E: pending total-control integration
```
