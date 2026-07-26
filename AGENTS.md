# Agent Working Agreement

本文件是任何新 Agent 接手 `ai-agent-platform` 时的首要入口。

## 核心原则

1. Git 仓库是项目正式事实的唯一真源。
2. 飞书是 Git 知识资产的阅读投影、协作空间和补充知识层。
3. 会影响架构、代码、接口、能力边界、技术决策、项目状态或后续执行的正式结论，必须最终落入 Git。
4. Feishu Native 内容不是项目正式事实；形成正式结论后，必须通过 Git Draft / Review / Merge 晋升。
5. 每个正式知识资产使用稳定 `asset_id`，重命名或迁移时不得更换 ID。
6. Research、Experiment、ADR 分离：
   - Research：查到了什么；
   - Experiment：实际验证了什么；
   - ADR：最终决定了什么。
7. 先查 `docs/_index/`，再按任务读取最小必要正文；禁止默认全库扫描。

## 最小恢复文档集

按顺序读取：

1. `README.md`
2. `AGENTS.md`
3. `docs/README.md`
4. `docs/context/project-context.md`（迁移完成后改为 `docs/00-context/CTX-001-project-context.md`）
5. `docs/context/current-task.md`（迁移完成后改为 `docs/00-context/CTX-002-current-state.md`）
6. `docs/Feishu_Knowledge_Skill_Architecture_v1.0.md`
7. `docs/_index/assets.yaml`

随后根据任务，从 Asset Index 定向读取 ADR、Skill、Workflow、Research、Experiment 或代码 README。

## 目录规则

- 正式知识：`docs/<domain>/`
- 资产索引：`docs/_index/`
- 文档模板：`docs/_templates/`
- 已废弃但需保留的历史：`docs/_archive/`
- Skill 工程资产：`skills/<skill>/`
- 实验代码与可复现配置：`experiments/<asset_id>/`
- Schema / Contract：`schemas/`、`contracts/`
- Runtime 原始日志、Trace、大型生成物：不直接写入 `docs/`

## 当前任务入口

- 当前状态：`docs/context/current-task.md`
- 远程映射：`docs/context/remote-context-map.md`
- 治理配置：`knowledge.config.yaml`
- 资产索引：`docs/_index/assets.yaml`
- 关系索引：`docs/_index/relations.yaml`
- 飞书映射：`docs/_index/feishu-map.yaml`

## 禁止行为

- 不得把聊天记录直接视为项目事实。
- 不得让飞书镜像修改无审核反写 Git。
- 不得自动接受 ADR 或直接向主分支写正式决策。
- 不得静默解决 Git / 飞书冲突。
- 不得覆盖 Feishu Native 内容。
- 不得自动删除、移动、修改权限或公开分享飞书内容。
- 不得提交 Token、Cookie、密钥、认证缓存、第三方完整知识库镜像。
- 不得删除旧决策历史；使用 `supersedes` 关系记录演进。

## 变更验收

正式资产变更至少检查：

- front matter 与 `asset_id`；
- 状态、证据等级和来源；
- 关系与索引；
- Git diff 与敏感信息；
- 相关测试或验证证据；
- 若发布到飞书，回读校验 Commit、Hash、标题和目标节点。
