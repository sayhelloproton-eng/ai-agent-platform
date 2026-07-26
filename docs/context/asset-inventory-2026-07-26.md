# Asset Inventory — 2026-07-26

## 盘点范围

- 项目根目录：`.`
- 盘点方式：只记录相对路径、类型和风险，不读取或记录认证缓存内容。
- Git 初始状态：已存在空仓库，分支为 `main`，尚无 Commit。

## 顶层目录与文件

| 路径 | 类型 | 处理建议 |
|---|---|---|
| `.git/` | 本地 Git 元数据 | 保留，不作为普通文件提交 |
| `.omo/` | 本地 Agent 运行状态 | 加入 `.gitignore`，不提交 |
| `skills/ai-knowledge/` | AI Knowledge Skill v1.0.0 源包 | 提交 |
| `docs/` | 项目文档与调研资产 | 分类提交 |
| `README.md` | 项目入口 | 提交 |
| `ai-knowledge-skill-v1.0.0.zip` | Skill 分发压缩包 | 本地保留，默认不提交 |

## Markdown 与项目知识文档

- `README.md`
- `docs/Codex 执行任务：初始化 AI 项目远程上下文与 GitHub 工程资产闭环.md`
- `docs/Feishu_Knowledge_Skill_Architecture_v1.0.md`
- `docs/Feishu_Knowledge_Skill_Design_Context_v1.0.md`
- `docs/Feishu_Knowledge_Base_*.md`
- `docs/Feishu_Public_Wiki_Read_Test_Report.md`
- `docs/Feishu_Wiki_Public_Access_Capability_Report.md`
- `docs/feishu-wiki-init-plan.md`

这些文档属于项目自产的上下文、设计或验证报告，可以进入 Git。

## Skill、脚本、配置和测试

- `skills/ai-knowledge/SKILL.md`
- `skills/ai-knowledge/references/`
- `skills/ai-knowledge/assets/`
- `skills/ai-knowledge/scripts/`
- `skills/ai-knowledge/tests/`
- `skills/ai-knowledge/MANIFEST.json`
- `skills/ai-knowledge/README.md`
- `skills/ai-knowledge/CHANGELOG.md`

Skill 包含 47 个文件，无外部 npm 依赖；安装副本位于用户目录，不属于本仓库。

## 调研资产

`docs/research/waytoagi-feishu-cli-export/` 包含：

- 自产报告、统计、目录树、元数据和导出脚本；
- `pages/` 下 53 个第三方公开 Wiki 页面本地镜像。

处理策略：

- 可提交 `export-report.md`、`space-info.json`、`wiki-tree.json`、`wiki-tree.md`、`integrity-check.json` 和导出脚本；
- `pages/` 完整正文默认加入 `.gitignore`；
- 本地文件不删除；
- `docs/research/waytoagi-feishu-cli-export.zip` 不提交。

## 图片与大文件

| 路径 | 大小 | 结论 |
|---|---:|---|
| `docs/架构图-高清增强版.png` | 约 1.6 MB | 项目自产架构图，可提交 |
| `docs/research/waytoagi-feishu-cli-export.zip` | 约 399 KB | 第三方镜像压缩包，不提交 |
| `ai-knowledge-skill-v1.0.0.zip` | 约 42 KB | 可由源目录重建，默认不提交 |

未发现超过常见 GitHub 单文件限制的大文件。

## 敏感风险检查

- 未发现 `.env`、PEM、私钥、P12、凭据或 Cookie 文件。
- 敏感内容模式扫描仅命中任务文档中用于检查的示例词，不构成真实凭据发现。
- `.omo/` 属于本地运行状态，按保守策略排除。
- 不读取 `~/.config/gh/hosts.yml`、lark-cli 凭据缓存、Keychain 或环境变量全集。

## Git 暂存区风险

盘点时发现 `.omo/` 与 WaytoAGI `pages/` 曾被加入空仓库的暂存区。它们必须仅从索引移除并在 `.gitignore` 中排除，本地内容继续保留。
