# Documentation

`docs/` 保存 `ai-agent-platform` 的长期文档资产。Git Repository 是唯一真源；本目录按受众和职责分为 Knowledge、Technical、Learning 与 ADR 四类。

## Structure

```text
docs/
├── README.md
├── AGENTS.md
├── knowledge/
├── technical/
├── learning/
└── adr/
```

## Boundaries

| 目录 | 受众与职责 | Feishu Projection |
|---|---|---|
| [`knowledge/`](./knowledge) | 面向人阅读的项目、架构、Agent、Workflow、实验和 Portfolio 知识 | 唯一允许的发布源 |
| [`technical/`](./technical) | 工程实现、技术方案、调研、规范、运维、治理和机器元数据 | 禁止 |
| [`learning/`](./learning) | 学习路线、笔记、资料与学习模板 | 禁止 |
| [`adr/`](./adr) | 架构决策、备选方案、权衡和后果 | 禁止 |

Agent 的启动与执行上下文位于根 [`context/`](../context)，不属于 `docs/`，也不参与 Feishu Projection。可执行 Agent 能力位于根 [`skills/`](../skills)。

## Source of Truth

- Git 是正式项目事实的唯一真源。
- 只允许 `docs/knowledge/ → Feishu`。
- 禁止 `context/ → Feishu`。
- 禁止 Feishu 自动反写 Git。
- 禁止双向同步。
- 本次目录迁移不代表已经实现任何发布或同步能力。

## Usage

1. Agent 启动先读取根 `README.md`、`AGENTS.md` 和 `context/`。
2. 面向人类发布的知识只从 `knowledge/` 选择。
3. 工程执行按任务读取 `technical/` 中的最小相关资料。
4. 学习资料与正式技术结论分开维护。
5. 架构决定必须进入 `adr/`，并保留状态和历史关系。

## Maintenance

- 修改 `docs/**` 前读取 [`AGENTS.md`](./AGENTS.md)。
- 移动正式资产时保留 Asset ID，并同步 Canonical Path、索引、关系和内部链接。
- 不把 Technical、Learning、ADR 或 Context 内容加入 Knowledge 发布输入。
- 不自动删除历史资产；废弃材料进入 `technical/Archive/`。
