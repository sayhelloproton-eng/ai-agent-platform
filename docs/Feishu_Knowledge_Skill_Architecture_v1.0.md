# Feishu Knowledge Skill Architecture v1.0

> 文档状态：架构设计  
> 项目：ai-agent-platform  
> 当前阶段：Knowledge Layer 建设  
> 本文不包含 Skill 实现、脚本、依赖安装或飞书数据操作。

## 1. 背景与设计目标

ai-agent-platform 的目标是构建面向 AI Agent 的工程平台，覆盖 Agent 系统、Workflow、Tool / Skill、Knowledge System 与长期上下文管理。

当前 Knowledge Layer 需要解决的不是“如何操作飞书”，而是：

- Agent 如何理解项目及其知识结构；
- Agent 如何按任务快速找到可信上下文；
- Agent 如何把执行结果转化为可复用知识；
- 知识如何被整理、更新、关联和持续演化；
- 底层知识载体变化时，上层 Agent 能力如何保持稳定。

因此，本设计的核心对象是 **AI Knowledge Skill**。Feishu 只是首个 Knowledge Provider，`lark-cli` / OpenAPI 是 Feishu Adapter 可调用的底层工具。

WaytoAGI 公开 Wiki 调研已经验证：

- 官方 `lark-cli` 可以解析公开 Wiki 节点；
- 可以递归获取 Wiki 目录树；
- 可以读取 `docx` 正文并导出 Markdown；
- Agent、Tool、Knowledge、Workflow 可以形成可运行链路；
- 不同飞书对象类型和访问权限会造成能力差异，不能假设所有节点都能以 Markdown 统一读取。

### 1.1 设计目标

1. 为 Agent 提供面向意图的知识能力，而不是底层 CRUD。
2. 通过索引缩小检索范围，避免每次扫描整个知识库。
3. 将 Provider 差异隔离在统一契约之后。
4. 支持知识的发现、查询、沉淀、维护和学习路径构建。
5. 保留来源、更新时间和证据链，使上下文可追溯。
6. 允许 Feishu、Git、Local File、Web 共同组成知识系统。

### 1.2 非目标

- 不建设飞书机器人或面向普通用户的飞书管理工具；
- 不封装一套飞书 CRUD API；
- 不把“向量搜索”本身当作完整 Knowledge System；
- 不在每次请求时下载整个 Wiki；
- 不让上层 Agent 感知 `space_id`、`node_token` 等 Provider 私有细节；
- 不在当前阶段实现 Skill、脚本、同步任务或存储组件。

## 2. Feishu Knowledge Skill 的定位

### 2.1 使用者

AI Knowledge Skill 的直接使用者是 **AI Agent**。

Human 通过 ChatGPT、Custom GPT、Gateway 或其他入口提出目标；Agent 负责理解任务并决定是否调用知识能力。人不直接面对 Skill 的内部接口。

典型使用场景：

- Coding Agent 在修改代码前获取项目架构、领域边界和 ADR；
- Planning Agent 获取产品目标、当前阶段和约束；
- Research Agent 查询历史实验、来源材料和结论；
- Workflow Agent 获取流程定义、工具要求和执行记录；
- Learning Agent 根据目标和已有知识生成学习路径；
- Agent 完成任务后提出知识沉淀或状态更新请求。

### 2.2 Skill 负责什么

Skill 负责把 Agent 的知识意图转换为稳定的领域能力，例如：

- `query_context`：为当前任务获取最相关上下文；
- `discover_knowledge`：发现知识结构和新增内容；
- `capture_knowledge`：把工作结果整理成知识候选；
- `record_decision`：以 ADR 语义记录架构决策；
- `update_project_status`：维护项目阶段和状态；
- `build_learning_path`：基于目标、现状和依赖生成学习路径。

这些名称表达业务意图，不表达底层 Provider 操作。

### 2.3 Skill 不负责什么

- 不直接实现飞书鉴权、分页、重试和 Token 保存；
- 不直接暴露 Wiki 节点、文档块或 OpenAPI 参数；
- 不决定某个 Provider 的 CLI 命令细节；
- 不替代 Agent 的任务规划和最终判断；
- 不把未经验证的生成内容直接写入权威知识库；
- 不承担通用文件管理、搜索引擎或数据库职责。

