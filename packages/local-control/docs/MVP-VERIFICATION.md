# SOL-LCL-001 Final Domain Verification

## Reference and scope

```text
Deep-audit reference:
main@6988b4b3711836c96706a5e79b195cd346d80fb3

Allowed scope:
packages/local-control/**
```

本轮不修改 Task、Plan、Claim、WorkItem、Controller、Gateway Route、Browser Host 或公共 Contracts。

## Final remediation coverage

- `request_id` 传输身份和统一业务指纹；
- 同进程与重启后的幂等回放；
- 同 Key 不同 Payload 冲突；
- 有界 `inFlight` 容量、TTL、并发合并和完成清理；
- `ACCEPTED / PARTIAL / SUCCEEDED / FAILED` 候选语义；
- Result/Evidence Sink 稳定引用；
- Sink 成功但 Report 失败后的恢复；
- 大结果和 Partial 结果只通过引用跨域；
- 子进程超时、取消、异常退出和输出超限；
- Contract Test Fixture；
- 跨域 WorkReport 不存在完整 `local_result`。

## Isolated cumulative-overlay verification

本次累计 Overlay 在交付环境中执行：

```text
TypeScript build: passed
Local Control tests: 27 passed / 0 failed
npm pack: passed
npm tgz offline install / binary / export verification: passed
```

交付环境为 Node 22 / npm 10。项目正式门禁仍是 Node 20 / npm 10，必须在本机最新仓库应用后重跑：

```bash
npm ci
npm run verify --workspace @ai-agent-platform/local-control
npm run pack:check --workspace @ai-agent-platform/local-control
npm run verify
```

最终报告必须以本机 Node 20 结果为准，不得把交付环境验证替代正式仓库验收。

## Integration readiness

```text
Local Control core: ready for total-control integration
Gateway Process Adapter: ready
Local Work Consumer and Ports: ready
Contract Test Fixture: ready
Gateway HTTP local.* route: total-control/Gateway integration
TSK → LCL Worker: total-control integration
Public WorkResult / ResultRef: pending total-control freeze
Four-domain E2E: pending total-control integration
```
