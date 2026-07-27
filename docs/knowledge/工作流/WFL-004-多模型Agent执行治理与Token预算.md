---
asset_id: WFL-004
asset_type: workflow
title: 多模型 Agent 执行治理与 Token 预算
status: proposed
evidence_level: decided
owners:
  - project-owner
created_at: 2026-07-27
updated_at: 2026-07-27
canonical_source: git
canonical_path: docs/knowledge/工作流/WFL-004-多模型Agent执行治理与Token预算.md
related_assets:
  - WFL-002
  - ARC-004
  - ARC-006
  - SKL-001
  - ENG-001
  - EXP-003
tags:
  - agent-workflow
  - token-budget
  - codex
  - deepseek
  - governance
---

# WFL-004 多模型 Agent 执行治理与 Token 预算

## 1. 问题定义

AI 编码和知识工程的成本不只是 API 费用，也包括：

- Token；
- 上下文窗口；
- 用户等待；
- 返工；
- 人工复核；
- 分支冲突；
- 外部系统污染。

强模型能力高，但不应该承担所有机械工作。

弱模型成本低，但不能让它重新设计架构。

脚本稳定，但不能替代语义决策。

因此需要按不确定性分工。

## 2. 市面方案的共同实践

### 2.1 OpenAI Agent 工程：Guardrails 与 Human Intervention

OpenAI 的 Agent 工程指南建议：

- 为已发现风险增加 Guardrails；
- 设置失败阈值；
- 高风险和不可逆动作触发人工介入；
- Agent 无法完成时能够把控制权交还用户。

这与本项目的 Preview、Scope Lock 和外部写入确认一致。

### 2.2 GitHub：Branch Protection 和 CODEOWNERS

GitHub 可以强制：

- Pull Request；
- Required Status Checks；
- Required Reviews；
- CODEOWNERS 审批；
- 禁止 Force Push；
- 线性历史。

说明关键治理不应只写在 Prompt 中，应逐步固化为平台门禁。

### 2.3 Repository Instructions

Codex、GitHub Copilot、Claude Code 和 Cursor 都支持仓库级或路径级持久指令。

共同价值：

- 减少每次重复解释；
- 给出构建和测试命令；
- 限制文件范围；
- 固化项目约束。

共同风险：

- 指令过长；
- 规则冲突；
- 自动生成内容不准确；
- 每次会话都消耗上下文。

因此指令必须最小化，并通过任务 Contract 补充本轮范围。

## 3. 角色分工

### 3.1 Project Owner

负责：

- 决定目标；
- 接受 ADR；
- 批准公开、删除、权限和外部写入；
- 判断哪些失败值得沉淀；
- 接受最终结果。

### 3.2 ChatGPT / Architecture Model

负责：

- 理解需求；
- 调研；
- 问题分类；
- 架构和决策；
- 生成执行合同；
- 审核结果。

不负责：

- 重复批量改名；
- 全仓机械替换；
- 长时间运行命令；
- 未经验证声称完成。

### 3.3 Codex / High-capability Executor

适合：

- 跨模块重构；
- 需要理解代码和测试的任务；
- 复杂迁移；
- 高不确定性 Debug；
- 实现新能力。

使用前提：

- Scope 已锁定；
- 验收明确；
- 有足够 Token；
- 不承担尚未决定的架构。

### 3.4 DeepSeek / Deterministic Executor

适合：

- 新增已经写好的 Markdown；
- 更新 README 导航；
- 按清单更新 YAML；
- 精确路径替换；
- 运行已有脚本；
- 生成 Diff 报告。

不允许：

- 改变 Source of Truth；
- 新建架构层；
- 重写 Skill；
- 扩大 Scope；
- 自行删除、合并或发布；
- 把失败变成“已完成”。

### 3.5 Script / CI

负责：

- YAML / JSON 解析；
- Markdown 链接；
- 路径存在；
- Asset ID；
- Canonical Path；
- Relation；
- Diff；
- 敏感信息；
- Publisher Fixture；
- Read-back 对比。

能由脚本判断的事情，不重复让模型阅读判断。

## 4. 任务路由矩阵

| 任务特征 | 执行者 |
|---|---|
| 目标模糊、需要方案比较 | ChatGPT |
| 架构或 ADR | ChatGPT + Project Owner |
| 多模块复杂实现 | Codex |
| 文件清单和内容已确定 | DeepSeek |
| 格式、路径、链接校验 | Script |
| Commit / Merge | Agent 执行，Owner 授权 |
| 飞书写入 | Publisher，Owner 确认 |
| 删除、权限、公开设置 | Owner 明确授权 |

## 5. 标准执行流程

```text
1. Intake
2. Classify Uncertainty
3. Select Executor
4. Build Context Package
5. Lock Scope
6. Execute
7. Run Deterministic Gates
8. Review Diff
9. Commit and Push
10. External Projection
11. Read-back
12. Capture Knowledge
```

### 5.1 Intake

说明：

- 为什么做；
- 交付物；
- 非目标；
- 当前阶段；
- 风险。

### 5.2 Classify Uncertainty

将任务分为：

```text
Decision
Design
Implementation
Mechanical Change
Validation
External Write
```

