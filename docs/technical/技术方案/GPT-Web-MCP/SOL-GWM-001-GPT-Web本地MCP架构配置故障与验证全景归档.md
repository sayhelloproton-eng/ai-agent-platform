---
title: GPT Web 本地 MCP 架构、配置、故障与验证全景归档
document_id: SOL-GWM-001
status: VERIFIED_IMPLEMENTATION
version: "1.0"
date: 2026-08-19
repository: ai-agent-platform
target_path: docs/technical/技术方案/GPT-Web-MCP/SOL-GWM-001-GPT-Web本地MCP架构配置故障与验证全景归档.md
audience:
  - ai-agent-platform / 后续工作区维护者
  - Agent 工程开发者
  - 需要复用 GPT Web ↔ 本机开发能力的团队成员
scope:
  - 需求与可行性
  - Secure MCP Tunnel
  - Desktop Commander
  - CodeGraph
  - 长任务超时事故
  - gptweb-mcp 持久化
  - 联合工具优先级验证
---

# GPT Web 本地 MCP 架构、配置、故障与验证全景归档

> 本文记录一次已经真实完成的工程闭环：
>
> **从“网页 Chat 能否直接、安全地使用本机开发能力”开始，经过 Secure MCP Tunnel、Desktop Commander、CodeGraph、真实故障定位、长任务规则、macOS 持久运行和联合工具选择测试，最终形成可复用的 `gptweb-mcp` 基线。**
>
> 本文保留：
>
> - 为什么做；
> - 遇到了什么问题；
> - 如何判断；
> - 如何设计；
> - 如何实现；
> - 如何验证；
> - 出现过什么失败；
> - 如何修复；
> - 得到什么可复用经验；
> - 哪些已经真实成立；
> - 哪些只是未来可优化项。
>
> 它不是产品宣传，也不是只列命令的安装笔记。

---

# 1. 背景与需求

## 1.1 原始问题

目标不是做一个新的 Agent Runtime。

目标是：

```text
网页 ChatGPT
→ 继续承担推理、架构、规划、判断
→ 同时能够真实访问本机
→ 读取代码
→ 执行 shell/git/process
→ 进行结构化代码图分析
```

并且满足：

```text
不新增自研模型
不额外建立复杂中间服务
不为了 MCP 推翻现有项目架构
不让每个 Chat 重新配置
不要求用户每次输入长启动命令
```

## 1.2 最终需求

最终收敛成两个本机能力面：

```text
Local Dev
= 本机真实执行能力

CodeGraph
= 代码结构知识图能力
```

再用一个本机统一入口管理：

```text
gptweb-mcp
```

---

# 2. 最终架构

```text
┌──────────────────────────────┐
│          ChatGPT Web         │
│  reasoning / planning / AI   │
└──────────────┬───────────────┘
               │
               │ MCP
               ▼
┌──────────────────────────────┐
│ OpenAI Secure MCP Tunnel     │
│ tunnel service/control plane │
└───────┬────────────────┬─────┘
        │                │
        │                │
        ▼                ▼
┌───────────────┐   ┌────────────────┐
│ tunnel-client │   │ tunnel-client  │
│ local-dev     │   │ codegraph      │
└──────┬────────┘   └───────┬────────┘
       │ stdio              │ stdio
       ▼                    ▼
┌─────────────────┐   ┌───────────────────────┐
│Desktop Commander│   │ codegraph serve --mcp │
└────────┬────────┘   └──────────┬────────────┘
         │                       │
         │                       │ projectPath
         ▼                       ▼
 filesystem/shell/git      per-project .codegraph
 process/source/search      SQLite knowledge graph
```

本机持久控制：

```text
macOS login
→ launchd
→ ~/.local/bin/gptweb-mcp start
→ local-dev
→ codegraph
```

---

# 3. 为什么选择 Secure MCP Tunnel

网页 Chat 不能把 `localhost` 直接当远程 MCP server 使用。

Secure MCP Tunnel 的价值是：

```text
本机 MCP Server
← stdio / loopback
← tunnel-client
← outbound HTTPS
← OpenAI tunnel service
← ChatGPT Web
```

本机不需要开放公网 listener。

OpenAI tunnel-client 官方 runtime 模型：

```text
ChatGPT/Product
→ Tunnel Service queue
→ tunnel-client long-poll
→ local MCP binding
→ terminal response
→ Tunnel Service
→ ChatGPT
```