### 2.4 与 Feishu CLI 的关系

`lark-cli` 位于 Tool / Adapter 层，是 Feishu Adapter 的一种执行通道。

- Skill 表达“需要什么知识”；
- Provider 将知识请求映射到统一 Provider 契约；
- Feishu Adapter 将契约映射为 Wiki、Docs、Sheets、Base 等操作；
- `lark-cli` 或 OpenAPI 执行具体只读/写入请求；
- Adapter 将飞书返回结果标准化为 Knowledge Item 和 Context Package。

Skill 不拼接 CLI 命令，也不依赖 CLI 输出格式。未来由 OpenAPI 替换 CLI 时，Skill 契约保持不变。

## 3. 总体架构

```text
Human / Application
        │
        ▼
Agent
        │  knowledge intent
        ▼
AI Knowledge Skill
        │  capability request
        ▼
Knowledge Router / Policy
        │
        ├──────────────► Knowledge Index
        │                    │
        ▼                    │ candidates
Provider Layer ◄─────────────┘
        │
        ├── Feishu Provider
        │       │
        │       ▼
        │   Feishu Adapter
        │       │
        │       ├── lark-cli
        │       └── Feishu OpenAPI
        │
        ├── Git Provider
        ├── Local File Provider
        └── Web Provider
                │
                ▼
Normalizer / Context Builder
        │
        ▼
Context Package
        │
        ▼
Agent
```

简化主链路：

```text
Agent
  ↓
AI Knowledge Skill
  ↓
Provider Layer
  ↓
Feishu Adapter
  ↓
lark-cli / OpenAPI
```

### 3.1 核心组件职责

| 组件 | 职责 |
|---|---|
| Agent | 理解用户目标、决定是否需要知识、使用返回上下文完成任务 |
| AI Knowledge Skill | 提供面向意图的知识能力，编排查询、沉淀和维护流程 |
| Knowledge Router | 根据任务、知识类型、项目范围和策略选择索引及 Provider |
| Knowledge Index | 保存轻量知识目录、关系、关键词、更新时间和来源定位 |
| Provider Layer | 提供统一读写契约，屏蔽不同知识载体差异 |
| Feishu Provider | 将统一知识操作转换为 Feishu 领域操作 |
| Feishu Adapter | 处理 Wiki/Docs/Base/Sheets API、CLI、分页、鉴权和错误 |
| Normalizer | 将不同 Provider 的结果转换为统一 Knowledge Item |
| Context Builder | 去重、排序、裁剪并生成带证据的 Context Package |
| Policy | 控制权限、写入确认、可信度、预算和数据边界 |

### 3.2 分层约束

1. Agent 只依赖 Skill 能力，不依赖 Provider。
2. Skill 只依赖 Provider 契约，不依赖 `lark-cli`。
3. Provider 不泄露底层 Token、CLI 输出和 API 错误结构。
4. Adapter 不承担知识语义判断。
5. Index 是定位层，不是权威正文存储。
6. 原始 Provider 是知识事实来源，Context Package 是任务级临时产物。

## 4. Skill 能力模型

### 4.1 Knowledge Discovery

目标：理解“有哪些知识”以及知识结构如何变化。

能力包括：

- 发现 Space、目录、文档和节点关系；
- 获取知识条目的基本元数据；
- 建立 Provider 内部父子关系；
- 识别新增、更新、移动和失效条目；
- 将 Provider 私有标识映射为统一 Knowledge Item ID；
- 增量更新索引，而不是重复全量扫描。

输出应是结构化目录和变更集，不默认加载所有正文。

### 4.2 Knowledge Retrieval

目标：针对 Agent 当前任务返回“足够且最相关”的上下文。

能力包括：

- 理解问题所属项目、领域、任务类型和时间范围；
- 从索引选出候选知识条目；
- 读取少量高相关原文；
- 对标题、目录、标签、关系和更新时间进行组合排序；
- 去除重复、过期或互相冲突的候选；
- 在 Token 预算内构造 Context Package；
- 返回来源、定位信息、更新时间和置信说明。