一个 Prompt 不应混合全部类型。

### 5.3 Build Context Package

只提供：

- 当前状态；
- 相关 ADR；
- 目标文件；
- 允许范围；
- 禁止范围；
- 验收。

不要提供整个聊天历史和全仓全文。

### 5.4 Scope Lock

必须列出：

```text
Allowed Existing Files
Allowed New Files
Forbidden Files
External Systems
Commit Permission
Push Permission
Publish Permission
```

### 5.5 Execute

执行者不得重新解释项目目标。

遇到决策缺口时停止，不通过“合理猜测”扩大任务。

### 5.6 Deterministic Gates

至少运行：

- `git diff --check`；
- 路径校验；
- Markdown 链接；
- YAML / JSON 解析；
- Asset ID 唯一；
- 相关测试。

### 5.7 Review Diff

只审查本任务 Diff，不重新阅读整个仓库。

### 5.8 Commit Before External Write

正式外部发布必须基于固定 Commit：

```text
Validate
→ Commit
→ Push
→ Publish
```

不允许从未提交工作树生成正式飞书页面。

## 6. Token 预算

Token 预算不是精确计费表，而是执行约束。

### 6.1 建议阶段预算

```text
15% 事实恢复和检索
20% 方案与任务合同
45% 实现
20% 验证、修复和报告
```

验证预算不能被前期漫谈耗尽。

### 6.2 轮次限制

同一任务默认：

- 一次架构确认；
- 一次执行；
- 一次确定性修复；
- 一次最终验收。

出现第二次同类失败时停止，先修 Contract 或工具，不继续堆 Prompt。

### 6.3 强模型使用条件

满足任一条件才使用强模型执行：

- 需要跨模块推理；
- 测试失败原因未知；
- 存在兼容性设计；
- 需要评估多个替代方案；
- 修改影响架构或安全边界。

### 6.4 弱模型使用条件

必须同时满足：

- 目标文件已列出；
- 内容已给出；
- 不需要设计；
- 验收可以由命令判断；
- 不涉及不可逆操作。

## 7. Prompt 作为执行合同

标准 Prompt 结构：

```text
Background
Goal
Source Commit
Allowed Files
New Files
Forbidden Files
Required Content
Exact Transformations
Validation Commands
Stop Conditions
Commit Permission
Push Permission
External Write Permission
Final Report Format
```

避免：

- “顺便优化”；
- “自己判断合理结构”；
- “发现问题全部修复”；
- “确保项目最佳实践”。

这些表达会让弱模型扩大范围。

## 8. 分支与 Worktree 协议

每个 Agent 任务绑定：

```text
Task ID
Base Commit
Branch
Worktree
Owner
Allowed Paths
```

规则：

- 同一知识层不允许两个 Agent 并行修改；
- 开始前检查工作区；
- 发现未说明修改立即停止；
- 不用 Reset 丢弃用户资产；
- Merge 前运行最终 Integrity Gate；
- 提交信息描述真实变更，不使用 `chore: first` 等无语义标题。

## 9. 外部写入门禁

飞书、GitHub 设置、权限和公开操作必须单独授权。

```text
Local Change
≠ Commit Permission

Commit
≠ Push Permission

Push
≠ Feishu Write Permission

Feishu Write
≠ Delete / Permission Permission
```

外部写入必须有：

- Preview；
- 目标；
- 风险；
- 幂等策略；
- 回读；
- 失败停止条件。

## 10. 完成定义

任务状态只允许：

- `Completed`；
- `Partially Completed`；
- `Blocked`；
- `Not Verified`。

`Completed` 必须同时满足：

- 交付物存在；
- Scope 未越界；
- 验证通过；
- Diff 已审查；
- 失败已披露；
- 外部动作与授权一致；
- 正式事实已进入正确位置。

## 11. 当前项目落地顺序

### 第一阶段

让 DeepSeek 完成确定性收尾：

- 加入本理论包；
- 更新 README；
- 更新 Assets；
- 修复已列出的路径和链接；
- 更新 Current Status。

### 第二阶段

增加自动 Integrity Gate。

### 第三阶段

对 `main` 启用：

- PR；
- Required Checks；
- 禁止 Force Push；
- 关键目录 CODEOWNERS。

单人项目的 CODEOWNERS 可以先保留为未来规则，不必马上增加复杂审批。

### 第四阶段

再建设 Chat → Gateway → Executor 自动链路。

在仓库治理稳定前，不扩大自动执行范围。

## 12. 参考资料

- OpenAI: A Practical Guide to Building Agents  
  https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/
- GitHub Protected Branches  
  https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- GitHub CODEOWNERS  
  https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- GitHub Copilot Repository Instructions  
  https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions
- Claude Code Project Memory  
  https://code.claude.com/docs/en/memory
- Cursor Rules  
  https://docs.cursor.com/context/rules
- Codex AGENTS.md  
  https://github.com/openai/codex/blob/main/docs/agents_md.md
- On the Impact of AGENTS.md Files on the Efficiency of AI Coding Agents  
  https://arxiv.org/abs/2601.20404
- Evaluating AGENTS.md: Are Repository-Level Context Files Helpful  
  https://arxiv.org/abs/2602.11988
