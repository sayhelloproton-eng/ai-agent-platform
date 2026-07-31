# PRD-003 ai-agent-platform 产品定义
> **资产状态**：本文正文已在 Batch 02 交付包中完成内容 Review；进入仓库后先标记为 `partial / unpublished`，待真实 Commit 整体复审通过后再升级为 `accepted`。

> `ai-agent-platform` 是面向个人 Agent 工程师的工程协作与能力资产平台：它用稳定 Contract、受控 Runtime、知识真源和证据治理，把分散的 Chat、专业 Agent、Codex、Skills 与本地工具组织成可持续推进的工作系统。

## 1. 产品类别

它不是一个面向终端消费者的聊天机器人，而是一个“个人 Agent Engineering Platform”。近期以仓库、Custom GPT Action 和本地 Runtime 为主要形态；中期增加 Task Control、Agent 资产和多执行器；远期才评估更完整的 UI、服务化和团队能力。

## 2. 目标用户

第一目标用户是有软件工程经验、希望通过真实项目转向 Agent / 全栈 Agent 工程的个人开发者。其特征是：

- 同时使用 ChatGPT、Codex、Git、IDE、本地工具和知识平台；
- 需要节省 API Token 和重复上下文；
- 需要保留人工审批；
- 需要把过程变成可解释、可验证的 Portfolio；
- 设备和预算有限，不能依赖重型基础设施。

未来可扩展到小型多 Agent 项目，但当前不为未知组织场景提前设计完整 SaaS。

## 3. 用户核心 Jobs

1. **恢复项目**：新 Agent 能快速知道当前事实、规则和下一步；
2. **形成任务**：把自然语言目标转成有约束、有验收的 Task Contract；
3. **安全执行**：让 Codex、Work 或 Skill 在明确权限和环境中执行；
4. **处理中断**：任务可以暂停、快照、移交、恢复或安全终止；
5. **沉淀资产**：把决策、知识、代码、测试、Agent 配置和产物放入可追踪结构；
6. **证明能力**：用真实 Demo、问题解决过程和证据形成求职材料。

## 4. 核心能力域

| 能力域 | 当前 | 下一步 |
| --- | --- | --- |
| Context & Knowledge | Git 真源、Context、四层文档、AI Knowledge Skill | Registry、影响分析、Knowledge Pack |
| Contracts & Security | Task/Result/Error、Auth、双层 Policy | 动态身份、Scope、expected\_version |
| Gateway & Runtime | 安全窄链路、两个 Capability、限流/并发 | Task State、队列/重试边界、执行适配 |
| Agent Assets | Custom GPT + Actions Skill | Agent Profile、评估、Release |
| Execution Governance | 本地调用和测试 | Execution Lane、Worktree、Approval、Evidence、Recovery |
| Product Validation | 项目和知识成果 | AI 视频工作流纵向切片和 Demo |

## 5. 价值主张

与直接使用 ChatGPT + Codex 相比，平台新增的是“可靠性和资产化”：

- 不靠单一会话保存任务事实；
- 不让模型直接设置数据库状态；
- 不让外部副作用缺少审批；
- 不让文档和代码长期脱节；
- 不让专业 GPT 的配置只存在 Builder 页面；
- 不让作品集只剩宣传描述。

## 6. 产品输入与输出

### 输入

目标、约束、仓库上下文、知识引用、Task、Agent Profile、Skill、用户审批和外部事件。

### 输出

TaskResult、Artifact、Diff、Commit/PR、测试证据、Approval Record、Snapshot、Knowledge Draft、ADR、Demo 和 Portfolio Evidence。

## 7. 产品边界

平台拥有共性机制：Task、身份、权限、状态、执行通道、证据、恢复、知识和资产关系。上层产品拥有业务领域模型、用户体验、业务数据和专属评估。模型、网络入口、代码平台和知识平台通过 Adapter 接入，始终可替换。

## 8. 非功能要求

- 默认拒绝和最小权限；
- 可读、可测试、可回滚；
- 失败快速、错误结构化；
- 不把 Secret、完整私人上下文和高风险数据写入公共仓库；
- Token 和资源使用可观测；
- 当前设备上可运行；
- 文档与实现状态可追踪；
- 不依赖单一 Provider 或公网入口。

## 9. 产品成熟度判断

产品从“仓库工程”升级为“可用平台”至少需要：Task 持久状态、执行器适配、Approval/Evidence、恢复闭环和一个真实业务纵向切片。当前已经完成知识基础和安全 Action 链路，但仍处于平台 MVP 早期。

## 10. 关联文章

用户价值见 `PRD-004`；能力路线见 `PRD-005`；AI 视频上层产品见 `PRD-006`；平台边界见 `PRD-007`；当前事实见 `CTX-005`。
