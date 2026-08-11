# 手机模型调研、选型、测试与验证全景归档

> 归档范围：`SOL-MOB-001`、端侧模型研究、MLXHub/Qwen/Gemma/Privacy AI/OpenCode、Tool Proposal、FAST/REASON、Execution Flow Runtime 手机能力验证，以及相关 Chat / 项目记忆。  
> 归档日期：2026-08-12  
> 当前结论层级：**技术归档 / 当前冻结基线入口**  
> 发布边界：`docs/technical/`，不参与飞书知识投影。  
> 事实纪律：历史、失效实验、当前实现和未来方向严格分开。

## 1. 这套文档解决什么问题

过去手机模型方向的事实散落在：专题 Chat、续接 Chat、项目记忆、`SOL-MOB-001` 技术方案、测试脚本/结果、OpenCode 实验、真机日志，以及后来的 Execution Flow Runtime live gate 中。

本归档把这些材料重新整理为一个可追溯入口，回答四个长期问题：

1. 为什么最终选择 **iPhone 17 Pro + MLXHub LAN Server + Qwen3.5 4B FAST/REASON**；
2. 哪些能力真正经过了真机验证，哪些只是早期构想；
3. 哪些失败来自模型，哪些来自测试脚本、协议适配或运行环境；
4. Phase 3 后续应该怎样使用手机算力，避免重新走已经被否定的路线。

## 2. 当前一句话基线

```text
Phone Runtime = MLXHub LAN Server on iPhone 17 Pro

FAST
  = sayhelloproton/Qwen3.5-4B-MLX-4bit-no-think
  = default / high-frequency / structured judgement / Vision

REASON
  = mlx-community/Qwen3.5-4B-MLX-4bit
  = explicit low-frequency escalation

Scheduling
  = one device-global serial inference lane
  = max inference concurrency 1

Authority
  = model produces judgement / proposal
  = Flow / Runtime / Policy / Approval / Executor own control and side effects
```

截至 2026-08-11，Execution Flow Runtime `0.0.0-lab.13.3.1` 的 FAST 与 REASON 手机能力 gate 均已完成；最终实验目录收敛为 `experiments/execution-flow-runtime/`，临时 integration spike / final acceptance harness 已删除。

## 3. 状态标记

| 标记 | 含义 |
|---|---|
| **FROZEN** | 当前已冻结、后续应直接复用的基线 |
| **VALIDATED** | 已有真实设备 / API / 文件系统 / 测试证据 |
| **ACCEPTED** | 已接受的架构或工程决策 |
| **HISTORICAL** | 当时真实存在，但只用于理解演进 |
| **SUPERSEDED** | 后续已被替代，不得继续当成当前方案 |
| **INVALID-AS-VERDICT** | 实验执行过，但因 harness/checker 问题不能作为模型能力结论 |
| **OPEN** | 仍需在未来条件变化后重新验证 |

## 4. 阅读顺序

| 顺序 | 文档 | 主要问题 |
|---|---|---|
| 1 | [01-研究路线与选型时间线](01-研究路线与选型时间线.md) | 从最早构想到最终选型经历了什么 |
| 2 | [02-运行时与模型选型](02-运行时与模型选型.md) | 为什么是 MLXHub + Qwen FAST/REASON |
| 3 | [03-API-Vision-Context-性能与稳定性验证](03-API-Vision-Context-性能与稳定性验证.md) | API、Vision、长上下文、热稳定到底测到了什么 |
| 4 | [04-语义合同-Approval边界与安全验证](04-语义合同-Approval边界与安全验证.md) | 手机模型如何做候选判断而不拥有控制权 |
| 5 | [05-Tool-Proposal-OpenCode与执行权限](05-Tool-Proposal-OpenCode与执行权限.md) | native tool_calls 为什么失败，Tool Proposal 为什么仍可用 |
| 6 | [06-FAST-REASON角色与调度](06-FAST-REASON角色与调度.md) | FAST/REASON 的职责、切换和资源约束 |
| 7 | [07-Execution-Flow-Runtime手机能力验证](07-Execution-Flow-Runtime手机能力验证.md) | 最终平台场景能力 gate 如何收口 |
| 8 | [08-失败-误报-被替代结论与经验](08-失败-误报-被替代结论与经验.md) | 哪些失败不能再被误读 |
| 9 | [09-实验资产与证据索引](09-实验资产与证据索引.md) | 从结论回到脚本、结果和代码 |
| 10 | [10-Chat与记忆来源索引](10-Chat与记忆来源索引.md) | 这些知识来自哪些 Chat / 项目记忆 |
| 11 | [11-当前冻结基线与后续使用约束](11-当前冻结基线与后续使用约束.md) | 以后直接复用什么、什么情况下才重测 |
| 12 | [12-关键结论证据矩阵](12-关键结论证据矩阵.md) | 关键结论、证据等级与解释边界的审计矩阵 |

## 5. 与现有文档的关系

- [端侧模型节点与单模型多角色服务构想与验证方案](../端侧模型节点与单模型多角色服务构想与验证方案.md)：**HISTORICAL / Proposal**。保留早期目标、角色隔离和“模型提议、Runtime 裁决”等源头思想，但其中 Gemma/Qwen9B/训练路线不是当前选型。
- `docs/technical/技术方案/第二阶段/SOL-MOB-001-手机端单模型多角色服务MVP.md`：**HISTORICAL → VALIDATED BASELINE**。记录第二阶段能力边界和大量真机实验，是本归档的重要事实来源。
- `docs/technical/技术方案/第三阶段/06-SOL-P3-MOB-001-端侧模型Provider接入边界.md`：**ACCEPTED ARCHITECTURE INPUT**。将手机模型收敛到模型与推理 Provider，而不是业务领域真源。
- `experiments/execution-flow-runtime/`：**CURRENT VERIFIED EXPERIMENTAL IMPLEMENTATION**。当前保留的手机推理消费者与 capability live gate。

## 6. 不把什么混在一起

本归档特别避免以下错误等价：

```text
理论 context window
!= 推荐生产上下文预算

HTTP 200
!= 语义正确

finish_reason=stop
!= 结构化输出完整

model confidence
!= execution authorization

MLXHub native tool_calls fail
!= Qwen 不会做工具选择/参数提案

模型能力 gate PASS
!= BHR/Gateway/Approval/Task/LCL 全平台集成 PASS

压力测试发热
!= 日常生产 duty-cycle 必然不可用
```

## 7. 当前维护规则

1. 当前冻结事实优先看本目录 `11`，历史细节再向前追。
2. 新实验必须进入 `09` 的证据索引，并在 `08` 登记 checker/harness 异常。
3. 只有设备、MLXHub Serving、模型 Artifact、Inference Contract 或平台使用场景发生实质变化，才重开对应能力 gate。
4. 不再把已经删除的 `phase3-runtime-integration-spike` / `phase3-final-platform-acceptance` 当成正式包或当前手机能力证据。
5. 物理地址、局域网 IP、临时模型槽位等只属于实验环境，不进入平台公共合同。
