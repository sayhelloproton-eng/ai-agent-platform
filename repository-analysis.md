# AI Agent Platform Repository Analysis

> Task: AI Agent Platform Knowledge System Redesign v3.0
>
> Phase: Phase 0 — Repository Analysis
>
> Date: 2026-07-27
>
> Status: Analysis Only

## 1. Executive Summary

当前仓库已经具备一套可工作的知识基础：Git 唯一真源、根 `context/`、四层 `docs/`、AI Knowledge Skill、Asset Index、Relation Index 和 Private Context 隔离均已建立。

但是，当前结构仍是 Task 002–003-C 形成的四层模型：

```text
docs/
├── knowledge/
├── technical/
├── learning/
└── adr/
```

它与 v3.0 提出的 16 个一级知识目录并不一致。当前 16 个目标目录均不存在，`docs/00_项目起源/project-home.md` 也不存在。

当前最重要的问题不是“如何移动文件”，而是先解决以下架构冲突：

1. v3.0 指定首页位于 `docs/00_项目起源/`，但当前唯一 Projection Source 是 `docs/knowledge/`。
2. v3.0 要把 ADR、学习路线和 Agent 运行日志放入飞书；当前 Skill Contract 明确禁止 `docs/adr/`、`docs/learning/` 和运行资产进入 Projection。
3. 当前部分正式资产仍描述 Feishu Native、逐资产映射和多种同步模式，与 Task 003-C 的 One Way Overwrite Projection 不一致。
4. 根 `context/` 仍停留在 Task 001，无法准确表达 Task 003-C 之后的当前状态。
5. 当前知识文档多数是工程定义或任务结果摘要，尚未普遍符合 v3.0 要求的开放知识库叙事结构。

因此，不应直接执行目录迁移。Phase 1 必须先确认知识根目录、ADR/Learning/Log 的发布边界以及 Context 与 Human Knowledge 的权威关系。

## 2. Analysis Scope

本次读取并分析：

- 根 [`AGENTS.md`](AGENTS.md)、[`README.md`](README.md)；
- [`docs/AGENTS.md`](docs/AGENTS.md)；
- 当前治理目录 [`docs/technical/治理规则/`](docs/technical/治理规则/)；
- 根 [`context/`](context/)；
- 当前完整 `docs/` 结构与 Markdown 标题；
- [`knowledge.config.yaml`](knowledge.config.yaml)；
- [`assets.yaml`](docs/technical/元数据/assets.yaml)；
- [`relations.yaml`](docs/technical/元数据/relations.yaml)；
- [`skills/ai-knowledge/SKILL.md`](skills/ai-knowledge/SKILL.md) 和 Skill Assets；
- 当前 Git 工作区状态。

分析以当前工作区为准，而不是只以 `HEAD` 为准。Task 001–003-C 的大量变更仍处于未提交状态。

本次没有读取 Private Context 正文。只检查了隔离结构、Git 跟踪边界和文件数量。

## 3. Current Repository Snapshot

### 3.1 Top-Level Structure

```text
ai-agent-platform/
├── AGENTS.md
├── README.md
├── context/
├── docs/
├── knowledge.config.yaml
├── skills/
└── .private-context/
```

当前没有 `apps/`、`packages/` 或其他业务实现目录。可执行工程资产主要集中在 `skills/ai-knowledge/`。

### 3.2 Asset Counts

| Area | Files | Markdown | README | Current Role |
|---|---:|---:|---:|---|
| `context/` | 6 | 6 | 1 | Agent Runtime Context |
| `docs/knowledge/` | 31 | 28 | 12 | 当前唯一 Feishu Projection Source |
| `docs/technical/` | 114 | 105 | 23 | 技术设计、治理、元数据、运维与历史证据 |
| `docs/learning/` | 17 | 15 | 2 | 学习材料与模板 |
| `docs/adr/` | 5 | 5 | 2 | 架构决策 |
| `skills/` | 59 | — | — | 可执行 Skill、Schema、Script 和 Test |
| `.private-context/` | 14 | — | 11 tracked | 私有内容边界 |

`docs/` 当前共有 170 个工作区文件。其中：

- 116 个路径已进入 Git Index；
- 53 个 WaytoAGI 第三方全文页面存在于本地但未被 Git 跟踪；
- 1 个 `.DS_Store` 属于本地系统文件。

### 3.3 Current Documentation Tree

```text
docs/
├── knowledge/
│   ├── 项目与产品/
│   ├── 架构与领域/
│   │   ├── 平台架构/
│   │   ├── 领域模型/
│   │   └── 知识架构/
│   ├── Agent与能力/
│   ├── 工作流/
│   ├── 实验与复盘/
│   └── Portfolio/
├── technical/
│   ├── 架构实现/
│   ├── 技术方案/
│   ├── 技术调研/
│   ├── 工程规范/
│   ├── 运维与迁移/
│   ├── 治理规则/
│   ├── 元数据/
│   └── Archive/
├── learning/
└── adr/
```

