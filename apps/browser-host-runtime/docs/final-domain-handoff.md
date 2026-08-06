# BHR 最终领域交接给第二阶段总纲

BHR 领域已完成最后一轮内部安全整改。后续不再退回本专题 Chat。

总纲接线时需要冻结并实现：

- `HostCommandV1`；
- `DeliveryAckV1` 与 Report Credential；
- `HostResultV1`；
- `UncertainSideEffectV1`，且服务端不得自动重发；
- Claim/Report/Approval Credential 生命周期；
- `idempotency_key + fingerprint` 的平台级唯一性；
- Receipt、非终态、隔离项和凭证保留策略；
- TSK 状态/Event 对 Delivery、Host Result、Uncertain、Fail、Cancellation 的映射。

BHR 提供：完整客户端、真实 HTTP Contract Fixture、Journal/恢复实现、55 项领域测试和真实浏览器 Runbook。
