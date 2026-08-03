# Current Status

## Working Baseline

```text
Working Branch:
  main

Current HEAD:
  read from Git at runtime

Current Phase:
  Phase 2.5 — Homepage Convergence and Feishu Publication Preparation

Feishu Publication:
  not_started
```

当前工作继续在 `main` 完成。准确 SHA、远端一致性和 Worktree 状态必须从 Git 实时读取；历史 Commit 只承担追溯，不作为当前状态硬编码。

视觉资产不使用独立分支。正文、PNG、SVG、语义镜像和 Visual Registry 以 Document Bundle 形式在同一分支、同一 Commit 管理。

## Verified Implementation

### Runtime chain

```text
Custom GPT
→ Microsoft Dev Tunnels
→ Action Gateway
→ Local Runtime
→ gateway.ping / runtime.status
```

已验证：

* Contracts、Auth、Policy；
* 双层 API Key 和 Capability Policy；
* Loopback、Rate、Concurrency、Timeout 和响应大小边界；
* Custom GPT Builder Action；
* 真实自然语言到本地 Runtime 的窄 Capability 调用。

仍未实现：

* 动态 Task Store 与 Execution / Result 持久化；
* Executor Adapter 与完整 Execution Lane；
* Approval、Evidence 和 Side-effect Ledger；
* 自动 Health Recovery；
* 多角色、多任务和多执行器自动调度；
* 完整 Agent Runtime。

### Knowledge, Context and delivery governance

已经形成：

* Git 唯一正式真源；
* `context/**` 共享启动上下文及 Planner 所有权；
* `docs/knowledge/**` 正式知识和 Feishu 唯一发布源；
* Platform Registry、Relations 和 Visual Registry；
* Document Bundle 与 Human-first、AI-lossless 语义镜像；
* Planner–Executor Handoff 与冻结 Artifact 交付；
* 六个活跃 Skill；
* Git → Feishu 单向覆盖和本地图片 Publisher 规则。

正式知识当前为十个内容域：

* `00_项目与产品`；
* `02_基础产品与能力`；
* `03_Agent工程架构思想与方法论`；
* `04_平台架构`；
* `05_上下文与知识系统`；
* `06_智能体资产体系`；
* `07_工作流与项目治理`；
* `08_实验与复盘`；
* `09_作品集`；
* `10_术语与来源`。

原 `00_项目入口` 与 `01_产品体系` 已合并为 `00_项目与产品`。保留后续目录编号，避免为连续编号制造大规模无价值路径迁移。

### Homepage and product convergence

* `CTX-001` 保留 Stable ID，正文重建为《智能体工程探索录》；
* `CTX-001` 已转换为资源型 Document Bundle，并拥有正式总揽图；
* `VIS-011～VIS-014` 已依据冻结后的产品正文重生成；
* Feishu 投影中，`CTX-001` 是独立根首页；
* 其余 CTX、DEC、PRD 页面归入“项目与产品”，不重复发布根首页；
* Git 目录归属和 Feishu 阅读层级由 Projection Policy 分开表达。

### Agent asset boundary

`06_智能体资产体系` 已形成 Role、Agent Profile、Skill、Knowledge Pack、Capability、Tool、Policy、Eval、Host Release 和 Catalog 的正式设计边界。

当前仍未物化：

* 正式 `agents/**`；
* Agent Profile Schema；
* 正式 `knowledge-packs/**`；
* Agent Eval Dataset；
* Host Release Publisher；
* released 专业 Agent。

因此只能表述为“智能体资产模型已经形成并被接受”，不能表述为“完整智能体运行能力已经验证”。

## Current Closure State

当前路径：

```text
Project Knowledge Synthesis
→ Engineering Document Authoring
→ Text Freeze
→ Formal Visual Generation
→ Frozen Artifact Delivery
→ Git Closure
→ Feishu Reset and Pilot
→ Full Projection and Readback
```

本轮冻结包完成：

* `00_项目入口` 与 `01_产品体系` 的 Canonical 合并；
* `CTX-001《智能体工程探索录》` 的完整重写；
* 总揽架构图与产品体系四张图的正式更新；
* Registry、Relations、Visual Manifest、Navigation 和 Projection Policy 同步；
* Context 与当前目录事实同步。

Feishu 尚未发布：

* Projection Mapping 尚未建立；
* 所有资产仍保持 `unpublished`；
* 不存在已验证页面树、页面节点和 Readback；
* 本轮冻结包不执行 Feishu 写入。

## Next Actions

1. 本地 Codex 按冻结 Artifact 在 `main` 机械应用、验证、Commit、Push 和远端回读；
2. 总控 Chat 基于固定 Commit 复审文档、图片和 Projection 规则；
3. 保留飞书知识空间与现有根页面，导出旧树并删除全部旧子页面；
4. 用 `CTX-001` 覆盖根首页，并试发布“平台架构 / ARC-001”带图页面；
5. 用户人工确认标题、层级、正文、图片和链接；
6. 确认后全量覆盖正式页面和图片；
7. 执行 Readback Verification，并以独立 Commit 记录 publication status；
8. 发布闭环后进入最小可信 Agent 纵向切片。

## Non-claims

* Host 产品已有的 MCP、Memory、Projects 或视觉能力，不等于平台已实现对应 Runtime；
* Canonical 文档和正式图片完成不等于代码能力完成；
* Agent Asset 模型完成不等于已存在 released Agent；
* Skill 物化不等于完整业务能力生产化；
* Feishu Projection Policy 存在不等于已经完成发布；
* 未经真实代码、测试、调用或回读支持的能力不得标记为 verified。
