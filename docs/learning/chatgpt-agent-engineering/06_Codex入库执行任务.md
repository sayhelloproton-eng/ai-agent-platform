# Codex 执行任务：将 ChatGPT Agent 工程体系学习大纲放入仓库

## 任务目标

将本压缩包中的学习大纲放入 `ai-agent-platform` 仓库合适位置，保持目录清晰和链接有效，不修改业务代码和当前架构。

## 目标路径

优先使用：

```text
docs/learning/chatgpt-agent-engineering/
```

若仓库已有明确文档规范，遵循现有规范并说明实际路径和原因。

## 执行前检查

1. 确认仓库根目录。
2. 读取根 `AGENTS.md` 与 `README.md`。
3. 检查 `docs/README.md`、`docs/learning/README.md`。
4. 检查工作区未提交修改。
5. 查找同名或相同主题文档。
6. 不覆盖用户现有内容。

## 允许操作

- 创建学习目录。
- 复制和整理 Markdown、Mermaid、模板。
- 在 `docs/learning/README.md` 增加导航；不存在时可创建简短 README。
- 修复包内相对链接。
- 生成文件清单和 diff。

## 禁止操作

- 不修改应用代码。
- 不安装依赖。
- 不运行破坏性命令。
- 不删除旧文档。
- 不同步飞书。
- 不创建 18 个空章节目录。
- 不重构仓库。
- 不自动 commit。
- 不自动 push。
- 不修改远程仓库设置。

## 验收标准

- 可从 `docs/learning/README.md` 找到总纲。
- Mermaid 代码块语法有效。
- UTF-8 编码。
- 不覆盖重复内容。
- 新增文件都在学习目录下。
- `git diff --stat` 只含文档。
- 输出实际落位和新增清单。
- 输出冲突与人工决策项。

## 完成回复格式

```text
实际落位：
读取的仓库规则：
新增文件：
修改文件：
未处理冲突：
链接检查：
git diff --stat：
建议人工 review：
```
