# Task Control Tests

测试覆盖：

- 无 Plan Task 到总控生成 Plan；
- Decision Context → Claim → Command 顺序；
- Task / Plan Version 冲突；
- Controller Command 幂等；
- WorkItem 创建、Claim、成功和失败回报；
- Dispatch Claim、交付、失败重试和业务状态隔离；
- 三类 Claim 独立到期接管、Epoch 递增与旧 Token fencing；
- Reconciler 幂等；
- Pause 保留信息并停止新调度；
- Timeline、Role Attention 与关键 Task / Plan 审计状态回放；
- 总控 Decision Context 公共合同映射与 Claim Token 脱敏；
- 角色不匹配、非法 Plan 修订和非法持久化记录拒绝；
- JSON 文件持久化和进程恢复；
- 单 Task 完整闭环。
