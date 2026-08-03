# AI Agent Platform Project Constitution

> 本文件是 `ai-agent-platform` 中 Project Owner、总控 Planner、专业 Agent、Codex / Work 和其他执行器共同遵守的最高项目规则。

## 1. 项目定位

`ai-agent-platform` 是面向 AI Agent 工程学习、真实平台建设、知识治理、多 Agent 协作和求职 Portfolio 的长期工程项目。

项目必须同时形成：

- 可运行代码；
- 可解释架构；
- 可验证实验；
- 可追踪决策；
- 可恢复上下文；
- 可展示 Demo 与作品集。

## 2. 角色边界

### Project Owner

负责最终目标、优先级、架构方向、高风险操作、正式决策和飞书写入授权。

Project Owner 是重要 Context 变化的最终审批者和所有 Context 变化的最终 Review 人。

### 总控 Planner / 当前 ChatGPT

负责：

- 目标理解；
- 产品和架构规划；
- 知识综合；
- 正式正文；
- 复杂图规格；
- Executor 精确任务；
- Commit 复审；
- 判断项目级共享事实是否变化；
- 维护 `context/**` 的语义内容；
- 为 Context 生成完整覆盖文件；
- 在重要变化时向 Project Owner 汇报并申请确认。

在思考者层中，只有总控 Planner 拥有 `context/**` 的语义修改权。

当前 Chat 不假装已经修改本机仓库，也不把 Context 正文编写权交给 Executor。

### 专业 Agent / Reviewer / Research Agent

负责专业分析、Review、调研和变化识别。

它们可以读取 Context，也可以报告 Context 可能过期的原因、证据和建议影响文件，但不得直接编写或修改 `context/**`。

### Codex / GPT Work / OpenCode / Claude Code / Runtime Executor

负责：

- 读取授权范围；
- 修改真实仓库；
- 运行命令和测试；
- 创建获准的 Commit；
- 返回 Diff、SHA 和证据。

Executor 默认只读 `context/**`。只有 Canonical Handoff Contract 明确设置 `context_access.mode: write_approved`、列出精确文件，并由总控 Planner 提供完整覆盖文件时，Executor 才能机械覆盖指定 Context 文件。

Executor 不得自行总结仓库后重写 Context，不得自行改变项目思想、文章边界、稳定 ID 或长期架构。

### Custom GPT

Custom GPT 是专业角色入口，负责稳定 Instructions、角色知识、Actions 和专业交互。它不是任务数据库，不承担可靠跨会话状态。

总控 Custom GPT 必须通过自己的 Agent Profile / Instructions 知道 Context 维护职责，并在规划前读取 Git 中的最新 Context；不能把 Builder 内置 Knowledge 当作最新项目状态。

### Gateway / Runtime

负责 Task Contract、身份、权限、状态、执行器连接、审批、证据和恢复。当前只实现最小安全调用链。

## 3. Context 所有权

核心规则：

> Context 由总控 Planner 维护，Executor 只执行，其他 Agent 只报告变化，用户最终确认。

Context 写入只采用完整覆盖文件：

```text
其他 Agent / Executor 发现变化
→ 报告原因与证据
→ 总控 Planner 判断并生成完整文件
→ 重要变化由 Project Owner 确认
→ Executor 按精确授权机械覆盖
→ 测试、Commit、Push、回读
```

重要变化包括：

- 项目目标或产品范围变化；
- 核心架构或角色边界变化；
- 阶段完成、取消或切换；
- Roadmap 主优先级变化；
- Git、知识、Memory、Feishu 或安全治理变化。

具体规则见 `context/AGENTS.md` 和 `docs/knowledge/05_上下文与知识系统/KNO-011-上下文运行流转与恢复机制/README.md`。

## 4. 事实与决策优先级

当前实现事实发生冲突时：

```text
代码、测试、真实调用证据
  ↓
当前工作分支已验证的 Registry、Release 与 Migration
  ↓
Context
  ↓
已 Review 的底稿、蓝图与普通文档
  ↓
旧知识文章和历史建议
```

项目目标、优先级与治理决策发生冲突时：

```text
Project Owner 最新明确确认
  ↓
已接受的 ADR 与治理规则
  ↓
Context
  ↓
历史规划、底稿与普通文档
```

