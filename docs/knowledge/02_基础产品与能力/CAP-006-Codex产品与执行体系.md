# CAP-006 Codex 产品与执行体系

## 1. 文档定位

Codex 是面向软件工程和技术知识工作的 Agent 执行体系。它可以理解仓库、修改文件、运行命令和测试、生成 Diff、处理 Review，并在本地或云端环境中完成较长任务。

Codex 不是项目真源，也不是“自动写代码就一定完成”的保证。真实结果仍以文件、测试、Git Diff、Commit 和外部系统回读为准。

## 2. Codex 的主要入口

当前 Codex 能力分布在多个入口中：

| 入口 | 主要用途 | 典型边界 |
|---|---|---|
| Desktop App | 多任务、长任务、Agent 监督、Worktree 和可视化 Review | 依赖本机环境、系统权限和客户端能力 |
| CLI | 终端内交互或非交互执行 | 适合脚本化、CI 和精确命令控制 |
| IDE Extension | 在编辑器中理解和修改代码 | 受当前 Workspace、IDE 和本机配置影响 |
| Cloud / Web | 在托管环境中处理仓库任务 | 环境、网络、Secret 和依赖与本机不同 |
| Mobile / Remote | 查看、发起或继续部分远程工作 | 不应假设等同于本机终端执行 |

这些入口共享 Codex 产品能力，但不保证共享完全相同的会话、文件系统、凭据、网络和配置。

## 3. 本地执行与云端执行

### 3.1 本地执行

本地 Codex 直接面对用户当前机器中的：

- 仓库；
- 分支和 Worktree；
- 已安装依赖；
- 本机命令；
- 本地服务；
- 环境变量；
- 系统权限。

优势是环境真实，适合调试本机链路和运行现有测试。风险是副作用直接作用于用户设备，因此需要 Sandbox、Approval、Scope 和 Git 门禁。

### 3.2 云端执行

云端 Codex 在托管环境中运行，适合并行任务、远程仓库工作和不依赖本机状态的任务。

云端与本地可能不同：

- 依赖版本；
- 操作系统；
- 网络；
- Secret；
- 缓存；
- 本地服务；
- 已登录浏览器；
- 文件挂载。

因此“云端通过”不能自动证明“本机通过”，反之亦然。

## 4. Codex 的任务生命周期

一个可靠的 Codex 任务应包含：

```text
固定输入 SHA
→ 读取 AGENTS 和任务合同
→ 确认工作区与范围
→ 理解相关代码和测试
→ 修改
→ 运行确定性验证
→ 检查 Diff
→ Commit / Push 授权
→ 输出证据
```

完成报告只能说明 Agent 的声明。最终 Review 应检查：

- 实际文件；
- 实际 Diff；
- 测试输出；
- Commit SHA；
- 远端回读；
- 工作区是否干净。

## 5. Worktree、Branch 与隔离

并行 Agent 如果共享一个可写工作区，容易发生：

- 相互覆盖；
- 错误暂存；
- 测试结果污染；
- 分支混淆；
- 无法确定哪一个 Agent 产生了副作用。

更稳妥的模型是：

```text
Task
  → Branch
  → Worktree
  → Executor / Session
```

Task 是稳定身份；Session 和 Executor 可以更换。一个写任务原则上绑定一个明确 Branch / Worktree。

当前知识重构仍在单分支串行完成，尚未实现平台级 Worktree 调度。

## 6. 多 Agent 与并行

Codex Desktop 和当前 Codex 客户端支持并行 Agent 或 Subagent 工作流，但并行不是默认收益。

适合并行：

- 相互独立的代码探索；
- 多模块只读审计；
- 可分离的测试与文档研究；
- 多种方案比较。

不适合并行：

- 多个 Agent 修改同一文件；
- 决策尚未冻结；
- 共享不可重入环境；
- Token 或 Review 能力不足；
- 任务依赖严格串行。

并行 Agent 会增加 Token、合并和监督成本。只有隔离价值或速度收益明确时才使用。

## 7. Codex 与 ChatGPT Work

两者都能完成较大任务，但关注点不同：

| ChatGPT Work | Codex |
|---|---|
| 面向通用可交付任务 | 面向仓库和技术执行 |
| 可组织文件、研究和多步骤工作 | 深入代码、终端、测试和 Git |
| 执行环境随 Work 类型变化 | 本地或云端工程环境更明确 |
| 输出可为文档、分析或其他产物 | 输出通常包含代码、Diff 和验证 |

本项目把当前 Chat 作为“大脑和复审”，把 Codex / Work 作为真实执行入口；不要求二者自动互相接管。

## 8. 安全与证据

Codex 的可靠性来自工程边界，而不是模型承诺：

1. 固定 Branch 和 SHA；
2. 工作区预检；
3. 明确允许和禁止路径；
4. 最小权限；
5. 高风险动作要求批准；
6. 运行仓库既有测试；
7. `git diff --check`；
8. 缓存区范围审计；
9. 单逻辑 Commit；
10. 远端回读。

## 9. 在 ai-agent-platform 中的当前定位

当前项目已经使用 Codex 完成：

- Contracts、Auth、Policy、Gateway、Runtime 和 Dev Tunnel 工程实现；
- 仓库测试和真实 Action 链路验证；
- 知识资产重构的确定性落库、验证和提交。

尚未实现：

- Codex Adapter；
- Execution Lane；
- Task 到 Worktree 的自动分配；
- 持久状态；
- Evidence Registry；
- 自动恢复与移交。

## 10. 关联文档

- [CAP-001 什么是 ChatGPT](./CAP-001-什么是ChatGPT-产品模型与Agent入口.md)
- [CAP-007 Codex 配置、权限与执行基线](./CAP-007-Codex配置权限与执行基线.md)
- [CAP-008 Agent 扩展与治理](./CAP-008-Agent扩展与治理-AGENTSRulesSkillsHooksMCP与Plugins.md)
- [CTX-007 当前实现与目标架构](../00_项目入口/CTX-007-当前实现与目标架构.md)
- [WFL-004 多模型 Agent 执行治理与 Token 预算](../07_工作流与项目治理/WFL-004-多模型Agent执行治理与Token预算.md)

## 11. 产品事实核验基线

核验日期：2026-07-31。

- [OpenAI：Introducing the Codex app](https://openai.com/index/introducing-the-codex-app/)
- [OpenAI：Work with Codex from anywhere](https://openai.com/index/work-with-codex-from-anywhere/)
- [OpenAI：Codex is now generally available](https://openai.com/index/codex-now-generally-available/)

Codex 入口、模型、套餐和客户端功能会变化，具体能力以当前官方文档与本机实际验证为准。