Retrieval 不是单一向量搜索，而是：

```text
意图识别 + 结构路由 + 元数据过滤 + 关系扩展 + 原文读取 + 预算裁剪
```

### 4.3 Knowledge Capture

目标：把 Agent 工作产物转化为可审核、可追溯的知识。

典型输入：

- 实验结果；
- 架构方案；
- ADR；
- 项目状态；
- Workflow 定义；
- 问题排查记录；
- 学习笔记。

Capture 分为两步：

1. 生成 Knowledge Candidate：包含类型、摘要、原文、来源任务、目标目录和关联条目。
2. 经过策略检查或人工确认后，由 Provider 写入权威知识库。

默认不得把未经确认的推断覆盖现有事实。写入需具备幂等键、来源记录和冲突检测。

### 4.4 Knowledge Maintenance

目标：保持知识结构、状态和关系长期有效。

能力包括：

- 更新 Knowledge Index；
- 检测失效链接和不可访问节点；
- 识别重复、过时或冲突知识；
- 维护项目状态与里程碑；
- 建立 ADR、架构、代码、实验之间的关联；
- 标记待复核内容，而不是自动删除；
- 根据 Provider 更新时间执行增量同步。

Maintenance 应输出变更建议和可审计记录。高影响修改应由人确认。

### 4.5 Learning Path

目标：将知识库中的已有资料组织为面向目标的学习路径。

输入：

- 学习目标；
- 当前能力或已掌握内容；
- 时间预算；
- 前置依赖；
- 指定项目或技术方向。

处理：

- 从 Index 定位主题和依赖；
- 读取关键原文；
- 识别知识缺口；
- 按前置关系组织阶段；
- 为每个阶段关联来源、实践任务和验收标准。

输出不是简单文档列表，而是：

```text
目标 → 前置知识 → 学习单元 → 实践任务 → 验收证据
```

## 5. Provider 设计

### 5.1 为什么 Feishu 不是核心能力

Knowledge System 的核心语义是“发现、定位、获取、沉淀、维护知识”。飞书只是一种存储和协作介质。

如果 Skill 直接绑定 Feishu：

- Agent 意图会退化为 Wiki CRUD；
- Git 中的代码事实、本地材料和 Web 外部知识无法统一使用；
- CLI 或 API 变化会传播到 Agent 层；
- 知识 ID、权限和内容格式会被飞书模型锁定；
- 无法根据任务选择最可信的来源。

因此核心能力必须使用 Provider 无关模型。

### 5.2 Provider 统一契约

概念契约可包含：

| 契约 | 说明 |
|---|---|
| `discover(scope, cursor)` | 发现目录和知识条目，支持增量游标 |
| `get_metadata(item_id)` | 获取标题、类型、关系、版本和来源信息 |
| `fetch_content(item_id, selector)` | 按需读取正文、片段或结构 |
| `search(query, filters)` | 执行 Provider 原生搜索，作为索引候选补充 |
| `capture(candidate, policy)` | 在策略允许后写入知识 |
| `update(item_id, change, version)` | 带版本检查地更新知识 |
| `health()` | 返回 Provider 可用性、身份和能力范围 |

这里的契约是架构语义，不是本阶段的代码接口定义。

Provider 必须声明 Capability Profile，例如：

- 是否支持层级目录；
- 是否支持全文搜索；
- 是否支持增量更新时间；
- 是否支持 Markdown；
- 是否支持写入、版本检查和链接；
- 当前身份具有哪些只读或写入能力。

### 5.3 Feishu Provider

负责：

- Space、Wiki Node、Doc 元数据发现；
- Wiki 层级与 Knowledge Item 关系映射；
- 文档正文按需获取；
- 飞书文档类型识别；
- 写入阶段的目录选择、版本与权限校验；
- 将 CLI/API 错误转换为统一 Provider Error。

Feishu Adapter 需按对象类型路由：

| 飞书对象 | 首选读取通道 |
|---|---|
| Wiki Node | Wiki API / `lark-cli wiki` |
| Docx | Docs API / `lark-cli docs` |
| Sheet | Sheets API / `lark-cli sheets` |
| Bitable | Base API / `lark-cli base` |
| 其他附件 | Drive API / `lark-cli drive` |

