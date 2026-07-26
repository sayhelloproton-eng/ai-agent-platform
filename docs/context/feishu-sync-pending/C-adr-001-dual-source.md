- 状态：Superseded
- 日期：2026-07-26
- 决策范围：ai-agent-platform 长期上下文与工程资产管理
- Superseded By：ADR-002 Git 唯一真源与飞书投影模型

## Context

项目的讨论上下文主要存在于 ChatGPT 会话，本地工程资产尚未形成稳定的远程版本事实源。新设备、新会话和新的 Agent 难以快速恢复完整状态。聊天、协作文档与 Git 分别适合不同类型的信息，如果将它们混合为单一事实源，会造成不可审计、难回滚或重复维护。

## Decision

采用 GitHub + Feishu 双源事实架构：

- GitHub 是工程资产事实源；
- Feishu 是知识与认知上下文事实源；
- ChatGPT Project 是协作和设计入口；
- AI Knowledge Skill 负责检索、捕获、更新和关联；
- 两端通过 URI、Commit、文件路径、文档 Token 和更新时间关联，不进行无治理的全文双向复制。

## Reasons

- Git 适合代码、Skill、Schema、脚本、Diff 和回滚；
- 飞书适合结构化知识、阅读、协作、远程同步和知识问答；
- Chat 历史不适合作为唯一长期事实源；
- Provider 抽象可以避免系统强绑定飞书；
- 索引优先可以降低 Token 消耗；
- 明确权威来源能够减少双向同步冲突和版本漂移。

## Consequences

正面影响：

- 支持多设备和跨 Agent 恢复；
- 工程资产可审计、可比较、可回滚；
- 知识可以持续更新并被人与 Agent 共同阅读；
- 降低重复说明和上下文丢失；
- Feishu、Git、Local File 和 Web 可以通过 Provider 模型扩展。

代价与约束：

- 需要明确每类资产的主维护位置；
- 需要处理 Git 与飞书引用一致性；
- 需要设计 Context Capture 和状态同步规则；
- 自动写入必须具备安全门禁；
- 远程一端暂时不可用时，需要明确部分成功状态，不能虚构闭环已完成。

## Rejected Alternatives

- 只依赖 ChatGPT Project；
- 所有文件只放飞书；
- 所有知识只放 Git；
- 每次全量读取知识库；
- 顶层 Skill 强绑定 Feishu CRUD；
- Git 与飞书之间进行未经治理的全文双向同步。

## Follow-up

- 配置本地 Git 提交身份并完成首次 Commit；
- 安装 GitHub CLI，初始化 private GitHub 仓库；
- 建立仓库与飞书的稳定链接；
- 实现只读 `query_context`；
- 实现 `capture_knowledge` 和 `sync_project_status`；
- 为重要 Git Commit 写入对应飞书工程记录；
- 建立 Knowledge Index 和增量维护策略。

## Evidence

- `docs/Codex 执行任务：初始化 AI 项目远程上下文与 GitHub 工程资产闭环.md`
- `docs/Feishu_Knowledge_Skill_Architecture_v1.0.md`
- `docs/context/project-context.md`
- `skills/ai-knowledge/references/01-architecture-and-boundaries.md`
