---
docId: TASK-DOMAIN-TODO
title: 任务与编排领域｜Domain TODO
docType: todo-index
authority: operational
lifecycle: active
domain: task-orchestration
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 任务与编排领域｜Domain TODO

> 这里只保存跨 Module 或 Domain-level Gate。可直接编码的工作下沉到 Module TODO。

## Domain-level Gates

1. Public Contract 与 TypeScript contracts/runtime schema 一一对应。
2. Module Registry 与 package/service/process/deployment unit 实际落位一致。
3. Domain integration tests 通过。
4. 修改 ownership/state/effect/approval/recovery/public contract 时，执行受影响的 cross-domain contract/E2E。
5. `PENDING_SPIKE` 不得成为没有 fallback 的 correctness dependency。
6. 完成项必须回填 verification/evidence，不用“代码已写”代替验收。

## Module TODO

- [task-orchestration](../04-模块/task-orchestration/TODO.md)
- [task-store-sqlite](../04-模块/task-store-sqlite/TODO.md)
- [task-migration-runner](../04-模块/task-migration-runner/TODO.md)
