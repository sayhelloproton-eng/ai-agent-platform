# CAP-007 Codex 配置、权限与执行基线

## 1. 为什么配置必须分层

Codex 配置会影响模型、审批、Sandbox、网络、MCP、环境变量、日志和实验能力。把所有配置写进一个全局文件会让不同项目互相污染，也会让临时高权限变成长期默认。

配置应按作用域和风险分层。

## 2. 配置层级与优先级

当前本地 Codex 使用多层配置。优先级从高到低为：

1. CLI flags 与 `--config`；
2. 受信任项目中的 `.codex/config.toml`，越接近当前目录优先级越高；
3. 通过 `--profile` 选择的 Profile 配置；
4. 用户配置 `~/.codex/config.toml`；
5. 系统配置；
6. 内置默认值。

组织管理员还可以使用受管配置限制危险组合。

原则：

- 全局层只放个人稳定默认；
- 项目层放仓库共同规则；
- Profile 表达可复用运行模式；
- 单次任务使用 CLI override；
- 临时高权限不写成永久默认。

## 3. Trusted Project

Codex 只在用户信任项目后加载项目级 `.codex/` 配置、Hooks 和 Rules。

这是重要边界：

- 打开一个仓库不等于自动信任；
- 项目配置可以影响命令、工具和生命周期脚本；
- 来历不明的仓库应先只读审计；
- 信任决定是否加载配置，不代表仓库内容本身安全。

## 4. Approval 与 Sandbox

### Approval

Approval Policy 决定 Codex 何时因命令或权限提升而询问用户。

常见思路：

- 默认在需要越过当前安全边界时询问；
- 只读任务尽量不请求写权限；
- 不把 `never` 当作“更自动也更安全”；
- 不把人工批准当作后端身份和 Policy 的替代品。

### Sandbox

Sandbox 限制 Codex 可读写的文件、可运行的命令和网络能力。

推荐从最小能力开始：

```text
只读探索
→ Workspace Write
→ 单项网络或高权限批准
```

`danger-full-access` 只用于用户明确理解风险、任务确有必要且有额外防护的情况。

## 5. 网络与 Web Search

本地 Codex 的网络和 Web Search 受 Sandbox、配置和产品策略影响。

工程基线：

- 搜索结果属于不可信外部输入；
- Cached Search 与 Live Search 风险不同；
- 网络能力不能自动获得 Secret；
- 下载和执行外部内容必须分开批准；
- 仓库任务能离线完成时不扩大网络权限。

## 6. AGENTS.md 发现与覆盖

Codex 启动任务时会读取 `AGENTS.md` 指导。

主要规则：

- 全局层来自 Codex Home；
- 项目层从 Git Root 向当前目录逐层发现；
- `AGENTS.override.md` 可覆盖同目录 `AGENTS.md`；
- 靠近当前目录的指导在合并后出现得更晚；
- 每个目录只加载一个匹配文件；
- 存在总大小限制；
- 修改 AGENTS 后通常需要新会话或重新启动任务。

AGENTS 适合长期仓库规则，不替代本次 Task Contract。

## 7. 环境变量与 Secret

Codex 可以向子进程转发环境变量，但必须限制：

- 哪些变量允许进入命令环境；
- 是否记录到日志；
- 是否可能被测试输出；
- 是否被 Agent 读取；
- 是否在云环境可用。

Secret 只从专用凭据系统或受控环境注入，不进入：

- `config.toml` 示例；
- AGENTS；
- Prompt；
- Git；
- 完成报告。

## 8. MCP 配置

本地 Codex 可以在用户或受信任项目配置中声明 MCP Server。

支持的主要连接方式包括：

- STDIO；
- Streamable HTTP；
- OAuth 等认证方式。

ChatGPT Desktop、Codex CLI 和 IDE Extension 可以共享本地 Codex Host 的 MCP 配置；ChatGPT Web 不读取本机 `~/.codex/config.toml`。

MCP 的具体边界见 [CAP-008 Agent 扩展与治理](./CAP-008-Agent扩展与治理-AGENTSRulesSkillsHooksMCP与Plugins.md)。

## 9. 推荐的配置策略

### safe-readonly

用于陌生仓库、调研和审计：

- 只读 Sandbox；
- 不自动联网；
- 不运行未知安装脚本；
- 高风险命令拒绝；
- 不加载未信任项目配置。

### normal-workspace

用于已信任仓库的正常实现：

- 仅 Workspace Write；
- 按需批准网络；
- 运行仓库既有测试；
- 明确 Git 范围；
- Commit 和 Push 单独授权。

### elevated-task

只用于确需系统级权限的短任务：

- 固定目标；
- 固定命令；
- 最小时间窗口；
- 结束后恢复；
- 保存执行证据。

## 10. 配置变更流程

```text
确认当前层级
→ 记录当前值
→ 选择最小作用域
→ 修改一个变量
→ 重启或新会话
→ 验证实际行为
→ 回滚或固化
```

配置文档必须区分：

- 官方当前支持；
- 项目推荐基线；
- 用户本机观察。

## 11. 本项目执行基线

`ai-agent-platform` 当前要求：

- Node.js 与 npm 版本固定；
- Git 工作区干净；
- 分支和起始 SHA 固定；
- `AGENTS.md` 是项目宪法；
- Task Contract 给出允许范围；
- 验证失败立即停止；
- 不通过修改测试或校验器掩盖问题；
- Commit、Push 和飞书写入需要明确授权。

## 12. 关联文档

- [CAP-006 Codex 产品与执行体系](./CAP-006-Codex产品与执行体系.md)
- [CAP-008 Agent 扩展与治理](./CAP-008-Agent扩展与治理-AGENTSRulesSkillsHooksMCP与Plugins.md)
- [`AGENTS.md`](../../../AGENTS.md)
- [`context/current-status.md`](../../../context/current-status.md)

## 13. 产品事实核验基线

核验日期：2026-07-31。

- [OpenAI：Config basics](https://learn.chatgpt.com/docs/config-file/config-basic)
- [OpenAI：Configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)
- [OpenAI：Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [OpenAI：Rules](https://learn.chatgpt.com/docs/agent-configuration/rules)

具体配置键和成熟度会变化，修改前应查阅当前 Reference。