这与“网页 Chat 作为脑，本机作为执行环境”非常匹配。

---

# 4. 两个 MCP 为什么分开

没有做成一个“大而全”的本机 MCP。

而是：

```text
Local Dev
CodeGraph
```

各自一个 Tunnel / runtime。

原因：

## 4.1 责任清晰

Local Dev：

```text
filesystem
shell
process
git
exact source
text search
```

CodeGraph：

```text
symbol
call path
dependency
dynamic dispatch
blast radius
structural code understanding
```

## 4.2 故障隔离

实际事故证明：

```text
Local Dev runtime stopped
CodeGraph runtime remained healthy
```

如果做成单 runtime，故障域更大。

## 4.3 AI 工具选择更自然

结构问题：

```text
CodeGraph first
```

真实状态：

```text
Local Dev
```

这比让一个 MCP 暴露几十种混杂工具更容易得到稳定工具选择。

---

# 5. Local Dev：Desktop Commander

## 5.1 已验证版本

真实实施基线：

```text
@wonderwhy-er/desktop-commander@0.2.44
```

stdio 启动：

```bash
npx -y @wonderwhy-er/desktop-commander@0.2.44
```

## 5.2 已验证配置

当时真实配置：

```json
{
  "blockedCommands": [],
  "allowedDirectories": [],
  "defaultShell": "/bin/zsh",
  "fileReadLineLimit": 10000,
  "fileWriteLineLimit": 2000,
  "telemetryEnabled": false
}
```

用户明确授予本机开发场景的高权限。

注意：

> 这个配置是本次真实环境事实，不应机械复制到他人机器。  
> 其它环境应根据所需目录与安全策略重新确认。

## 5.3 为什么 Desktop Commander 适合作为 Local Dev

它不是简单的：

```text
exec(command) → wait → output
```

它原生支持：

```text
start_process
read_process_output
interact_with_process
list_sessions
force_terminate
```

因此长任务可以：

```text
短时间启动
→ 返回 PID/session
→ 后续继续读取
```

这一点后来成为解决 120 秒事故的关键。

---

# 6. CodeGraph

## 6.1 已验证版本

真实实施：

```text
CodeGraph 1.5.0
```

当时 binary：

```text
/Users/agent/.nvm/versions/node/v24.19.0/bin/codegraph
```

这只是历史机器路径，不是通用配置。

## 6.2 ProFlow 当时索引事实

真实状态：

```text
Files: 380
Nodes: 4,776
Edges: 15,617
DB: ~21.39 MB
Journal: WAL
Index: up to date
```

`.codegraph` 指向项目自己的可重建索引。

## 6.3 `.codegraph` 的语义

```text
.codegraph/
= 代码知识图索引
≠ 项目业务事实
≠ Task 状态真源
≠ 文档真源
```

CodeGraph 索引坏了可以重建。

## 6.4 从单项目模式改成通用模式

最初：

```bash
codegraph serve --mcp \
  --path /Users/agent/Desktop/proton-workspace/repos/proflow
```

这个配置会把 MCP Server 默认项目绑定到 ProFlow。

后来确认未来：

```text
proton-workspace/
└── repos/
    ├── proflow/
    ├── project-a/
    └── project-b/
```

因此通用入口不应该锁死 ProFlow。

最终改成：

```bash
codegraph serve --mcp
```

每次调用：

```text
projectPath=/absolute/path/to/repo
```

每个 repo 自己：

```bash
cd repo
codegraph init
```

## 6.5 为什么不能直接 `--path proton-workspace`

`proton-workspace` 是多 repo 容器时：

```text
workspace root
≠ 单一 CodeGraph project
```

正确模型：

```text
repo A/.codegraph
repo B/.codegraph
repo C/.codegraph
```

一个通用 MCP Server 按 `projectPath` 查询。

---

# 7. CodeGraph 的 MCP Instructions

CodeGraph 这部分和 Local Dev 有一个重要区别。

CodeGraph Server 自己会通过 MCP initialize response 输出 server-level instructions。

其当前官方实现明确要求 Agent：

```text
结构问题
→ codegraph_explore

call path
→ codegraph_explore

impact / blast radius
→ codegraph_explore
```

并且强调：

```text
不要先用 grep/read 重建已索引代码的结构
```

当前默认 MCP surface 主要为：

```text
codegraph_explore
```

因此 CodeGraph 不需要额外塞很重的 App Description。

