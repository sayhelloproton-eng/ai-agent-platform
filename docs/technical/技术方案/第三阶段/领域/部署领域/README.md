# 部署领域｜REWORK REQUIRED

> ⚠️ 本领域设计已被 Phase 3 总纲标记为 REWORK。
> 原因：当前设计假定"模块自行完成 preflight/install/configure 部署子闭环"，与用户冻结的新部署边界冲突。

## 当前问题

当前设计假设：

```text
模块自己 preflight
→ 模块自己 install
→ 模块自己 configure
→ 模块自己形成部署子闭环
→ Platform CLI 只是转发 module install/configure/start/verify
→ 静态 INSTALL.md 作为最终部署计划
```

## 正确方向（冻结裁决）

模块只公开可机器读取的事实与操作原语：

```text
module identity / version
provides（提供什么能力）
requires（需要什么外部依赖——logical ref）
config slots（需要哪些配置槽位）
candidate discovery sources（候选依赖从哪里发现）
verify hints（如何验证候选依赖）
lifecycle primitives（start/stop/status/health/doctor）
potential effects（执行后可能产生的副作用）
invariants（不变约束）
```

平台级 Deployment Planner 才拥有：

```text
selected modules
→ query all module requirements
→ aggregate
→ build dependency graph
→ provider/consumer matching
→ resolve concrete environment
→ verify all required dependencies
→ dynamically generate THIS deployment's INSTALL.md / plan
→ AI presents ONE consolidated confirmation
```

平台级 Deployment Executor 确认后才拥有：

```text
apply resolved config
→ materialize packages if needed
→ start lifecycle primitives
→ health checks
→ cross-module acceptance
→ verification records / manifest
```

## 允许模块保留

模块可以继续拥有 start / stop / status / health / doctor 等生命周期原语。

## 禁止模块拥有

模块不能拥有：
- 跨模块 topology 规划
- 外部依赖 resolution
- 用户全局确认
- platform-level apply
- 静态通用 INSTALL.md 作为最终部署计划

## 相关裁决

见 `docs/technical/技术方案/第三阶段/08-ARC-P3-RULING-001-Execution-Flow-Runtime-Handoff裁决.md`
及 Phase 3 总纲 `00-PHASE3-总纲-模块化执行平台与独立部署基建.md`。

## 实施状态

**REWORK — 等待 Stage 1 Commons 冻结后再重新设计。**
当前目录仅保留 REWORK 标记，不做实现。
