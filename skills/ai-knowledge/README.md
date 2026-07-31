# ai-knowledge Skill

面向 Agent 的长期项目知识 Skill。它负责从 Git 获取最小必要上下文、组织知识变更，并为允许发布的 Knowledge 资产生成受控 Projection Plan。

本文件描述规则层合同。配置、脚本和测试将在后续任务中对齐；当前合同更新不代表执行逻辑已经调整。

## Source Of Truth

**Git Repository is the canonical source and the only source of truth.**

聊天、Feishu 页面、Provider 返回和运行输出都只能作为输入、证据或候选变更。只有经过 Review 并进入 Git 的内容才是正式项目事实。

Feishu 的定位是 **Human Readable Knowledge Projection**，不是与 Git 并列的知识源。
它面向人和 AI 阅读，不追求对 Git 文件、元数据和资源目录做仓库镜像。

## Trigger Boundary

本 Skill 只处理知识语义：检索、综合、正文、生命周期、Registry 语义和 Feishu Projection。

以下任务应路由到 [`deterministic-delivery`](../deterministic-delivery/)：

- 冻结交付包的 ZIP、Manifest、Hash 和中央目录校验；
- Overlay / Delete 白名单复制与范围检查；
- 测试、精确暂存、唯一 Commit 和 Push；
- 同一任务失败后的 continuation / resume。

当 Contract 声明 `knowledge_content_frozen: true` 时，`ai-knowledge` 使用 `contract_reference_only`，不得重复加载全部知识 References，也不得重新解释、改写或扩大交付正文。

## Knowledge Layers

| Layer | Path | Responsibility | Feishu Projection |
|---|---|---|---|
| Context Layer | [`context/`](../../context/) | 项目状态、当前任务、架构约束和执行规则；动态、精简、面向 Agent | 禁止 |
| Knowledge Layer | [`docs/knowledge/`](../../docs/knowledge/) | 项目、架构、Agent、Workflow、实验和 Portfolio；面向人类阅读 | 唯一允许的发布源 |
| Technical Layer | [`docs/technical/`](../../docs/technical/) | Runtime、Provider、Adapter、技术方案、调研和工程规范 | 默认禁止 |
| Learning Layer | [`docs/learning/`](../../docs/learning/) | 学习路线、笔记和学习资料 | 禁止 |
| Decision Layer | [`docs/adr/`](../../docs/adr/) | Decision、Context、Alternatives 和 Consequences | 禁止作为知识库正文 |

`skills/ai-knowledge/` 保存可执行能力及其规则，不是 Feishu 发布源。

## Projection Direction

唯一允许的项目知识发布方向：

```text
Git docs/knowledge/
        ↓
Feishu Knowledge
```

禁止：

- Feishu 覆盖 Git；
- Feishu 自动反写 Git；
- Git 与 Feishu 双向同步；
- 将 `context/`、`docs/technical/`、`docs/learning/` 或 `docs/adr/` 默认发布到 Feishu；
- 自动合并 Git 与 Feishu 的差异。

## Capabilities

- 从 `context/` 和 Git 正式资产选择最小上下文。
- 生成带来源、状态和缺口的 Context Package。
- 将已确认事件分类为 Context、Knowledge、Technical 或 ADR Draft。
- 更新 Git Draft、验证路径和关系。
- 仅为 `docs/knowledge/` 生成 Feishu Projection Plan。
- 导入授权的外部 Wiki 元数据和证据，但不把外部内容直接视为项目事实。

## Feishu Knowledge Publisher

Feishu Knowledge Publisher 将已 Review 的 `docs/knowledge/**` 确定性发布到飞书知识库“智能体工程探索”。

- `docs/knowledge/README.md` 发布为首页；
- 普通 Markdown 使用首个 H1 作为飞书标题；
- 目录 README 不发布正文；
- Git frontmatter 只服务 Git，在 Projection payload 中过滤；
- 只发布标题、正文、列表、表格、引用、代码块和普通链接；
- 图片、Mermaid、draw.io 和二进制资源不进入飞书；
- 重要图形必须先在 Git 中经 Review 转成文字说明和 `text` 代码块图；
- Git 相对文档链接转换为飞书文档链接或不可变 GitHub URL；
- 不发布代码、Skill、Schema 或其他 Git Layer；
- 不允许 AI 改写正文、飞书反写 Git 或双向同步。

完整合同见 [`references/11-feishu-publishing.md`](references/11-feishu-publishing.md)。

## Canonical Status

项目动态状态入口是 Git [`context/current-status.md`](../../context/current-status.md)。Feishu 状态页只能是从允许的 Knowledge 资产生成的阅读投影，不能覆盖 Context。

## Requirements and Validation

- Node.js 20+
- `lark-cli` 1.0.77+（仅在显式使用 Feishu Provider 时）

```bash
node scripts/validate_bundle.mjs
node tests/self-test.mjs
```

上述脚本和测试本次未修改；其路径和行为将在后续配置层与执行层任务中对齐。

## Safety

默认只读。Git 写入前必须有 Change Plan 和目标范围；写入后必须验证。Feishu Projection Publish 必须另行预览、确认和回读。

Skill 不自动删除、移动、修改成员/权限、互联网公开、接受 ADR、覆盖 Git 或执行双向同步。
