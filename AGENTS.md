# AI Agent Platform Project Constitution

> 本文件是 `ai-agent-platform` 中人类协作者、ChatGPT、Codex 和其他 Agent 共同遵守的最高项目级规则。详细操作规范由下层 `AGENTS.md` 和 `docs/governance/` 细化，但不得推翻本宪法。

## 1. 项目定位

`ai-agent-platform` 是面向个人学习、工程实践和求职 Portfolio 的 AI Agent 工程平台。

项目长期建设：

- 以 ChatGPT / Chat 为交互和决策入口；
- 以 Task、Agent、Capability、Workflow、Knowledge、Result 为核心领域；
- 通过 Gateway、Application Service、Port 和 Adapter 接入模型、工具、知识库、代码平台和存储；
- 让模型、设备、Tool、Provider 和业务工作流可替换；
- 形成真实可运行能力、可解释工程证据和可展示业务成果。

本项目不是：

- 单纯的飞书知识库或 Feishu CLI 包装器；
- 单纯的 ChatGPT → Codex 转发器；
- 只有架构图、没有真实实现的概念项目；
- 当前六个月内一次性实现完整通用 Agent SaaS。

## 2. 六个月优先级

### Phase 1：Knowledge Foundation

完成 Git + Feishu + AI Knowledge Skill：项目知识、索引、受控投影、回读验收和 Drift 检测。

### Phase 2：AI Coding Workflow

完成 ChatGPT → Task → Codex → Git：Task Contract、Gateway / Bridge、执行、测试、Result、Branch / Commit / PR 和知识回写。

### Phase 3：AI Video Workflow

以 AI 视频工作流验证真实复杂业务：文本处理、故事分析、人物场景、分镜提示词、模型适配、评估重试、成本记录和 Demo。

长期总体架构必须保留。MVP 只决定优先级和验证范围，不代表删除未来能力：

- `Now`：当前阶段实现；
- `Next`：六个月内后续实现；
- `Later`：保留边界，暂不实现。

不得因暂不实现而删除长期能力，也不得提前创建没有调用方、测试和真实用途的大量空模块。

## 3. 核心架构原则

- 业务与模型解耦；
- 业务与设备解耦；
- Domain 与 Provider 解耦；
- 上层依赖 Port、Contract 和稳定接口；
- 模型、Tool、Provider 和设备可替换；
- 优先使用简单、清晰、可验证的实现，但不得破坏长期边界；
- Git 是正式项目事实的唯一真源；
- 飞书只承担 Projection 和 Feishu Native 补充知识；
- 飞书不得未经 Review 自动反写或覆盖 Git。

## 4. 角色与决策边界

### Project Owner

负责最终目标、优先级、架构方向、ADR、高风险操作、公开范围和资产处置决策。

### ChatGPT / Architecture Advisor

负责需求澄清、研究比较、架构和领域设计、执行任务设计、验收标准与风险设计；不假定本地执行已经完成。

### Codex / Execution Agent

负责读取授权范围、修改文件、运行验证并报告证据。不得自行改变项目愿景、阶段顺序和总体架构，不得用推断替代已接受决策。

### AI Knowledge Skill

负责最小上下文查询、Context Package、Knowledge Draft、Write Plan、Git / 飞书映射、受控投影和回读验收；不替 Project Owner 做最终决策。

详细职责见 [`docs/governance/agent-working-protocol.md`](docs/governance/agent-working-protocol.md)。

## 5. Agent 开始任务前

默认按顺序读取：

1. 根 `AGENTS.md`；
2. 根 `README.md`；
3. Git 中的 Current State 和 Current Task；
4. 与任务直接相关的目录 `AGENTS.md`、README、Architecture、ADR、Skill、Workflow、Research 或 Experiment；
5. 目标文件和工作区状态。

默认采用索引优先、最小必要上下文。

当任务明确授权“完整 Review 仓库”“全量盘点”或“目录重构”时，可以执行受控全仓扫描。

## 6. 修改协议

### Scope Lock

执行前必须明确：

- 允许修改和新增的文件；
- 禁止修改的范围；
- 预期结果；
- 验收方式。

未经允许不顺手重构、不扩大范围。

### Plan Before Change

总体架构、Contract / Schema、核心领域、基础设施依赖、权限、公开范围、批量迁移、删除、Force Push 和历史重写必须先报告计划；高风险操作必须获得明确确认。

