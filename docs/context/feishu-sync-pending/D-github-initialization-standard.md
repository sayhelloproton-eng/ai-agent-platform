## 当前执行结果

| 项目 | 真实状态 |
|---|---|
| GitHub 仓库名称 | `sayhelloproton-eng/ai-agent-platform` |
| GitHub 仓库 URL | https://github.com/sayhelloproton-eng/ai-agent-platform |
| 可见性 | `PRIVATE` |
| 默认分支 | 本地 `main` |
| 当前 Commit | `c5ea37bb14a724798ff8628fc6b2d367135d02e3` |
| 本地目录 | `/path/to/ai-agent-platform` |
| 本地 Git | 已初始化，首次 Commit 已推送 |
| Remote origin | `git@github.com:sayhelloproton-eng/ai-agent-platform.git` |
| Push | 成功，`main` 跟踪 `origin/main` |

GitHub CLI 已修复并完成认证，private 仓库已创建并绑定 SSH remote。首次 Commit 已成功推送到 `origin/main`。

## 工程资产范围

Git/GitHub 管理：

- `skills/ai-knowledge/` 下的 Skill、references、assets、Schema、模板、脚本和测试；
- `README.md`；
- `docs/context/` 下的新 Agent 恢复入口；
- 项目自产的架构、飞书验证、知识系统设计和调研报告；
- WaytoAGI 调研的元数据、统计、目录树和导出脚本；
- 项目自产架构图。

默认不提交：

- `.omo/`、`.codex/` 等本地 Agent 运行状态；
- `.env`、密钥、Cookie、Token、认证缓存；
- `ai-knowledge-skill-v1.0.0.zip` 等可重建分发包；
- `docs/research/waytoagi-feishu-cli-export/pages/` 第三方完整正文；
- `docs/research/waytoagi-feishu-cli-export.zip`。

## `.gitignore` 策略

忽略规则覆盖 macOS 元数据、依赖、构建输出、日志、缓存、环境文件、密钥格式、编辑器状态、本地 Agent 状态、Lark 认证缓存和指定第三方完整导出目录。

规则采用明确路径，避免忽略整个 `docs/research/` 或整个 `docs/`，确保项目自产的报告、统计和脚本仍可提交。

## 密钥和本地缓存排除

Commit 前检查：

- 文件名：`.env`、PEM、Key、P12、credential、secret、token、cookie、`.enc`；
- 内容模式：`Authorization:`、`Bearer`、`client_secret`、`app_secret` 和私钥头；
- Git 暂存区的路径与统计；
- 本地 Agent、lark-cli 和 GitHub CLI 认证缓存。

只报告风险路径，不复制秘密值。当前扫描未发现真实凭据文件或秘密内容。

## 第三方调研导出策略

WaytoAGI 公开 Wiki 的完整 Markdown 镜像仅用于本地研究，不重新发布到 GitHub。可以提交自行生成的实验报告、节点统计、结构摘要、元数据和只读导出脚本。

完整正文已通过 `.gitignore` 从版本管理中排除，本地文件未删除。

## Commit 规范

- 每个 Commit 只包含一个可解释的工程变化；
- Commit 前检查 staged name、stat 和敏感模式；
- 重要 Commit 在飞书工程记录中保存 hash、目的和相关路径；
- 不执行 `push --force`、`reset --hard`、`clean -fd`、`filter-branch` 或历史重写；
- 首次建议 Commit：`chore: initialize ai-agent-platform context and knowledge assets`；
- 飞书链接回填后的建议 Commit：`docs: link GitHub assets with Feishu knowledge records`。

## Git 与飞书关联方式

- 飞书记录 GitHub repository、branch、Commit 和相对路径；
- Git 的 `docs/context/remote-context-map.md` 记录飞书 Space、Node Token 和 URL；
- 项目状态以飞书状态文档为知识真源；
- 可执行当前任务同时保存在 Git `docs/context/current-task.md`；
- 不做双向全文复制。

## 恢复项目的步骤

远程仓库恢复流程：

```bash
git clone git@github.com:sayhelloproton-eng/ai-agent-platform.git
cd ai-agent-platform
git status --short --branch
cd skills/ai-knowledge
node scripts/validate_bundle.mjs
node tests/self-test.mjs
```

随后阅读：

1. `README.md`
2. `docs/context/project-context.md`
3. `docs/context/current-task.md`
4. `docs/context/remote-context-map.md`
5. 飞书中的项目状态、ADR 和最新 Agent Log

## 待完成

- 回读验证 GitHub 默认分支；
- 创建关联信息的第二次 Commit 并 push。
