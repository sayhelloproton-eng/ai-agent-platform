# PRT-002 可演示纵向切片与 Portfolio Release 路线图

> 核心结论：Demo 必须证明一条真实用户路径，而不是播放预先准备的成功截图；当前已有三个可组织的证据型 Demo，Task Control 和 AI 视频仍属于后续纵向切片。

## 1. Demo 与 Portfolio Release 的区别

- **Demo**：证明某条具体能力链在明确环境中可运行、可失败、可解释。
- **Portfolio Source**：本目录中的项目故事、证据映射和索引。
- **Portfolio Release**：对外可访问、经过敏感信息检查、具有入口、版本和发布说明的完整成果。

一个 Demo 完成不等于 Portfolio Release 完成。

## 2. Demo 选择标准

每个 Demo 必须有：

- 明确用户问题；
- 可运行入口；
- 固定版本和环境；
- 正常路径；
- 至少一个安全失败或限制；
- 可量化结果；
- 代码、测试和 Experiment；
- 当前与目标能力边界。

## 3. 当前可组织的 Demo

### 3.1 Knowledge Governance Demo

**状态：已实现核心资产 / 正式 Feishu 发布待完成**

展示：

- Git 唯一真源；
- Platform Registry；
- Document Bundle；
- Knowledge / Context / Projection 边界；
- 冻结交付和全量校验；
- Feishu 单向覆盖发布设计。

当前缺口：最终 Git → Feishu 覆盖发布、逐页回读和公开展示入口。

### 3.2 Trusted Action Chain Demo

**状态：已验证最小链路**

展示：

```text
Custom GPT
→ Dev Tunnels
→ Action Gateway
→ Local Runtime
→ runtime.status
```

同时演示错误 Key、未知 Capability 或安全拒绝，证明默认拒绝和双层 Policy。

当前缺口：持久 Task、Approval、Evidence、多执行器和生产公网。

### 3.3 Deterministic Planner–Executor Delivery Demo

**状态：流程已多次真实使用**

展示：

- Planner 生成完整冻结包；
- Manifest、Hash、Scope 和 Delete；
- Executor 机械应用；
- Registry、链接和历史引用分类；
- 全量校验；
- 单 Commit、Push 和远端回读；
- 失败时从安全停止点续跑。

当前缺口：通用 Package Generator 和自动 Impact Analyzer。

## 4. 下一纵向切片

### 4.1 Task Control Demo

**状态：Accepted Design / Not Implemented**

目标：

- Task / Version；
- Execution / Result；
- Lease；
- Checkpoint；
- Pause / Resume；
- Approval；
- Evidence；
- Side-effect Ledger。

验收必须有真实持久状态和中断恢复，不能只展示架构图。

### 4.2 AI 视频工作流 Demo

**状态：Planned / Not Started**

目标用户路径：

```text
短故事
→ 角色 / 场景
→ 分镜
→ Prompt
→ 可替换 Provider
→ 结果、成本、重试和评价
```

该 Demo 用于验证平台能否支撑真实产品业务，不要求现在创建根级 `products/`。

## 5. 建议发布顺序

```text
整理当前三个证据型 Demo
  → 完成全库人工 Review
  → Git → Feishu 发布与回读
  → 形成 Portfolio README / 展示页
  → 录制或编写 Demo Runbook
  → 敏感信息检查
  → Portfolio Release Tag
  → 再推进 Task Control 和 AI 视频增强版
```

正式 Portfolio 不必等待所有远期能力，但每个未实现能力必须明确标记。

## 6. Release Gate

正式 Release 至少满足：

- 入口和运行说明可用；
- 固定 Commit / Tag；
- `npm run verify` 通过；
- Demo Evidence 可回查；
- 失败路径和限制可解释；
- Feishu 或展示页面回读；
- 没有 Secret、私人 Context、Token 或第三方全文泄漏；
- 简历和面试材料与仓库事实一致。

## 7. 关联资产

- [PRD-005 平台能力地图与产品成熟度](../../00_项目与产品/PRD-005-平台能力地图与产品成熟度/README.md)
- [ARC-016 能力依赖、多任务并行与分阶段 MVP](../../04_平台架构/ARC-016-能力依赖多任务并行与分阶段MVP路线图/README.md)
- [WFL-011 产品孵化与专项业务工作流框架](../../07_工作流与项目治理/WFL-011-产品孵化与专项业务工作流框架/README.md)
- [PRT-006 项目成果与证据索引](../PRT-006-项目成果索引/README.md)
