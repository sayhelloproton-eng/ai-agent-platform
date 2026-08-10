# 第三阶段技术方案｜模块化执行平台与独立部署基建

> Phase 3 可以进行颠覆性设计。当前仓库结构、Package 划分、Registry、文档同步与飞书规则均不构成本阶段硬约束；这些治理规则在新架构稳定后重新定义。

## 阶段定位

Phase 2 证明“平台能力可以真实串起来”。

Phase 3 要证明：

> **这些能力可以成为真正的平台模块：稳定合同、独立部署、配置注入、可替换、可验证，并能在不修改 Flow 协议的情况下改变部署位置和具体 Provider。**

## 优先级

```text
P0 公共领域 / 平台基建
→ P0 Task 领域重塑
→ P0 Execution Flow Runtime / Composition Root
→ P1 Browser Lifecycle 重塑
→ P1 Local / Controller / Inference Adapter 迁移
→ P1 真实跨部署验收
```

## 方案目录

1. [00｜Phase 3 总纲：模块化执行平台与独立部署基建](./00-PHASE3-总纲-模块化执行平台与独立部署基建.md)
2. [01｜Phase 3 需求目标与成功标准](./01-PHASE3-需求目标与成功标准.md)
3. [02｜ARC-P3-001 公共领域与模块边界总体设计](./02-ARC-P3-001-公共领域与模块边界总体设计.md)
4. [03｜SOL-P3-TSK-001 任务领域重塑与生命周期模型](./03-SOL-P3-TSK-001-任务领域重塑与生命周期模型.md)
5. [04｜SOL-P3-RUN-001 Execution Flow Runtime 与独立部署](./04-SOL-P3-RUN-001-Execution-Flow-Runtime与独立部署.md)
6. [05｜SOL-P3-BHR-001 Browser Execution Lifecycle 重塑](./05-SOL-P3-BHR-001-Browser-Execution-Lifecycle重塑.md)
7. [06｜SOL-P3-MOB-001 端侧模型 Provider 接入边界](./06-SOL-P3-MOB-001-端侧模型Provider接入边界.md)
8. [07｜PLAN-P3-001 实施顺序与阶段门禁](./07-PLAN-P3-001-实施顺序与阶段门禁.md)
9. [99｜新 Chat 最终交接提示词](./99-PHASE3-新Chat最终交接提示词-20260810.md)

## 当前设计自由度

Phase 3 新 Chat 被明确授权：

- 可以重新定义 package 结构；
- 可以拆分或合并现有模块；
- 可以重新设计公共合同；
- 可以重塑 Task 状态机；
- 可以废弃当前内部 API；
- 可以重新定义 Runtime、Gateway、Adapter、Provider、Flow 的关系；
- 可以把 `experiments/execution-flow-runtime` 视为重要实验输入，但不是不可修改的最终架构；
- 可以暂时绕开当前文档同步 / Registry / Feishu 治理流程，待架构冻结后再重新建立治理。

唯一要求：所有颠覆性变化必须说明“解决什么需求、替代什么旧问题、保留什么真实语义”。
