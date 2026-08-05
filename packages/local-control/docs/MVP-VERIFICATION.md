# SOL-LCL-001 MVP Verification

## Baseline

```text
Source archive commit identity:
5b1edbe303aa8c3c4388804149a875f8f34ca9dd

Audited design:
第二阶段(2).zip / SOL-LCL-001-Local-Control与CLI-MVP.md
```

## Implemented Scope

- 新增 `@ai-agent-platform/local-control`；
- 10 个 `local.*` Capability；
- stdin/stdout 单 JSON 协议；
- Project / Runtime / Executor / Service Registry；
- Git / File / Runtime / Executor / Service Adapter；
- 路径、敏感资源、预算和固定命令策略；
- npm pack 与离线安装测试；
- Gateway 接入合同文档。

未修改 Gateway、Task Control、Controller、Browser Host 或公共 Contracts 的内部实现。

## Verification Results

在当前执行环境完成：

- Local Control：12/12 tests passed；
- Contracts：17/17 tests passed；
- Auth：12/12 tests passed；
- Policy：12/12 tests passed；
- Action Gateway：79/79 tests passed；
- Local Runtime：44/44 tests passed；
- Local Chain：6/6 tests passed；
- Local Stack：5/5 tests passed；
- Skills Check：通过；
- Engineering Document Authoring Self-test：通过；
- Planner-Executor Handoff Self-test：通过；
- npm pack：通过；
- 打包产物离线安装与 `aap-local` 二进制调用：通过。

## Environment Limitation

执行沙盒为 Node.js `v22.16.0`，仓库正式要求 Node.js 20。所有 TypeScript 构建和测试均通过，但落库执行器仍必须在项目规定的 Node 20 / npm 10 环境重新运行正式门禁。

上传的是 GitHub 风格源码归档，不含 `.git`，因此以下门禁无法在本环境成立：

- 实时 Branch / HEAD / Remote 一致性；
- Worktree / Index 洁净度；
- `git diff --check`；
- `scripts/repo-check.mjs` 的 Git 跟踪文件检查。

这不是代码测试失败。正式应用时必须以固定 Base Commit、干净 Worktree 和 Node 20 重新验证。

源码归档还存在一个与本实现无关的文件名编码限制：部分中文路径在 ZIP 中以字面量 `#U...` 形式出现，而 Registry 中记录的是规范中文路径，因此 `check:registry` 在当前解压副本中无法通过。不得通过修改 Registry 或公共语义绕过；应在保留真实 Unicode 文件名的正式 Git Worktree 中复验。

## Governance Notes

- 同步只读查询不强制创建 Work Item；
- 异步状态只由 Task Control 保存；
- CLI 无长期状态；
- 没有新增 Local Control Service、Daemon 或第二 Gateway；
- Gateway Adapter 和共享合同仍等待总控跨领域审计；
- 未单方面修改平台公共语义。
