# ARC-006 项目知识分层与 Agent 上下文架构

## 一句话结论

仓库中所有资料合起来是“项目知识”，但 Agent 每次执行任务只应该拿到其中一小部分。

```text
项目全部知识
      |
      | 按任务筛选
      v
本次任务上下文
```

Agent 的能力不是来自“读得越多”，而是来自“在正确的时候读到正确的东西”。

## 1. 为什么会有这篇文档

这个项目开始依赖多个 Agent 工作：

- ChatGPT 讨论需求和架构；
- Codex 修改仓库；
- OpenCode / DeepSeek 执行低成本任务；
- 后续还会有 Gateway、Skill 和更多自动化能力。

但每次新 Agent 进入仓库，都需要先回答：

- 这个项目到底要做什么？
- 当前阶段是什么？
- 哪些决策已经确定？
- 哪些文件是正式知识？
- 哪些只是历史实验？
- 这次允许改什么？
- 做完以后如何验证？

早期这些信息主要存在于长聊天里。后来虽然建立了 `context/`，但又出现了新的问题：

- `context/current-status.md` 还写着 Task 001 进行中；
- 实际 Skill 和飞书投影已经完成；
- `context/` 与 `docs/knowledge/` 重复描述项目目标和路线图；
- 历史 Context 放在 Archive 中，但没有明确标记失效；
- Agent 读取了过期状态后，可能按照旧阶段继续工作。

这类问题叫 Context Drift：给 Agent 的项目说明和仓库现实已经不一致。

## 2. 项目中实际遇到的三个矛盾

### 2.1 全部读，Token 太贵；少读，又怕漏关键信息

让 Agent 扫描整个仓库，能够减少遗漏，但代价是：

- 上下文窗口被无关内容占用；
- 旧方案和新方案同时进入推理；
- 弱模型难以判断哪些内容有效；
- 每次任务都重复消耗 Token；
- Agent 容易顺手修改任务之外的文件。

完全不提供上下文又会导致：

- 重新发明已经确定的架构；
- 重复调查；
- 使用旧路径；
- 忽略项目约束。

问题不在于“读多还是读少”，而在于缺少一套选择规则。

### 2.2 动态状态和长期知识混在一起

`current-status.md` 应该回答：

> 现在做到哪里，下一步是什么？

而知识文档应该回答：

> 为什么这样设计，这套方案如何工作？

如果二者互相复制，状态每变化一次就要修改多篇文档，最终一定漂移。

### 2.3 规则、知识、证据和私人信息没有完全分开

项目中同时存在：

- Agent 启动规则；
- 正式知识；
- 技术证据；
- 学习材料；
- 历史实验；
- 私人背景；
- Secret 和本地运行状态。

它们的生命周期、读者和安全边界不同，不能因为都是 Markdown 就放进同一层。

## 3. 市面上的成熟思路

### 3.1 Diátaxis：先区分文档服务的目的

Diátaxis 将文档分为：

- Tutorial：带人学习；
- How-to：帮助完成具体任务；
- Reference：准确查询；
- Explanation：解释概念与原因。

它给本项目的启发不是照搬四个目录，而是：

> 不同文档解决不同问题，不能把教程、操作步骤、参考资料和架构解释写成同一种文件。

因此，学习路线、工程规范、实验记录、正式架构和当前状态需要分开。

### 3.2 GitHub Copilot：仓库级规则和路径级规则分开

GitHub Copilot 支持：

- 仓库级自定义指令；
- 路径级指令；
- `AGENTS.md`；
- 不同目录应用不同规则。

这说明 Agent 规则应该有作用域。

例如：

- 根 `AGENTS.md` 只放全仓通用规则；
- `docs/AGENTS.md` 只规定文档资产；
- Skill 目录可以有 Skill 专属规则；
- 不应该把所有细节都塞进一个根文件。

### 3.3 Claude Code：启动时自动加载核心记忆，详细内容按需读取

Claude Code 使用项目级 `CLAUDE.md` 保存共享规则，并支持导入其他文件。其文档强调：

- 核心项目规则可以持久化；
- 详细主题可以拆分；
- 启动内容应具体；
- 项目演进后要定期更新。

这和本项目的 `AGENTS.md + context/ + 按需知识` 思路一致。

### 3.4 MCP：上下文、操作和模板不是一回事

MCP 将能力分为：

- Resources：上下文数据；
- Tools：可以执行的动作；
- Prompts：可复用交互模板。

这个划分提醒我们：

> 知识不应该和执行动作、任务模板混成一个概念。

`docs/knowledge` 是知识，Skill 是能力规则，Gateway / Tool 才负责操作。

## 4. 本项目的四层知识与上下文模型

### 4.1 第一层：启动上下文

位置：

```text
README.md
AGENTS.md
context/
knowledge.config.yaml
```

作用：

让一个第一次进入仓库的 Agent 在最小成本下知道：

- 项目是什么；
- 当前做到哪里；
- 当前路线图；
- 全仓规则；
- 正式知识源在哪里。

特点：

- 内容短；
- 变化较快；
- 每个任务开始都可能读取；
- 不讲完整历史；
- 不复制所有知识正文。

### 4.2 第二层：长期知识

位置：

```text
docs/knowledge/**
```

作用：

保存适合人和 Agent 长期阅读的知识资产：

- 项目与产品；
- 架构与领域；
- Agent 与能力；
- 工作流；
- 知识系统；
- 技术方案；
- 实验与复盘；
- 学习路线；
- 作品集。