该结构的优点是 Knowledge、Technical、Learning 和 Decision 边界清楚；缺点是面向人阅读的知识没有按项目成长路线展开，且 v3.0 希望展示的 ADR、Learning、Tool、Model 和 Agent Log 不在当前 Projection Source 内。

## 4. Asset Classification

### 4.1 Knowledge Assets

当前明确属于 Human Knowledge 的资产主要有：

- 项目背景、平台愿景与 Portfolio 目标；
- Target Architecture、Delivery Architecture 和领域模型；
- AI Knowledge Skill 设计说明；
- Knowledge、Coding 和 Video Workflow；
- 已整理的 Feishu CLI 实验；
- Portfolio Story 和 Demo Roadmap。

当前 `assets.yaml` 共登记 30 个正式资产：

| Canonical Layer | Count |
|---|---:|
| `docs/knowledge/` | 16 |
| `docs/technical/` | 12 |
| `docs/adr/` | 2 |

30 个 Canonical Path 全部存在，没有重复 Asset ID。39 条关系的端点全部有效。这是当前体系最稳定的部分。

### 4.2 Engineering Assets

以下内容属于 Engineering Asset，不应直接进入飞书：

- `skills/ai-knowledge/scripts/`；
- `skills/ai-knowledge/tests/`；
- `skills/ai-knowledge/assets/schemas/`；
- Skill Manifest、Fixture 和运行脚本；
- `docs/technical/元数据/`；
- `docs/technical/运维与迁移/` 中的执行证据；
- 原始外部镜像、导出脚本和机器快照；
- Archive。

其中部分 Engineering Asset 已有适合人阅读的设计说明，可以成为 v3.0 Knowledge Asset 的来源：

- `skills/ai-knowledge/` → AI Knowledge Skill 设计说明；
- Schema → Schema 设计说明；
- Feishu Provider / CLI 调研 → 工具能力说明；
- Runtime Boundary → 工程实现设计。

必须保持“实现资产”和“实现说明”分离，不能直接把代码、Schema、测试或原始运行记录投影到飞书。

### 4.3 Private Assets

`.private-context/` 当前有 11 个被 Git 跟踪的边界 README，没有任何非 README 私有正文被 Git 跟踪。

本地还存在 3 个被忽略文件。本次没有读取其名称或内容。

当前隔离策略基本符合 v3.0：

```text
Private Asset
  ├── 不进入公开 Git 正文
  ├── 不进入 Feishu
  └── 只有脱敏、最小化并 Review 后才能晋升为 Public Git Asset
```

## 5. Target Directory Coverage

v3.0 的 16 个目标目录目前均不存在。以下表格只分析当前内容覆盖，不是迁移方案。

| Target Area | Existing Evidence | Current Gap |
|---|---|---|
| `00_项目起源` | CTX-001、Project Story、根 README | 缺少 `project-home.md`；起源与产品内容混合 |
| `01_项目规划` | CTX-003、ARC-003、旧 CTX-004、Demo Roadmap | Roadmap 分散；Current Context 与历史 Roadmap 状态不一致 |
| `02_产品与目标` | PRD-001、PRD-002 | 基础较完整，缺少明确场景导航 |
| `03_系统架构` | ARC-001、ARC-003、架构图 | 内容较完整，但仍包含旧 Feishu Native 描述 |
| `04_领域模型` | DOM-001 | 只有核心概念与 Aggregate 草案，状态仍为 Proposed |
| `05_Agent系统` | Agent README、SKL-001 | 缺 Agent Role、Planning、Memory、Tool Call 和生命周期专题 |
| `06_工作流设计` | WFL-001、WFL-002、WFL-003 | 有目标流程，运行实现和失败案例不足 |
| `07_知识系统` | ARC-002、SKL-001、SOL-001/002 | 核心资产存在，但知识模型仍混有已废弃的 Native、Mapping 和多模式发布 |
| `08_工具与能力` | RSH-001、Feishu CLI 证据、Skill References | 缺 MCP、GitHub API、Browser、Computer Use 的稳定能力说明 |
| `09_模型与运行环境` | 架构中的 Provider 抽象 | 缺 OpenAI、Claude、Gemini、Local Model、Ollama 专题 |
| `10_工程实现` | ARC-004、Solution、Engineering Rules、Skill 实现 | 设计说明与内部技术文档尚未形成统一的人类阅读层 |
| `11_技术研究与实验` | RSH-001、EXP-001、EXP-002、外部证据 | Research 与 Experiment 分散；实验格式不符合 v3.0 |
| `12_架构决策` | ADR-001、ADR-002 | 当前 ADR 被明确排除在 Projection Source 外 |
| `13_学习路线` | `docs/learning/chatgpt-agent-engineering/` | 当前 Learning Layer 被明确禁止投影 |
| `14_Portfolio成果展示` | Project Story、Demo Roadmap、PRD-002 | 有骨架，缺真实运行 Demo 和量化结果 |
| `15_Agent运行日志` | Execution History、Operations | 当前主要是工程证据；原始日志不适合直接公开或投影 |

