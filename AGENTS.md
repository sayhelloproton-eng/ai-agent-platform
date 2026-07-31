# AI Agent Platform Project Constitution

> 本文件是 `ai-agent-platform` 中人类协作者、当前 ChatGPT、Codex / Work 和其他 Agent 共同遵守的最高项目规则。

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

### 当前 ChatGPT

负责：

- 目标理解；
- 产品和架构规划；
- 知识综合；
- 正式正文；
- 复杂图规格；
- Codex 精确任务；
- Commit 复审。

当前 Chat 不假装已经修改本机仓库。

### Codex / GPT Work

负责：

- 读取授权范围；
- 修改真实仓库；
- 运行命令和测试；
- 创建 Commit；
- 返回 Diff、SHA 和证据。

Codex 不得自行改变项目思想、文章边界、稳定 ID 或长期架构。

### Custom GPT

是专业角色入口，负责稳定 Instructions、角色知识、Actions 和专业交互。它不是任务数据库，不承担可靠跨会话状态。

### Gateway / Runtime

负责 Task Contract、身份、权限、状态、执行器连接、审批、证据和恢复。当前只实现最小安全调用链。

## 3. 事实优先级

发生冲突时：

```text
代码、测试、真实调用证据
  ↓
当前 main 的 Context、ADR 和治理规则
  ↓
Project Owner 与当前 Chat 已确认原则
  ↓
已 Review 的底稿与蓝图
  ↓
旧知识文章和历史建议
```

旧文档不能反向约束目标设计，但其历史、问题、实验和证据必须保留。

## 4. Git、飞书与 Registry

- Git 是唯一真源；
- `docs/knowledge/` 是飞书唯一发布源；
- `platform-registry/` 是资产身份、关系、状态、实现证据和投影的系统真源；
- 飞书只允许 Git → Feishu；
- 发布前禁止读取飞书正文；
- 禁止语义 Diff、合并、反向同步和双向同步；
- 映射建立后按文档 `node_id` 覆盖变化文档。

飞书写入必须由 Project Owner 明确授权。

## 5. 当前与目标

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

## 6. Scope Lock

执行前必须明确：

- 允许修改范围；
- 禁止范围；
- 输入基线 SHA；
- 预期输出；
- 验证命令；
- Commit 信息。

不得顺手扩大范围。

## 7. 批次与提交

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

## 8. 文档与 Registry

- 每个长期目录必须有有效 README；
- 最近一级 README 必须说明目录、文件、入口和状态；
- 正式资产必须有稳定 ID；
- ID 不得复用；
- 正文不保存大段系统 Front Matter；
- 关系、投影、实现状态和发布记录进入 `platform-registry/`；
- 被替代资产必须记录 `supersedes` / `superseded_by` / `merged_into`。

## 9. 复杂图

复杂架构、跨层关系、多角色泳道、状态机、治理闭环和生命周期必须生成正式 SVG / PNG 资产。

图在正文冻结后生成。现有失败图不作为视觉基线。

## 10. 安全底线

禁止提交：

- Token、Secret、Cookie、密码、私钥和 `.env`；
- 私人原文和未脱敏材料；
- 未授权第三方全文；
- 本地运行缓存和认证状态。

删除、权限、公开范围、Force Push 和历史重写必须单独授权。

## 11. Definition of Done

任务完成至少满足：

- 交付物真实存在；
- 只修改授权范围；
- 验证实际运行；
- README 与 Registry 同步；
- 当前与目标未混淆；
- Diff、Commit SHA 和限制已报告；
- 未执行内容没有被描述为完成。

## 12. 启动顺序

1. 根 `README.md`；
2. 根 `AGENTS.md`；
3. `context/README.md`；
4. `context/current-status.md`；
5. 与任务直接相关的最小知识、技术方案、ADR、Skill、代码和测试；
6. `platform-registry/` 中的相关资产与关系。

只有任务明确授权全仓审计时才允许全量扫描。
