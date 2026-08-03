# Context Directory Agent Rules

> 本文件补充根 `AGENTS.md`，只约束 `context/**` 的读取、判断与写入。

## 1. 目录职责

`context/` 保存项目级共享启动上下文。内容必须短、小、当前、可信，用于让总控 Planner、新会话、专业 Agent 和 Executor 快速恢复项目事实。

本目录不保存：

- 单个任务的逐步执行状态；
- 命令日志和大段输出；
- ChatGPT 用户 Memory；
- Agent 私有工作记忆；
- Secret、Token、Cookie 或隐私原文；
- 完整技术方案、教程或历史复盘；
- Runtime Task Store / Checkpoint 的替代品。

## 2. 所有权

核心规则：

> Context 由总控 Planner 维护，Executor 只执行，其他 Agent 只报告变化，用户最终确认。

权限边界：

- 总控 Planner：判断是否需要更新，并生成完整覆盖文件；
- 专业 Agent、Reviewer、Research Agent：只读并报告变化、原因、证据和建议文件；
- Executor：默认只读，只能按获准 Contract 机械覆盖完整文件；
- Project Owner：重要变化审批和最终 Review。

## 3. 写入授权

Executor 修改 `context/**` 必须同时满足：

1. Canonical Handoff Contract 中存在 `context_access`；
2. `context_access.mode` 为 `write_approved`；
3. `context_access.files` 精确列出目标文件；
4. `content_source` 为 `planner_full_replacement`；
5. 总控 Planner 已提供每个目标文件的完整覆盖内容；
6. 目标文件同时位于 Scope Lock 的允许路径中。

缺少任一条件均视为 `read_only`。

禁止 Executor：

- 根据仓库现状自行编写或补全 Context；
- 将修改清单解释成自由改写权；
- 顺便修改未列出的 Context 文件；
- 把执行报告、推测或未来设想写成当前事实。

## 4. 文件职责与触发条件

| 文件 | 职责 | 典型更新触发 |
|---|---|---|
| `README.md` | 目录导航和读取顺序 | 文件增删、职责或读取顺序变化 |
| `project-context.md` | 稳定目标、范围和产品关系 | 目标或范围变化 |
| `architecture-context.md` | 当前实现、目标架构和边界 | 架构、应用、Package 或能力边界变化 |
| `current-status.md` | 当前阶段、已实现、限制和下一步 | 阶段、Release、Skill 或主要工作变化 |
| `knowledge-strategy.md` | Knowledge、Memory、Task State、投影治理 | 知识和发布治理变化 |
| `roadmap.md` | 阶段顺序、门槛和延期项 | 优先级、阶段或完成门槛变化 |

普通 Bug 修复、测试补充和不改变项目级共享事实的内部实现，不要求更新 Context。

## 5. 变化报告

非总控角色发现 Context 可能过期时，只提交：

```yaml
context_change_report:
  required: true
  reason: <为什么可能过期>
  evidence:
    - <Commit、路径、测试或真实调用证据>
  suggested_files:
    - context/<file>.md
```

报告不是写入授权。

## 6. 用户审批

以下重要变化由总控 Planner 先向 Project Owner 汇报并申请确认：

- 项目目标或产品范围；
- 核心架构或角色边界；
- 阶段完成、取消或切换；
- Roadmap 主优先级；
- Git、Knowledge、Memory、Feishu 或安全治理原则。

已确认事实的小范围同步、链接修正和明确状态修正，可以按既有授权处理。

## 7. 冲突处理

若 Context 与代码、测试、真实调用证据、Registry、Release 或 Migration 冲突：

1. 停止基于冲突 Context 继续规划；
2. 报告冲突和证据；
3. 由总控 Planner 生成完整替换文件；
4. 必要时取得用户确认；
5. 再由 Executor 机械落盘。

正式说明见：

`docs/knowledge/05_上下文与知识系统/KNO-011-上下文运行流转与恢复机制/README.md`
