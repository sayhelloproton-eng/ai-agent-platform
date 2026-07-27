# Write Governance

## Authority

Git Repository 是唯一真源。正式项目内容先形成 Git Draft，经 Review 后进入正确 Layer。

Feishu 是 Human Readable Knowledge Projection。它不能成为独立规范源，不能自动反写或覆盖 Git，也不能与 Git 双向同步。

## Before Git Write

1. 读取 Git 来源和当前 Context。
2. 确定目标 Layer 与目标路径。
3. 生成 Change Plan、完整 Draft 或 Diff。
4. 检查 Asset ID、关系、敏感信息和范围。
5. 获得 Git 变更所需确认。

## After Git Write

1. 验证 Git 文件、路径、链接、状态和关系。
2. 更新适用的 Git Index。
3. 只有目标位于 `docs/knowledge/` 且任务需要发布时，生成独立 Projection Plan。
4. 获得独立发布确认后才可 Publish。
5. Publish 后回读；失败标记 Projection Pending，不回滚或覆盖 Git。

## Levels

- G0：只读查询、本地 Draft、Index、Change Plan 和 Preview。
- G1：经授权更新指定 Git 文件并验证。
- P0：为 `docs/knowledge/` 生成 Projection Preview，不执行发布。
- P1：发布指定 Feishu Projection，需要独立明确确认和回读。
- P2：批量或大段覆盖，需要变更摘要和二次确认。
- X：删除、移动、权限、成员、互联网公开；Skill 不执行。

## Layer Write Rules

- `context/`：只保存动态 Agent Context；禁止发布。
- `docs/knowledge/`：保存人类可读知识；唯一可发布 Layer。
- `docs/technical/`：保存工程内容；默认禁止发布。
- `docs/learning/`：保存学习内容；禁止发布。
- `docs/adr/`：保存决策原文；禁止作为知识库正文发布。

## Current State Update

1. 读取 Git `context/current-status.md` 和已验收证据。
2. 生成完整 Context Draft 与 Diff。
3. Project Owner Review 后更新 Git。
4. 验证状态与证据。
5. 不从 Feishu 状态页反向更新 Context。

## ADR and Experiment

只有真实取舍并经确认才能 Accepted。ADR 写入 `docs/adr/`，不作为知识库正文。

Experiment 必须包含环境、步骤、观察、结果和限制；面向人类发布的实验总结可进入 `docs/knowledge/实验与复盘/`。
