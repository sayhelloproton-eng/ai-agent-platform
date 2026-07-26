# ai-agent-platform

`ai-agent-platform` 是一个围绕 AI Agent、Workflow、Knowledge System、Tool / Skill 和长期上下文管理展开的工程实践项目。

## 当前阶段

当前正在建设 Knowledge System Foundation，目标是建立 ChatGPT、飞书与 Git/GitHub 之间可恢复、可追溯的上下文与工程资产闭环。

## 知识资产模型

- Git/GitHub 是项目正式事实的唯一真源，保存代码、Skill、Schema、脚本、测试、架构、ADR、状态和正式知识。
- 飞书是 Git 知识资产的阅读投影、协作空间和补充知识层。
- Feishu Native 内容不是项目正式事实；影响项目的结论必须通过 Review 晋升到 Git。
- ChatGPT Project 是需求讨论、分析和方案推演入口。
- 飞书投影通过 Asset ID、Git Path、Commit、Hash 和 Node Token 关联，不做无治理的双向同步。

该决策由 [ADR-002](docs/09-adr/ADR-002-git-single-source-feishu-projection.md) 记录，并替代早期的双源事实模型。

## 目录

- `skills/ai-knowledge/`：AI Knowledge Skill v1.0.0 源包。
- `docs/`：项目设计、飞书验证结果与工程上下文。
- `docs/_index/`：Agent 的资产、关系和飞书映射检索入口。
- `docs/_templates/`：正式知识资产模板。
- `docs/context/`：新设备或新 Agent 的恢复入口。
- `docs/research/`：调研报告、元数据和实验资产。

## 本地运行

当前仓库尚未实现可运行的平台服务。现阶段可验证资产主要是架构文档、AI Knowledge Skill 和飞书 CLI 调研成果。

AI Knowledge Skill 自检：

```bash
cd skills/ai-knowledge
node scripts/validate_bundle.mjs
node tests/self-test.mjs
```

## 远程知识入口

- 飞书知识库：首页《智能体工程探索录》
- URL：https://<FEISHU_TENANT>.feishu.cn/docx/<FEISHU_HOME_DOCX_TOKEN>
- Space ID：`<FEISHU_SPACE_ID>`

## 安全与第三方内容

- 不提交 Token、Cookie、密钥、`.env` 或本地认证缓存。
- `docs/research/waytoagi-feishu-cli-export/pages/` 是第三方公开知识库的本地研究镜像，默认不进入 Git。
- 删除、权限修改、公开分享、强制推送和历史重写不由自动流程执行。

## Next Actions

1. 按 `docs/_index/migration-inventory.yaml` 迁移核心 Context。
2. 将 Architecture、Research、Experiment 和 Skill 拆分为稳定 Asset ID。
3. 设计飞书 Git 对齐区与 `90_Feishu_Native` 的迁移预览。
4. 实现 Git → Feishu 单向投影 MVP。
5. 实现 `query_context` 只读 MVP。
