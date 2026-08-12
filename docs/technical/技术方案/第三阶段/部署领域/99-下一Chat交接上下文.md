# 下一 Chat 交接上下文

## 1. 当前状态

Deployment Domain Phase 3 v1/P0 已冻结。

五个正式包必须全部保留：

```text
module-contract
module-template
deployment-conformance
platform-cli
module-skill
```

运行形态：5 包 / 0 Deployment daemon / 1 Platform CLI。

## 2. 绝对不能丢的结论

- 所有内部 npm 包、服务、Browser Extension、Agent Package 都进入 Module Governance；
- 所有外部资源必须通过 External Resource Module/Adapter 进入同一 Module Graph；
- Package != Service != Process != Deployment Unit；
- Module 只暴露自描述/requirements/config/lifecycle/verification/effects，整体依赖图和部署动作由 Platform CLI plan/apply；
- ACTION_REQUIRED 是人工步骤正式状态，可 same-plan resume；
- Upgrade 是 v1；Template Migration 与 Package Upgrade 分离；
- Verification Records 按版本/资源身份保留；
- doctor 不自动 repair；Manifest 不做第二真源；
- Deployment v1 不使用 SQLite；repo-local files 足够；
- persisted state 不能冒充 runtime reality；
- 不建设 Workflow Engine、Marketplace、K8s、自动 rollback、Vault；
- Composition Root 已由 ALIGN 冻结为 `@ai-agent-platform/platform-host`；本条原 handoff 已完成。

## 3. 下一步（POST-ALIGNMENT）

> 原“进入五领域最终总纲 / 冻结 Composition Root”步骤已经 COMPLETED，不得在后续 Chat 重开。

当前下一步：

1. 以 ALIGN-001～250 修复后的五领域文档作为唯一 normative design baseline；
2. 生成/落地新仓库 monorepo package layout，保持所有领域应用能力独立 npm package；
3. 由 Deployment Module Graph 物化第一版 target set 与 configSlots/moduleRef；
4. 按 package/module scope 实施，并通过 Domain Test + Conformance + 受影响 Cross-domain E2E；
5. OpenAI Carrier 未验证能力继续按 `PENDING_SPIKE` 管理。

## 4. 真源

后续对 Deployment 的讨论应优先读取本冻结包；旧 `部署领域.zip` 仅作为历史草案，不得反向覆盖已确认修正。
