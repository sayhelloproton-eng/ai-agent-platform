---
docId: EXECUTION-DOMAIN-TODO
title: 执行领域｜Domain TODO
docType: todo-index
authority: operational
lifecycle: active
domain: execution
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 执行领域｜Domain TODO

> 这里只保存跨 Module 或 Domain-level Gate。可直接编码的工作下沉到 Module TODO。

## Domain-level Gates

1. Public Contract 与 TypeScript contracts/runtime schema 一一对应。
2. Module Registry 与 package/service/process/deployment unit 实际落位一致。
3. Domain integration tests 通过。
4. 修改 ownership/state/effect/approval/recovery/public contract 时，执行受影响的 cross-domain contract/E2E。
5. `PENDING_SPIKE` 不得成为没有 fallback 的 correctness dependency。
6. 完成项必须回填 verification/evidence，不用“代码已写”代替验收。

## Module TODO

- [execution-contracts](../04-模块/execution-contracts/TODO.md)
- [execution-runtime](../04-模块/execution-runtime/TODO.md)
- [execution-local](../04-模块/execution-local/TODO.md)
- [execution-browser-extension](../04-模块/execution-browser-extension/TODO.md)
