# WaytoAGI 飞书 CLI 资料的工程启发

来源是公开目录“飞书CLI使用方法”的 lark-cli 递归导出。采集共发现 53 个节点，其中 50 个 docx 取得完整 Markdown，另外 2 个 bitable 和 1 个 sheet 因专用 scope 不足未读取正文。

## 已验证事实

- 公共 Wiki URL 可以通过官方 Wiki/Docs API 跨租户读取，但仍需有效 user/bot token。
- 根节点可解析 Space、Wiki token、Docx token、标题和子节点。
- 文档类可直接取 Markdown；结构化对象必须路由到 Base/Sheets。
- 一个 `SKILL.md` + `lark-cli` 可以把 Agent 意图编排为飞书操作；复杂产品可在其上增加 Web/Gateway、确认和多用户隔离。

## 可复用模式

### Prompt 合同

高质量任务不是命令堆砌，而是：对象 + 动作 + 范围 + 输出 + 约束。本 Skill 将其提升为 Knowledge Intent / Context Package / Write Plan。

### 先理解目标再检索

学习路径案例先了解用户基础和时间，再检索内容；不是只按关键词返回链接。

### 预生成 + 按需个性化

热门学习路径预生成，少数个性化请求按需检索，可显著减少 token 和权限压力。该模式适用于项目上下文包和常用 Agent 启动包。

### Knowledge Loop

原始内容经过分类、重组、导航、使用和再沉淀形成闭环。知识库重构案例强调先分析现状、提出新结构、预览、移动/写入和验证。

### Domain Skill

优秀案例不是 `create_doc` 包装，而是待办扫描、知识库巡检、产品工作流、研报沉淀等领域能力。AI Knowledge Skill 应继续位于官方飞书工具 Skill 之上。

## 不照搬

- 社区知识库以传播、案例和活动为主；ai-agent-platform 以 Context、Architecture、Domain、Workflow、Engineering、ADR 为主。
- 不把外部文章全文复制进自己的知识库；只沉淀有来源的总结、决策和可复用方法。
- 不把“可通过 OpenAPI 读取”误认为“匿名可读”。
