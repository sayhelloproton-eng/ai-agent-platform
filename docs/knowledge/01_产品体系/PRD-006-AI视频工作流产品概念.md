# PRD-006 AI 视频工作流产品概念
> **资产状态**：本文正文已在 Batch 02 交付包中完成内容 Review；进入仓库后先标记为 `partial / unpublished`，待真实 Commit 整体复审通过后再升级为 `accepted`。

> 状态：`designing / not-started`。AI 视频工作流是未来依托 `ai-agent-platform` 的上层产品，用于验证复杂领域、多个模型 Provider、人工 Review、成本和恢复；当前仓库没有其业务实现。

## 1. 产品机会

AI 视频创作不是单次“文生视频”。一个可控作品通常需要故事理解、人物与场景一致性、章节/镜头拆分、分镜、提示词、图片/视频/声音生成、质量评估、重试和资产管理。多个模型能力变化快、接口不同、成本和失败模式不稳定。

这正好可以验证平台的核心主张：领域对象不绑定模型；任务可追踪；人工在环；Provider 可替换；每次生成有成本和证据。

## 2. 目标用户与首个场景

近期目标用户仍是项目所有者，用它完成可展示 Demo，而不是立即面向商业用户。首个纵向切片应足够小：

> 输入一段故事文本，输出人物、场景、章节、冲突和结构化 JSON，并保存来源、版本、评估和人工修订。

这一步先验证 Story、Character、Scene、Chapter 等领域对象和 Task/Result，不急于调用昂贵视频模型。

## 3. 产品价值

- 把长文本转为可编辑的创作结构；
- 让人物、场景和镜头资产跨阶段复用；
- 通过统一 Port 替换图像、视频、声音 Provider；
- 记录每次生成的输入、模型、参数、成本、结果和评估；
- 支持失败重试、人工改写和版本比较；
- 形成从需求到成片的完整作品集证据。

## 4. 核心领域候选

| 领域 | 核心对象 | 说明 |
| --- | --- | --- |
| Story | Story、Chapter、Plot Point、Conflict | 原始叙事与结构化理解 |
| Character | Character、Appearance、Trait、Reference | 人物一致性和版本 |
| Scene | Scene、Location、Time、Mood | 场景语义和视觉约束 |
| Shot | Storyboard、Shot、Camera、Duration | 分镜和镜头计划 |
| Prompt | Prompt Template、Prompt Version、Negative Constraint | 面向 Provider 的生成指令 |
| Generation | Generation Task、Provider、Model、Parameter、Result | 外部生成执行 |
| Review | Evaluation、Issue、Revision、Approval | 质量判断和人工在环 |
| Asset | Image、Video、Audio、Metadata、Lineage | 创作资产和来源 |

这些只是候选，进入实现前需要通过首个故事切片验证，不能直接冻结为完整 DDD。

## 5. 与平台的关系

平台提供：Task/Result、身份和权限、Execution Lane、Provider Adapter、Evidence、成本记录、Health/Recovery、Git/Registry、Agent/Skill。<br>
AI 视频产品提供：故事、人物、场景、分镜、创作体验、业务规则、专属评估和作品资产。

因此不创建根级 `products/`。真正开始开发时，按资产类型建立：`apps/ai-video-workflow/`、相关 packages、知识文章、Agent Profile 和 Skill。

## 6. 智能体角色候选

- 故事分析 Agent；
- 人物设定 Agent；
- 场景与美术 Agent；
- 分镜导演 Agent；
- Prompt Agent；
- 生成执行 Agent；
- 一致性/质量复审 Agent；
- 成本与实验分析 Agent。

角色之间通过 Task、Artifact 和 Evidence 协作，不共享全部聊天噪声。首期不需要同时创建所有 GPT，只选择故事分析和复审两个角色验证。

## 7. MVP 分阶段

1. Story → Character/Scene/Chapter JSON；
2. JSON → Storyboard/Shot Plan；
3. Shot → Prompt + Provider Adapter；
4. 单模型图像/短视频生成；
5. 质量评估、人工修订、重试和成本；
6. 组合成 Demo 与作品集。

每阶段都要保存输入、版本、结果、失败和评估，避免只展示最终成功样例。

## 8. 非目标

- 当前不建设完整视频编辑器；
- 不承诺全自动生成高质量长片；
- 不绑定单一国内或国外模型；
- 不在没有业务验证前设计全量媒体资产平台；
- 不把未来角色和目录写成当前实现；
- 不用高成本 API 替代先验证领域结构。

## 9. 风险与待验证

- 模型能力和价格变化快；
- 人物一致性和长视频连续性仍困难；
- 版权、隐私和内容安全需要专门策略；
- 媒体文件存储和 Git 边界待设计；
- 评价标准可能高度主观；
- 旧 Mac 无法承担重型本地生成。

因此近期从文本结构化和低成本模型适配开始，让平台能力先在可控范围内接受验证。
