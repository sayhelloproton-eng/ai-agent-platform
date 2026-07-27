---
asset_id: ARC-006
asset_type: architecture
title: 项目知识分层与 Agent 上下文架构
status: proposed
evidence_level: decided
owners:
  - project-owner
created_at: 2026-07-27
updated_at: 2026-07-27
canonical_source: git
canonical_path: docs/knowledge/知识系统/ARC-006-项目知识分层与Agent上下文架构.md
related_assets:
  - ARC-002
  - ARC-004
  - ARC-005
  - CTX-001
  - CTX-003
  - SKL-001
  - WFL-001
  - WFL-004
  - EXP-003
tags:
  - context-engineering
  - knowledge-layer
  - retrieval
  - agent-instructions
---

# ARC-006 项目知识分层与 Agent 上下文架构

## 1. 问题定义

项目拥有大量知识，不代表 Agent 应该把它们全部加载进上下文。

需要区分：

```text
Knowledge Universe
≠
Task Context
```

知识系统回答“项目长期知道什么”。

Context 系统回答“当前任务此刻必须知道什么”。

两者混在一起会导致：

- 新 Agent 每次读取整个仓库；
- Token 被无关文档占满；
- Current Status 与稳定知识重复；
- 同一事实多处修改；
- 旧决策干扰当前任务；
- 弱模型无法从大量上下文中稳定执行。

## 2. 市面方案的共同方向

### 2.1 Diátaxis：按用户需求组织文档

Diátaxis 将文档分为：

- Tutorial；
- How-to Guide；
- Reference；
- Explanation。

核心价值是：

> 文档类别应服务不同用户任务，而不是把所有内容写成同一种“说明文档”。

对本项目的启发：

- 学习路线不等于正式架构；
- 技术参考不等于当前任务；
- 实验结果不等于最终 Solution；
- 解释性知识不应混入运行日志。

### 2.2 Backstage TechDocs：文档和软件实体关联

Backstage 将文档和代码托管源、软件实体和发布流程关联，说明知识应与项目对象和版本绑定，而不是脱离代码形成孤立页面。

### 2.3 GitHub Copilot：仓库级和路径级指令

GitHub Copilot 支持：

- Repository-wide Instructions；
- Path-specific Instructions；
- `AGENTS.md`；
- 最近目录优先的作用域。

说明 Agent 指令应具有范围，不应把所有规则都放进一个根文件。

### 2.4 Claude Code：项目记忆与按需主题文件

Claude Code 使用 `CLAUDE.md` 提供持久指令，并将详细记忆拆到按需读取的主题文件。官方文档也建议保持启动内容简洁。

### 2.5 Cursor：Rules 与 Surgical Context

Cursor 支持项目 Rules，并建议通过明确文件、目录或上下文引用引导 Agent，而不是完全依赖自动全仓搜索。

### 2.6 MCP：Context 与 Tool 分离

MCP 区分 Resources、Prompts 和 Tools。它说明：

- 可读取知识；
- 执行工具；
- 工作模板；

应该是不同接口，不应让知识 Skill 退化为工具 CRUD。

## 3. 四层项目知识模型

### 3.1 Startup Context

位置：

```text
README.md
AGENTS.md
context/
```

职责：

- 项目是什么；
- 当前阶段；
- 当前限制；
- 恢复顺序；
- 关键路径；
- 下一步。

特点：

- 小；
- 动态；
- 启动时读取；
- 不复制完整知识正文。

建议启动预算：

- 根 README；
- 根 AGENTS；
- `context/current-status.md`；
- 与任务直接相关的一个 Context 文件。

### 3.2 Human Knowledge

位置：

```text
docs/knowledge/
```

职责：

- 产品和项目叙事；
- 架构解释；
- 领域模型；
- 工作流；
- 知识系统；
- 复盘；
- 作品集。

特点：

- 稳定；
- 面向人和 Agent 阅读；
- 可投影飞书；
- 不承担实时任务状态。

### 3.3 Engineering Evidence

位置：

```text
docs/technical/
docs/adr/
skills/
schemas/
tests/
scripts/
```

职责：

- ADR；
- Research；
- Experiment Evidence；
- Solution 实现细节；
- OPS；
- Migration；
- Contract；
- 测试和脚本。

特点：

- 精确；
- 可审计；
- 默认不发布飞书；
- Agent 按任务读取。

### 3.4 Runtime and Private Context

位置：

```text
.private-context/
本地运行目录
Agent Session
外部连接器
```

职责：

- 私人资料；
- 临时任务输入；
- 本地环境；
- 未公开证据；
- 运行 Trace。

特点：

- 按需；
- 默认不提交；
- 默认不进入正式知识；
- 需要明确安全边界。

## 4. 同一事实只能有一个 Owner

为避免 Drift，每类事实定义唯一 Owner。

| 事实 | Owner |
|---|---|
| 项目当前阶段 | `context/current-status.md` |
| 项目稳定背景 | `docs/knowledge/项目与产品/` |
| 正式架构解释 | `docs/knowledge/架构与领域/` |
| 架构决策原因 | `docs/adr/` |
| 实现边界 | `docs/technical/架构实现/` |
| Skill 行为合同 | `skills/<skill>/` |
| 飞书阅读内容 | Git Projection |
| 私人资料 | `.private-context/` 本地正文 |

