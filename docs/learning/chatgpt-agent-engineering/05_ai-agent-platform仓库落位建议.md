# `ai-agent-platform` 仓库落位建议

## 推荐位置

```text
ai-agent-platform/
└── docs/
    └── learning/
        └── chatgpt-agent-engineering/
```

理由：这是学习与知识资产，不是运行时代码；与架构和产品文档分开；可逐章扩展；便于飞书同步 Skill 识别。

## 推荐未来结构

```text
docs/
├── README.md
├── architecture/
├── product/
├── decisions/
├── operations/
├── learning/
│   ├── README.md
│   └── chatgpt-agent-engineering/
│       ├── README.md
│       ├── 00_ChatGPT_Agent_工程体系学习总纲.md
│       ├── 01_学习大纲图.md
│       ├── chapters/
│       ├── glossary/
│       ├── templates/
│       ├── sources/
│       └── progress/
└── experiments/
```

## 与其他目录边界

- `docs/learning`：学习过程与能力体系。
- `docs/architecture`：项目当前采用的架构。
- `docs/decisions`：正式 ADR。
- `docs/experiments`：直接服务项目的验证报告。
- `context/`：供 Agent 快速加载的压缩上下文，不复制整套课程。
- `AGENTS.md`：Agent 工作规则；README：目录说明。

## 第一批不要做

- 不创建 18 个空章节目录；
- 不创建无内容 README；
- 不复制同一课程到多个位置；
- 不修改现有架构；
- 不同步飞书；
- 不创建运行时代码；
- 不自动 commit 或 push。

## Git 操作建议

1. 检查仓库状态。
2. 读取根 `AGENTS.md` 和相关 README。
3. 仅复制压缩包中的 `docs/`。
4. 检查同名文件和重复内容。
5. 修复相对链接。
6. 输出 `git diff --stat`。
7. 输出新增文件清单。
8. 等待人工 review。