WaytoAGI 调研说明：Wiki 节点公开不代表其 Sheet、Bitable 等子资源一定具有相同 API 权限。Provider 必须允许“目录可见、正文不可读”的部分成功状态。

### 5.4 Git Provider

未来用于提供代码事实及其演化历史：

- README、架构文档、ADR、接口定义；
- 代码目录和模块边界；
- commit、branch、tag 与变更关系；
- 文档与实现版本的一致性证据。

Git Provider 应优先使用结构和变更信息，避免把整个仓库文本送入模型。

### 5.5 Local File Provider

未来用于管理尚未进入正式知识库的本地资料：

- Markdown、PDF、图片、配置和研究材料；
- 工作区路径、文件哈希、修改时间；
- 本地草稿和待归档知识候选。

Local Provider 必须设置允许访问的根目录，防止越界读取。

### 5.6 Web Provider

未来用于获取外部公开知识：

- 官方文档；
- 公开网页和公开 Wiki；
- 技术文章与研究资料。

Web 内容应记录 URL、抓取时间、发布日期、来源类型和访问状态。外部内容不能默认覆盖项目内部事实。

## 6. Feishu CLI / OpenAPI Adapter

### 6.1 Adapter 职责

- 选择 `lark-cli` 或 OpenAPI 执行通道；
- 处理身份、鉴权状态和能力探测；
- 处理分页、重试、限流、超时和游标；
- 解析 Wiki URL、node token 和对象 token；
- 按对象类型选择正确 API；
- 保存 Provider 原始错误，但向上返回统一错误；
- 对所有写入操作实施 dry-run、版本检查和确认策略；
- 记录调用审计信息，但不得记录明文 Token。

### 6.2 CLI 与 OpenAPI 的选择

MVP 可优先使用已经验证的官方 `lark-cli`，降低早期接入成本。随着平台服务化，可由 OpenAPI Adapter 提供稳定、并发和可观测能力。

二者都必须实现同一 Feishu Provider 契约：

```text
Feishu Provider
      │
      ├── Lark CLI Adapter
      └── Feishu OpenAPI Adapter
```

### 6.3 错误模型

统一错误至少应区分：

- `NotFound`
- `PermissionDenied`
- `UnsupportedContentType`
- `AuthenticationRequired`
- `RateLimited`
- `ProviderUnavailable`
- `VersionConflict`
- `PartialContent`

错误需要包含 Provider、资源定位、是否可重试和建议动作。Skill 不应直接解析 CLI 文本。

## 7. Knowledge Index 设计

### 7.1 设计目的

Knowledge Index 是轻量定位系统，解决：

- 避免每次递归扫描整个知识库；
- 避免把全库正文发送给 LLM；
- 快速确定与任务最相关的少数节点；
- 追踪来源、关系、版本和更新时间；
- 支持跨 Provider 的统一查询。

Index 不替代 Feishu、Git 或本地文件。权威正文仍由 Provider 保存。

### 7.2 Knowledge Item 元数据

建议最小模型：

| 字段 | 说明 |
|---|---|
| `knowledge_id` | Provider 无关的稳定 ID |
| `provider` | `feishu`、`git`、`local`、`web` |
| `provider_item_id` | Provider 私有定位信息 |
| `project` | 所属项目，如 `ai-agent-platform` |
| `title` | 知识标题 |
| `knowledge_type` | context、product、architecture、adr、experiment 等 |
| `path` | 逻辑目录路径 |
| `parent_id` | 父级 Knowledge Item |
| `relations` | 依赖、实现、验证、替代等关系 |
| `keywords` | 主题词与领域词 |
| `content_digest` | 内容摘要哈希，用于变更检测 |
| `updated_at` | Provider 更新时间 |
| `indexed_at` | 最近索引时间 |
| `access_state` | 可读、部分可读、无权限、失效 |
| `authority` | 来源权威级别 |
| `locator` | 可追溯 URL、路径或版本 |

可选增加短摘要和小型检索片段，但不能在 Index 中复制整库正文。

### 7.3 分层索引

