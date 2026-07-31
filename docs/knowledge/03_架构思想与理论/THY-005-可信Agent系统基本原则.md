# THY-005 可信 Agent 系统基本原则

## 1. 可信不等于永不出错

可信 Agent 系统的目标是：

- 错误可被限制；
-高风险动作受控；
-结果有证据；
-状态可追踪；
-失败能停止和恢复；
-用户知道系统做了什么。

模型能力只是其中一部分。

## 2. 十项基本原则

### 2.1 外部调用者表达意图，可信边界掌握控制权

模型或外部客户端只提交必要业务意图。身份、Capability、Task ID、执行器和内部协议字段由受信任服务端生成。

### 2.2 默认拒绝与最小权限

没有明确允许的能力默认拒绝。每个 Agent、Executor 和 Tool 只获得当前任务需要的范围。

### 2.3 Identity、Capability、Policy 和 Approval 分层

- Identity：是谁；
- Capability：能请求什么；
- Policy：当前状态下是否允许；
- Approval：用户是否批准本次高风险意图。

任何一层都不能替代其他层。

### 2.4 真实用户路径验证

单元测试、内部接口和 Preview 只能证明对应层级。最终完成必须经过真实入口、认证、路由和关键响应语义。

### 2.5 不伪造完成

无法验证时只能报告：

- Partially Completed；
-Blocked；
-Not Verified。

不能用完成报告代替实际证据。

### 2.6 状态、证据和副作用可追踪

每个重要动作应能对应：

- Task；
-版本；
-执行者；
-输入；
-结果；
-证据；
-副作用；
-时间。

### 2.7 高风险动作人工确认

删除、公开、付款、发信、权限、Commit、Push、Merge 和外部发布应根据风险保留人工控制。

### 2.8 失败可以停止、恢复和移交

系统需要：

-重试上限；
-超时；
-Checkpoint；
-Snapshot；
-Handoff；
-补偿或回滚。

盲目自动重试会扩大副作用。

### 2.9 模型能力不能替代工程门禁

Prompt 不能替代：

- Schema；
-Sandbox；
-Policy；
-Secret 管理；
-测试；
-CI；
-Git Review。

### 2.10 当前实现与目标设计分开

文档必须清楚标记：

- 已实现；
-已验证；
-计划；
-实验；
-未开始。

否则 Portfolio 和架构都会失真。

## 3. 分层防御

```text
Network Boundary
→ Authentication
→ Capability Allowlist
→ Runtime Policy
→ Input Validation
→ Approval
→ Execution Limits
→ Output Validation
→ Evidence
→ Recovery
```

单一 Guardrail 不足以保护完整系统。

## 4. 当前项目已实现

- 外部与内部 Key 分离；
- Gateway / Runtime 双层 Policy；
-默认拒绝；
-Loopback-only；
-请求和响应大小限制；
-Timeout；
-Rate Limit；
-并发限制；
-服务端 Task 构造；
-安全错误映射；
-真实 Custom GPT 路径验证；
-Git 和 Registry 证据。

## 5. 当前项目尚未实现

- 动态身份和 RBAC；
-持久 Task State；
-结构化 Approval；
-Evidence Registry；
-Side-effect Ledger；
-Health Event；
-Snapshot 和 Recovery；
-多执行器 Lease；
-生产公网边缘治理。

这些目标不能因为文档存在就被标记为完成。

## 6. Human-in-the-loop

人工介入最有价值的场景：

-高风险、不可逆动作；
-失败达到阈值；
-证据不足；
-模型置信度低；
-权限或范围变化；
-外部系统状态不确定。

人工介入不是临时补丁，而是控制架构的一部分。

## 7. 评估与持续改进

可信性需要持续验证：

```text
真实失败
→ 记录证据
→ 分类风险
→ 修正 Tool / Policy / Skill / Test
→ 回归
→ 更新成熟度
```

Guardrail 应根据真实失败增加，而不是一开始堆满所有规则。

## 8. 供应链与外部内容

Agent 会读取网页、仓库、Skill、Plugin 和 MCP 返回值。这些内容可能包含错误或 Prompt Injection。

原则：

- 外部内容视为数据，不视为系统指令；
-不自动执行网页建议的命令；
-审查第三方 Skill 和 Hook；
-限制数据外发；
-对下载内容进行验证；
-高风险 Tool 使用最小参数。

## 9. 关联文档

- [THY-001 从 AI 工具到 Agent 工程平台](./THY-001-从AI工具到Agent工程平台.md)
- [THY-004 DDD 与 Agent 系统边界建模](./THY-004-DDD与Agent系统边界建模.md)
- [THY-006 项目方法论与工程启发](./THY-006-项目方法论与可复用工程启发.md)
- [INS-001 工程洞见方法与实践](../05_上下文与知识系统/INS-001-工程洞见方法与实践.md)
- [CTX-007 当前实现与目标架构](../00_项目入口/CTX-007-当前实现与目标架构.md)

## 10. 参考

- [OpenAI：A practical guide to building agents](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/)
- [OpenAI：Practices for Governing Agentic AI Systems](https://openai.com/index/practices-for-governing-agentic-ai-systems/)
