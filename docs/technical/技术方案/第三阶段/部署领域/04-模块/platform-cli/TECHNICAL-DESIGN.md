---
docId: DEPLOYMENT-PLATFORM-CLI-TECH-DESIGN
title: '`platform-cli` 详细技术方案'
docType: module-design
authority: normative
lifecycle: frozen
domain: deployment-governance
moduleRef: platform-cli
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs:
- DEPLOYMENT-PLATFORM-CLI-TECH-DESIGN
- DEPLOYMENT-DOC-02-01
---

# `platform-cli` 详细技术方案

## 1. 定位

Platform CLI 是 Deployment Domain 唯一平台级确定性应用。

它不懂其他领域内部业务，只懂 Module Contract 和公开 lifecycle/verification contract。

## 2. Commands

```bash
platform preflight [module]
platform plan --intent install|configure|upgrade|repair [options]
platform apply <planRef>
platform start [module]
platform stop [module]
platform status [module]
platform verify [module]
platform doctor [module]
platform manifest [module]
```

`restart` 可通过 stop/start 组合或未来 alias，不需要单独增加平台语义。

## 3. `preflight`

汇总：

- Module Descriptor validity；
- current environment；
- Requires/Provides；
- Config availability；
- External Resource status；
- Human prerequisites；
- compatibility。

只检查，不执行有副作用部署。

## 4. `plan`

输入目标 Module Set / target versions / instance config intention。

输出：

- resolved modules；
- dependency graph；
- config materialization；
- package/external changes；
- lifecycle steps；
- potential effects；
- human actions；
- verification steps；
- plan fingerprint。

Plan 不 apply。

## 5. `apply`

必须：

- exclusive workspace lock；
- 读取不可变 plan；
- 校验 plan 仍适用于当前 reality；
- 每步先 check；
- satisfied → SKIP；
- executable → EXECUTE；
- human → ACTION_REQUIRED + STOP；
- failure → FAILED + STOP；
- 原子更新 state/index；
- 完整结构化日志。

## 6. `start/stop`

只对支持该 primitive 的 Deployment Unit 生效。全平台 start/stop 按依赖拓扑顺序执行。

不要求 library/remote API 实现 start/stop。

## 7. `status`

实时调用 Module status，持久状态仅作为辅助。结果必须能区分 stale persisted fact 与 current reality。

## 8. `verify`

调用各领域公开 verify，写入 Version Verification Record；平台级 verify 再验证 Required Graph 是否整体满足。

## 9. `doctor`

诊断 + evidence + recommendation；不自动 repair。

需要修复时：

```text
platform doctor
→ platform plan --intent repair
→ confirm
→ platform apply
```

## 10. `manifest`

动态组合：

- root package.json / lockfile；
- Module Descriptors；
- Deployment state/history；
- live Module status；
- Verification Records；
- Provides/Requires resolution；
- unresolved ACTION_REQUIRED。

Manifest 不是人工维护真源。

---

## 当前正式约束：plan/apply 与状态真实性

Platform CLI 是唯一全局 Deployment Planner/Executor；Module 只声明 requirements/config/provides/requires/lifecycle/verification/effects。`status/verify/doctor` 必须读取当前 reality；doctor 默认只诊断，修改环境必须生成 repair plan。CLI 按需运行，不成为第二 Runtime/长期 workflow engine。
