# ai-knowledge Skill

面向 Agent 的长期项目知识 Skill。Git 保存正式事实，飞书是可替换 Provider 与 Projection；Skill 不是飞书 CRUD 包装器。

## Capabilities

- 从 Asset / Relation Index 选择最小上下文。
- 生成带来源、状态和缺口的 Context Package。
- 将 Task Result、Experiment、Decision 转为 Git Knowledge Draft。
- 为 Feishu Projection 生成 Write Plan、执行受控写入并回读验收。
- 导入授权的公开 Wiki 元数据和本地索引。

## Canonical Status

Git [`CTX-002`](../../docs/00-context/CTX-002-current-state.md) 是项目动态状态规范源。飞书 `Project_Status` 只能是 Projection；飞书 Native 结论必须先晋升为 Git Draft。

## Requirements and Validation

- Node.js 20+
- `lark-cli` 1.0.77+（仅在使用 Feishu Provider 时）

```bash
node scripts/validate_bundle.mjs
node tests/self-test.mjs
```

## Safety

默认只读；飞书写入默认 dry-run，必须预览、确认和回读。Skill 不自动删除、移动、修改成员/权限、互联网公开、接受 ADR 或覆盖 Git。