这是后来联合测试能够自动“结构工具优先”的重要原因。

---

# 8. Local Dev 为什么需要 App Description 规则

Desktop Commander 当前公开配置主要包括：

```text
blockedCommands
allowedDirectories
defaultShell
fileReadLineLimit
fileWriteLineLimit
telemetryEnabled
```

没有一个现成的用户配置字段可以直接写：

```text
MCP server instructions = "不要让长任务阻塞 120 秒"
```

又因为本次明确不希望：

```text
新增 wrapper
新增代理服务
fork Desktop Commander
修改 tunnel-client
```

所以采用现有 ChatGPT App Description 作为轻量模型指导。

最终规则：

```text
Local machine development tools for filesystem, shell, process and git operations.

Execution rule: For commands that may run longer than 30 seconds, use short start_process calls (normally timeout_ms <= 5000) and continue via PID/session with read_process_output. Never wait 60000/90000/120000 ms in one MCP call.

For publish, release, deploy, migration, install or other non-idempotent operations, never blindly retry after timeout, session termination or unknown state. Recover authoritative state first.
```

重要边界：

```text
App Description
= guidance
≠ hard server enforcement
```

但当前已经满足需求，不值得为了机械 hard guard 新增中间服务。

---

# 9. 真实 120 秒事故

这是本次最重要的工程经验之一。

## 9.1 场景

ProFlow Real-1 npm Registry 发布。

第三次真实 publish：

```text
pnpm release:publish
```

通过 Desktop Commander：

```text
start_process(... timeout_ms=120000)
```

单个 MCP tool call 长时间保持 foreground wait。

## 9.2 关键时间线

Desktop Commander tool log：

```text
2026-08-18T14:58:21.847Z
start_process
timeout_ms=120000
pnpm release:publish
```

换算本地 +08：

```text
22:58:21.847
```

Tunnel log：

```text
23:00:21.341086
MCP connection TTL reached; stopping response forwarding
```

紧接着：

```text
23:00:21.342439
stdio MCP command failed; requesting tunnel-client shutdown
reason="stdio MCP command stdin write failed"
error="write |1: file already closed"
```

再后：

```text
23:00:21.344031
command response deadline reached; dropping without posting a response
```

时间差：

```text
22:58:21.847
→ 23:00:21.341
≈ 119.494 秒
```

与：

```text
timeout_ms=120000
```

高度重合。

---

# 10. 根因裁决

最终证据支持：

```text
CODEGRAPH_CAUSED_FAILURE = NO

MIXED_MCP_CAUSED_FAILURE = NO EVIDENCE

DESKTOP_COMMANDER_RANDOM_CRASH = NO EVIDENCE

LONG_FOREGROUND_MCP_CALL_AT_120S_BOUNDARY = CONFIRMED

STDIO_PIPE_CLOSED = CONFIRMED

TUNNEL_CLIENT_SELF_SHUTDOWN = CONFIRMED
```

最准确的根因描述：

> **一个长时间保持 foreground 的单 MCP request 运行到约 120 秒有效 response deadline 边界；随后 tunnel-client 在 stdio 写入阶段发现 pipe 已关闭，其当前 fatal error policy 请求关闭整个 local runtime。**

需要保持的严谨边界：

- 不能说“所有超过 120 秒的本机进程都会杀死 MCP”；
- 真正危险的是“一个 MCP JSON-RPC 调用本身一直阻塞到 deadline”；
- 长时间后台进程本身是 Desktop Commander 原生支持场景。

---

# 11. 为什么不是简单调大 TTL

OpenAI tunnel-client 有：

```text
MCP_CONNECTION_MAX_TTL
```

官方默认：

```text
10m
```

但 protocol 还有：

```text
response_timeout
```

它表示：

> 单个 command 的完整生命周期 deadline，从 poll response 被客户端收到时开始计时。

因此：

```text
connection max TTL
≠
single command response deadline
```

本次真实环境观察到约：

```text
120s
```

所以仅仅设置：

```text
MCP_CONNECTION_MAX_TTL=30m
```

并不能证明单 command 就能等待 30 分钟。

最终没有采用“调大 TTL”作为根治方案。

---

# 12. 正确的长任务模型

## 12.1 错误

```text
ChatGPT
→ start_process(timeout_ms=120000)
→ MCP request 一直开着
→ 等 pnpm/build/publish 完成
```

## 12.2 正确

