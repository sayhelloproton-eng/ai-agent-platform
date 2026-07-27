# WFL-004 多模型 Agent 执行治理与 Token 预算

## 一句话结论

不再让一个高级模型同时负责想方案、改文件、跑命令、修格式和写报告。

```text
Project Owner  决定目标和授权
ChatGPT        调研、设计、拆任务、Review
Codex          处理高不确定性工程任务
DeepSeek       执行已经写清楚的机械修改
Script / CI    做确定性校验
```

模型不是按品牌分工，而是按任务的不确定性、风险和验证方式分工。

## 1. 为什么会有这篇文档

知识系统初始化过程中，Codex 额度很快耗尽。

真正消耗 Token 的不只是代码实现，还包括：

- 每个新会话重新解释项目；
- 在模型还没确定前就开始迁移；
- 一个 Prompt 同时包含架构、改名、发布和验证；
- 修改后反复让强模型扫描整个仓库；
- 简单路径替换也让高级模型完成；
- API 告警后重复分析和 Preview；
- 执行报告过长，下一轮又要重新阅读。

最终出现了一个现实问题：

> 架构还需要强模型判断，但强模型额度已经被机械劳动消耗完，只能换成能力较弱的执行模型。

因此，Token 不能只被看成套餐额度，而应该被当成工程资源管理。

## 2. 项目中模型失配的具体表现

### 2.1 强模型做了大量确定性劳动

例如：

- 文件改中文名；
- 更新 YAML 路径；
- 调整 README 导航；
- 扫描图片和 Mermaid；
- 统计页面数量；
- 运行已有校验脚本。

这些任务不需要高级推理，只需要范围明确和验证可靠。

### 2.2 弱模型被要求判断架构

当 Codex 不可用后，DeepSeek / OpenCode 需要接手。

如果只说“修复项目问题”，弱模型可能：

- 把旧状态当真实状态；
- 扩大修改范围；
- 自己设计新的规则；
- 把未验证事项写成完成；
- 删除仍有价值的资产。

弱模型不是不能用，而是不能把“尚未决定的问题”交给它决定。

### 2.3 同一个任务混合六种工作

知识库任务实际混合了：

```text
事实恢复
架构决策
文件迁移
规则实现
外部发布
结果复盘
```

任何一部分变化，后面的工作都要重来。

## 3. 市面上的成熟思路

### 3.1 OpenAI：先从简单系统开始，再按复杂度增加 Agent

OpenAI 的 Agent 工程指南建议：

- 模型、工具和指令是基本组成；
- 清晰指令能够降低歧义；
- 先从单 Agent 和简单编排开始；
- 失败达到阈值时交还给人；
- 高风险、不可逆动作需要人工介入；
- Guardrails 应根据真实失败逐步增加。

对本项目的启发是：

> 不要因为有多个模型，就一开始建设复杂多 Agent 网络；先把任务合同和停止条件做好。

### 3.2 GitHub Copilot：把长期规则放进仓库

GitHub 支持仓库级和路径级自定义指令，也支持 `AGENTS.md`。

它解决的是“每次都重新解释项目”的问题。

但规则文件不能代替本轮任务说明：

- 长期规则回答“这个仓库一直怎么工作”；
- Task Contract 回答“这一次具体做什么”。

### 3.3 Claude Code：项目记忆应具体、分层并定期更新

Claude Code 的项目内存用于保存架构、编码标准和常用工作流。

官方建议内容要具体，并且随项目变化定期审查。

这正好对应本项目发生的 Context Drift：

> 持久化上下文本身也会过期，必须进入任务关闭流程。

### 3.4 确定性检查应交给程序

模型可以理解含义，但不应该反复人工判断：

- 路径是否存在；
- YAML 能否解析；
- Asset ID 是否重复；
- Markdown 链接是否失效；
- Frontmatter 是否进入正文；
- 发布页面数量是否正确。

这些问题应该由脚本和 CI 给出明确结果。

## 4. 本项目的最终分工

### 4.1 Project Owner

负责：

- 确定真正目标；
- 接受或拒绝架构决策；
- 批准删除、公开、权限、Commit、Push 和飞书写入；
- 判断项目是否进入下一阶段；
- 对最终结果负责。

### 4.2 ChatGPT

负责：

- 理解用户真正要解决的问题；
- 从聊天、仓库和调研中恢复事实；
- 比较市面方案；
- 形成架构和方法论；
- 把任务拆成可执行合同；
- Review Diff 和执行报告；
- 把失败沉淀成知识。

不负责长期机械执行。

### 4.3 Codex

适合：

- 跨模块实现；
- 复杂重构；
- 原因未知的测试失败；
- 需要理解代码后连续修改；
- 需要在本地运行、验证、修复的工程任务。

使用 Codex 前必须先锁定：

- 目标；
- 影响范围；
- 已确定决策；
- 验收方式；
- Token 预算。

### 4.4 DeepSeek / OpenCode

适合：

- 内容已经写好的 Markdown 落盘；
- 精确路径替换；
- 更新 README 导航；
- 按清单更新 YAML；
- 运行现有命令；
- 输出 Diff 和验证报告。

不允许自行：

- 改 Source of Truth；
- 新增架构层；
- 修改 Skill 合同；
- 扩大 Scope；
- 删除分支、发布飞书或修改权限；
- 把失败写成完成。

### 4.5 Script / CI

负责：

- YAML / JSON 解析；
- 路径存在性；
- Markdown 链接；
- Asset ID 唯一性；
- Canonical Path；
- 敏感信息；
- `git diff --check`；
- Skill 测试；
- Publisher Fixture；
- 发布回读对比。

