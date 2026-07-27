# Git and Feishu Knowledge Governance

## 1. 目的

本规范定义 Git 与飞书在 `ai-agent-platform` 中的权威边界、覆盖发布、回读验收和高风险操作规则。

本次规范只描述流程，不授权任何 Feishu Projection 发布。

## 2. Git 是唯一正式真源

以下内容必须最终进入 Git：

- 项目定位、目标、非目标、Roadmap 和 Current State；
- Architecture、Domain Model 和 ADR；
- Skill、Workflow、Schema、Contract 和 Prompt；
- 代码、配置、脚本和测试；
- 已验证 Research / Experiment 结论；
- 正式问题解决方案、复盘、发布记录和工程规范；
- 影响接口、能力边界、状态或后续执行的结论。

Chat、飞书和运行输出可以产生候选内容，但只有经过 Review 并进入 Git 后才成为正式项目事实。

## 3. Feishu Projection

Projection 只由 Git `docs/knowledge/` 目录构建，用于：

- 阅读和分享；
- 项目知识库展示；
- Architecture、Agent、Workflow、实验与 Portfolio 阅读；
- Portfolio 展示。

发布关系固定为：

```text
Git docs/knowledge/
        ↓ Build
Feishu Knowledge Base
        ↓ Overwrite Publish
Read-back Verify
```

不维护逐文件 Feishu Node 对应表。Git 目录结构与 Feishu Knowledge Base 保持一对一投影；两者内容不同时，以 Git 为准并重新覆盖发布。人工修改 Projection 不得反写 Git。

## 4. 外部 Feishu 内容

项目不把 Feishu 作为数据库、第二真源或协作源。用户提供的外部 Feishu 内容只能作为外部证据，例如：

- 外部资料；
- 待审阅建议；
- 公开 Wiki 研究材料。

外部内容不是项目正式事实，不能直接覆盖或更新 Git。

## 5. 外部证据晋升

外部证据产生以下影响时必须先进入 Git：

- 正式技术或产品决策；
- Architecture、Domain 或接口变化；
- Skill / Workflow 能力变化；
- Roadmap 或 Current State 变化；
- 实验最终结论；
- 已确认问题解决方案。

流程：

```text
External Evidence
      ↓
Knowledge Agent 提取候选
      ↓
Git Draft + Asset ID + Evidence
      ↓
Human Review
      ↓
Review and Update Git
      ↓
如进入 docs/knowledge/，重新构建 Projection
```

不得跳过 Git Review，把外部内容直接宣布为正式事实。

## 6. Git → Feishu 发布

推荐流程：

```text
Git docs/knowledge/
        ↓
Build Projection
        ↓
完整覆盖预览
        ↓
Human Confirmation
        ↓
Overwrite Publish
        ↓
Read-back Verify
```

Write Plan 至少包含：

- Git Source Root：`docs/knowledge/`；
- 目标 Feishu Knowledge Base；
- 发布模式：overwrite；
- 影响范围和风险；
- Git revision 前置条件；
- 回读验收和失败处理。

## 7. 回读验收

写入成功后必须核对：

- Knowledge Base 和发布目标；
- 目录结构、标题、正文关键段落和链接；
- revision 或更新时间；
- Git Source Root 和 Source Revision；
- CLI / API 返回与实际页面一致；
- 未修改目标外内容。

命令成功但回读失败时，状态为 `Not Verified`，不得重复创建或宣称完整成功。

## 8. Drift 检测

Drift 包括：

- Git `docs/knowledge/` 内容已变而 Projection 未发布；
- Projection 被人工修改；
- Git Source Revision 与发布版本不一致；
- 页面被移动、删除或权限改变。

处理规则：

| 情况 | 处理 |
|---|---|
| Git 新于 Projection | 重新 Build 并生成覆盖预览 |
| Projection 人工修改 | 报告 Drift，按 Git 重新覆盖发布 |
| 修改建议有价值 | 转成 Git Change Proposal |
| 发布失败 | 保留 Git 真源并记录错误 |

## 9. 权威边界

- Git 正式资产与 Projection 不一致：Git 胜出；
- Git 与外部 Feishu 内容不一致：外部内容仅作为建议或证据来源；
- 两份 Git 正式资产不一致：按 Accepted ADR、代码、测试和更新时间判断并报告；
- 无法判断：停止并请 Project Owner 决定；
- 不得使用 Feishu 覆盖 Git 或删除 Git 历史。

## 10. 高风险边界

以下操作不得自动执行：

- 删除文档或节点；
- 批量移动和重命名；
- 修改成员和权限；
- 设置互联网公开或取消公开；
- 覆盖大段人工维护内容；
- 飞书修改自动反写 Git。

创建和更新也必须经过预览、确认和回读。CLI 要求 `--yes` 时必须重新报告风险并获得确认。

## 11. 非 Projection 内容

Feishu Knowledge Base 只接收 `docs/knowledge/` 的 Projection。以下正式内容不能只留在 Feishu：

- Accepted 决策；
- 正式 Architecture、Contract 和能力边界；
- Current State 和 Roadmap 变化；
- 可复现实验结论；
- 影响实现和后续任务的约束。

## 12. Projection 配置维护

修改或发布 Knowledge 资产时检查：

- `knowledge.config.yaml`；
- `docs/technical/元数据/assets.yaml`；
- `docs/technical/元数据/relations.yaml`；
- `docs/knowledge/` 目录结构；
- Git Source Revision 和发布预览。

真实租户标识和凭据不得提交到 Git；运行时由受控的私有配置提供。