```text
ChatGPT
→ start_process(timeout_ms=1000~5000)
→ PID/session
→ 当前 MCP call 立即结束

ChatGPT
→ read_process_output(PID)
→ 当前 call 立即结束

ChatGPT
→ read_process_output(PID)
→ ...

→ DONE + exit code
```

真正长的是：

```text
OS process
```

而不是：

```text
MCP request
```

这使系统不依赖单 request 的 120 秒窗口。

---

# 13. 不可安全重复操作的额外规则

对于：

```text
publish
release
deploy
migration
upgrade
```

必须满足：

```text
exactly-once launch
+ PID/session
+ stdout/stderr evidence
+ exit code
+ authoritative external state
```

如果 ChatGPT 得到：

```text
Session terminated
MCP timeout
UI error
```

结论只能是：

```text
MCP_STATE = interrupted
UNDERLYING_OPERATION = UNKNOWN
```

不能直接：

```text
operation = FAILED
```

## 13.1 真实 publish 事故后的正确处理

当时：

```text
PUBLISH_STATE = UNKNOWN
```

正确路线：

```text
恢复 Local Dev
→ read-only Registry reconciliation
→ 精确判断 published / missing / unknown
→ 只补 missing
```

不是：

```text
再跑一次完整 release:publish
```

这条经验适用于所有有副作用的远程操作。

---

# 14. CodeGraph 会不会也撞 120 秒

理论上：

```text
任何经同一 tunnel command lifecycle 的 MCP tool call
```

都受到对应 deadline 约束。

但 CodeGraph `codegraph_explore` 正常负载与 Local Dev 长 shell 命令不同。

CodeGraph 官方说明：

```text
knowledge graph pre-computed
SQLite reads extremely fast
explore output capped
```

而本次 ProFlow：

```text
380 files
4,776 nodes
15,617 edges
21 MB DB
```

远小于公开超大图 timeout 案例。

最终结论：

```text
普通 codegraph_explore 120s 风险 = 极低
```

无需照搬 Local Dev 的 PID/polling 机制。

真正可能慢的是：

```text
codegraph init
full index
very large project
degraded daemon / queue
```

而 `init/index` 不是当前默认 `codegraph_explore` 的普通执行路径。

因此没有对 CodeGraph 增加人为的“30 秒硬限制”。

---

# 15. Runtime 管理

真实 alias：

```text
local-dev
codegraph
```

Local Dev：

```bash
tunnel-client runtimes connect \
  --alias local-dev \
  --tunnel-id "<LOCAL_DEV_TUNNEL_ID>" \
  --runtime-api-key "file:$HOME/.config/openai/tunnel-client/proflow-runtime.key" \
  --mcp-command "npx -y @wonderwhy-er/desktop-commander@0.2.44"
```

CodeGraph 最终：

```bash
tunnel-client runtimes connect \
  --alias codegraph \
  --tunnel-id "<CODEGRAPH_TUNNEL_ID>" \
  --runtime-api-key "file:$HOME/.config/openai/tunnel-client/proflow-runtime.key" \
  --mcp-command "/absolute/path/to/codegraph serve --mcp"
```

说明：

```text
proflow-runtime.key
```

只是历史文件名。

它并不意味着 Runtime Key 只能给 ProFlow。

后续新环境建议改成更通用名字：

```text
gptweb-mcp-runtime.key
```

但已经工作的当前环境没有为了“好看”去改 Key 文件名。

---

# 16. Secret 处理

本次最终原则：

```text
Runtime API Key
→ 本地文件
→ chmod 600
→ file:/path 引用
```

长期 runtime：

```text
Restricted Runtime Key
```

不要使用：

```text
Admin Key
```

作为 daemon credential。

原因：

- 权限最小化；
- 防止 Shell history 泄露；
- 防止文档/Chat 中意外复制；
- Runtime 与 Admin CRUD 权限分离。

---

# 17. gptweb-mcp

用户不希望以后每次输入两大串：

```text
tunnel-client runtimes connect ...
```

因此统一成：

```bash
gptweb-mcp
```

真实安装位置：

```text
~/.local/bin/gptweb-mcp
```

提供：

```text
gptweb-mcp
gptweb-mcp start
gptweb-mcp status
gptweb-mcp test
gptweb-mcp restart
gptweb-mcp stop
```

## 17.1 幂等

核心设计：

```text
is local-dev already running?
YES → 不动
NO  → connect

is codegraph already running?
YES → 不动
NO  → connect
```

