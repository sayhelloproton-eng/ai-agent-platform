# Local Control Source

- `contracts.ts`：包内候选合同；跨领域审计前不提升到公共 Contracts。
- `request-validator.ts`：Local Request 运行时校验。
- `capability-registry.ts`：10 个 Capability 的描述与模式约束。
- `registry.ts`：受信任 Project / Runtime / Executor / Service Registry。
- `policy.ts`：路径、敏感资源、预算和命令边界。
- `process.ts`：`shell: false` 的固定进程执行器。
- `adapters/`：Git、File、Runtime、Executor、Service 的确定性适配。
- `capabilities/`：高层 `local.*` 处理器。
- `invoke.ts`：一次请求、一次结果的应用入口。
- `cli.ts`：stdin/stdout 机器协议。
- `result-validator.ts`：Canonical Local Result 与请求身份校验。
- `gateway-process-adapter.ts`：`shell:false` 的固定 CLI Process Client。
- `local-work-v1.ts`：纯 Work Claim 映射、传输 request_id 语义和稳定业务指纹。
- `work-consumer-adapter.ts`：无状态 Work Consumer、Result/Evidence/Report Port、有界 inFlight 和引用式报告。
- `local-work-contract-test-fixture.ts`：供总控统一 Worker 接线使用的稳定 Contract Test Fixture。

任何新增能力必须先进入 Capability Catalog，并通过 Registry、Policy、Adapter 和测试，不得增加 `shell.exec`、`git.raw` 或任意路径入口。
