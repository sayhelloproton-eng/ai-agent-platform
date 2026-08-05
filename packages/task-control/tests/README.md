# Task Control Tests

当前共 33 个领域测试，覆盖：

- 无 Plan Task 到总控生成 Plan；
- Decision Context → Claim → Command 顺序；
- Task / Plan Version 冲突与无副作用；
- Controller Command 幂等与请求指纹冲突；
- Plan 完成门禁：仍有未完成节点时不得 `COMPLETED`；
- 当前节点约束：非当前节点不得创建 WorkItem；
- WorkItem 创建、Claim、成功和失败回报；
- Dispatch Claim、交付、失败重试和业务状态隔离；
- 三类 Claim 独立到期、替换、回收、Epoch 递增和旧 Token fencing；
- Claim 状态变化的不可变 Event 完整性；
- 等待 Work / Approval 后重新 Controller Claim；
- Pause / Resume 保留并恢复协调状态；
- Approval wait / resolve，包括暂停期间 Resolution；
- Reconciler 幂等；
- Timeline、Role Attention 与关键 Task / Plan 审计状态回放；
- Decision Context 兼容映射与 Claim Token 脱敏；
- CTL 候选输入/Claim/Decision Contract Test；
- LCL WorkItem / Local Work Request 候选 Contract Test；
- BHR Dispatch / Host Result 候选 Contract Test；
- 角色不匹配、非法 Plan 修订和非法持久化记录拒绝；
- JSON 文件持久化和进程恢复；
- 单 Task 完整闭环。