因此：

```text
重复运行 gptweb-mcp
```

不会重复拉起已有 runtime。

---

# 18. macOS 持久化

最终使用 macOS 原生：

```text
launchd
```

LaunchAgent：

```text
~/Library/LaunchAgents/com.sayhello.gptweb-mcp.plist
```

主要配置：

```xml
<key>RunAtLoad</key>
<true/>

<key>StartInterval</key>
<integer>60</integer>

<key>ProcessType</key>
<string>Background</string>
```

效果：

```text
用户登录
→ launchd 运行 gptweb-mcp start
→ 两个 runtime 被检查
→ 缺哪个恢复哪个
```

每 60 秒重新执行幂等检查。

日志：

```text
~/Library/Logs/gptweb-mcp/stdout.log
~/Library/Logs/gptweb-mcp/stderr.log
```

---

# 19. 为什么 launchd 可以接受

初始约束是：

```text
不增加额外服务或应用
```

这里的 launchd：

```text
不是新第三方服务
不是 MCP wrapper
不是新的业务 daemon
```

它只是 macOS 原生登录任务管理器，用来执行：

```text
gptweb-mcp start
```

所以没有改变 MCP 架构。

---

# 20. 一个安装过程的小事故：RPROMPT

安装命令最外层曾执行：

```bash
set -u
```

因为命令直接粘贴进 VS Code 交互式 zsh，这会把当前 shell 切到 `nounset`。

随后 VS Code prompt hook：

```text
__vsc_update_prompt
__vsc_preexec
```

访问未定义：

```text
RPROMPT
```

出现：

```text
RPROMPT: parameter not set
```

处理：

```text
关闭当前 Terminal
→ 新开 Terminal
```

原因不在 MCP。

最终规范：

```text
独立脚本内部可以 set -u
交互式安装块最外层不要 set -u
```

---

# 21. 最终 Runtime 验证

真实执行：

```bash
gptweb-mcp test
```

得到：

```text
Local Dev: already running
CodeGraph: already running

========== GPTWEB MCP TEST ==========
LOCAL_DEV=READY
CODEGRAPH=READY

GPTWEB_MCP=2/2_READY
```

由此确认：

```text
Local Dev runtime = READY
CodeGraph runtime = READY
gptweb-mcp idempotency = PASS
```

但这还不是最终功能 PASS。

---

# 22. 真实联合测试

专门设计一个**不写任何 MCP / tool 名称**的测试提示词。

目的：

> 看网页 Chat 能否仅根据问题语义自动选择正确工具。

问题性质：

```text
分析 Browser Execution
从 runtime composition
到 extension creation
并用真实源码交叉验证
```

## 22.1 实际调用顺序

真实行为：

```text
① 先做结构代码图分析
→ projectPath 指向 ProFlow
→ codegraph_explore

② 获得：
createBrowserExecutorComposition
createExecutionBrowserExtension
createBrowserRealityBridgeServer
formal-process 等核心节点

③ 再使用本机源码能力
→ 精确读取/验证源码

④ 综合输出调用链
```

最终裁决：

```text
TOOL_SELECTION = PASS
TOOL_PRIORITY  = PASS
CROSS_VERIFY   = PASS
```

---

# 23. 联合测试发现的实际价值

CodeGraph 第一阶段给出了：

```text
createBrowserExecutorComposition
→ createExecutionBrowserExtension
→ Browser Executor
```

后续真实源码验证进一步澄清：

```text
createExecutionBrowserExtension()
≠ 物理创建 Chrome Extension
```

真实语义：

```text
createExecutionBrowserExtension()
= Node-side Browser Executor adapter / ExecutionExecutorPort
```

物理 Chrome Extension：

```text
Chrome 加载 MV3 extension
→ background service worker
→ 主动连接 loopback bridge
```

这证明联合模式不是简单重复结果。

结构图负责：

```text
找到真实结构
```

本机源码负责：

```text
确认精确运行语义
```

---

# 24. 最终工具优先级基线

固定为：

```text
STRUCTURAL QUESTION
↓
CodeGraph first
↓
核心 files / symbols / call path
↓
Local Dev exact reality
↓
source / git / rg / shell / process
```

具体：

