---
name: ai-knowledge
version: 1.2.0
description: "管理 ai-agent-platform 的长期项目知识。当 Agent 需要从 Git Context 和正式资产获取最小必要证据、更新 Git 知识、记录 ADR、导入外部资料或为 docs/knowledge 生成受控 Feishu Projection 时使用。Git Repository 是唯一真源；默认索引优先、最小上下文、只读优先。"
metadata:
  requires:
    bins: ["lark-cli", "node"]
  cliHelp: "lark-cli --help;lark-cli wiki --help;lark-cli docs --help"
---
# AI Knowledge

该 Skill 给 **ai-agent-platform 中的 Agent** 使用，提供项目知识生命周期能力。它不是飞书 CRUD 包装器，也不是给 Codex 自由发挥内容的提示词。Codex/CLI 是执行器；调用该 Skill 的 Agent 负责理解目标、组织语义内容、引用依据和决定是否沉淀。

## 开始前读取策略

只读取与当前知识意图直接相关的最小参考，不再默认加载全部 References。

1. 首先判断任务是否真正涉及知识语义；
2. 涉及认证、确认或高风险知识写入时读取 [`references/00-shared-rules.md`](references/00-shared-rules.md)；
3. 涉及职责边界时读取 [`references/01-architecture-and-boundaries.md`](references/01-architecture-and-boundaries.md)；
4. 涉及知识模型或 Git 知识写入时读取 `03-knowledge-model.md`、`05-write-governance.md`；
5. 涉及飞书读取或发布时才读取 `06-feishu-provider.md`、`11-feishu-publishing.md`；
6. 冻结 Contract 的机械落库和同一任务续跑不加载完整 References，交由 `deterministic-delivery` Skill。

## Knowledge Boundary

| Layer | Canonical Path | Role | Projection |
|---|---|---|---|
| Context | `context/` | Agent Runtime Context：状态、任务、约束、规则 | 禁止 |
| Knowledge | `docs/knowledge/` | Human Knowledge Base：可阅读、可展示、可发布 | 唯一允许的 Feishu 发布源 |
| Technical | `docs/technical/` | 工程设计、方案、调研、规范和 Operations | 默认禁止 |
| Learning | `docs/learning/` | 学习资产 | 禁止 |
| Decision | `docs/adr/` | 架构决策及其上下文、备选和后果 | 禁止作为知识库正文 |

Git Repository 是所有正式项目事实的 Canonical Source。Feishu 只能是 `docs/knowledge/` 的 Human Readable Projection，或未经晋升的外部证据来源。

## 触发场景

仅在任务需要理解、选择、生成或治理**知识语义**时触发：

- 查询项目架构、ADR、工作流、当前阶段或知识来源；
- 形成知识正文、实验记录、ADR、状态草稿或学习路径；
- 决定资产落位、知识生命周期、Registry 语义关系或发布资格；
- 读取、导入或发布飞书知识投影；
- 重建知识索引、检查过期知识或发现知识缺口。

## 不触发

以下任务不完整触发本 Skill：

- 已冻结 ZIP / Overlay / Delete Contract 的解压、Hash、`cmp`、测试、暂存、Commit 和 Push；
- 同一批次失败后的 continuation / resume，且知识内容、范围与生命周期没有改变；
- 普通代码修改、仓库机械操作或单个 Provider 命令，不需要知识语义判断；
- 只读检查 Git SHA、工作区、中央目录、Manifest、白名单或测试结果。

上述确定性执行任务使用 `skills/deterministic-delivery/`。若包内标记 `knowledge_content_frozen: true`，本 Skill 的策略必须是 `contract_reference_only`：只核对知识边界，不重复加载完整 References，也不重新解释或改写正文。

删除、权限、公开分享、批量移动等高风险操作仍需明确授权；本 Skill 不因被触发而自动获得这些权限。

## 总流程

1. **识别知识意图**：先判断是否需要知识语义；冻结 Contract 的机械执行直接路由到 `deterministic-delivery`。
2. **确定 Git Layer**：Context、Knowledge、Technical、Learning 或 ADR；不要先按 Provider 分类。
3. **读取最小证据**：先目录/索引，再 outline/section，最后才是完整正文。
4. **生成 Context Package 或 Draft**：列出来源、范围、缺口和置信度；不得编造项目事实。
5. **更新 Git**：先输出 Change Plan、目标范围和 Diff；确认后写入 Git 并验证。
6. **可选发布**：仅当来源位于 `docs/knowledge/` 且任务明确需要时，另生成 Projection Plan。
7. **验收**：Git 变更验证优先；若获授权发布，再回读 Feishu 目标并验证。

## 意图路由