## 6. Quality and Consistency Findings

### 6.1 Strengths

- Git 唯一真源原则已在配置、Skill Contract 和 ADR 中建立。
- Asset Index 和 Relation Index 当前结构有效。
- `docs/` 内部 Markdown 相对链接检查没有发现失效链接。
- 每个当前长期一级目录都有 README。
- 第三方全文页面未进入 Git Index。
- Private Context 正文没有进入 Git。
- Knowledge、Engineering 和 Private 的物理边界已经存在。

### 6.2 Stale Runtime Context

[`context/current-status.md`](context/current-status.md)、[`context/roadmap.md`](context/roadmap.md) 和根 [`README.md`](README.md) 仍把 Task 001 / Context Foundation 描述为当前阶段。

这与已经完成 Task 002、Task 003-A、003-B、003-C 的工作区事实不一致。新 Agent 目前会从最优先入口读取到过期阶段。

### 6.3 Broken Rule Navigation

全仓 203 个 Markdown 文件的本地链接检查发现 14 个失效链接：

- 根 `AGENTS.md` 仍引用已迁移的 `docs/governance/`；
- 根 `AGENTS.md` 仍引用已归档的 `docs/00-context/`；
- `skills/README.md` 仍引用旧 Governance 路径。

`docs/` 内部链接本身没有发现失效项。

### 6.4 Contract Drift

以下正式资产仍描述 Task 003-C 已废弃的模型：

- 根 `AGENTS.md`：Feishu Native、Git/Feishu Mapping；
- ARC-002：Feishu Native Layer、`mirror/projection/index/native/capture`；
- ADR-002：Native、逐资产 Mapping 和多模式发布；
- SKL-001：归档 CTX-002 是动态状态源；
- WFL-001：Native Capture、Merge、Projection Pending；
- Documentation Rules 和 Agent Working Protocol：Feishu Mapping。

当前 `knowledge.config.yaml` 已经是：

```text
docs/knowledge/
  → one_way
  → one_to_one
  → overwrite
  → Feishu
```

但正式知识正文、治理规则和 Runtime Script 尚未全部消费该模型。

### 6.5 Skill Runtime Drift

`node skills/ai-knowledge/scripts/validate_bundle.mjs` 当前退出码为 1。

原因是 validator 仍读取旧 `profile.git.current_state` 和 `docs/00-context/CTX-002-current-state.md`。这与 Task 003-B 的 Profile 3.0 不兼容，属于尚未执行的 Runtime Script Alignment。

### 6.6 Content Style Gap

在 28 个非 Archive 的 Indexed Asset 中，v3.0 关键标题覆盖如下：

| Heading | Coverage |
|---|---:|
| What | 2 / 28 |
| Why | 2 / 28 |
| Problem | 4 / 28 |
| Context | 2 / 28 |
| Decision | 2 / 28 |
| Alternatives | 1 / 28 |
| How | 0 / 28 |
| Implementation | 3 / 28 |
| Result | 2 / 28 |
| Lessons | 1 / 28 |
| Next | 2 / 28 |

这不代表所有文档都必须机械使用完全相同的标题，但说明当前资产整体仍偏向“定义、状态和任务结果”，尚未形成统一的开放知识库叙事。

实验文档也未统一使用 v3.0 规定的：

```text
Background
Problem
Exploration
Finding
Decision
Result
Lesson
```

ADR 当前结构与 v3.0 接近，但标题使用 `Reasons / Trade-offs / Consequences`，尚未统一为 `Reason / Tradeoff / Consequence`。

### 6.7 Feishu State Is Not Currently Verified

Git 中最后一份验证证据表示：

- 已创建 15 个旧结构一级 Node；
- 首页《智能体工程探索录》位于旧 `00_Context` 下；
- 历史首页验收版本为 revision 3。

v3.0 目标是 16 个新目录加首页。当前没有执行 Feishu 回读，因此不能把历史记录当作当前在线状态。Phase 3 前必须先执行只读盘点。

## 7. Primary Architecture Conflict

v3.0 指定：

```text
docs/00_项目起源/project-home.md
```

