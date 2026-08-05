# Task Control Source

| 文件 | 职责 |
|---|---|
| `model.ts` | 领域对象、公共应用接口和冻结枚举 |
| `contracts.ts` | 总控 Decision Context v1 公共合同映射与脱敏 |
| `error.ts` | 领域错误与不变量断言 |
| `ports.ts` | Clock、ID 与 Store Port |
| `store.ts` | 内存和原子 JSON 文件持久化 Adapter |
| `policy.ts` | Plan、版本、Claim 和状态迁移策略 |
| `service.ts` | Task、Controller、Work、Dispatch Application Service |
| `reconciler.ts` | 确定性单 Task 调和器与恢复扫描 |
| `projections.ts` | Timeline、Role Attention、Dispatch Queue 与审计状态回放 |
| `index.ts` | 包公开入口 |

领域规则不得放入 Gateway 路由或 Browser Host Adapter。