| 意图 | 必读参考 | 首选产物 |
|---|---|---|
| 查询项目上下文 | `04-retrieval-policy.md`、`07-workflows.md#query-context` | Context Package |
| 沉淀知识 | `03-knowledge-model.md`、`05-write-governance.md` | 分层 Git Draft + Change Plan |
| 更新项目状态 | `05-write-governance.md`、`07-workflows.md#update-project-status` | Context Draft + Diff |
| 记录 ADR | `03-knowledge-model.md`、`07-workflows.md#record-adr` | ADR Draft |
| 导入公开 Wiki | `06-feishu-provider.md`、`07-workflows.md#import-public-wiki` | Tree + Index + Import Report |
| 生成学习路径 | `07-workflows.md#build-learning-path` | Learning Path |
| 重建/查询索引 | `04-retrieval-policy.md` | Index / Ranked Candidates |
| 发布知识投影 | `05-write-governance.md`、`06-feishu-provider.md`、`07-workflows.md#publish-knowledge-projection`、`11-feishu-publishing.md` | Publishing Manifest + Projection Plan + Read-back Report |

## 强制行为规则

- **内容作者与执行器分离**：Codex 可以读取、创建、更新和验收；不得在缺少依据时自行宣布项目阶段、技术决策或完成状态。
- **Git 唯一真源**：所有正式事实必须经过 Review 并进入 Git；Feishu、聊天和 Provider 输出都不是独立真源。
- **动态 Context**：项目状态从 `context/current-status.md` 读取；`context/` 不参与 Feishu Projection。
- **唯一发布源**：只有 `docs/knowledge/` 可以生成项目 Feishu Knowledge Projection。
- **文本化投影**：正文不得由 AI 总结或改写；按 `11-feishu-publishing.md` 过滤 Git frontmatter、图片、Mermaid 和二进制资源引用，只发布可阅读的文本 Markdown。
- **图形边界**：已 Review 的正式 `asset://` PNG 由 Publisher 从 `knowledge-assets` 解析、上传为 Feishu media 并插入 image block；Mermaid、draw.io、GitHub Raw URL 和未受管二进制引用不进入投影。正文必须独立表达关键语义，Publisher 不临时解释或重绘。
- **README 边界**：只把 `docs/knowledge/README.md` 作为首页发布；其他目录 README 不发布正文。
- **禁止反向和双向同步**：Feishu 不得覆盖或自动反写 Git，也不得自动合并差异。
- **只读优先**：读取、索引和生成草稿默认不需要确认；创建/更新飞书文档必须先预览。
- **索引优先**：先查询本地 Knowledge Index；没有索引时先构建目录级索引，不要把整个 Wiki 正文发送给模型。
- **局部读取**：优先 outline/section/fragment；只有在需要跨全文综合且预算允许时读取完整 Markdown。
- **来源可追踪**：回答和草稿必须保留标题、URL/token、更新时间；事实与推断分开。
- **类型路由**：`docx` 用 `lark-doc`；`sheet` 用 `lark-sheets`；`bitable` 用 `lark-base`；缺 scope 时停止并说明，不伪造 Markdown。
- **权限边界**：公开网页、OpenAPI 可读和匿名可读是三件事；公开 Wiki 仍需有效 user/bot token。
- **高风险门禁**：删除、权限、公开分享、批量移动永不自动执行；CLI exit 10 不能静默追加 `--yes`。

## 输出约定

### 查询类

返回 `Context Package`：任务、已选来源、关键事实、相关决策、当前状态、缺口、token 预算和引用。格式见 [`assets/schemas/context-package.schema.json`](assets/schemas/context-package.schema.json)。

### 写入类

先返回：

1. Git Layer、目标路径与来源证据。
2. 完整内容草稿或 Diff。
3. Change Plan（目标范围、风险、验收和回滚）。
4. 明确询问是否更新 Git。
5. 只有 `docs/knowledge/` 需要发布时，另行生成 Projection Plan 并再次确认。

没有明确同意时，不执行 Git 写入或 Feishu 发布。Git 写入授权不自动授权 Feishu 发布。

## 可用脚本

- `node scripts/lark_read.mjs ...`：只读解析 Wiki、递归目录、读取正文。
- `node scripts/build_index.mjs ...`：从目录树和 Markdown 文件构建本地索引。
- `node scripts/query_index.mjs ...`：低成本检索索引并输出候选阅读计划。
- `node scripts/render_draft.mjs ...`：从结构化 Knowledge Event 生成实验、ADR、状态、知识笔记或学习路径草稿。
- `node scripts/lark_write.mjs ...`：默认 dry-run；仅在显式 `--apply` 和确认短语存在时执行受控创建/更新。
- `node scripts/validate_bundle.mjs`：校验 Skill 文件、项目配置和 JSON Schema。

脚本只处理确定性工作；语义判断、内容组织、事实校验和最终决策由 Agent 完成。

## 图片资源规则

Agent 在编写或修改 `docs/knowledge/` 下的 Markdown 文档时：

- 图片**必须**存储在 `knowledge-assets` 分支的对应文档目录：
  `images/{docs/knowledge 子路径}/{文档名}/`
- Markdown 引用**必须**使用 `asset://` 格式：
  `![图名](asset://文档名/图片文件名.png)`
- **禁止**使用本地相对路径（`./images/arch.png`）
- **禁止**使用外部图床链接（GitHub Raw URL、Imgur、OSS 等）
- **禁止**在飞书手动上传图片
- Publisher 负责 `asset://` → 飞书图片资源的转换
