## 项目

ai-agent-platform

## 当前阶段

Knowledge System Foundation / Context Synchronization Initialization

## 当前目标

建立 ChatGPT、飞书与 Git/GitHub 之间的长期上下文和工程资产闭环，使新设备、新会话和新的 Agent 能快速恢复项目状态并继续工作。

## 已完成

- 已建立飞书知识库“智能体工程探索”。
- 已冻结 v1.0 十五个一级目录。
- 已创建知识库首页《智能体工程探索录》。
- 已安装并验证官方 `lark-cli` 1.0.77。
- 已验证公开飞书 Wiki 的跨租户读取。
- 已完成 WaytoAGI Wiki 结构导出实验：53 个节点中 50 个 Docx 成功导出 Markdown，2 个 Bitable 和 1 个 Sheet 因类型与权限限制未导出。
- 已明确 AI Knowledge Skill 面向 Agent，Feishu 是可替换 Knowledge Provider。
- 已形成 Git/GitHub 与 Feishu 双源事实模型。
- 已确定索引优先、最小上下文的检索原则。
- 已生成、安装并通过 AI Knowledge Skill v1.0.0 自检。
- 已完成本地资产、敏感风险和第三方内容盘点。
- 已创建 GitHub private 仓库并完成首次安全 Commit 与 push。

## 当前正在执行

- 创建关联信息的第二次 Git Commit 并 push。
- 执行 GitHub、Git 和飞书最终验收。
- 为 AI Knowledge Skill implementation 准备 Knowledge Index。

## 当前阻塞

- 当前无外部阻塞。
- GitHub private 仓库、首次 Commit 和 push 已完成。
- 飞书 A–E 文档和首页局部更新已完成回读验收。

## 下一步

1. 创建关联信息的第二次 Commit 并 push。
2. 建立 Knowledge Index。
3. 实现 `query_context` 只读 MVP。
4. 实现任务完成后的 `capture_knowledge` 与 `sync_project_status`。

## 远程恢复流程

1. 登录 ChatGPT 账号并进入项目，了解近期讨论。
2. 克隆 GitHub 仓库，恢复代码、Skill、Schema、脚本和工程文档。
3. 阅读仓库中的 `README.md`、`docs/context/project-context.md` 和 `docs/context/current-task.md`。
4. 登录飞书并读取本页面、相关 ADR 和项目状态。
5. Agent 通过 Knowledge Index 查询最小必要上下文。
6. 继续执行当前 Next Actions。

## 状态依据

- 本地任务文档：`docs/Codex 执行任务：初始化 AI 项目远程上下文与 GitHub 工程资产闭环.md`
- 本地资产盘点：`docs/context/asset-inventory-2026-07-26.md`
- 项目上下文：`docs/context/project-context.md`
- 当前任务：`docs/context/current-task.md`
- AI Knowledge Skill：`skills/ai-knowledge/`
