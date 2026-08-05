# Task Control Rules

1. 收到 `task_id` 后先查询最新 Decision Context。
2. 理解 Requirement、Task、Plan、当前节点、事件、结果、约束和审批。
3. 只有角色匹配且任务仍需处理时才领取 Controller Claim。
4. 只提交受约束的 Controller Command，不直接修改状态字段。
5. 冲突、Claim 过期或上下文变化时重新查询，不盲目重试。
6. Task 长期归属于角色；具体 Profile 只持有短期处理权。
