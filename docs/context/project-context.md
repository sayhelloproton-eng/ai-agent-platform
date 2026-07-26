# Project Context

## 项目目标

`ai-agent-platform` 是长期演进的 AI Agent 工程平台，核心方向包括 Agent 系统、AI Workflow、Tool / Skill、Knowledge System、长期上下文管理，以及模型、设备和 Provider 的可替换性。

长期方向包含 AI 视频工作流；当前优先级是知识层和上下文同步基础设施。

## 总体架构

```text
Human
  ↓
Chat / Gateway
  ↓
Agent
  ↓
AI Knowledge Skill
  ↓
Knowledge Provider
  ├── Feishu
  ├── Git
  ├── Local File
  └── Web
```

飞书只是 Knowledge Provider。底层飞书操作通过官方 `lark-cli` 或 OpenAPI 完成，上层 Skill 不暴露飞书 CRUD。

## 知识资产权威模型

| 资产 | 权威位置 |
|---|---|
| 代码、Skill、Schema、脚本、测试、架构、ADR、状态和正式结论 | Git/GitHub |
| Git 正式资产的阅读镜像、汇总、索引和看板 | Feishu Projection |
| 会议、学习笔记、评审、外部资料和待整理想法 | Feishu Native |
| 活跃讨论、分析与方案推演 | ChatGPT Project |

Git 是项目正式事实的唯一真源。Feishu Native 不是项目正式事实；一旦内容影响架构、接口、能力边界、技术决策、状态或未来执行，必须通过 Git Draft、Review 和 Merge 晋升。

该规则由 `ADR-002` 确认，并替代 `ADR-001` 双源事实模型。

## 当前阶段

Knowledge System Foundation / Knowledge Asset Governance。

## 已完成

- 创建飞书知识库“智能体工程探索”和 15 个一级目录；
- 创建首页《智能体工程探索录》；
- 安装并验证官方 `lark-cli` 1.0.77；
- 验证公开飞书 Wiki 的跨租户读取；
- 完成 WaytoAGI Wiki 目录与 Markdown 导出实验；
- 设计并安装 AI Knowledge Skill v1.0.0；
- 确认 Feishu Provider 和低 Token 索引优先检索；
- 完成 GitHub private 仓库初始化、两次 Commit 和远端推送；
- 创建飞书 A–E 文档并更新首页状态；
- 接受 ADR-002：Git 唯一真源与飞书投影模型；
- 建立知识治理配置、资产索引、关系索引、飞书映射和模板。

## 当前任务

执行知识资产架构 Phase 0 / Phase 1：盘点现有资产，建立 Git Canonical 治理基础，并为后续非破坏性迁移准备索引。

当前执行状态：

- `AGENTS.md`、`knowledge.config.yaml` 和 `docs/README.md` 已建立；
- Asset、Relation、Feishu Map 和 Migration Inventory 已建立；
- ADR-001 已在 Git 中标记为 Superseded；
- ADR-002 和 Knowledge Asset Architecture 已形成 Git Canonical Asset；
- 未移动或删除旧文件，未执行飞书写入。

## 下一步

1. 人工确认 Phase 0 / Phase 1 的 Git 变更。
2. 按 Migration Inventory 迁移核心 Context 和 Roadmap。
3. 将 Architecture、Skill、Research 与 Experiment 拆分为稳定资产。
4. 生成飞书目录对齐和 ADR-002 投影的 Write Plan，不直接修改飞书。
5. 实现 Git → Feishu 单向投影与 Drift 检测 MVP。

## 飞书入口

- Space：智能体工程探索
- Space ID：`<FEISHU_SPACE_ID>`
- 首页：https://<FEISHU_TENANT>.feishu.cn/docx/<FEISHU_HOME_DOCX_TOKEN>
- 首页 Wiki Node Token：`<FEISHU_HOME_WIKI_TOKEN>`

## 安全边界

- 不提交凭据、Token、Cookie、`.env` 和本地认证状态；
- 不发布 WaytoAGI 第三方完整正文；
- 不修改飞书权限、互联网公开状态或一级目录；
- 不执行删除、强制推送或 Git 历史重写；
- 飞书写入必须先预览、确认，再回读验收。
