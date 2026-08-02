# Skill Engineering Rules

> 作用范围：`skills/**`。本文件细化根项目宪法，不得降低其安全、Git 或 Review 要求。

## 1. 独立 Skill 的成立条件

只有同时满足以下条件的能力才进入 `skills/`：

- 会在多个任务中重复出现；
- 需要 Agent 进行稳定判断或执行一套稳定工作流；
- 输入、输出、非目标和停止条件可清楚定义；
- 与相邻能力存在可验证的边界；
- 能通过真实案例、Fixture 或确定性脚本验证。

工具安装说明、单个应用运行命令、一次性迁移和历史报告不是 Skill，应进入应用 README、Runbook、技术文档或归档。

## 2. Skill Creator 结构

每个活跃 Skill 必须提供：

```text
skill-name/
├── SKILL.md                 # 必需；运行时入口
├── agents/openai.yaml       # 推荐；人类可见元数据
├── references/              # 按需读取的详细规则
├── scripts/                 # 只放重复且需要确定性的代码
├── assets/                  # 输出模板、Schema、Fixture 等可复用资产
└── tests/                   # 触发、边界和结果验证
```

`SKILL.md` YAML Frontmatter 只允许 `name` 与 `description`。`description` 必须同时说明正向触发和主要负向触发，因为它承担路由职责。

默认不创建 Skill 内部 `README.md`、`CHANGELOG.md`、`MANIFEST.json`、Quick Start 或重复索引。人类总索引由 `skills/README.md` 承担；设计历史由 Git、Registry、正式知识和技术文档承担。

## 3. 渐进披露

- `SKILL.md` 只保留核心不变量、决策树、主流程和停止规则；
- 详细领域知识进入 `references/`，仅在对应任务需要时读取；
- 可重复的机械工作进入 `scripts/`；
- 模板、Schema 和示例进入 `assets/`；
- 不把完整 Pilot 报告、历史基线输出或大段项目知识塞进 Skill 内核。

上下文窗口是共享资源。Skill 不得通过重复文档扩大默认加载量。

## 4. 边界与路由

每个 Skill 必须明确：

- 它回答的唯一核心问题；
- 哪些任务应该触发；
- 哪些相邻任务必须移交；
- 是否拥有语义决定权、写入权、发布权；
- 冲突时哪个 Skill 主导。

路径或关键词不能单独决定触发。例如目标文件位于 `docs/knowledge/`，不代表必须触发知识治理；已有冻结 Artifact 时由 `planner-executor-handoff` 的 `apply_frozen_artifacts` 模式主导。

## 5. 写入与证据

- Skill 默认只提供方法或候选结果，不自动获得仓库写入、生命周期晋升、外部发布或 Git 权限；
- Context 语义仍由总控 Planner 维护；
- Executor 只能在 Canonical Handoff Contract 授权范围内执行；
- 所有成功结论必须对应真实测试、回读、Commit 或外部证据；
- 失败必须保留原始错误、影响范围和安全停止点。

## 6. 修改验收

修改 Skill 时至少检查：

1. `description` 的触发精度；
2. 与相邻 Skill 的职责是否重复；
3. SKILL 正文是否可继续压缩并下沉到 References；
4. Agents 元数据是否仍与正文一致；
5. 脚本、Schema、Fixture 和测试是否覆盖新增边界；
6. `skills/README.md`、Registry、Context 和正式 Skill 文档是否同步；
7. 被替代 Skill 是否有明确 `superseded_by`，且不再参与自动路由。
