# Write Governance

## Authority

正式项目内容先写 Git Draft 并 Review。Feishu Projection 不能成为独立规范源；Feishu Native 影响项目时先晋升到 Git。

## Levels

- G0：本地 Draft、Index、Preview。
- G1：只读 Provider、回读验收。
- G2：创建/更新指定 Feishu Projection，需要明确确认。
- G3：批量或大段覆盖，需要变更摘要和二次确认。
- G4：删除、移动、权限、成员、互联网公开；Skill 不执行。

## Current State Update

1. 读取 Git `CTX-002` 和证据。
2. 生成完整 Git Draft 与 Diff。
3. Project Owner Review 后 Merge。
4. 更新 Asset Index。
5. 可选生成 Feishu Project Status Projection Plan。
6. 确认后写入并回读；失败只标记 Projection Pending，不回滚 Git 正式状态。

## ADR and Experiment

只有真实取舍并经确认才能 Accepted。Experiment 必须包含环境、步骤、观察、结果和限制；验证不自动等于采用。
