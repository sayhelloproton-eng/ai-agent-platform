# PRT-005 关键问题、失败与架构收敛

> 核心结论：项目价值不只来自顺利实现，更来自把错误假设、失败门禁和恢复过程转化为正式架构、工作流、Skill 和自动检查。

## 1. 案例一：Git 与 Feishu 双源冲突

### 问题

双向编辑要求长期处理格式、权限、映射、冲突和 Drift，Agent 无法可靠判断谁是正式事实。

### 决定

Git 唯一真源；Feishu 单向 overwrite；发布前固定 Git 版本，发布后回读，不把 Feishu 内容合并回 Git。

### 证据

`ARC-005`、`KNO-006`、ADR-002、`EXP-001～003`、Project Knowledge Governance Skill。

### 能力体现

识别数据所有权冲突，用更简单的投影模型替代表面灵活但长期成本高的双源模型。

## 2. 案例二：Cloudflare 路线过重

### 问题

Worker、Edge、Tunnel、Origin、Secret、Gateway 和 Runtime 同时引入，导致“公网在线”和“业务链路成功”难以区分。

### 决定

开发期改用 Microsoft Dev Tunnels，保留 Gateway / Runtime Contract、双层 Policy 和 Loopback 边界。

### 证据

`EXP-005`、`EXP-006`、`EXP-007`、Dev Tunnel 应用和真实调用。

### 能力体现

围绕当前验证目标缩短路径，同时保留未来生产 Adapter 的架构空间。

## 3. 案例三：正文候选包导致 Registry 必然失败

### 问题

`07` v1 只修改正文和删除旧文件，却禁止修改 Registry 与跨文档链接。Executor 正确完成机械覆盖后，整仓校验必然失败。

### 决定

区分：

- 正文候选；
- 可人工 Review 的冻结内容；
- 完整可提交冻结包。

正式交付包必须覆盖路径变化的完整影响闭包。

### 证据

`EXP-008`、`WFL-010`、最终 `07` 完整冻结包与 Commit `93da9612e237f94cc6044d85ac7a2f0d7c37b203`。

### 能力体现

不把执行器的停止当成工具问题，而是回到 Planner 的交付合同和影响分析责任。

## 4. 案例四：历史 Migration 被误判为活跃残留

### 问题

v2 使用“`platform-registry/**` 中旧路径必须全部为 0”的粗粒度门禁，误伤 Migration Matrix 中 16 行应保留的历史路径。

### 决定

按语义分类：

- 活跃 Registry、Canonical 文档、Context、Skill：旧路径清零；
- Migration、迁移计划、Archive：允许保留真实历史。

### 证据

`EXP-008`、v3 Historical Reference Policy、Registry 168 Assets / 440 Relations 校验。

### 能力体现

用领域语义替代目录名和全文搜索的粗暴判断。

## 5. 案例五：Ruby 中文编码恢复

### 问题

Ruby 2.6 在 `-e` 模式下把中文源码按 US-ASCII 解析，单纯修改 I/O 编码无法解决解析前失败。

### 决定

中文路径通过环境变量传入；Ruby 源码保持 ASCII；JSON / YAML 显式 UTF-8 读取。

### 证据

`EXP-009` 的 Batch 05 恢复记录。

### 能力体现

区分源码编码与文件 I/O 编码，只授权解决已确认根因的最小变化。

## 6. 案例六：长上下文和 Handoff 漂移

### 问题

目标、指导粒度、执行权、Git 行为和 Review 混在聊天提示词中，执行器切换后容易遗漏门禁或误解分支策略。

### 决定

Handoff 分离 Guidance Tier 与 Execution Authority；使用结构化 Artifact、Feedback Contract、Executor Switch Checkpoint 和逐任务 Git Operating Policy。

### 证据

Planner–Executor Handoff、负向测试、真实失败修正和多次冻结落库。

### 能力体现

把沟通问题转化为 Contract、Schema、测试和机器检查。

## 7. 共同方法

```text
发现失败
  → 保全 Git / Evidence / Side Effect
  → 区分内容、合同、环境和工具错误
  → 确认根因
  → 最小修正
  → 回归完整门禁
  → 更新 Workflow / Skill / Knowledge
```

## 8. 当前边界

这些案例证明了分析、治理和恢复能力，但不代表所有问题都已自动化。Impact Analyzer、Task Store、Approval Store、Recovery Service 和生产运维仍在后续路线中。

## 9. 关联资产

- [EXP-003 知识系统初始化与单一真源收敛复盘](../../08_实验与复盘/EXP-003-知识系统初始化阶段复盘/README.md)
- [EXP-007 Cloudflare 到 Dev Tunnels 路线替代复盘](../../08_实验与复盘/EXP-007-Cloudflare路线替代复盘/README.md)
- [EXP-008 长上下文、冻结交付与知识综合复盘](../../08_实验与复盘/EXP-008-长上下文与知识综合复盘/README.md)
- [EXP-009 任务中断、健康恢复与快照续跑实验](../../08_实验与复盘/EXP-009-健康恢复与任务快照实验/README.md)