建议使用三层：

1. **Structure Index**  
   保存目录、父子关系、知识类型和 Provider 定位。
2. **Semantic Metadata Index**  
   保存标题、关键词、短摘要和领域标签。
3. **Content Chunk Index（按需）**  
   仅为高价值、长文档建立可定位片段，不默认对全库切块。

先使用结构和元数据筛选；只有候选仍过多时才使用内容级索引。

### 7.4 避免全库扫描

- 初次发现允许一次受控全量目录扫描；
- 后续基于 `updated_at`、版本号、内容哈希或 Provider 游标增量同步；
- 查询时只访问 Index，不先访问全部 Provider 正文；
- 对选中的 Top-K 节点按需获取内容；
- 缓存稳定元数据和近期 Context Package；
- 对不可访问或长期未变化节点采用退避策略；
- 将目录级路由规则用于缩小范围，例如 ADR 问题优先进入 `11_ADR`。

### 7.5 降低 Token 消耗

- 先返回标题、路径和摘要，后取正文；
- 为请求设置候选数、正文数和 Token Budget；
- 优先抽取与问题相关的章节，而非整篇文档；
- 对重复引用按 `knowledge_id + version` 去重；
- 已在当前对话使用的上下文不重复注入；
- 长文先基于目录定位章节，再读取对应段落；
- 保留引用定位，不用冗长转述替代原文证据。

### 7.6 快速定位上下文

候选排序建议组合：

```text
结构匹配
+ 知识类型匹配
+ 标题/关键词匹配
+ 关系邻近度
+ 项目范围
+ 时效性
+ 来源权威度
+ Provider 可访问性
```

向量相似度可以作为信号之一，但不能成为唯一排序依据。

## 8. Context Retrieval 流程

```text
用户问题
   ↓
Agent 判断是否需要外部知识
   ↓
调用 AI Knowledge Skill
   ↓
Knowledge Router 识别项目、领域、知识类型、时间范围
   ↓
查询 Knowledge Index
   ↓
获得候选 Knowledge Items
   ↓
Provider 按需获取少量原文或目标章节
   ↓
Normalizer 统一内容与来源信息
   ↓
Context Builder 去重、排序、裁剪
   ↓
返回 Context Package
   ↓
Agent 使用上下文完成任务
```

### 8.1 Agent 判断

以下情况应调用 Skill：

- 问题依赖项目历史、架构约束或已有决策；
- 需要验证当前状态或知识库事实；
- 需要引用已有实验、Workflow 或学习材料；
- 当前上下文不足以安全执行任务。

纯语言转换、无需项目事实的简单任务可不调用。

### 8.2 Skill 路由

Router 产生 Retrieval Plan：

- `project_scope`
- `knowledge_types`
- `providers`
- `time_range`
- `required_authority`
- `top_k`
- `token_budget`
- `freshness_requirement`

例如“为什么 Gateway 采用某种边界”应优先查询：

```text
11_ADR → 02_Architecture → 09_Engineering → Git Provider
```

### 8.3 Context Package

返回结构建议包含：

- 当前问题和检索范围；
- 选中的原文片段；
- 每个片段的 Knowledge Item ID；
- 标题、来源、路径、版本和更新时间；
- 相关关系；
- 内容缺失或权限限制；
- 使用的 Token Budget；
- 是否需要进一步检索。

Context Package 不应隐藏冲突。如果多个来源结论不同，应同时返回并标明权威度和时间。

## 9. Knowledge Lifecycle

```text
产生知识
   ↓
整理
   ↓
存储
   ↓
索引
   ↓
检索
   ↓
使用与验证
   ↓
更新 / 归档
   └──────────► 再次索引
```

### 9.1 产生知识

来源包括人工设计、Agent 执行、代码变更、研究实验、Workflow 运行和外部资料。

每条知识必须保留来源任务、作者/执行者、产生时间和证据。

### 9.2 整理

将原始结果转化为明确的知识类型：

- Project Context
- Product Goal
- Architecture
- Domain Model
- Agent System
- Workflow
- Knowledge System
- Model Runtime
- Tool Integration
- Engineering
- Research Experiment
- ADR
- Learning Path
- Portfolio
- Agent Log

