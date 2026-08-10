# Phase 3 总纲｜模块化执行平台与独立部署基建

## 1. 一句话目标

> 把 Phase 2 已验证的 Controller、Task、Local、Browser、Inference 能力，从“一套能串起来的实现”升级为“通过稳定协议连接、部署无关、可替换、可独立测试和部署的一组平台模块”。

## 2. 为什么必须进入 Phase 3

Phase 2 后半程证明：继续在现有边界里增加 selector、状态字段和特殊豁免，无法从根本上解决复杂度。真实问题已经集中到：

- 模块边界；
- 生命周期所有权；
- 独立部署；
- Runtime composition；
- 公共合同；
- deterministic verification。

因此 Phase 3 允许对整个仓库进行结构性重塑。

## 3. 核心架构目标

### 3.1 模块独立

模块内部只能依赖自己的 public ports / contracts，不直接 import CTL / TSK / LCL / BHR / Gateway 其他模块内部实现。

### 3.2 部署无关

同一个模块应能在以下形态间切换：

```text
in-process
localhost service
LAN service
remote service
```

上层 Flow 和领域协议不因此修改。

### 3.3 Runtime-owned Composition

外部依赖统一由 Runtime-owned config + Adapter / Provider 注入，例如：

- inference backend endpoint / model mapping；
- capability adapter endpoint；
- task-control endpoint；
- storage / runtime home；
- command registry；
- auth / policy endpoint。

Core 不感知具体部署位置。

### 3.4 逻辑引用而不是物理地址

Flow / Task / Controller 只使用：

```text
backend_ref
capability_ref
command_ref
provider_ref
module_ref
```

禁止把 IP、目录、可执行文件、其他模块源码路径写进 Flow。

### 3.5 稳定协议

跨模块交互使用版本化 API / protocol。实现可以 in-process 或 remote，语义不变。

## 4. Phase 3 的三个第一优先级

### P0-A：公共领域 / Platform Commons

先冻结所有模块共同依赖但任何业务领域都不应私有化的语义和基建。

### P0-B：Task Domain

Task 是整个平台协调事实的持有者。必须优先重新定义等待、执行、Delivery、Continuation、Claim、Recovery 的语义。

### P0-C：Execution Flow Runtime

Runtime 负责配置解析、Provider / Adapter 组装和有界执行；不拥有 Task 业务状态，不成为自由 Agent loop。

## 5. Controller / Task / Flow / Runtime 的初始边界

这是 Phase 3 第一个需要验证和冻结的设计假设：

| 对象 | 拥有 | 不拥有 |
|---|---|---|
| Controller | 目标理解、决策、Plan 语义、选择下一步 | 执行器内部状态、部署位置 |
| Task Control | Durable Task / Plan Progress / Work / Dispatch / Event / Coordination | 模型推理、DOM、本机实现 |
| Execution Flow | 一个有界执行单元的声明式节点、数据绑定、Capability Ref | Durable Task 状态、自由决策 |
| Runtime | 配置、Composition Root、Provider / Adapter、执行 Flow | Task 业务生命周期、Controller 决策 |
| Capability Module | 执行一个领域能力并回报结果 | 全局 Task orchestration |

Phase 3 可以推翻此表，但必须用真实需求和故障证据替代，而不是凭 package 偏好修改。

## 6. Repository Reset 原则

本阶段不以保持现有目录兼容为目标。

可以：

- 建新 package graph；
- 迁移 / 删除旧内部 Adapter；
- 合并 Gateway 与 Runtime 职责或重新拆分；
- 重写 Task Core；
- 将 Browser Host 拆成多个 package / plane；
- 将实验 Runtime 升格或重写。

暂时不要求：

- Feishu 同步；
- docs/knowledge 映射；
- 旧 Registry 完整兼容；
- 旧 root verify 全程不变。

这些治理在 Phase 3 架构稳定后重新定义。
