---
asset_id: ADR-002
asset_type: adr
title: Git 唯一真源与飞书投影模型
status: accepted
evidence_level: decided
owners:
  - project-owner
created_at: 2026-07-26
updated_at: 2026-07-27
canonical_source: git
canonical_path: docs/adr/ADR-002-git-single-source-feishu-projection.md
supersedes:
  - ADR-001
related_assets:
  - ARC-002
  - CTX-001
  - CTX-002
  - SKL-001
tags:
  - knowledge-governance
  - git
  - feishu
  - source-of-truth
---

# ADR-002 Git 唯一真源与飞书投影模型

- Status: Accepted
- Date: 2026-07-26
- Supersedes: ADR-001
- Superseded By:

## Context

双源事实模型完成了 GitHub 工程资产和飞书知识空间的首次闭环，但“工程事实在 Git、知识事实在飞书”的划分会让架构、ADR、当前状态和 Skill 边界出现两个可独立修改的权威版本。

项目已经采用 DDD、API First 和 Adapter Pattern。知识体系同样需要稳定领域模型与可替换 Provider，并必须让新 Agent 在不依赖历史 Chat 的情况下判断正式事实。

## Decision

Git 仓库是项目正式事实的唯一真源。

飞书承担：

1. Git 正式知识资产的阅读镜像或汇总投影；
2. 人与 Agent 的协作、展示和查询体验；
3. Feishu Native 补充知识；
4. 临时 Capture Inbox。

以下结论必须最终进入 Git：

- 项目背景、愿景、当前状态和 Roadmap；
- 架构、领域模型、接口与安全边界；
- ADR、Skill 和 Workflow 的正式定义；
- Schema、Contract、Prompt；
- 已验证的研究、实验结论和问题解决方案；
- 影响未来执行的正式结论。

Feishu Native 可以长期存在，但不是项目正式事实。一旦内容影响上述范围，必须通过 Git Draft / Review / Merge 晋升。

## Reasons

- Git 提供版本、Diff、Review、回滚、分支和可审计历史；
- 单一权威源消除 Git / 飞书冲突时的职责歧义；
- 飞书继续提供更好的阅读和协作体验；
- Provider 分层允许未来加入 Git、Local File 和 Web；
- 稳定 Asset ID 和关系索引让 Agent 可以最小化检索上下文；
- Feishu Native 晋升流程保留协作灵活性，不强迫所有笔记进入 Git。

## Alternatives

### 保持双源事实

拒绝。正式知识会发生漂移，冲突需要人为猜测哪个版本更权威。

### 所有内容只保存在 Git

拒绝。会议、学习笔记、评审批注和展示看板不都适合 Git Review 流程。

### 所有知识只保存在飞书

拒绝。难以与代码、Schema、测试、Commit 和发布过程形成原子审计。

### 自动双向同步

拒绝。飞书评论或人工编辑不能未经审核自动覆盖 Git 正式事实。

## Trade-offs

### Positive

- 正式事实只有一个权威版本；
- Agent 恢复路径稳定且可索引；
- Git 与飞书冲突规则简单；
- 架构演进和证据链可审计；
- 飞书仍可承载非正式协作。

### Negative

- 正式结论需要 Git Review，流程比直接改飞书更严格；
- 需要维护 Asset Index、关系和飞书映射；
- 需要检测投影 Drift；
- 旧飞书页面需要逐步补充 Source Mode 和 Canonical Git Path。

## Implementation Impact

- 创建 `AGENTS.md` 和 `knowledge.config.yaml`；
- 建立 `docs/technical/元数据/` 和按用途分类的模板目录；
- 正式资产使用稳定 `asset_id`；
- ADR-001 标记为 Superseded；
- 飞书投影页面必须记录 Git Path、Commit、Hash 和同步状态；
- Feishu Native 放入独立逻辑区，形成正式结论时创建 Git Change Proposal；
- 知识治理 Skill 的上层能力保持 Provider-neutral；该能力当前由 Project Knowledge Governance 承担。

## Validation

- 新 Agent 能通过 README、AGENTS、Context、Architecture 和 Asset Index 恢复项目；
- 每个正式资产能追溯到 Git 路径和 Commit；
- 飞书页面能识别 `mirror`、`projection`、`index`、`native` 或 `capture`；
- Git / 飞书冲突时，正式事实以 Git 为准；
- Superseded ADR 保留完整历史和替代关系。

## Follow-up

1. 完成 Phase 0 资产盘点。
2. 将核心 Context、Architecture、Skill、Research 和 Experiment 迁移为稳定 Asset ID。
3. 设计并预览飞书目录的 Git 对齐区和 `90_Feishu_Native`。
4. 实现只从 Git 发布到飞书的同步 MVP。
5. 增加关系、链接、Hash 和 Drift 校验。
