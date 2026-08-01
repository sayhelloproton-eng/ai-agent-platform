# ARC-008 ai-agent-platform DDD 领域蓝图

## 1. 文档定位

把平台长期能力划分为 Bounded Context，说明领域模型、状态所有权和集成方式。蓝图用于控制复杂度，不代表所有 Context 已拆成服务。


## 正式视觉资产

![DDD Bounded Context 蓝图](asset://04_平台架构/ARC-008-ai-agent-platform-DDD领域蓝图/VIS-003-DDD领域蓝图.png)

- Visual Asset ID：`VIS-003`；
- SVG 源文件：`knowledge-assets:images/04_平台架构/ARC-008-ai-agent-platform-DDD领域蓝图/VIS-003-DDD领域蓝图.svg`；
- PNG 预览：`knowledge-assets:images/04_平台架构/ARC-008-ai-agent-platform-DDD领域蓝图/VIS-003-DDD领域蓝图.png`；
- 事实边界：Context 表示规则与状态所有权，不表示当前已经拆成独立服务。

## 2. Bounded Context

核心上下文包括 Task Control、Agent Governance、Execution、Knowledge Asset、Publishing、Engineering Insight、Product Domain 与 Infrastructure Adapter。

## 3. 核心领域

可信任务控制拥有 Task、Version、Capability、Policy、Approval、Executor Assignment、Evidence、Side-effect、Health 与 Recovery。

## 4. 职责边界

Knowledge 管理正式资产；Publishing 管理派生发布；Product Domain 管理 AI 视频等业务；Infrastructure Adapter 封装 Git、Codex、MCP、Tunnel、模型和存储。

## 5. 集成

Context 通过 Command、Event、Query、Port 和 Registry Reference 交流，不共享 Provider 内部对象。

## 6. 当前实现边界

现有代码形成 Contracts、Auth、Policy、Gateway 与 Runtime 最小边界；知识、Registry 和 Publisher 主要由文档与 Skill 承载。

## 7. 目标设计边界

先以模块化单体和稳定 Contract 验证边界，再根据真实扩展和部署压力决定是否拆服务。

## 8. 设计原则

- 边界由规则和状态决定，不由 Agent 名称决定
- Domain 不依赖模型或 Provider
- 先模块化验证再拆分
- 平台只抽取已证明可复用机制
- 当前与目标分开

## 9. 关联文档

- [THY-004 DDD 与 Agent 系统边界建模](../03_架构思想与理论/THY-004-DDD与Agent系统边界建模.md)
- [PRD-007 平台与上层产品边界](../01_产品体系/PRD-007-平台与上层产品边界.md)
- [ARC-001 历史平台目标架构](ARC-001-ai-agent-platform总体架构.md)