当前已接受的 Projection Contract 指定：

```text
docs/knowledge/
        ↓
Feishu Knowledge Base
```

如果直接采用 `docs/00_项目起源/`，会产生两个问题：

1. 首页不在唯一 Projection Source 内；
2. `docs/` 同时包含 Technical、Learning、ADR 和内部元数据，无法整体一对一发布。

与现有边界最一致的解释是：

```text
docs/
├── knowledge/
│   ├── 00_项目起源/
│   ├── 01_项目规划/
│   ├── ...
│   └── 15_Agent运行日志/
├── technical/
├── learning/
└── adr/
```

对应首页应为：

```text
docs/knowledge/00_项目起源/project-home.md
```

这只是 Phase 0 的架构一致性判断，不是已接受的迁移方案。若 Project Owner 坚持使用 `docs/00_项目起源/`，则必须重新设计 Task 003-A、003-B、003-C 已建立的 Knowledge Source Contract。

## 8. Decisions Required Before Phase 1

### Decision 1：16 个目录的物理根

需要确认是：

- `docs/knowledge/00_...15_...`；或
- 直接使用 `docs/00_...15_...` 并重新定义 Projection Source。

### Decision 2：ADR 的 Canonical Location

当前 ADR 位于 `docs/adr/` 且禁止投影；v3.0 要求 `12_架构决策` 进入飞书。

需要决定：

- 移动 Canonical ADR；
- 或保留 `docs/adr/`，在 Knowledge Layer 生成受控阅读视图。

后者必须解决重复内容和 Drift 风险。

### Decision 3：Learning 的发布粒度

需要区分：

- 可公开、稳定的学习路线；
- 学习过程、原始提示词、笔记和模板。

不建议把整个当前 `docs/learning/` 无筛选投影到飞书。

### Decision 4：Agent Log 的边界

需要区分：

- 可公开的执行摘要、错误复盘和优化经验；
- 原始 Trace、Prompt、模型输出、Token、运行状态和敏感输入。

只有脱敏、结构化、可复用的摘要适合作为 `15_Agent运行日志` Knowledge Asset。

### Decision 5：Research 与第三方内容

RSH/EXP 总结可以进入 Knowledge Layer。WaytoAGI 的 53 个第三方全文页面应继续作为本地忽略证据，不得进入 GitHub 或 Feishu Projection。

### Decision 6：Context 与 Human Knowledge 的权威关系

`context/` 和 `00_项目起源`、`01_项目规划` 会包含相似事实。需要明确：

- 哪一层保存动态 Agent Runtime Summary；
- 哪一层保存稳定人类叙事；
- 状态变化时谁更新谁；
- 如何避免两份 Git 文件产生事实漂移。

### Decision 7：Feishu Overwrite 的管理边界

需要确认 Overwrite Publish 是：

- 覆盖整个受管 Knowledge Base；或
- 只覆盖一个明确的 Managed Root。

任何现有人工内容是否保留，必须在 Phase 3 前明确，不能依赖覆盖时临时判断。

### Decision 8：命名和语言规范

v3.0 使用中文编号目录，当前文件和 H1 大量使用英文。需要在 Phase 1 确认：

- 目录中文、文件名英文 Asset ID 是否继续；
- H1 是否中文化；
- Feishu 标题与 Git 标题是否完全一致；
- `_`、中英文空格和编号排序规则。

## 9. Preconditions for Migration Planning

进入 Phase 1 前建议满足：

1. Project Owner 确认上述 8 个决策。
2. 先稳定或提交 Task 001–003-C 的现有工作区，避免两轮大型迁移叠加。
3. 冻结一份完整 Asset Inventory，不遗漏 untracked、ignored、Archive 和第三方证据。
4. 为每个资产定义“保留、移动、拆分、合并、生成视图或继续内部保存”，但不删除历史。
5. 明确 Asset ID、Canonical Path、Relation、README 和链接更新规则。
6. 为每批迁移定义回滚点和验证命令。
7. Git 调整验收完成后，才允许设计 Feishu Write Plan。

## 10. Phase 0 Result

本次结论：

- 当前仓库事实已完成受控盘点；
- 当前四层结构与 v3.0 的主要差距已识别；
- Knowledge、Engineering 和 Private 边界已识别；
- 16 个目标目录的现有内容覆盖和缺口已识别；
- 必须在 Phase 1 前确认的架构决策已列出。

本次未执行：

- 文件移动、重命名、合并或删除；
- 16 个目标目录创建；
- README 补充；
- `project-home.md` 创建；
- Asset Index 或 Relation Index 修改；
- Knowledge Migration Plan；
- Feishu 查询、创建、更新、删除或权限操作；
- Commit 或 Push。
