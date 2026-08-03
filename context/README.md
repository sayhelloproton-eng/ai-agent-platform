# Context

`context/` 为总控 Planner、新 Agent 和开发者提供短、小、当前、可信的项目恢复入口。

## 所有权

`context/**` 的唯一语义负责人是总控 Planner。

- 专业 Agent、Reviewer 和 Research Agent 只能报告变化；
- Executor 默认只读；
- Executor 只有收到完整覆盖文件和精确 `write_approved` 授权时才能机械落盘；
- 重要目标、架构、阶段、Roadmap 和治理变化由用户最终确认。

详细规则先读 `AGENTS.md`，正式机制见 `docs/knowledge/05_上下文与知识系统/KNO-011-上下文运行流转与恢复机制/README.md`。

## 阅读顺序

1. `AGENTS.md`：Context 所有权、写入授权和停止规则；
2. `project-context.md`：项目为什么存在；
3. `architecture-context.md`：当前实现、目标架构和边界；
4. `current-status.md`：当前基线、完成项、未完成项和下一步；
5. `roadmap.md`：阶段顺序与完成门槛；
6. `knowledge-strategy.md`：Git、Registry、Knowledge、Memory、Knowledge Pack 和飞书投影。

## 边界

Context 不保存完整教程、技术方案、历史复盘、动态任务日志或用户 Memory。

详细知识进入 `docs/knowledge/`，实现方案进入 `docs/technical/`，决策进入 `docs/adr/`，系统元数据进入 `platform-registry/`，动态任务状态进入未来 Task Store / Checkpoint。

`current-status.md` 是当前状态的最可信短快照；代码、测试、真实调用证据和受治理 Registry 仍高于文字状态。
