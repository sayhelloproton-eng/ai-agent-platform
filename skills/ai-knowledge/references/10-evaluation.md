# Skill 评估与验收

## 触发准确性

应触发：项目上下文、ADR、实验沉淀、状态更新、公开 Wiki 导入、学习路径。

不应触发：纯编码、单个飞书底层操作、权限公开、删除移动。

## 检索质量

- 是否先用索引。
- 是否只读取相关目录。
- 是否保留来源。
- 是否把事实、推断、未知分开。
- 是否在预算内完成。

## 写入质量

- 是否有结构化事件和证据。
- 是否正确选择 Git Layer 和目标目录。
- 是否先生成 Change Plan、Diff 并确认 Git 范围。
- 是否在 Git 更新后完成路径、链接、关系和索引验证。
- 是否只有 `docs/knowledge/` 进入 Projection Plan。
- Git 确认和 Feishu 发布确认是否分离。
- 发布时是否查重、校验 revision 并回读验收。

## 状态更新

- 是否只在里程碑更新。
- completed 是否有证据。
- 是否只更新 `context/current-status.md` 或经确认的 Context 目标。
- 是否禁止 Context 发布。
- 是否避免 Codex 自行宣布阶段。

## Provider 边界

- 上层是否使用 Knowledge Item 而非飞书 token 作为领域对象。
- sheet/bitable 是否正确路由。
- 缺权限是否停止而非绕过。
- Feishu 是否始终被视为 Projection 或外部证据，而非真源。
- 是否拒绝 Feishu 反写、覆盖 Git、双向同步和自动合并。

## 测试用例

参考 `references/examples/` 和 `tests/self-test.mjs`。人工验收至少覆盖：

1. 查询 Gateway 上下文。
2. 根据 CLI 验收报告生成实验草稿。
3. 项目状态更新只修改 Git Context 中有验收证据的完成项。
4. 导入公开 Wiki 时 docx 成功、非 docx 清楚报告限制。
5. 写入未确认时只有 dry-run。
6. `context/`、`docs/technical/`、`docs/learning/` 和 `docs/adr/` 不能生成项目 Feishu Projection。