其他文件只能引用 Owner，不应复制后独立维护。

## 5. Context 与 Knowledge 的边界

### Context 应包含

- 当前阶段；
- 当前目标；
- 当前限制；
- 已知 Drift；
- 入口文件；
- 下一步；
- 恢复指令。

### Context 不应包含

- 完整架构论文；
- 所有 ADR 正文；
- 所有历史执行日志；
- 大量教程；
- 飞书页面 Token；
- 可通过索引查到的详细知识。

### Knowledge 应包含

- 经 Review 的稳定解释；
- 可供人类长期阅读的项目知识；
- 架构和工作流的 Why；
- 经过提炼的实验与复盘。

### Knowledge 不应包含

- 每小时变化的任务状态；
- 未验证计划；
- 私人数据；
- 全量 Agent Trace；
- 每次命令输出。

## 6. Index-first Retrieval

推荐检索过程：

```text
Task Intent
    |
    v
Read Startup Context
    |
    v
Query Asset Index
    |
    v
Select 1-3 Primary Assets
    |
    v
Expand Related Evidence
    |
    v
Build Context Package
```

默认禁止：

```text
Read Entire Repository
Read Entire Feishu Space
Load All ADRs
Load All Agent Logs
```

只有全仓审计或迁移任务才允许受控扫描。

## 7. Context Package

一个任务上下文包至少包含：

```json
{
  "task": {
    "goal": "",
    "non_goals": [],
    "deliverables": []
  },
  "project": {
    "phase": "",
    "source_commit": ""
  },
  "scope": {
    "allowed_files": [],
    "forbidden_files": []
  },
  "knowledge": {
    "primary_assets": [],
    "supporting_evidence": []
  },
  "constraints": [],
  "validation": [],
  "stop_conditions": []
}
```

Context Package 是临时任务输入，不是新的正式知识副本。

## 8. Instruction Hierarchy

建议顺序：

```text
System / Platform Policy
        |
        v
Root AGENTS.md
        |
        v
Nearest Directory AGENTS.md
        |
        v
Task Contract
        |
        v
Selected Knowledge and Evidence
```

冲突规则：

1. 上层安全和平台规则优先；
2. 更近路径的工程规则覆盖更通用规则；
3. Task Contract 不能违反 Accepted ADR；
4. 历史资产不能覆盖当前状态；
5. 发现冲突时停止，不自动拼接结论。

## 9. 控制指令体积

仓库指令越多不一定越好。

2026 年关于 `AGENTS.md` 的实证研究出现不同结论：

- 有研究观察到运行时间和输出 Token 下降；
- 也有研究发现自动生成或包含多余要求的 Context 文件会降低成功率并增加成本。

因此本项目不追求“把所有知识写进 AGENTS”，而采用：

```text
Minimal Rules
+
On-demand Knowledge
+
Deterministic Validation
```

AGENTS 只保存必须始终遵守的规则。

详细理论、历史和示例按任务检索。

## 10. Drift 检测

### 10.1 Drift 类型

```text
Status Drift
Path Drift
Contract Drift
Projection Drift
Instruction Drift
Relation Drift
```

### 10.2 阶段结束触发器

每个阶段结束必须检查：

- `context/current-status.md`；
- Roadmap；
- 相关 README；
- Asset Index；
- Accepted ADR；
- Skill Profile；
- Projection Manifest。

### 10.3 自动检查

机器可以验证：

- 路径存在；
- 链接有效；
- Asset ID 唯一；
- Canonical Path 一致；
- Relation 目标存在；
- 配置与目录匹配；
- Context 更新时间和阶段标识。

机器不能决定：

- 架构是否应改变；
- ADR 是否接受；
- 哪个失败经验值得进入知识库；
- 是否公开私人内容。

## 11. 当前项目建议

### 保留

```text
context/
docs/knowledge/
docs/technical/
docs/learning/
docs/adr/
skills/
.private-context/
```

### 收敛

- `context/current-status.md` 只维护动态阶段；
- `docs/knowledge` 不复制实时状态；
- ADR 保存决策；
- Technical 保存证据和实现；
- Feishu 只消费 `docs/knowledge`；
- Agent 通过索引和关系按需扩展。

### 新增 ADR 建议

建立：

```text
ADR-003 Context Runtime 与 Human Knowledge 的边界
```

明确两者的 Owner、更新触发器和冲突处理。

## 12. 参考资料

- Diátaxis  
  https://diataxis.fr/
- Backstage TechDocs Concepts  
  https://backstage.io/docs/features/techdocs/concepts/
- GitHub Copilot Repository Instructions  
  https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions
- Claude Code Project Memory  
  https://code.claude.com/docs/en/memory
- Cursor Rules  
  https://docs.cursor.com/context/rules
- Cursor Working with Context  
  https://docs.cursor.com/en/guides/working-with-context
- Codex AGENTS.md  
  https://github.com/openai/codex/blob/main/docs/agents_md.md
- Model Context Protocol Architecture  
  https://modelcontextprotocol.io/docs/learn/architecture
- On the Impact of AGENTS.md Files on the Efficiency of AI Coding Agents  
  https://arxiv.org/abs/2601.20404
- Evaluating AGENTS.md: Are Repository-Level Context Files Helpful  
  https://arxiv.org/abs/2602.11988