整理阶段负责去除临时噪声、建立标题、关系和目标位置，但不得改变事实。

### 9.3 存储

根据知识类型和权威来源选择 Provider：

- 协作文档、项目状态：Feishu；
- 与代码强关联的设计和 ADR：Git；
- 草稿与本地材料：Local File；
- 外部参考：Web Index。

同一知识可以跨 Provider 引用，但必须指定权威来源，避免双向覆盖。

### 9.4 检索

通过 Index 先定位，再由 Provider 读取最新正文。Context Package 记录检索版本，确保可追溯。

### 9.5 更新

更新前检查：

- 目标是否仍存在；
- 当前版本是否与读取版本一致；
- 新内容是补充、替代还是冲突；
- 是否需要人工确认；
- Index 是否需要失效和重建。

删除不作为自动维护的默认动作。过时知识优先标记状态、建立替代关系或归档。

## 10. MVP 阶段规划

### Phase 1：只读查询

目标：让 Agent 能稳定获取项目上下文。

范围：

- Feishu Provider 只读接入；
- 发现指定 Space 及目录树；
- 建立 Structure Index 与基础元数据；
- 按项目目录和知识类型路由；
- 按需读取 docx 正文；
- 构造带来源的 Context Package；
- 记录不可读 Sheet/Bitable 等部分成功状态；
- 设置候选数量和 Token Budget。

验收标准：

- Agent 无需扫描全库即可回答项目上下文问题；
- 返回结果包含来源、路径和更新时间；
- Provider 不可用时能够明确降级；
- Skill 层不出现飞书私有参数；
- 不发生任何知识库写入。

### Phase 2：知识沉淀

目标：把 Agent 执行结果转化为可审核知识。

范围：

- Knowledge Candidate 模型；
- 实验、ADR、项目状态等类型化模板；
- capture、record decision、update status 能力；
- 人工确认或策略审批；
- 幂等写入与版本冲突检测；
- 写入后增量更新 Index；
- 初步接入 Git / Local Provider。

验收标准：

- 同一任务重试不会产生重复文档；
- 每次写入具有来源和审计记录；
- 冲突不会静默覆盖；
- Agent 生成内容与人工确认状态可区分。

### Phase 3：自动维护

目标：让知识系统能够持续发现变化并提出维护动作。

范围：

- 多 Provider 增量同步；
- 失效、重复、冲突和过期检测；
- 文档与代码、ADR、实验关系维护；
- 项目状态自动汇总；
- Learning Path 动态更新；
- 自动生成维护建议；
- 低风险变更自动执行，高风险变更人工确认。

验收标准：

- 只同步变化内容；
- 可追踪每次维护的原因和影响；
- Provider 之间有明确权威来源与冲突策略；
- 自动维护不会执行无确认删除或大范围覆盖。

## 11. 安全、权限与可观测性

### 11.1 最小权限

- Phase 1 仅申请完成查询所需的只读权限；
- 写权限在 Phase 2 单独启用；
- 权限能力由 Provider Health/Capability Profile 显式报告；
- 公开 Wiki 的页面公开状态不能被视为所有子资源 API 可读。

### 11.2 写入控制

- Skill 意图必须明确区分 query 与 mutation；
- 写入前验证目标 Provider、知识类型、目录和版本；
- 高影响操作要求人工确认；
- 删除、权限变更和批量覆盖不属于默认 Skill 能力；
- 每次变更生成审计事件和幂等键。

### 11.3 可观测性

建议记录：

- Skill capability；
- Retrieval Plan；
- Index 命中数和候选数；
- 实际读取的 Knowledge Item；
- Token 预算与使用量；
- Provider 延迟、错误和重试；
- Context Package 引用；
- 写入审批和结果。

日志不得保存访问 Token、Cookie 或不必要的完整敏感正文。

## 12. 明确设计边界

### 12.1 禁止做飞书 CRUD Wrapper

不向 Agent 提供以下形式的核心能力：

- `create_doc`
- `get_node`
- `update_doc`
- `delete_node`

这些只能作为 Feishu Adapter 内部实现细节。Skill 必须以知识意图命名和编排。

