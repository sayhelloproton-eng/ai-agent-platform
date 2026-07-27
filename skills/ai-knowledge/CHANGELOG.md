# Changelog

## 1.2.0 - 2026-07-27

- 将飞书定位收敛为面向人和 AI 阅读的文本知识投影，而不是 Git 仓库镜像。
- 增加 Projection Filter：移除 Git frontmatter、图片、Mermaid、draw.io 和二进制资源引用。
- 取消图片 URL 转换、图片 Block、Mermaid 渲染和 PNG 展示规则。
- 要求重要图形先在 Git 中经 Review 转成文字说明与 `text` 代码块图。
- 保持 Git 唯一真源、单向发布、独立预览确认和发布后回读验收。

## 1.1.1 - 2026-07-27

- 增加 Feishu Knowledge Publisher 固定发布合同。
- 明确 Markdown、首页与目录 README、H1 标题、图片、Mermaid 和内部链接规则。
- 固化 `docs/knowledge/**` 到“智能体工程探索”的单向发布流程和停止条件。

## 1.1.0 - 2026-07-27

- 将 Git CTX-002 设为动态状态唯一规范源。
- 将飞书 Project Status 改为 Projection。
- 更新检索、写入、Workflow、项目配置和验证门禁。

## 1.0.0

- 定义 Agent-first、Provider-neutral 的 AI Knowledge Skill。
- 内置 ai-agent-platform 飞书知识库结构与 token 映射。
- 增加索引优先、最小上下文、来源追踪和动态状态单一真源原则。
- 增加 Feishu 只读 Provider、受控写入、公开 Wiki 导入、ADR、实验和学习路径工作流。
- 增加无第三方依赖的 Node.js 工具脚本、JSON Schema、模板和自测。