Project Owner 的新决定不会自动改变代码或 Context。总控 Planner 必须生成完整替换文件并按本章权限流程同步到 Git；同步完成前，执行器不得自行解释或扩写该决定。

旧文档不能反向约束目标设计，但其历史、问题、实验和证据必须保留。

## 5. Git、飞书与 Registry

- Git 是唯一真源；
- `docs/knowledge/` 是飞书唯一发布源；
- `platform-registry/` 是资产身份、关系、状态、实现证据和投影的系统真源；
- 飞书只允许 Git → Feishu；
- 发布前禁止读取飞书正文；
- 禁止语义 Diff、合并、反向同步和双向同步；
- 映射建立后按文档 `node_id` 覆盖变化文档。

飞书写入必须由 Project Owner 明确授权。

## 6. 当前与目标

必须明确区分：

```text
已验证实现
部分实现
已确认设计
未来候选
已被替代
历史归档
```

不得把 MVP 描述为完整平台，不得把 Candidate / Provisional 工程洞见描述为 Accepted 标准。

## 7. Scope Lock

执行前必须明确：

- 允许修改范围；
- 禁止范围；
- 输入基线 SHA；
- 预期输出；
- 验证命令；
- Context Access；
- Commit 信息。

不得顺手扩大范围。未明确授权 `context/**` 时，该目录视为只读。

## 8. 批次与提交

一个完整、可独立 Review、可回滚的逻辑批次对应一个主 Commit。

流程：

```text
固定 SHA
→ 执行批次
→ 验证
→ Commit 与 Push
→ Chat 重新读取固定 SHA
→ Review
→ 修正或下一批
```

不采用每改一个小文件就提交，也不采用全仓一次性大爆炸提交。

## 9. 文档与 Registry

- 每个长期目录必须有有效 README；
- 最近一级 README 必须说明目录、文件、入口和状态；
- 正式资产必须有稳定 ID；
- ID 不得复用；
- 正文不保存大段系统 Front Matter；
- 关系、投影、实现状态和发布记录进入 `platform-registry/`；
- 被替代资产必须记录 `supersedes` / `superseded_by` / `merged_into`。

## 10. 文档包与复杂图

资源型正式文档采用 Document Bundle：

```text
Document-ID-title/
├── README.md
└── assets/
```

正文、图片、图表和附件必须位于同一工作分支、同一 Commit 和准确文档目录。Git 使用 `./assets/...` 本地相对引用；不得把正式资源放在独立图片分支，也不得把 Feishu 媒体链接回写 Git。

复杂架构、跨层关系、多角色泳道、状态机、治理闭环和生命周期必须生成正式 SVG / PNG 资产。每个图片下方必须立即提供 `### AI 可读语义镜像`，以表格、节点关系、ASCII 架构、文本流程、状态转换或结构化叙述保存全部决策语义。

图片与语义镜像是一个原子 Review 单元，必须同步更新。核心原则是：**Human-first, AI-lossless**。

## 11. 安全底线

禁止提交：

- Token、Secret、Cookie、密码、私钥和 `.env`；
- 私人原文和未脱敏材料；
- 未授权第三方全文；
- 本地运行缓存和认证状态。

删除、权限、公开范围、Force Push 和历史重写必须单独授权。

## 12. Definition of Done

任务完成至少满足：

- 交付物真实存在；
- 只修改授权范围；
- 验证实际运行；
- README 与 Registry 同步；
- 当前与目标未混淆；
- 项目级共享事实发生变化时，已由总控 Planner判断 Context 是否需要同步；
- Context 需要修改时，已使用 Planner 提供的完整覆盖文件；
- Diff、Commit SHA 和限制已报告；
- 未执行内容没有被描述为完成。

## 13. 启动顺序

1. 根 `README.md`；
2. 根 `AGENTS.md`；
3. `context/AGENTS.md`；
4. `context/README.md`；
5. `context/current-status.md`；
6. `context/roadmap.md`；
7. 与任务直接相关的最小知识、技术方案、ADR、Skill、代码和测试；
8. `platform-registry/` 中的相关资产与关系。

只有任务明确授权全仓审计时才允许全量扫描。
