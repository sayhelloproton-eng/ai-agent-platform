# Git and Feishu Knowledge Governance

## 1. 目的

本规范定义 Git 与飞书在 `ai-agent-platform` 中的权威边界、内容分类、晋升、发布、回读、Drift 和高风险操作规则。

本次规范只描述流程，不授权任何飞书同步或写入。

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

Projection 由 Git 正式资产生成或对齐，用于：

- 阅读和分享；
- Agent 查询；
- 项目首页和状态看板；
- Architecture、ADR、Research 和 Skill 汇总；
- Portfolio 展示。

Projection 必须尽可能记录：

- Asset ID；
- Canonical Git Path；
- Source Commit；
- Content Hash；
- Last Synced At；
- Sync Status。

Git 与 Projection 不同，以 Git 为准。人工修改 Projection 不得自动反写 Git。

## 4. Feishu Native

Native 可以保存：

- 临时讨论和会议过程；
- 学习笔记；
- 外部资料；
- 评审批注；
- 待整理想法；
- Capture Inbox 和展示看板。

Native 默认不是正式项目事实，应标记：

- `Source Mode: Feishu Native`；
- `Canonical Project Asset: No`；
- `Promotion Status: Not Required / Candidate / Promoted`。

## 5. Feishu Native 晋升

Native 内容产生以下影响时必须晋升：

- 正式技术或产品决策；
- Architecture、Domain 或接口变化；
- Skill / Workflow 能力变化；
- Roadmap 或 Current State 变化；
- 实验最终结论；
- 已确认问题解决方案。

流程：

```text
Feishu Native
      ↓
Knowledge Agent 提取候选
      ↓
Git Draft + Asset ID + Evidence
      ↓
Human Review
      ↓
Merge to Git
      ↓
重新生成 Feishu Projection
      ↓
Native 标记 Promoted
```

不得跳过 Git Review，把 Native 直接宣布为正式事实。

## 6. Git → Feishu 发布

推荐流程：

```text
Git Accepted / Validated Asset
              ↓
      Feishu Write Plan
              ↓
      完整内容预览
              ↓
       Human Confirmation
              ↓
       Create / Update
              ↓
       Read-back Verify
              ↓
  Commit + Hash + Status 更新
```

Write Plan 至少包含：

- 目标 Space、Node、Doc 和标题；
- `mirror`、`projection` 或 `index` 模式；
- create、append、局部替换或 overwrite；
- 影响范围和风险；
- revision / Hash 前置条件；
- 幂等策略；
- 回读验收和失败处理。

## 7. 回读验收

写入成功后必须核对：

- Space、父节点和目标文档；
- 标题、正文关键段落和链接；
- revision 或更新时间；
- Asset ID、Git Path、Commit 和 Hash；
- CLI / API 返回与实际页面一致；
- 未修改目标外内容。

命令成功但回读失败时，状态为 `Not Verified`，不得重复创建或宣称完整成功。

## 8. Drift 检测

Drift 包括：

- Git 内容已变而 Projection 未更新；
- Projection 被人工修改；
- Git Path、Asset ID 或映射失效；
- Commit / Hash 不匹配；
- 页面被移动、删除或权限改变。

处理规则：

| 情况 | 处理 |
|---|---|
| Git 新于 Projection | 生成更新预览 |
| Projection 人工修改 | 标记 Drift，不反写 |
| 修改建议有价值 | 转成 Git Change Proposal |
| 映射失效 | 停止写入并修复映射 |
| 同步失败 | 保留上次成功版本并记录错误 |

## 9. 冲突处理

- Git 正式资产与 Projection 冲突：Git 胜出；
- Git 与 Feishu Native 冲突：Native 仅作为建议或证据来源；
- 两份 Git 正式资产冲突：按 Accepted ADR、代码、测试和更新时间判断并报告；
- 无法判断：停止并请 Project Owner 决定；
- 不得静默合并、覆盖或删除历史。

## 10. 高风险边界

以下操作不得自动执行：

- 删除文档或节点；
- 批量移动和重命名；
- 修改成员和权限；
- 设置互联网公开或取消公开；
- 覆盖大段人工维护内容；
- 飞书修改自动反写 Git。

创建和更新也必须经过预览、确认和回读。CLI 要求 `--yes` 时必须重新报告风险并获得确认。

## 11. 什么可以只在飞书

可以长期 Native：

- 不影响项目正式事实的学习和讨论；
- 个人阅读笔记；
- 外部链接收藏；
- 评审过程和会议过程；
- 临时通知和展示看板。

不能只留在飞书：

- Accepted 决策；
- 正式 Architecture、Contract 和能力边界；
- Current State 和 Roadmap 变化；
- 可复现实验结论；
- 影响实现和后续任务的约束。

## 12. 映射维护

飞书映射由 Git 管理。新增、移动、废弃或发布资产时检查：

- `docs/_index/assets.yaml`；
- `docs/_index/relations.yaml`；
- `docs/_index/feishu-map.yaml`；
- Asset ID 与逻辑路径；
- Commit、Hash 和 Sync Status。

如果公开仓库不适合保存真实租户标识，应使用占位符或私有配置，不把凭据和私有资源标识提交到 Git。
