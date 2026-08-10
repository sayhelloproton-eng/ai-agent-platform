# Phase 3｜需求目标与成功标准

## 1. 用户 / 平台目标

最终平台使用体验应该收敛为：

```text
用户给目标
→ Controller 决策
→ Task 自动协调
→ Runtime 路由到 Local / Browser / Model / 其他 Capability
→ 需要高风险动作时请求一次人工批准
→ 平台继续
→ Task 完成
```

用户不应在正常运行中理解或操作：

- claimEpoch；
- journal；
- poll interval；
- report token；
- dispatch internal state；
- Browser DOM selector。

这些只属于诊断和运维层。

## 2. 架构需求目标

### R1 独立部署

任何主要模块都不能假设其他模块与自己同进程或同目录。

### R2 可替换

Provider / Adapter 更换不改业务 Flow。

### R3 稳定公共语义

跨域 ref、result、error、approval、idempotency、event、capability descriptor 必须版本化。

### R4 Durable Coordination

Task Control 能正确表达业务等待、执行租约、Delivery、Continuation 和 Recovery。

### R5 Bounded Execution

Browser / Local / Inference Module 只执行边界内 Capability，不接管全局 Task Workflow。

### R6 可验证

真实 Browser / 手机设备不再承担主要状态机调试；核心 race 可以在 deterministic simulator 中复现。

### R7 AI-friendly Interface

模块 CLI / API / schema 应可被 Agent 自描述和发现，减少隐藏提示词假设。

## 3. Phase 3 成功标准

### Gate A：公共领域冻结

- 公共 contract packages / schemas 明确；
- module manifest / capability descriptor 明确；
- logical ref 与 provider mapping 明确；
- transport-neutral port 明确；
- error / result / approval / idempotency 统一语义明确。

### Gate B：Task Domain vNext

自动化证明：

- Approval waiting 不持有 execution lease；
- Delivery 后 execution 不可反向失败；
- continuation failure 独立表达；
- no blind retry；
- crash / lease expiry / replay 可确定恢复。

### Gate C：Deployment Independence

同一测试 Flow 至少在两种组合下运行：

```text
A. in-process adapter
B. localhost HTTP adapter
```

Flow 本身不修改。

### Gate D：Provider Replacement

至少一个 inference / capability provider 通过配置替换，Flow 不修改。

### Gate E：Browser Lifecycle vNext

- Observation read-only；
- Execution Delivery terminal；
- Wake Delivery terminal；
- busy defer；
- dynamic page scroll 不由 observation 隐式控制。

### Gate F：真实 E2E

最终只运行少量真实验收：

```text
Goal
→ Controller
→ Task
→ Local / Browser Capability
→ Approval
→ Delivery / Result
→ Controller continuation
→ Complete
```

真实环境失败后先回 simulator / contract test，不在 Browser 上无限补丁循环。