### 12.2 禁止退化为简单 RAG

系统不能只做：

```text
文档切块 → Embedding → 相似度 Top-K → 发送给 LLM
```

必须同时考虑结构、知识类型、关系、来源权威、时间、项目范围、权限和版本。RAG 可以作为 Retrieval 的局部技术，不是系统边界。

### 12.3 禁止强绑定飞书

- 统一 Knowledge Item 不使用飞书 Token 作为全局业务 ID；
- Skill 不依赖飞书目录、API 或 CLI 输出；
- Provider 契约必须能由 Git、Local File 和 Web 实现；
- Provider 失败不能导致整个 Knowledge Skill 架构失效；
- 跨 Provider 时必须明确来源权威和冲突规则。

### 12.4 当前阶段边界

本文仅完成架构设计：

- 不创建 `skills/ai-knowledge`；
- 不编写 Provider、Adapter、Index 或 Retrieval 代码；
- 不创建自动同步脚本；
- 不安装依赖；
- 不修改飞书知识库；
- 不决定具体数据库、Embedding 模型或部署拓扑。

## 13. 需要人工确认的架构决策

以下决策会影响后续详细设计和 MVP 实现，应在进入代码阶段前确认。

### ADR-KNOW-001：Index 的权威边界

建议：Index 只保存定位元数据、关系、短摘要和可选片段；Provider 保持正文权威。

待确认：是否允许在本地 Index 缓存完整正文，以支持离线查询。

### ADR-KNOW-002：Phase 1 Index 存储

候选：

- 仓库内 JSON/SQLite：简单、可审计，适合单机 MVP；
- 独立数据库：适合服务化和并发，但增加运维成本。

建议：Phase 1 优先 SQLite 或等价轻量本地存储，接口保持可替换。

### ADR-KNOW-003：Feishu 与 Git 的权威关系

建议：

- 项目状态、协作知识以 Feishu 为权威；
- 代码、接口和随代码演进的 ADR 以 Git 为权威；
- 跨 Provider 只建立引用，不进行无规则双向同步。

待确认：ADR 最终以 Git 还是 Feishu 为主。

### ADR-KNOW-004：写入审批策略

建议：

- ADR、架构、项目状态：必须人工确认；
- Agent Log、低风险执行记录：可在限定目录自动追加；
- 删除、覆盖和权限修改：始终人工确认。

待确认：哪些知识类型允许自动写入。

### ADR-KNOW-005：检索预算策略

建议：按任务类型配置 Top-K、正文数量和 Token Budget，并支持二次检索。

待确认：MVP 的默认预算，以及是否允许 Agent 自主扩大检索范围。

### ADR-KNOW-006：语义索引引入时机

建议：Phase 1 先验证结构索引、关键词和关系路由；只有召回不足时再引入 Embedding。

待确认：是否在 Phase 1 同时验证小规模语义检索。

### ADR-KNOW-007：公开外部知识的可信度

建议：Web / 公开 Wiki 默认作为外部参考，不自动成为项目内部事实；引用时保留来源和抓取时间。

待确认：哪些外部来源可以提升为可信知识源。

### ADR-KNOW-008：不可读取对象的降级策略

建议：Index 保留目录与元数据，将正文状态标为 `PartialContent` 或 `PermissionDenied`，检索时提示缺口，不伪造正文。

待确认：是否为 Sheet、Bitable 等类型单独申请只读权限并纳入 Phase 1。

## 14. 架构结论

Feishu Knowledge Skill 的正确形态是：

```text
AI Agent 的长期知识能力
        ↓
面向意图的 AI Knowledge Skill
        ↓
可替换的 Knowledge Provider
        ↓
Feishu / Git / Local File / Web
```

其价值不在于让 Agent “会操作飞书”，而在于让 Agent 能够：

```text
理解项目
  ↓
定位知识
  ↓
获取可信上下文
  ↓
执行任务
  ↓
沉淀与维护知识
  ↓
持续演化
```

Phase 1 应优先证明：基于结构化索引和按需读取，Agent 能以较低 Token 成本稳定获得可追溯的项目上下文，同时保持 Feishu Provider 可替换。
