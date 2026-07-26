## 今日背景

ai-agent-platform 的项目背景、架构讨论和执行状态长期分散在 ChatGPT 会话、本地文件与飞书知识库中。聊天适合讨论和推演，但不是稳定的工程接口；本地目录保存了真实资产，却缺少可验证的远程版本事实源。新设备、新会话或新的 Agent 因此难以恢复“为什么这样设计、当前做到哪里、下一步做什么”。

本轮工作的目标是建立第一条可验证的上下文闭环：ChatGPT 提供高层语义与已确认方案，本地工程保存可执行资产，Git/GitHub 管理工程版本，飞书保存长期知识、决策与状态，AI Knowledge Skill 在两类事实源之间提供受控检索和沉淀能力。

## 今日完成事项

- 建立并验证飞书知识库“智能体工程探索”及 15 个冻结的 v1.0 一级目录。
- 创建知识库首页《智能体工程探索录》。
- 安装并验证官方 `lark-cli` 1.0.77、user/bot 身份及 Wiki/Docs 基础能力。
- 验证官方 CLI 可读取 WaytoAGI 公开 Wiki，并递归导出目录和 Markdown。
- 分析官方 CLI、Provider Adapter 与领域 Skill 的分层边界。
- 明确 AI Knowledge Skill 的直接使用者是 Agent，不是普通飞书用户，也不是简单的 Codex 命令集合。
- 明确顶层 Skill 不能退化为 Feishu CRUD Wrapper。
- 设计并反复校准 AI Knowledge Skill，最终形成 47 文件的 v1.0.0 标准 Skill 包。
- 将 Skill 安装到用户级 Agent Skills 目录，`validate_bundle` 与 `self-test` 均通过。
- 分析 ChatGPT Project 的跨设备价值与限制。
- 确定飞书作为远程知识层、GitHub 作为工程资产层。
- 提出 Context Synchronization Loop。
- 检查本地 Git、GitHub CLI、飞书访问、资产、敏感风险与第三方内容。
- 创建 `.gitignore`、README 和 `docs/context/` 恢复入口。

## WaytoAGI 与 lark-cli 验证结果

测试目标为公开 Wiki：

`https://waytoagi.feishu.cn/wiki/Zsp2wxsKEiRTEjkajJFc7FBGnh3`

已确认：

- Space ID：`7226178700923011075`
- Root Wiki Token：`Zsp2wxsKEiRTEjkajJFc7FBGnh3`
- Root Docx Token：`J88HdqWmaolp4mxA4SCcvPrGnHZ`
- 官方 `lark-cli` 可以跨租户读取公开 Wiki，但仍依赖有效的 user 或 bot token，并非匿名网页读取。
- 可以读取节点元数据、递归目录树和 Docx Markdown。
- 共发现 53 个节点，50 个 Docx 页面成功导出 Markdown。
- 2 个 Bitable 和 1 个 Sheet 不能当作 Docx 处理；类型专用读取需要对应 scope。

该实验验证了 Feishu 可以作为 Agent 的 Knowledge Provider，也验证了 Provider 必须按对象类型路由并支持“目录可见、正文不可读”的部分成功状态。

## Skill 交付标准的校准

早期产物过度接近说明文档或设计描述，缺少可安装、可执行、可验证的标准 Skill 结构。这个问题促使项目明确 Skill 的交付标准：

- 单一顶层目录；
- 唯一 `SKILL.md`；
- 详细规则进入 `references/`；
- 确定性操作进入 `scripts/`；
- 模板与 Schema 进入 `assets/`；
- 包含 fixtures、self-test 和 bundle validator；
- 不依赖外部 npm 包；
- 默认只读、索引优先、最小上下文；
- 真实写入必须经过预览和人工确认；
- 删除、权限、公开分享与批量移动不自动执行。

最终 `ai-knowledge` v1.0.0 已通过结构、自检、索引排序和草稿生成验证。

## ChatGPT Project、Feishu 与 GitHub 的边界

**ChatGPT Project** 是讨论、需求澄清、分析和架构推演入口。它保留协作过程，但历史聊天是非结构化内容，不适合作为代码版本系统或唯一长期事实源。

**Feishu** 是知识与认知上下文事实源，保存项目背景、状态、架构、领域模型、研究实验、ADR、学习路径和 Agent 执行记录。飞书不复制维护完整源码。

**Git/GitHub** 是工程资产事实源，保存代码、Skill、Schema、脚本、测试、工程文档及 Commit、Diff、Review 和回滚历史。

## 最终双源模型

```text
ChatGPT Project
    │ 讨论、分析、需求、设计
    ▼
Context Capture / AI Knowledge Skill
    ├─────────────────┐
    ▼                 ▼
Feishu               GitHub
知识事实源            工程事实源
背景/决策/状态        代码/Skill/Schema/脚本
    └────────┬────────┘
             ▼
       Agent 恢复上下文
```

两个事实源通过 URI、Commit、相对路径、飞书 Node Token 和更新时间关联。同一事实明确一个主维护位置，不执行无治理的全文双向同步。

## 解决的问题

- 将项目上下文从单一聊天依赖转化为可恢复的结构化知识。
- 明确不同资产的事实源，避免 Git 与飞书重复维护。
- 让 Skill 面向 Agent 的知识意图，而不是底层飞书 CRUD。
- 通过目录、索引和元数据先定位，再读取最小正文，降低 Token 消耗。
- 用 dry-run、人工确认、回读验收和幂等检查控制知识写入风险。
- 明确第三方公开内容只作为本地研究材料，不默认重新发布。

## 当前仍缺失的能力
- Knowledge Index 尚未建立。
- `query_context` 尚未接入真实项目索引。
- `capture_knowledge` 和 `sync_project_status` 尚未形成端到端验证。
- Git Commit 与飞书文档的自动关联尚未实现。
- Sheet 与 Bitable 的只读 scope 尚未纳入 MVP。

## 下一步实施顺序

1. 基于目录和元数据构建 Knowledge Index。
2. 实现 `query_context` 只读 MVP。
3. 实现受控的知识沉淀和项目状态同步。

## 关联的本地与 GitHub 工程资产

本地项目目录：`/path/to/ai-agent-platform`

关键资产：

- `README.md`
- `skills/ai-knowledge/`
- `docs/Feishu_Knowledge_Skill_Architecture_v1.0.md`
- `docs/Feishu_Knowledge_Skill_Design_Context_v1.0.md`
- `docs/context/project-context.md`
- `docs/context/current-task.md`
- `docs/context/remote-context-map.md`
- `docs/context/asset-inventory-2026-07-26.md`
- `docs/research/waytoagi-feishu-cli-export/`

GitHub 仓库：https://github.com/sayhelloproton-eng/ai-agent-platform

可见性：PRIVATE

默认分支：`main`

Commit：`c5ea37bb14a724798ff8628fc6b2d367135d02e3`
