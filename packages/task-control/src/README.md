# Task Control Source

| 文件 | 职责 |
|---|---|
| `model.ts` | TSK 领域对象、应用输入和内部枚举 |
| `contracts.ts` | 现有 Decision Context snake_case 兼容映射；不是已裁决的唯一平台合同 |
| `integration-proposals.ts` | CTL、LCL、BHR 候选跨域接口，仅供总控审计 |
| `request-fingerprint.ts` | 幂等请求规范化与 SHA-256 指纹 |
| `error.ts` | 领域错误与不变量断言 |
| `ports.ts` | Clock、ID、Store 与 Approval Resolution Port |
| `store.ts` | 内存和原子 JSON 文件持久化 Adapter、旧状态安全迁移 |
| `policy.ts` | Plan 完成门禁、版本、Claim 和状态迁移策略 |
| `service.ts` | Task、Controller、Work、Approval、Dispatch Application Service |
| `reconciler.ts` | 确定性单 Task 调和器、Claim 回收事件与恢复扫描 |
| `projections.ts` | Timeline、Role Attention、Dispatch Queue 与审计状态回放 |
| `index.ts` | 包公开入口 |

领域规则不得放入 Gateway 路由、Local Worker 或 Browser Host Adapter。候选跨域类型不得在本领域内宣称为已冻结公共合同。
