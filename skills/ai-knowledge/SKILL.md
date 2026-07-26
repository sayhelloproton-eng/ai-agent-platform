---
name: ai-knowledge
version: 1.0.0
description: "管理 ai-agent-platform 的长期项目知识。当 Agent 需要查询项目上下文、从飞书知识库获取最小必要证据、沉淀实验或 ADR、同步项目进度、导入公开飞书 Wiki、维护知识索引或生成学习路径时使用。默认索引优先、最小上下文、只读优先；飞书只是 Provider，底层复用官方 lark-cli/OpenAPI；任何写入先生成预览并遵循人工确认门禁。"
metadata:
  requires:
    bins: ["lark-cli", "node"]
  cliHelp: "lark-cli --help;lark-cli wiki --help;lark-cli docs --help"
---
# AI Knowledge

该 Skill 给 **ai-agent-platform 中的 Agent** 使用，提供项目知识生命周期能力。它不是飞书 CRUD 包装器，也不是给 Codex 自由发挥内容的提示词。Codex/CLI 是执行器；调用该 Skill 的 Agent 负责理解目标、组织语义内容、引用依据和决定是否沉淀。

## 开始前必须读取

1. [`references/00-shared-rules.md`](references/00-shared-rules.md)：认证、安全、确认门禁和停止条件。
2. [`references/01-architecture-and-boundaries.md`](references/01-architecture-and-boundaries.md)：Skill、Provider、Agent、Codex 的职责边界。
3. [`references/02-project-profile.md`](references/02-project-profile.md)：当前 `ai-agent-platform` 飞书空间、目录和动态状态策略。
4. 涉及飞书读取或写入时，再读取 [`references/06-feishu-provider.md`](references/06-feishu-provider.md)。

## 触发场景

- Agent 开始项目任务前需要架构、ADR、工作流或当前阶段上下文。
- 用户询问“为什么这样设计”“当前进度是什么”“下一步是什么”。
- 任务或实验完成，需要形成实验记录、ADR、问题解决记录或项目状态更新。
- 用户提供公开飞书 Wiki，希望结构化读取、导入或建立本地索引。
- 用户希望依据知识库生成循序渐进的学习路径。
- 知识库内容增长后，需要重建索引、检查过期内容或发现知识缺口。

## 不触发

- 仅需要执行单个飞书 API/CLI 命令且不涉及项目知识语义时，优先使用官方 `lark-wiki`、`lark-doc`、`lark-drive` 等 Skill。
- 仅处理代码仓库文件、与知识上下文无关的普通编码任务。
- 用户要求更改互联网公开、成员、权限、删除或批量移动节点；本 Skill 不自动执行这些治理操作。

## 总流程

1. **识别知识意图**：查询、沉淀、状态同步、ADR、导入、索引、学习路径。
2. **确定信息来源**：项目配置、Knowledge Index、飞书、Git、本地文件；不要默认全库扫描。
3. **读取最小证据**：先目录/索引，再 outline/section，最后才是完整正文。
4. **生成 Context Package 或 Draft**：列出来源、范围、缺口和置信度；不得编造项目事实。
5. **执行动作**：只读可直接执行；写入先输出 Write Plan 和内容预览，得到明确同意后再执行。
6. **验收**：回读目标资源，核对 token、标题、revision、父节点和正文关键段落。
7. **维护闭环**：成功写入后更新索引；只有达到里程碑时才同步项目状态。

## 意图路由

| 意图 | 必读参考 | 首选产物 |
|---|---|---|
| 查询项目上下文 | `04-retrieval-policy.md`、`07-workflows.md#query-context` | Context Package |
| 沉淀知识 | `03-knowledge-model.md`、`05-write-governance.md` | Knowledge Draft + Write Plan |
| 同步项目状态 | `05-write-governance.md`、`07-workflows.md#sync-project-status` | Project Status Draft |
| 记录 ADR | `03-knowledge-model.md`、`07-workflows.md#record-adr` | ADR Draft |
| 导入公开 Wiki | `06-feishu-provider.md`、`07-workflows.md#import-public-wiki` | Tree + Index + Import Report |
| 生成学习路径 | `07-workflows.md#build-learning-path` | Learning Path |
| 重建/查询索引 | `04-retrieval-policy.md` | Index / Ranked Candidates |

## 强制行为规则

- **内容作者与执行器分离**：Codex 可以读取、创建、更新和验收；不得在缺少依据时自行宣布项目阶段、技术决策或完成状态。
- **动态状态单一真源**：`Project_Status（项目状态）` 是规范状态源；首页“当前阶段”只是可选快照，不能作为唯一真源。
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

1. 知识类型与目标目录。
2. 完整内容草稿。
3. Write Plan（目标 token、命令类别、风险、幂等键、验收步骤）。
4. 明确询问是否执行。

没有明确同意时，不执行真实写入。

## 可用脚本

- `node scripts/lark_read.mjs ...`：只读解析 Wiki、递归目录、读取正文。
- `node scripts/build_index.mjs ...`：从目录树和 Markdown 文件构建本地索引。
- `node scripts/query_index.mjs ...`：低成本检索索引并输出候选阅读计划。
- `node scripts/render_draft.mjs ...`：从结构化 Knowledge Event 生成实验、ADR、状态、知识笔记或学习路径草稿。
- `node scripts/lark_write.mjs ...`：默认 dry-run；仅在显式 `--apply` 和确认短语存在时执行受控创建/更新。
- `node scripts/validate_bundle.mjs`：校验 Skill 文件、项目配置和 JSON Schema。

脚本只处理确定性工作；语义判断、内容组织、事实校验和最终决策由 Agent 完成。
