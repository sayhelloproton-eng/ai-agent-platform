# Documentation and Knowledge Asset Rules

> 作用范围：`docs/**`。本文件细化根项目宪法，不得推翻根 `AGENTS.md`。

## 1. 文档类型

正式知识资产按职责区分：

- **Project Context**：愿景、背景、目标、非目标和约束；
- **Architecture**：架构驱动、视图、边界、数据流和权衡；
- **Domain**：领域、实体、值对象、聚合、服务和不变量；
- **ADR**：已评审的架构决策及其后果；
- **Research**：外部资料、候选方案和证据来源；
- **Experiment**：实际环境、方法、观察、结果和限制；
- **Skill Design**：Skill 的领域定位、能力边界和契约；
- **Workflow**：步骤、状态、输入输出、失败和恢复；
- **Engineering**：工程规范、模块说明和实现约束；
- **Current State**：当前阶段、完成项、进行中、阻塞和下一步；
- **Current Task**：当前任务的范围、交付物、验收和状态。

不同类型不得混用：

- Research 回答“查到了什么”；
- Experiment 回答“实际验证了什么”；
- ADR 回答“项目最终决定了什么”。

未经验证的 Research 不得写成实验结果；未经 Project Owner 接受的观察或建议不得标记为 Accepted ADR。

## 2. 正式事实和证据

- Git 文档是正式知识资产的唯一真源；
- Chat、执行输出和飞书页面不是自动成立的正式事实；
- 已完成、已验证、已接受等表述必须有来源或证据；
- 推测、观察、验证和决策必须明确区分；
- 历史材料不得覆盖最新 Accepted ADR、代码、测试或 Current State。

## 3. Asset ID 与索引

需要稳定 `asset_id` 的正式资产包括：

- Project Context、Architecture、Domain；
- ADR、Research、Experiment；
- Skill Design、Workflow、Engineering；
- 其他需要长期引用、关联或飞书投影的正式资产。

规则：

- 新建前检查 `docs/_index/assets.yaml`，不得自行创造冲突编号；
- 文件移动、重命名和飞书投影调整时原则上保持 `asset_id` 不变；
- 新增、移动、废弃或改变关系时，检查 Asset Index、Relation Index 和 Feishu Mapping；
- `superseded`、`archived` 和替代关系必须保留演进证据，不得静默删除；
- 索引与正文冲突时必须报告 Drift。

## 4. Git 与飞书

- Feishu Projection 由 Git 文档生成或对齐，不是第二真源；
- Feishu Native 形成正式结论后，必须先晋升为 Git Draft 并经过 Review；
- 修改正式文档时，检查是否影响 `docs/_index/feishu-map.yaml`；
- 飞书内容不得自动反写或覆盖 Git；
- 飞书写入需要 Write Plan、人工确认和回读验收；
- 除非任务明确授权，本目录修改不得自动同步飞书。

详细规则见 [`governance/git-feishu-governance.md`](governance/git-feishu-governance.md)。

## 5. 文档修改检查

根据资产类型检查以下适用部分：

- What；
- Why；
- Problem；
- Context；
- Decision；
- Alternatives；
- Implementation；
- Result；
- Lessons；
- Next；
- Related Assets；
- 状态和证据等级；
- 链接、路径和引用；
- 是否重复、冲突或过时；
- 是否影响索引和飞书映射。

不得为满足模板而编造不适用内容。缺失事实应标记待确认。

## 6. README 与目录

新增长期文档目录时必须创建 `README.md`，至少说明：

- 目录职责；
- 允许的文件类型；
- 命名和 Asset ID 规则；
- 关键结构；
- 使用和维护方式；
- 与其他目录的边界；
- 相关架构、ADR、Skill、Workflow 和飞书逻辑路径。

机器生成、外部镜像或固定格式目录如果不适合 README，必须由父目录 README 记录例外和原因。

详细规范见 [`governance/documentation-rules.md`](governance/documentation-rules.md)。

## 7. 修改与验收

修改 `docs/**` 前：

1. 确定文档类型和权威来源；
2. 检查相关 ADR、代码、测试和索引；
3. 锁定允许修改范围；
4. 对批量迁移、归档或飞书投影先给出计划；
5. 修改后检查 Markdown、链接、状态、Asset ID、索引和 Git diff；
6. 明确报告未验证、未同步和未完成项。

不得借文档整理顺手重构仓库、修正未授权旧文档或执行飞书写入。