| 问题 | 首选 |
|---|---|
| 调用链 | CodeGraph |
| dependency | CodeGraph |
| ownership | CodeGraph |
| blast radius | CodeGraph |
| dynamic dispatch | CodeGraph |
| package.json | Local Dev |
| config / docs | Local Dev |
| git 状态 | Local Dev |
| 精确文本 | Local Dev |
| shell/process | Local Dev |
| test/build | Local Dev |
| CodeGraph 未覆盖细节 | Local Dev |

这不是绝对互斥。

如果用户明确要求：

```text
结构分析 + 真实源码交叉验证
```

则：

```text
CodeGraph
→ Local Dev
```

是正确组合。

---

# 25. 为什么没有继续优化成 MCP Wrapper

讨论过：

```text
ChatGPT
→ Local Dev Guard MCP
→ Desktop Commander
```

Guard 可以：

```text
注入 server instructions
拦截 timeout_ms > 30000
```

但最终没有做。

原因：

```text
用户不希望新增服务
用户不希望新增应用
用户只希望用已有配置/字段
```

现阶段：

```text
App Description
+
Desktop Commander 原生 session
+
操作纪律
```

已经解决问题。

所以：

```text
WRAPPER = NOT ADOPTED
```

---

# 26. 为什么没有修改 ProFlow 架构

这套 MCP 是：

```text
Developer Tooling / Web Chat Local Capability
```

不是 ProFlow Phase 3 的业务 runtime。

因此明确：

```text
MCP findings
≠ 重开 Phase 3 Architecture
```

没有因为：

```text
Secure MCP Tunnel
CodeGraph
Desktop Commander
```

推翻：

```text
Custom GPT + Action + Gateway + ProFlow Core
```

这条边界非常重要。

---

# 27. 当前实现 vs 可迁移方案

## 27.1 当前真实实现

```text
Local Dev App
CodeGraph App
two Secure MCP Tunnels
tunnel-client managed runtimes
Desktop Commander 0.2.44
CodeGraph 1.5.0
gptweb-mcp
launchd
60s self-check
```

## 27.2 当前机器的历史细节

```text
Mac: Intel
CodeGraph binary 曾位于 NVM Node v24.19.0 路径
Runtime Key 文件名仍为 proflow-runtime.key
```

这些不是通用架构要求。

## 27.3 新机器建议

新机器：

```text
探测绝对路径
使用当前官方 tunnel-client
Runtime Key 文件改成通用命名
CodeGraph per-project init
codegraph serve --mcp
```

不要复制旧绝对路径。

---

# 28. 运维命令

日常只需要：

```bash
gptweb-mcp
```

测试：

```bash
gptweb-mcp test
```

状态：

```bash
gptweb-mcp status
```

全部重启：

```bash
gptweb-mcp restart
```

停止：

```bash
gptweb-mcp stop
```

单个 runtime 深查：

```bash
tunnel-client runtimes status local-dev --json
tunnel-client runtimes status codegraph --json
```

CodeGraph：

```bash
cd /path/to/repo
codegraph status
```

---

# 29. 故障诊断路径

## 29.1 Local Dev 不 READY

```text
gptweb-mcp status
↓
tunnel-client runtimes status local-dev --json
↓
Local Dev tunnel log
↓
Desktop Commander tool call log
```

历史本机日志位置：

```text
~/Library/Application Support/tunnel-client/logs/local-dev.log
~/.claude-server-commander/claude_tool_call.log
```

## 29.2 CodeGraph 不 READY

```text
tunnel-client runtimes status codegraph --json
↓
codegraph -v
↓
目标 repo codegraph status
↓
确认 projectPath
```

## 29.3 只有某个 MCP 挂

不要：

```text
重启全部
```

先：

```text
只恢复失败 alias
```

两个 runtime 是独立故障域。

---

# 30. 已知边界

## 30.1 App Description 不是 Hard Guard

模型理论上仍可能生成错误 timeout。

所以实际任务仍要观察：

```text
start_process(timeout_ms)
```

但当前联合使用已经稳定。

## 30.2 Secure MCP Tunnel 的单 command deadline 由平台控制

不能假定：

```text
本机 connection-max-ttl
=
单工具最大执行时间
```

长任务必须采用 session/polling。

## 30.3 CodeGraph 不是 Runtime Correctness

CodeGraph 可以回答：

```text
结构是什么
谁调用谁
影响什么
```

不能替代：

```text
compiler
test
runtime
真实环境
```

## 30.4 `.codegraph` 需要每 repo 初始化

新的 repo：

```bash
codegraph init
```