特点：

- 解释 What、Why、How；
- 经过整理；
- 能发布到飞书；
- 不承担实时任务状态；
- 不放 Secret、本地状态和大量运行日志。

### 4.3 第三层：工程证据

位置：

```text
docs/technical/**
docs/adr/**
docs/learning/**
tests/
scripts/
schemas/
```

作用：

保存能够支撑正式知识的工程材料：

- ADR；
- 治理规则；
- 调研证据；
- 迁移记录；
- 运维记录；
- Schema；
- 校验脚本；
- 测试结果。

特点：

- 面向工程审计；
- 不一定全部发布飞书；
- 比长期知识更详细；
- 可以证明“为什么相信这个结论”。

### 4.4 第四层：运行与私人上下文

位置示例：

```text
.private-context/**
本地 Worktree
临时任务输入
Agent 运行状态
Secret
认证信息
```

作用：

支持当前用户和本地环境工作。

特点：

- 不进入公开仓库；
- 不发布飞书；
- 不成为正式项目事实；
- 需要清楚的 `.gitignore` 和目录说明。

## 5. 同一个事实由谁负责

为了避免重复，项目需要给常见事实指定唯一 Owner。

| 事实 | 唯一 Owner | 其他位置如何处理 |
|---|---|---|
| 项目当前阶段 | `context/current-status.md` | 知识文档只描述稳定阶段成果 |
| 路线图状态 | `context/roadmap.md` | 产品文档解释路线原因，不复制实时状态 |
| Git / 飞书权威关系 | ADR + ARC-005 | README 只做简短引用 |
| 正式知识路径 | `knowledge.config.yaml` | AGENTS 和 Skill 引用配置 |
| 发布规则 | `skills/project-knowledge-governance/**` | SOL-004 解释原因，不重复实现细节 |
| 项目长期叙事 | `docs/knowledge/**` | Context 只提供摘要 |
| 私人信息 | `.private-context/**` | 正式知识不得复制 |

原则：

> 一个事实只在一个位置完整维护，其他位置只链接或摘要。

## 6. Agent 如何组装本次任务上下文

Agent 启动不应该读取全部仓库，而应分两步。

### 6.1 固定启动包

每次先读：

```text
README.md
AGENTS.md
context/current-status.md
context/roadmap.md
knowledge.config.yaml
```

确认：

- 任务是否与当前阶段一致；
- 配置路径是否真实存在；
- 仓库是否存在 Context Drift；
- 本次任务属于哪个知识领域。

### 6.2 按任务补充

然后根据任务读取最小集合。

例如：

#### 修改飞书 Publisher

```text
ARC-005
SOL-004
SKL-001
skills/project-knowledge-governance/**
相关测试
```

#### 设计 Gateway

```text
CTX-001
ARC-001
ARC-003
相关 ADR
Gateway 目标代码
```

#### 写阶段复盘

```text
current-status
Git 历史
EXP 证据
相关 ADR / SOL
```

最终形成 Context Package：

```text
任务目标
当前状态
已确定决策
相关知识
目标文件
允许范围
禁止范围
验收方式
停止条件
```

## 7. Context Drift 如何处理

Context Drift 不是发现后什么都不能做。

正确规则是：

1. 停止基于不确定事实继续写入；
2. 允许只读检查、Git 历史核对和证据收集；
3. 列出冲突的文件与事实；
4. 由 Project Owner 确认真实状态；
5. 先修复启动上下文，再继续原任务；
6. 任务关闭前检查状态文件是否需要更新。

不允许：

- 静默忽略 Drift；
- 自行猜测哪个状态是真的；
- 把计划写成已完成；
- 因为修复状态而顺手重构其他文件。

## 8. 从这次实践抽象出的理论

### 8.1 知识库和上下文不是一回事

知识库追求长期完整。

任务上下文追求当前相关。

将两者等同，要么 Token 失控，要么关键信息缺失。

### 8.2 上下文设计的核心是选择，不是堆积

Context Engineering 不是把所有信息都保存起来，而是设计：

- 什么必须常驻；
- 什么按需读取；
- 什么只用于审计；
- 什么永远不能进入公开上下文。

### 8.3 动态事实必须有明确 Owner

越经常变化的信息，越不能到处复制。

当前状态、版本和路径应尽量由一个文件或配置负责。

### 8.4 Agent 规则需要作用域

根规则只放全局约束，细节下沉到相关目录。

这样既减少上下文，也避免不同领域规则互相冲突。

## 9. 下一步落地

当前最重要的不是增加更多文档，而是建立一致性检查：

- `knowledge.config.yaml` 中的路径必须存在；
- Markdown 相对链接必须有效；
- Asset ID 和 Canonical Path 必须一致；
- `current-status.md` 和 Roadmap 的阶段不能冲突；
- Archive 资产必须明确 `superseded`；
- `.private-context` 跟踪规则必须可测试。

这些能够由脚本判断的事情，不再让模型反复阅读判断。

## 10. 参考资料

- Diátaxis
  https://diataxis.fr/start-here/
- GitHub Copilot Repository Instructions
  https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions
- GitHub Copilot CLI Custom Instructions
  https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions
- Anthropic Claude Code Memory
  https://docs.anthropic.com/zh-CN/docs/claude-code/memory
- Model Context Protocol Architecture
  https://modelcontextprotocol.io/docs/learn/architecture
