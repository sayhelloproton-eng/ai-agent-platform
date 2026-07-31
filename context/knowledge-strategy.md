# Knowledge Strategy

## Core Decision

**Git Repository is the only source of truth.**

正式项目事实包括代码、测试、Context、知识、技术方案、ADR、Agent 配置、Knowledge Pack、Registry 和发布记录。

## Knowledge Layers

```text
Raw Sources
  → Learning / Research / Experiment
  → Reviewed Knowledge / Technical Solution / ADR
  → Agent Profile / Knowledge Pack / Skill
  → Runtime Use and Evidence
  → New Insight and Revision
```

## Platform Registry

`platform-registry/` 负责：

- 稳定资产 ID；
- Canonical Path；
- 实现状态；
- 资产关系；
- 证据入口；
- Feishu Projection；
- Release；
- 变更影响。

知识正文不再保存大段系统 Front Matter。

## Engineering Insights

- `skills/engineering-insight-distillation/`：提炼方法；
- `platform-registry/registries/engineering-insights/`：成熟度、生命周期、Occurrence 和关系的机器真源；
- `docs/knowledge/.../INS-001`：面向人的综合解释。

## Custom GPT Knowledge

每个专有 Custom GPT 使用两层稳定知识：

1. 通用基础知识包；
2. 角色专属知识包。

Git 是知识真源，Knowledge Pack 是派生发布资产；外部知识服务负责实时、共享和按权限检索。

## Feishu Projection

允许：

```text
Git docs/knowledge/ → Feishu
```

发布规则：

- overwrite；
- one-way；
- one-to-one mapping；
- zero pre-read；
- no semantic diff；
- no merge；
- no reverse write。

首次迁移按映射文档逐篇覆盖。映射稳定后，只覆盖 Git 中发生变化的文档。

发布后验证 API、revision、图片、映射和失败项，不让大模型阅读飞书全文。

## Retrieval

Agent 默认索引优先、最小必要上下文：

1. Context；
2. Registry；
3. 与任务相关的最多少量完整文档；
4. 相关代码、测试和证据。

不默认扫描全部仓库或全部飞书。
