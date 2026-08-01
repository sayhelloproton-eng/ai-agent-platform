# Roadmap

## Phase 1：Knowledge Foundation

状态：**Completed**

已完成 Git 唯一真源、AI Knowledge Skill、知识发布、图片 Publisher 和首轮知识治理。

## Phase 2：AI Coding Workflow

状态：**MVP Verified / Platform Incomplete**

已完成：

- Contracts、Auth、Policy；
- Action Gateway；
- Local Runtime；
- Microsoft Dev Tunnels；
- Custom GPT `runtime.status` 正式调用；
- 安全和并发加固；
- Engineering Insight Distillation 与 Registry。

## Phase 2.5：Knowledge Asset Rebuild and Platform Governance

状态：**Knowledge and Execution Governance Completed / Visual Assets In Review**

Batch 01 已完成首次仓库落库：

- [x] 重构仓库入口和 Context；
- [x] 建立 Platform Registry MVP；
- [x] 建立目标知识树；
- [x] 拆分技术目录职责；
- [x] 迁移 Engineering Insight Registry。

Batch 01-R1 已完成：

- [x] 完成 Registry 与状态一致性修正；
- [x] 将迁移矩阵纳入 Git；
- [x] 增强 Registry 校验。

Batch 02 与 Batch 02-R1：

- [x] 将 `00_项目入口` 六篇正文落库；
- [x] 将 `01_产品体系` 五篇正文落库；
- [x] 同步 Registry、迁移矩阵与 Release；
- [x] 完成正文事实校准、动态生命周期语言清理和导航修正；
- [x] 根据 Batch 02-R1 修正提交完成仓库级整体 Review；
- [x] 将 11 篇正式文章升级为 `accepted`；
- [x] 生成第一组十张正式 SVG / PNG；
- [ ] 生成 HTML；
- [ ] 完成全部文档后发布飞书。

Batch 03：基础产品能力与架构理论

- [x] 审计 CAP-001～CAP-008 的来源和旧资产；
- [x] 审计 THY-001～THY-006 的来源和旧资产；
- [x] 完成十四项资产的标题、边界与来源设计；
- [x] 生成并落库 CAP-001～CAP-005；
- [x] 按真实 Commit Review 并接受 CAP-001～CAP-005；
- [x] 生成 CAP-006～CAP-008 与 THY-001～THY-006 确定正文和执行包；
- [x] 按真实 Commit Review CAP-006～CAP-008 与 THY-001～THY-006；
- [x] 将通过 Review 的九篇正文升级为 `accepted`。

Batch 04：平台架构与上下文知识系统

- [x] 生成 ARC-007～ARC-014 与 ARC-016；
- [x] 生成 KNO-001～KNO-010；
- [x] 同步 Registry、关系、迁移矩阵和 Release；
- [x] 按真实 Commit Review 十九篇正文；
- [x] 将通过 Review 的十九篇正文升级为 `accepted`。

Batch 05：智能体资产与工作流治理

- [x] 修正 `context/current-status.md` 的 Batch 03BC 状态漂移；
- [x] 生成 ARC-017～ARC-018；
- [x] 生成 AGT-001～AGT-010；
- [x] 生成 WFL-005～WFL-012；
- [x] 同步 Registry、关系、迁移矩阵和 Release；
- [x] 按真实 Commit Review 二十篇正文；
- [x] 将通过 Review 的二十篇正文升级为 `accepted`。

Batch 06：实验、作品集、术语与知识树路径收口

- [x] 生成 ARC-015；
- [x] 生成 EXP-005～EXP-009；
- [x] 生成 PRT-003～PRT-006；
- [x] 生成 REF-001～REF-005；
- [x] 迁移 SKL-001～SKL-002 与 WFL-001～WFL-004；
- [x] 同步 Registry、关系、迁移矩阵和 Release；
- [x] 按真实 Commit Review 十五篇新正文；
- [x] 将通过 Review 的十五篇正文升级为 `accepted`。

Batch 07：全库一致性与 Registry 迁移收口

- [x] 修正 Context 与栏目 README 状态漂移；
- [x] 执行 15 个 Registry 批准路径迁移；
- [x] 完成 17 个原位资产迁移审计；
- [x] 删除旧知识目录导航文件，使 `docs/knowledge/` 只保留 `00～10`；
- [x] 清理正式知识正文中的旧系统 Front Matter；
- [x] 更新全仓内部链接与 Skill 路径引用；
- [x] 按真实 Commit Review Batch 07；
- [x] 将整体知识迁移状态升级为 completed。

Batch 08：执行治理与确定性交付 Skill

- [x] 收紧 `ai-knowledge` 触发条件；
- [x] 新增 `deterministic-delivery` Skill；
- [x] 建立 `deterministic_delivery` 与 `continuation` 两种执行模式；
- [x] 固化 ZIP、Hash、Overlay/Delete、tracked+untracked、rename-aware staged scope 门禁；
- [x] 固化 Ruby 中文路径、zsh `path`、空目录和失败续跑规则；
- [x] 增加 Contract Schema、Example、Validator 和自测；
- [x] 按真实 Commit Review Batch 08。

Batch 09：正式视觉资产与双分支交付

- [x] 生成平台总体架构、真实执行链路、DDD、Task Control、Execution Lane 等十张正式图；
- [x] 为每张图提供 SVG 源文件和 PNG 预览；
- [x] 建立 `VIS-*` 稳定 ID、Manifest、Hash 和 Registry 关系；
- [x] 在目标正文中使用 `asset://` 引用；
- [x] 建立 SVG 安全、PNG 尺寸与跨分支映射校验；
- [ ] 按真实 Commit Review `knowledge-assets` 与 `knowledge-rebuild-v2`；

后续进入最终仓库 Review、main 合并和飞书覆盖式发布。

## Phase 2 Next：Task Control and Trusted Execution

目标：

- 动态 Task State；
- Execution Lane；
- Branch / Worktree；
- Approval；
- Evidence；
- Side-effect Ledger；
- Health & Recovery；
- 多执行器适配。

只有产生真实调用方、测试和证据后才创建代码包。

## Phase 3：AI Video Workflow

状态：**Not Started**

以真实视频业务验证平台能力，包括故事理解、角色和场景、分镜、提示词、模型 Adapter、评估重试、成本和 Demo。

AI 视频工作流依托 `ai-agent-platform`，不创建根级 `products/`。
