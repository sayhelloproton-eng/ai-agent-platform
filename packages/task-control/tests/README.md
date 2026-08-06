# Task Control Tests

当前共 43 个领域测试。

## 基础与第一轮整改

- 无 Plan Task 到总控生成 Plan；
- Decision Context → Claim → Command 顺序；
- Task / Plan Version 冲突与无副作用；
- Controller Command 幂等与请求指纹冲突；
- Plan 完成门禁和当前节点约束；
- WorkItem 创建、Claim、成功和失败回报；
- 三类 Claim 独立到期、替换、回收、Epoch 递增与 fencing；
- 等待 Work / Approval 后重新 Controller Claim；
- Pause / Resume；
- Approval wait / resolve；
- Reconciler 幂等；
- Timeline、Role Attention、审计回放；
- Decision Context 兼容映射；
- CTL/LCL/BHR Candidate Contract Test；
- JSON 持久化、恢复和单 Task 闭环。

## 第二轮整改

- 正式 Task Intake 创建；
- Task Intake 重复请求稳定回放；
- Task Intake 幂等冲突；
- BHR Claim → Delivery Ack → Controller Claim → Host Result；
- Controller Claim 不破坏合法 BHR 回报凭证；
- Dispatch Claim 过期、重领和旧 Token fencing；
- 重复 Ack、重复 Host Result；
- WorkItem claim / start / complete；
- WorkItem fail / retry / expire；
- 完整 Local Result 正文拒绝，只接受 Result/Evidence Ref；
- Host Command 物化不包含 DOM、截图或 Binding；
- Host Result 正文拒绝；
- `INSERT_NODE_AFTER` 真实重连 successor 与执行顺序；
- 多 Application Adapter 共享 Store 时版本与 Event 一致；
- stale version 无状态和 Event 副作用；
- Json Store 单文件单 Writer；
- 重启后 Dispatch Claim 与 Host Result 补报。
