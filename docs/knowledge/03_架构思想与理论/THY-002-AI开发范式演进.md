# THY-002 AI 开发范式演进

## 1. 这不是唯一历史顺序

AI 开发范式可以按系统承担的工程责任理解，而不是按产品发布时间排列。

一个项目可以停在任何足够有效的层级，也可以同时使用多个层级。

## 2. 工程复杂度阶梯

```text
代码补全
→ 对话辅助
→ Coding Agent
→ Tool-connected Agent
→ Workflow / Task Control
→ Agent Platform
```

## 3. 代码补全

### 能力

根据当前文件或光标附近上下文生成代码。

### 状态

主要由 IDE 和开发者保存。

### 风险

- 局部正确但整体不一致；
-缺少测试；
-不了解业务约束。

### 验证

开发者 Review、编译和测试。

适合高频、低风险、局部任务。

## 4. 对话辅助

### 能力

解释、设计、调研、生成较大代码片段。

### 状态

保存在聊天和用户提供的上下文中。

### 新风险

- 长上下文漂移；
-聊天结论未进入 Git；
-无法证明真实执行。

### 验证

将结论落入文件、ADR、代码和测试。

## 5. Coding Agent

### 能力

读取仓库、修改多文件、运行命令和测试。

### 状态

由 Session、工作区和 Git 共同承载。

### 新风险

-越界修改；
-错误命令；
-环境污染；
-完成报告与真实 Diff 不一致。

### 验证

固定 SHA、Scope Lock、测试、Diff、Commit 和回读。

## 6. Tool-connected Agent

### 能力

通过 Actions、MCP、API 或 Computer Use 操作外部系统。

### 新风险

-身份和权限；
-不可信外部内容；
-副作用；
-数据发送；
-工具返回伪造或过时。

### 验证

真实用户路径、后端 Policy、认证、审计和人工确认。

## 7. Workflow 与 Task Control

### 能力

管理多步骤、依赖、版本、状态、重试和交接。

### 状态

从 Session 中独立出来，进入 Task Store。

### 新风险

-状态竞争；
-重复执行；
-补偿失败；
-审批版本过期；
-证据与任务不一致。

### 验证

幂等、状态机测试、Expected Version、事件和恢复演练。

## 8. Agent Platform

### 能力

支持多入口、多角色、多执行器、多产品和共享治理。

### 新风险

-抽象过早；
-平台吞并产品；
-权限和成本失控；
-Registry 与实现漂移；
-复杂度超过真实需求。

### 验证

多个真实产品调用、稳定 Contract、隔离、Evals、治理和运营指标。

## 9. 何时不升级

不应因为“更先进”而升级复杂度。

继续使用较简单方案的条件：

- 规则稳定且确定；
-脚本更可靠；
-任务频率低；
-错误影响高且无法充分控制；
-没有真实多 Agent 需求；
-没有状态持久化价值；
-Review 成本高于收益。

## 10. 演进驱动力

真正推动升级的是：

- 不确定性；
-工具数量；
-任务长度；
-并行需求；
-副作用；
-恢复需求；
-跨产品复用；
-治理要求。

## 11. 本项目演进

```text
Chat 规划
→ Codex 仓库执行
→ Git / Feishu 知识治理
→ Custom GPT Action MVP
→ Gateway / Runtime
→ Platform Registry
→ 下一步 Task Control
```

该路径不是预先设计出的完美路线，而是由真实问题逐步抽象。

## 12. 关联文档

- [THY-001 从 AI 工具到 Agent 工程平台](./THY-001-从AI工具到Agent工程平台.md)
- [THY-003 Agent + Skills 开发范式](./THY-003-Agent与Skills开发范式.md)
- [THY-005 可信 Agent 系统基本原则](./THY-005-可信Agent系统基本原则.md)
- [PRD-005 平台能力地图与产品成熟度](../01_产品体系/PRD-005-平台能力地图与产品成熟度/README.md)

## 13. 参考

- [OpenAI：A practical guide to building agents](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/)
