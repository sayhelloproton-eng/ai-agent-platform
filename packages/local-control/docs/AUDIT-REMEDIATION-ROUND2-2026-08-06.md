# SOL-LCL-001 第二轮综合审计整改记录

## Baseline and scope

```text
main@353a9ff39af6582e33f0ea8078af75f40c64380c
Scope: packages/local-control/**
```

本轮在最新远端 `main` 上连续增量整改，没有重放旧 ZIP，没有修改其他领域或公共 Contracts。

## Closed findings

- 固定 `LocalWorkClaimInput → LocalRequest` 纯映射，拒绝 Task/Plan/WorkItem 状态字段；
- Work Consumer 跨域报告不再包含完整 `local_result`；
- 新增可替换 `LocalResultSinkPort`、`LocalEvidenceSinkPort` 和可选 `LocalWorkReportPort`；
- Result Sink 回读支持重启和报告失败后的稳定引用复用；
- 规范化请求指纹绑定幂等键，不同 Payload 复用 Key 被拒绝；
- Process Adapter 支持 `AbortSignal` 取消并保持 `shell:false`；
- Timeout、取消、进程失败、输出超限转换为稳定的候选 Transport Error；
- 大结果正文只进入 Result Sink，跨域仅返回摘要和引用；
- 新增 Local Work v1 Contract Change Proposal，保持 `Proposed / Not Frozen`。

## Ownership boundary

Local Control 仍不保存或修改 Task、Plan、PlanNode、Claim、WorkItem 和调度状态，不实现 Gateway Route、Task Scheduler、Browser Host、Approval 或第二控制平面。

Result/Evidence Port 只是调用边界；平台级存储、URI、生命周期、Worker Claim 和重试政策仍由总控与相应领域冻结。
