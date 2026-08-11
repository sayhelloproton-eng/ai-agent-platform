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
- Composition Root 仍必须在五领域最终总纲裁决。

## 3. 下一步

进入 Phase 3 五领域最终总纲：

1. 汇总五领域 Package/Service/Deployment Unit；
2. 冻结 Application Composition Root；
3. 冻结真实本地进程/端口/公开入口拓扑；
4. 完成 Provides/Requires 全局矩阵；
5. 将全部内部与外部资源映射为 Module Graph；
6. 生成新仓库 monorepo/package layout；
7. 生成第一版 platform deployment target set；
8. 制定新仓库实现顺序与跨领域 E2E Gate。

## 4. 真源

后续对 Deployment 的讨论应优先读取本冻结包；旧 `部署领域.zip` 仅作为历史草案，不得反向覆盖已确认修正。
