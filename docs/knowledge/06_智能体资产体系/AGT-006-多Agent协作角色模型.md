# AGT-006 多Agent协作角色模型

## 1. 文档定位

本文定义多个专业 Agent 围绕同一目标协作时的角色、合同、通信和汇合模型。多 Agent 的价值来自职责分离与并行，不来自增加模型数量。

## 2. 协作模式

支持顺序流水线、并行独立任务、Reviewer 模式、专家咨询和人工升级。每种模式必须明确 Task Owner、输入版本、输出 Contract、依赖和汇合节点。

## 3. 通信

Agent 通过 Task、Result、Checkpoint、Evidence 和 Decision Request 交流，不直接依赖彼此的隐藏对话历史。消息引用稳定资产与 Commit，大型内容使用路径或对象引用。

## 4. 冲突与汇合

Integration Task 检查版本、路径冲突、Contract 变化和证据有效性。观点冲突由显式 Decision 解决；不能让最后一个 Agent 的输出自动覆盖其他结论。

## 5. 自治边界

Agent 可以在授权范围内拆分低风险子任务，但不能自行增加角色、工具权限、预算或外部副作用。循环调用必须有最大步数、Token 和时间预算。

## 6. 当前实现边界

当前协作由 Chat、Codex / DeepSeek、脚本和 Project Owner 手工编排；没有自动 Agent Registry、Message Bus、Integration Task 或循环控制。

## 7. 目标设计边界

目标先实现 Task Contract、Execution Lane、Checkpoint 和 Reviewer 角色，再验证有限的并行协作。复杂自主网络不作为当前 MVP。

## 8. 设计原则

- 先证明单 Agent 流程，再增加协作。
- Agent 通过显式 Contract 交流。
- 并行任务必须有隔离和汇合方案。
- 冲突需要 Decision，不使用最后写入获胜。
- 循环受步数、预算和人工升级控制。

## 9. 关联文档

- [ARC-007 多窗口多角色多任务并行架构](../04_平台架构/ARC-016-能力依赖多任务并行与分阶段MVP路线图/README.md)
- [ARC-009 轻量Task-Control架构](../04_平台架构/ARC-001-ai-agent-platform总体架构/README.md)
- [ARC-010 Execution-Lane执行通道模型](../04_平台架构/ARC-001-ai-agent-platform总体架构/README.md)
- [AGT-001 Agent角色体系](AGT-001-Agent角色体系.md)
- [WFL-005 多角色任务合同](../07_工作流与项目治理/WFL-005-多角色任务合同.md)
- [WFL-006 规划实现测试复审与集成](../07_工作流与项目治理/WFL-006-规划实现测试复审与集成.md)