原则：

> 能被程序明确判断的事情，不重复消耗模型上下文。

## 5. 任务如何分级

### A 类：需要决策

特征：

- 目标还不明确；
- 存在多个架构方案；
- 会改变项目边界；
- 影响安全、公开或权限。

流程：

```text
ChatGPT 调研和比较
→ Project Owner 决策
→ 形成 ADR / Task Contract
```

### B 类：高不确定性实现

特征：

- 多模块修改；
- 测试失败原因未知；
- 需要边实现边验证；
- 可能需要重构。

执行者：Codex。

### C 类：确定性修改

特征：

- 目标文件已列出；
- 新内容已经给出；
- 不需要重新设计；
- 验收可以通过命令判断。

执行者：DeepSeek / OpenCode。

### D 类：确定性验证

特征：

- 输入和预期明确；
- 可以输出成功或失败；
- 不需要语义判断。

执行者：Script / CI。

### E 类：不可逆或外部写入

包括：

- Commit；
- Push；
- Merge；
- 删除分支；
- 飞书发布；
- 清空知识库；
- 修改权限和公开状态。

要求：Project Owner 单独授权。

## 6. Task Contract：让 Agent 只做这次该做的事

每个执行任务至少包含：

```text
Background
Goal
Source Commit
Allowed Existing Files
Allowed New Files
Forbidden Files
Exact Changes
Validation Commands
Stop Conditions
Commit Permission
Push Permission
External Write Permission
Final Report Format
```

### 模糊任务示例

```text
修复知识库的问题，顺便优化结构。
```

这会让 Agent 自己决定什么叫问题、什么叫优化。

### 可执行任务示例

```text
目标：
把给定的 5 篇 Markdown 写入固定路径。

允许：
5 个目标文件、4 个目录 README、assets.yaml。

禁止：
skills/**、knowledge.config.yaml、context/**、飞书 API。

验收：
YAML 可解析、Asset ID 唯一、链接有效、git diff --check。

停止：
发现目标路径与当前仓库不一致时停止并报告。
```

## 7. Token 预算如何控制

Token 预算不是精确计费，而是防止任务前半段把后半段资源耗尽。

建议分配：

```text
15% 事实恢复
20% 方案和任务合同
45% 实现
20% 验证、修复和报告
```

规则：

- 事实没有确认，不进入实现；
- 架构没有决定，不让执行 Agent 猜；
- 同类失败出现第二次，停止堆 Prompt；
- 先修合同、测试或工具，再继续；
- Review 只看本任务 Diff，不重新分析整个项目；
- 机械修改优先脚本或弱模型；
- 强模型额度为未知问题保留。

## 8. 标准执行流程

```text
1. Owner 提出目标
2. ChatGPT 恢复事实
3. 判断任务类型和风险
4. Owner 确认关键决策
5. 生成 Task Contract
6. 选择执行者
7. 执行范围内修改
8. Script 运行确定性校验
9. ChatGPT Review Diff
10. Owner 授权 Commit / Push
11. Owner 授权外部发布
12. 回读验证
13. 更新 Current Status
14. 沉淀值得复用的经验
```

## 9. 停止条件

出现以下情况，执行 Agent 必须停止：

- 仓库状态和 Task Contract 不一致；
- 目标文件不存在且未授权创建替代路径；
- 需要做新的架构决策；
- 发现任务外未说明修改；
- 确定性校验失败且原因未知；
- 需要执行未授权外部动作；
- Token 不足以完成验证；
- 同一错误修复一次后仍失败。

停止不是失败。

在边界不清时继续执行，才是更大的失败。

## 10. 完成定义

任务只能标记为：

- `Completed`；
- `Partially Completed`；
- `Blocked`；
- `Not Verified`。

`Completed` 必须同时满足：

- 交付物存在；
- 未修改禁止范围；
- 测试通过；
- Diff 已审查；
- 失败和告警已披露；
- 外部动作符合授权；
- 状态文件已经检查；
- 结果可以从 Git 恢复。

## 11. 从这次实践抽象出的理论

### 11.1 模型能力应匹配任务不确定性

不是越强的模型越应该多用。

强模型最有价值的地方是降低未知，而不是完成已知的复制粘贴。

### 11.2 Agent 的可靠性来自边界

Agent 越能行动，越需要：

- 范围；
- 停止条件；
- 权限；
- 验收；
- 人工接管。

### 11.3 Token 是系统资源

重复解释、无效扫描和返工，与浪费 CPU、内存一样，都是架构问题。

### 11.4 多模型不是目标

如果一个 Agent 加脚本就能稳定完成任务，不要为了“多 Agent”增加编排。

只有任务确实存在不同能力、权限或上下文边界时，才分配多个执行者。

## 12. 当前项目的落地顺序

1. 先修仓库 Context Drift、路径和链接；
2. 建立 Integrity Gate；
3. 固化 Task Contract 模板；
4. 使用 DeepSeek 完成确定性文档收尾；
5. 将 Codex 额度保留给 Gateway 和 Runtime 实现；
6. 仓库治理稳定后，再扩展 Chat → Gateway → Executor 自动链路。

## 13. 参考资料

- OpenAI: A Practical Guide to Building Agents  
  https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/
- GitHub Copilot Repository Instructions  
  https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions
- GitHub Copilot CLI Custom Instructions  
  https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions
- Anthropic Claude Code Memory  
  https://docs.anthropic.com/zh-CN/docs/claude-code/memory