否则通用 MCP Server 没有可查询的图。

---

# 31. 安全基线

1. Runtime Key 使用 Restricted 权限。
2. Key 不进入 Chat。
3. Key 不进入 Git。
4. Key 文件 chmod 600。
5. Admin Key 不用于长期 runtime。
6. App full access 只在用户明确知情后开启。
7. 对 publish/deploy 等副作用，MCP interruption 不能直接触发 retry。
8. 用户仓库可能包含 Secret，CodeGraph/Local Dev 权限应按实际信任边界配置。
9. 公共仓库文档不提交真实 Runtime Key。
10. Tunnel ID 属于 opaque infrastructure identifier；除非确有运维需要，公开文档也不必写死。

---

# 32. 不应重复走的弯路

不要再：

```text
为了长任务去无脑调高 TTL
为了安全规则新建 wrapper MCP
把 CodeGraph 永久锁死 ProFlow
把 workspace 根目录当超级 CodeGraph
把 Session terminated 当 command failed
UNKNOWN 后直接重跑 publish
每次开机手输两条 runtimes connect
只看 runtime READY 不做真实功能测试
```

---

# 33. 最终基线

```text
GPT Web
= reasoning / orchestration

Local Dev
= local physical truth / execution

CodeGraph
= structural code intelligence

tunnel-client
= secure transport + managed local runtime

gptweb-mcp
= local lifecycle convenience entry

launchd
= macOS login persistence
```

最终状态：

```text
GPTWEB_MCP_PERSISTENCE = PASS

LOCAL_DEV_RUNTIME = READY
CODEGRAPH_RUNTIME = READY

LOCAL_DEV_FUNCTIONAL = PASS
CODEGRAPH_FUNCTIONAL = PASS

TOOL_SELECTION = PASS
TOOL_PRIORITY = PASS
CROSS_VERIFY = PASS
```

---

# 34. 可复用工程经验

这次最值得长期保留的不是命令本身，而是以下方法：

```text
1. Reasoning 与 Mechanical Execution 分离
2. Structural Intelligence 与 Physical Reality 分离
3. Long Process 与 MCP Request Lifecycle 分离
4. Side-effect UNKNOWN 与 FAILED 分离
5. Runtime Health 与 Functional PASS 分离
6. Per-project Index 与 Workspace Container 分离
7. App Guidance 与 Protocol Hard Guard 分离
8. 新能力接入与业务架构重构分离
```

这些原则可以直接复用到后续新项目。

---

# 35. 外部官方参考

OpenAI：

- `https://help.openai.com/en/articles/12584461-developer-mode-apps-and-full-mcp-connectors-in-chatgpt-beta`
- `https://github.com/openai/tunnel-client/blob/master/docs/onboarding.md`
- `https://github.com/openai/tunnel-client/blob/master/docs/configuration.md`
- `https://github.com/openai/tunnel-client/blob/master/docs/connectors.md`
- `https://github.com/openai/tunnel-client/blob/master/docs/protocol.md`
- `https://github.com/openai/tunnel-client/blob/master/docs/permissions.md`
- `https://github.com/openai/tunnel-client/blob/master/plugins/tunnel-mcp/skills/tunnel-mcp/references/runtime-flows.md`

Desktop Commander：

- `https://github.com/wonderwhy-er/DesktopCommanderMCP`
- `https://github.com/wonderwhy-er/DesktopCommanderMCP/blob/main/plugins/claude/skills/desktop-commander-overview/SKILL.md`

CodeGraph：

- `https://github.com/colbymchenry/codegraph`
- `https://github.com/colbymchenry/codegraph/blob/main/site/src/content/docs/getting-started/installation.md`
- `https://github.com/colbymchenry/codegraph/blob/main/site/src/content/docs/getting-started/your-first-graph.md`
- `https://github.com/colbymchenry/codegraph/blob/main/src/mcp/server-instructions.ts`

---

# 36. 文档归属

当前先沉淀在：

```text
/Users/agent/Desktop/proton-workspace/repos/ai-agent-platform
└── docs/technical/技术方案/GPT-Web-MCP/
```

原因：

- 这是此前 Agent 工程探索与技术沉淀仓库；
- 本能力来自该工程探索链路；
- 当前先保证知识不丢；
- 后续新的统一工作区/知识仓建立后，再进行跨项目整理和迁移。

本文只记录真实完成的能力基线，不把未来迁移提前设计成新的架构工程。