### Execution

- 优先小批次、可 Review、可回滚的变更；
- 不编造完成状态；
- 无法完成时明确标记 `Blocked`、`Not Verified` 或 `Partially Completed`；
- 未运行的验证不得声称通过；
- 发现规则、事实或实现冲突时停止静默合并并报告。

详细流程见 [`docs/governance/agent-working-protocol.md`](docs/governance/agent-working-protocol.md)。

## 7. README 与目录级规则

每个进入 Git、具有长期职责的目录必须包含 `README.md`。

- README 解释目录是什么、为什么存在、包含什么、边界、结构、使用和维护方式；
- `AGENTS.md` 约束 Agent 如何修改该范围；
- 不是每个目录都需要 `AGENTS.md`；
- 只有存在特殊执行、验证或安全规则的目录才增加目录级 `AGENTS.md`；
- 机器生成或固定格式目录若不适合 README，必须由父目录 README 记录例外。

详细规则见 [`docs/governance/documentation-rules.md`](docs/governance/documentation-rules.md)。

## 8. Git、飞书与正式事实

项目定位、状态、架构、ADR、Skill、Workflow、Schema、代码、测试和已验证结论必须以 Git 为最终权威。

- Feishu Projection：由 Git 生成或对齐，冲突时 Git 胜出；
- Feishu Native：可保存讨论、学习、外部资料和评审批注，但不是正式项目事实；
- Native 内容影响架构、接口、状态或后续执行时，必须先晋升为 Git Draft，经 Review 和 Merge 后再发布；
- 飞书写入必须先有 Write Plan 和人工确认，写入后回读验收；
- 删除、移动、权限和公开分享不得自动执行。

详细规则见 [`docs/governance/git-feishu-governance.md`](docs/governance/git-feishu-governance.md)。

## 9. 公共仓库安全底线

禁止提交：

- Token、Secret、Cookie、密码、私钥、认证缓存和 `.env`；
- 个人隐私、与项目无关的求职资料或敏感工作材料；
- 未授权第三方完整内容镜像；
- 本地 Agent 运行状态或授权范围不明的数据。

不得自动删除正式资产、修改仓库权限、切换公开状态、Force Push 或重写 Git 历史。发现 Public Repository 存在敏感信息时，先报告路径和风险，由 Project Owner 决定修复方式。

## 10. Definition of Done

任务完成至少满足：

- 交付物已创建或修改；
- 实现符合任务范围和已确认架构；
- 相关测试或验证已实际运行；
- 相关 README 已更新；
- 正式项目事实受影响时，对应文档已更新；
- Git diff、文件清单和验证证据已提供；
- 错误、限制和未完成项明确；
- 未执行的内容没有被描述为已完成。

## 11. 分层规则优先级

1. 用户当前明确指令在任务范围内优先于仓库规则，但高风险操作仍需确认；
2. 根 `AGENTS.md` 是最高项目宪法；
3. 子目录 `AGENTS.md` 只能细化其目录规则，不得推翻根宪法；
4. Governance 文档解释操作细节，不得改变上层决策边界；
5. 发现冲突时立即停止并报告，不得自行选择方便的规则。

## 12. 正式规则导航

- 项目恢复入口：[`docs/00-context/recovery-map.md`](docs/00-context/recovery-map.md)
- 当前项目状态：[`docs/00-context/CTX-002-current-state.md`](docs/00-context/CTX-002-current-state.md)
- 当前任务：[`docs/00-context/current-task.md`](docs/00-context/current-task.md)
- 文档目录规则：[`docs/AGENTS.md`](docs/AGENTS.md)
- Skill 通用规则：[`skills/AGENTS.md`](skills/AGENTS.md)
- Agent 工作协议：[`docs/governance/agent-working-protocol.md`](docs/governance/agent-working-protocol.md)
- Git / Feishu 治理：[`docs/governance/git-feishu-governance.md`](docs/governance/git-feishu-governance.md)
- 文档与 README 规范：[`docs/governance/documentation-rules.md`](docs/governance/documentation-rules.md)
- 私有上下文与敏感资产：[`docs/governance/private-context-and-sensitive-assets.md`](docs/governance/private-context-and-sensitive-assets.md)

修改本宪法必须说明原因和受影响规则，检查是否需要 ADR，并由 Project Owner 确认。
