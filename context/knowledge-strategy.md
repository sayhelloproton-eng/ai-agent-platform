# Knowledge Strategy

## Core Decision

**Git Repository is the only formal source of truth.**

代码、测试、Context、正式知识、技术方案、ADR、Registry、Skills、Release、Migration 和未来 Agent Profile / Knowledge Pack 只有在 Git 中物化并经过 Review 后，才成为正式项目资产。Feishu、Custom GPT Knowledge、HTML 和外部知识服务都是派生使用形态。

## Asset boundaries

| Asset | Responsibility |
|---|---|
| `context/` | 短、小、当前、可信的共享启动上下文；语义由总控 Planner 维护 |
| `docs/knowledge/` | 面向人的正式长期知识，也是 Feishu 发布源 |
| `docs/technical/` | 技术方案、治理、调研、Runbook、迁移与实验评估 |
| `docs/adr/` | 已接受的重要决策与后果 |
| `platform-registry/` | Asset、Relation、Lifecycle、Implementation、Release、Migration 与 Projection 控制面 |
| `skills/` | 精确触发、可复用、可验证的方法与工作流 |
| Task Store / Checkpoint | 当前任务状态、进度、证据和恢复信息 |
| ChatGPT Memory | 用户个性化偏好，不是项目知识 |
| Feishu / Knowledge Pack / RAG | 从 Git 派生的发布或检索形态 |

```text
Memory ≠ Project Knowledge ≠ Context ≠ Knowledge Pack ≠ Task State
```

## Knowledge capability boundaries

```text
project-knowledge-synthesis
  → 恢复多源事实、重复、冲突与目标资产结构

engineering-document-authoring
  → 把批准内容写成人类易读、视觉丰富、AI 信息无损的正式文档

project-knowledge-governance
  → 管理落位、稳定 ID、生命周期、Registry、完整性、检索和外部投影

planner-executor-handoff
  → 以 implement_from_spec 或 apply_frozen_artifacts 交给 Executor
```

Engineering Insight Distillation 只在用户明确要求时从有证据的工程事件提炼复用洞见。Context 语义只由总控 Planner 决定。

## Document Bundle

资源型正式文档是一个完整文档包：

```text
Document-ID-title/
├── README.md
└── assets/
    ├── diagram.svg
    ├── diagram.png
    └── attachment.ext
```

原则：

- Asset Co-location：正文和资源同目录、同分支、同 Commit；
- Human-first：骨架清楚、信息密度高，优先图、表、矩阵、时间线和状态表达；
- AI-lossless：每个图片立即跟随 AI 可读语义镜像；
- Atomic Visual Block：图片与镜像同步 Review 和更新；
- Git 使用 `./assets/...`，不使用独立图片分支、`asset://` 或 Feishu URL。

简单且无资源的文档可以保持单个 `.md`；一旦拥有正式资源，应升级为文档包。

## Lifecycle and evidence

```text
Raw Source
→ Learning / Research / Experiment
→ Synthesis / Draft
→ Human Review
→ Accepted Knowledge / ADR / Solution
→ Derived Agent / Skill / Knowledge Pack
→ Runtime Use and Evidence
→ Revision / Superseded / Archive
```

状态晋升必须有来源、证据、人工 Review、Registry 一致性和敏感信息检查。未经 Review 的模型输出不能直接成为正式知识或发布资产。

## Retrieval

```text
Task evidence / checkpoint
→ context/
→ Registry / local index
→ 少量相关完整文档
→ code / tests / evidence
→ 必要时外部 Knowledge Service
```

不默认扫描全仓或全部 Feishu，不从长期知识推断当前任务状态。

## Feishu projection

```text
Git document bundle
  → 读取 README.md 与本地相对图片
  → 上传图片到 Feishu
  → overwrite 正文并插入图片块
  → 保留 AI 可读语义镜像
  → API / revision / text / media 回读
```

规则：one-way、one-to-one、overwrite、zero pre-read、no semantic merge、no reverse write。Feishu media token、URL 和 Block ID 只属于投影状态，不回写 Git。

发布必须在全部正式内容 Review、Git Commit 与校验通过后获得独立授权。本阶段不执行 Feishu 写入。

## Current implementation

已实现 Git 真源、Context、正式知识、技术文档、Platform Registry、Engineering Insight Registry、六个活跃 Skill、Document Bundle 规则、34 个共置视觉资产和 Feishu 本地图片投影逻辑。

`05_上下文与知识系统` 已收敛为知识资产治理、上下文编译与策略、上下文运行与连续性、知识分发与投影、记忆反馈与学习五个领域，并形成六篇 Canonical 文档与六张共置视觉资产。当前已实现的仍是 Git 真源、项目 Context、Registry、人工 Handoff 与冻结交付；通用 Context Builder、Context Runtime、Knowledge Pack Publisher、Agent Profile Publisher、外部 Knowledge Service / RAG 和自动 Memory 晋升仍是目标设计。
