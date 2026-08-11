# 10｜Chat 与项目记忆来源索引

> 核心问题：本归档从哪些对话和项目记忆恢复了手机模型研究历史？

## 1. 来源说明

ChatGPT 项目中的历史讨论并不都以“完整 raw transcript 文件”存在于仓库。此次归档使用三类来源交叉恢复：

1. **项目内可检索 Chat / conversation context**；
2. **项目长期记忆与各 Chat 同步的 formal baseline memory**；
3. **由对话生成的测试脚本、结果、技术方案和 Runtime 代码**。

因此本文件是“可追溯主题索引”，不是声称把 ChatGPT 后端全部原始消息逐字导出。

## 2. 已确认的主 Chat

| 日期 | Chat / 会话标题 | 主要内容 | 沉淀位置 |
|---|---|---|---|
| 2026-08-04~05 | `SOL-MOB-001-手机端单模型多角色服务MVP` | 从端侧构想到 Phase 2 可选后置 MVP；领域边界、Provider Port、多角色 | 01、02、04、11 |
| 2026-08-06 | `SOL-MOB-001 继续` | 现成 App vs 自建 Host、模型候选、FAST/REASON 需求、测试节奏 | 01、02、06 |
| 2026-08-08 | `Chat｜手机模型 Tool Calling、OpenCode 执行权限与 Browser Host 驱动边界` | MLXHub/Privacy AI/Gemma 比较、Tool Calling、OpenCode、权限边界 | 02、05、08、09 |
| 2026-08-09 | `Chat｜手机模型 Tool Calling、OpenCode 执行权限与 Browser Host 驱动边界-继续` | 最终 MLXHub runtime、Qwen FAST/REASON、Tool Proposal、真实 E2E、并发/性能 | 02、03、05、06、11 |
| 2026-08-10 | `第三阶段的总纲` | Phase 3 模型与推理领域、Execution Flow Runtime 与 Provider 边界 | 06、07、11 |
| 2026-08-11 | `第三阶段的总纲｜续接 01` | Execution Flow Runtime EF4/EF5/集成验证、最终手机 capability test 方向 | 07、08 |
| 2026-08-11~12 | 当前续接 Chat | FAST 20-request gate、REASON 12-request gate、harness/scoring 修正、实验包清理与结项 | 07、08、11 |

## 3. 跨领域 Chat 中的手机相关输入

手机模型并不是孤立专题。以下类别 Chat 也贡献过约束：

- `第二阶段的总纲*`：手机模型不阻塞 Phase 2 四域；BHR/LCL/TSK/CTL 各自拥有自己的状态和执行权；
- `SOL-TSK-001*`：WorkItem / ResultRef / Task progression 不由 MOB 直接修改；
- `SOL-BHR-001*`：Browser binding / screenshot / real browser action 归 BHR；
- `SOL-LCL-001*`：File / Shell / Runtime fact 归 Local Control/Execution；
- Phase 3 领域划分讨论：SOL-MOB 进入“模型与推理领域”，Agent 只表达 FAST/REASON/Vision 等逻辑需求。

这些会话不是手机选型主 Chat，但决定了手机模型“不能拥有”的边界。

## 4. 关键记忆同步节点

### 2026-08-06~07

- iPhone 17 Pro 作为专属模型机；
- 放弃自建 iPhone Model Host / llama.rn 路线；
- 测试脚本 cooldown 与生产调度分离。

### 2026-08-08

- MLXHub native OpenAI tool_calls 不可靠；
- Tool Proposal / Adapter / Policy / Approval / Execute 分层；
- read/write/run 权限边界和真实文件 E2E。

### 2026-08-09

- FAST / REASON 正式模型 ID；
- FAST 默认高频，REASON 低频升级；
- Runtime 全局串行；
- Text/Vision/128KB/context/sustained 综合结果；
- Gemma 退出主线。

### 2026-08-10~11

- Execution Flow Runtime provider-agnostic；
- Flow 拥有 transition；
- FAST/REASON capability gate 转为 mock 平台输入 + real phone inference；
- 真实 BHR/Gateway/Approval 不应混入手机算力 capability test。

### 2026-08-11 结项

- FAST capability GO；
- REASON capability GO；
- `execution-flow-runtime@0.0.0-lab.13.3.1`；
- 临时 Phase 3 integration/acceptance 实验目录删除。

## 5. 如何使用这个索引

如果后续某个 Chat 说“以前我们已经验证过 X”，先在本文件找到对应 Chat 主题，再去 `09` 找物理证据；若只有 Chat 结论、没有可复核测试资产，则只能标记为 **conversation-derived decision/context**，不能提升为新的实测事实。
