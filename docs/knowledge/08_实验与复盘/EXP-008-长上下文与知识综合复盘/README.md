# EXP-008 长上下文、冻结交付与知识综合复盘

> 核心结论：长上下文可以帮助判断，但不能充当正式状态数据库；完整冻结包必须从最终资产反向生成 Scope、Manifest、Registry、活跃链接和历史引用策略，不能先做正文再把集成缺口留给执行器。

## 1. 复盘范围

本文覆盖知识重构和 `07_工作流与项目治理` 落库过程中出现的：

- 长会话与上下文压缩；
- 任务书和 ZIP 漂移；
- 候选正文包与完整冻结包边界；
- Registry、活跃引用和 Migration 的集成；
- 失败后的 Continuation；
- 最终 Commit Review。

## 2. 主要观察

长上下文能保留大量历史，也会产生：

- 旧状态与新状态并存；
- 文件名、Schema 和命令被手工抄错；
- 执行者重复读取同一背景；
- 补充指令层层叠加；
- Planner、Executor 和 Reviewer 责任混合；
- “正文完成”被误认为“仓库状态完整”。

## 3. 已验证的有效做法

- Git 固定 SHA 作为事实基线；
- `context/` 提供短入口，Registry 提供机器状态；
- 最终 ZIP 内置唯一 Contract；
- Overlay、Delete、Scope、Manifest 和 Hash 从最终文件自动生成；
- 执行前验证 Worktree、Index、Remote 和输入包；
- 执行后上传或回读真实 Commit；
- Review 只检查增量风险和状态闭环。

## 4. 典型失败

### 4.1 Diff 漏掉未跟踪文件

仅使用 `git diff --name-only` 会漏掉 Untracked。完整范围必须合并：

```text
git diff --name-only
git ls-files --others --exclude-standard
```

### 4.2 聊天任务书与 ZIP 不一致

手工复制文件名、字段或门禁，会让执行器按照错误 Contract 停止。最终执行说明必须由冻结包本身产生，并以包内文件为唯一输入。

### 4.3 正文候选包不是完整落库包

`07` v1 只覆盖正文并删除旧路径，同时禁止更新 Registry 和活跃链接。结果是正文应用成功，但整仓 Registry 必然失败。

经验：只要正式路径发生变化，冻结 Scope 至少要覆盖：

- Canonical 正文；
- Registry Current / Canonical Path；
- Relations 或 supersede；
- 所有活跃链接；
- Delete List；
- 历史迁移引用策略；
- 完整校验。

### 4.4 粗粒度旧路径门禁误伤历史记录

`07` v2 已补齐正文、Registry 和活跃链接，但错误要求 `platform-registry/**` 中旧路径全部清零，导致 `platform-registry/migrations/asset-migration-matrix.csv` 的 16 行历史记录被误判为失败。

经验：旧路径必须按语义分类：

- 活跃 Registry、Canonical 文档、Context 和执行资产：必须清零；
- Migration Matrix、迁移计划和 Archive：允许保留真实历史。

### 4.5 安全停止点不应回滚

`07` v3 没有回滚已经正确应用的 35 个未暂存路径，而是先验证：

- HEAD / Remote；
- Index 为空；
- Scope 35 / 35；
- Overlay 23 / 23 逐字节一致；
- Delete 12 / 12；
- Extra / Missing 为 0。

确认安全停止点后，只修正验收规则并续跑，最终形成 Commit `93da9612e237f94cc6044d85ac7a2f0d7c37b203`。

## 5. 收敛后的冻结交付模型

```text
Canonical Content Freeze
  → Impact Inventory
  → Registry and Active Link Update
  → Historical Reference Classification
  → Generate Overlay / Delete / Scope / Manifest
  → Package Integrity Simulation
  → apply_frozen_artifacts
  → Full Repository Verification
  → Exact Stage
  → Single Commit and Push
  → Remote Readback
```

## 6. Planner、Executor 与 Reviewer 边界

### Planner

- 完成语义判断；
- 生成完整文件；
- 识别所有下游影响；
- 冻结 Scope 和历史引用政策；
- 不把集成设计留给 Executor。

### Executor

- 验证输入和环境；
- 机械覆盖和精确删除；
- 执行冻结门禁；
- 遇到合同冲突立即停止；
- 不擅自修复范围外文件。

### Reviewer

- 读取真实 Diff、测试、Registry 和回读；
- 区分内容错误、合同错误、环境错误和辅助脚本错误；
- 不因只读辅助脚本本身失败就误判冻结内容。

## 7. 当前事实边界

当前已经实践完整冻结包、Continuation、Hash、精确 Scope、全量校验、单 Commit 和远端回读。自动 Impact Analyzer、通用 Package Generator 和跨仓库索引仍未实现。

## 8. 后续改进

- 让生成器从最终文件自动产生 Scope、Delete、Manifest 和提示词；
- 把历史引用允许区写入统一 Policy；
- 对候选包与可提交包使用不同明确类型；
- 在包生成阶段运行临时仓库模拟；
- 为 Overlay / Delete / Registry / Link 建立统一闭包检查；
- 将重复的 shell 辅助断言收敛为仓库脚本，减少环境差异。

## 9. 关联资产

- [WFL-005 任务合同与多角色协作](../../07_工作流与项目治理/WFL-005-任务合同与多角色协作/README.md)
- [WFL-006 执行通道、验证复审与集成](../../07_工作流与项目治理/WFL-006-执行通道验证复审与集成/README.md)
- [WFL-010 资产变更、发布与关联同步工作流](../../07_工作流与项目治理/WFL-010-资产变更发布与关联同步工作流/README.md)
- [KNO-009 记忆、反馈与知识自迭代](../../05_上下文与知识系统/KNO-009-记忆反馈与知识自迭代机制/README.md)
- [EXP-009 任务中断、健康恢复与快照续跑实验](../EXP-009-健康恢复与任务快照实验/README.md)
