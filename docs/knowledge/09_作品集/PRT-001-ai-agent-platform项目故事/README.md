# PRT-001 ai-agent-platform 项目故事与价值主线

> 一句话介绍：`ai-agent-platform` 是一个用真实代码、知识资产、工作流和实验建立“可理解、可执行、可验证、可恢复”的个人 AI Agent 工程平台。

## 1. 为什么开始

项目最初不是为了再做一个聊天界面，而是解决一个长期问题：

> AI 每次进入工程任务时，怎样理解同一个项目、遵守同一套边界、在本机和外部系统中安全执行，并把结果变成下次可复用的正式资产？

普通对话可以给出建议，但真实工程需要：

- 稳定目标和架构；
- 可恢复的上下文；
- 明确 Task 和权限；
- 真实工具与本机执行；
- 测试、Evidence 和副作用回读；
- Git 中可版本化的知识；
- 可向人解释的项目成果。

## 2. 项目如何收敛

### 2.1 先确定要建设什么

平台架构把系统拆成用户入口、Task Control、执行编排、上下文与知识、Agent 与 Skill、Evidence 与安全、发布与 Registry，以及上层产品领域。

架构不以某个模型或工具为中心，Provider 可以替换，Contract、状态和安全边界保持稳定。

### 2.2 用上下文系统保证目标不漂移

Git 成为唯一真源；Context、正式知识、Registry、Knowledge Pack 和 Feishu Projection 各自承担不同职责。

长期知识不等于 Task State，Memory 不等于事实，Session 不等于 Task。

### 2.3 用工作流把能力串成执行线

目标进入后，依次经过事实恢复、决策、Task Contract、执行、验证、Review、审批、集成、发布、回读和基线治理。

Planner、Executor、Reviewer 和 Approver 的责任被分开，冻结 Artifact 让机械落库不再依赖执行器重新理解整个项目。

### 2.4 用实验证明，而不是只画架构

项目完成了：

- 公开飞书 Wiki 读取和递归导出实验；
- Custom GPT → Dev Tunnels → Gateway → Runtime 的真实窄链路；
- Gateway / Runtime 双层认证和 Policy 测试；
- Engineering Insight Skill 首轮评测；
- 长上下文、冻结交付、失败恢复和任务快照复盘。

实验结果同时记录限制，避免把最小链路包装成完整平台。

## 3. 当前已经形成的成果

### 可运行代码

- Contracts、Auth 和 Policy 共享包；
- Action Gateway；
- Local Runtime；
- Microsoft Dev Tunnels 应用；
- 本地链路、Workspace 和整仓验证。

### 工程治理

- Git 唯一真源；
- Platform Registry；
- Document Bundle 和视觉语义镜像；
- 六个活跃 Skill；
- `AGT-001/002/003/005/007/008` 六篇智能体资产 Canonical 文档与 `VIS-035` 总体架构图，形成并接受了智能体资产模型；相关运行资产尚未物化；
- Planner–Executor Handoff；
- 冻结 ZIP、Manifest、Hash、Scope、单 Commit 和远端回读。

### 正式知识

- 产品、能力、方法论、平台架构、上下文与知识、智能体、工作流、实验和作品集目录；
- 架构图、实验图和可追踪关系；
- Superseded、Migration 和 Archive。

## 4. 项目的差异化

这个项目的重点不是“用了多少 AI 工具”，而是：

1. **把 AI 执行当成受治理系统**：默认拒绝、最小 Capability、双层 Policy、明确审批和回读。
2. **把知识当成工程资产**：单一真源、稳定 ID、生命周期、关系和派生投影。
3. **把失败变成系统变化**：错误进入 Experiment、Retrospective、Workflow、Skill 或检查脚本。
4. **把当前实现和目标设计分开**：不把宿主能力、架构占位或计划写成平台已实现。
5. **面向真实产品验证**：后续使用 AI 视频工作流检验通用 Task、Context、Capability 和 Evidence 是否可复用。

## 5. 当前事实边界

### 已实现并测试

- Contracts、Auth、Policy、Gateway、Runtime 与仓库验证；
- 知识治理、Registry、Document Bundle 与六个活跃 Skill。

### 真实链路已验证

- Custom GPT Actions 最小可信链路；
- Gateway / Runtime / Dev Tunnels；
- 冻结交付、完整校验和安全续跑。

### 正式设计已接受

- Role、Agent Profile、Knowledge Pack、Skill / Capability / Tool / Permission / Policy、Eval、Host Release 与 Catalog 的智能体资产模型；
- 正式设计已接受，但 `agents/**`、`knowledge-packs/**`、released 专业 Agent 和完整 Agent Runtime 尚未物化。

### 计划中

- 正式 `agents/**`、Role / Agent Profile Schema 和 released 专业 Agent；
- 正式 `knowledge-packs/**`；
- 完整 Agent Runtime；
- 动态 Task Store 和持久 Execution；
- Approval / Evidence / Side-effect Ledger；
- 自动多执行器调度；
- Knowledge Pack / Agent Profile 自动 Publisher；
- AI 视频业务 Demo；
- 生产公网和正式 Portfolio Release。

这些未物化项不影响项目已经形成正式资产模型和清晰实现路线，但不得被描述为已验证运行能力。

## 6. 适合展示的能力

- Agent 系统架构与边界设计；
- Node.js 全栈服务和安全链路；
- Contracts、Policy、测试和故障处理；
- AI 编码工作流和多角色协作；
- Docs-as-Code、知识治理和投影；
- 从失败到流程、Skill 和检查器的持续改进。

## 7. 关联资产

- [ARC-001 ai-agent-platform 总体架构与执行路径](../../04_平台架构/ARC-001-ai-agent-platform总体架构/README.md)
- [ARC-002 上下文与知识系统总体架构](../../05_上下文与知识系统/ARC-002-上下文与知识系统总体架构/README.md)
- [WFL-001 工作流与项目治理总体模型](../../07_工作流与项目治理/WFL-001-工作流与项目治理总体模型/README.md)
- [PRT-006 项目成果与证据索引](../PRT-006-项目成果索引/README.md)
