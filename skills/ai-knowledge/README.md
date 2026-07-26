# ai-knowledge Skill

面向 Codex / Agent Skills 标准的长期项目知识管理 Skill。包内只有一个 `SKILL.md`，其余内容按官方推荐放在 `references/`、`assets/` 和 `scripts/` 中。

## 解决的问题

- Agent 在执行开发任务前，如何只读取最相关的项目上下文。
- Chat 负责内容与决策、Codex 负责本地执行时，如何避免 Codex 在上下文不足时自行发挥。
- 飞书首页的“当前进度”由谁维护、依据什么更新。
- 如何把飞书作为可替换 Knowledge Provider，而不是把上层能力写死成飞书 CRUD。
- 如何通过官方 `lark-cli` 读取跨租户公开 Wiki，而不使用网页抓取和大段 HTML 消耗 token。

## 安装

将整个 `ai-knowledge` 文件夹放到 Agent Skills 目录。当前通用约定优先使用：

```text
~/.agents/skills/ai-knowledge/
```

团队仓库可将其纳入共享的 `.agents/skills/ai-knowledge/`（以当前 Codex 版本的发现规则为准）。不要只复制 `SKILL.md`，脚本、参考资料、模板和 Schema 都是 Skill 的组成部分。

## 前置条件

- Node.js 20+
- `@larksuite/cli` / `lark-cli` 1.0.77 或更高
- 已完成 `lark-cli config init` 和最小权限 OAuth
- 读取/写入对应飞书资源所需 scope

检查：

```bash
node --version
lark-cli --version
lark-cli auth status --json --verify
node scripts/validate_bundle.mjs
node tests/self-test.mjs
```

## 使用方式

显式调用：

```text
使用 $ai-knowledge，为“实现 Feishu Knowledge Skill MVP”加载最小项目上下文。
```

或自然语言触发：

```text
读取项目架构、ADR 和当前阶段，给这次 Gateway 修改生成 Context Package。
```

## 项目配置

`assets/ai-agent-platform.json` 已包含当前知识库的非密钥标识，包括 Space ID、首页 token 和 15 个一级节点。任何凭证都不得写入此文件。

动态状态文档尚未创建时，Skill 会先生成创建草稿和 Write Plan；创建后再把 token 写回项目配置。首页的阶段信息只作为展示快照。

## 目录

```text
ai-knowledge/
├── SKILL.md
├── README.md
├── CHANGELOG.md
├── references/
├── assets/
├── scripts/
└── tests/
```

## 安全

- 默认只读，写入脚本默认 `--dry-run`。
- `--apply` 仍要求固定确认短语；CLI 要求高风险确认时必须再次向用户确认，不能自动加 `--yes`。
- 本 Skill 不自动删除、移动 Wiki 节点、修改成员/权限或切换互联网公开。
- 对外部知识仅处理用户有权读取的公开/授权资源，并保留来源。
