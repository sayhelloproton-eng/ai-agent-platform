---
docId: MODEL-DOC-03-04
title: 08 · Capability Proposal 与 Execution 桥接
docType: cross-domain-flow
authority: normative
lifecycle: frozen
domain: model-reasoning
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 08 · Capability Proposal 与 Execution 桥接

## 1. [FROZEN] 背景

第一版模型 API 不保证原生 Tool Calling，且平台不能把工具执行权交给模型。

因此使用“结构化 Proposal”模式。

## 2. 正式路径

```text
Caller prepares allowed capability candidates
↓
Model Runtime + capability.proposal Reasoning Spec
↓
Model outputs one Capability Proposal
↓
Output Validator validates Proposal schema
↓
Caller validates candidate allowlist
↓
Execution Runtime validates Scope / Policy / Approval
↓
Execution performs effect
↓
Typed Capability Result
↓
Caller optionally requests another inference round
```

## 3. [FROZEN] 模型限制

单次推理：

- 最多一个 Proposal；
- capability 必须来自输入候选；
- arguments 必须满足 schema；
- 不能发明 tool；
- 不能携带 credential/secret；
- 不能声明“已经执行”；
- 不能决定 Scope/Approval。

## 4. Proposal 不是 Tool Call

语义差异：

```text
Tool Call:
  模型协议可能隐含执行器会调用

Capability Proposal:
  只是一个经过强约束的候选建议
  后续确定性平台仍可以 DENY
```

## 5. [FROZEN] 中间层不新增服务

不创建：

```text
tool-service
tool-router
proposal-service
```

Proposal 转换/校验可以由调用领域已有控制模块承担；Execution 只接受正常 typed Capability Request。

## 6. [FROZEN] Result 回灌

回灌合同需：

- capability id；
- status；
- typed data；
- bounded evidence summary；
- references；
- 错误语义。

禁止直接灌：

- 20MB stdout；
- 整个 DOM；
- 全量日志；
- secrets。

## 7. [FROZEN] maxRounds

调用领域必须给 Proposal→Execution→Result→Model 循环设置有限轮次。

达到上限：

```text
STOP / ESCALATE / return unresolved
```

具体最终状态归调用领域，不归 Model。

---

## 当前正式约束：caller-owned bridge

正式链保持：Model Proposal → caller schema/allowlist/scope/policy/approval → Execution `executeCapability`。Model Runtime 不直接 import/call Execution；一次 infer 最多一个 proposal，caller 控制有限 maxRounds，禁止自主无限 Tool Loop。

## 9. Carrier Function Calling 与 Model Proposal 分层

Custom GPT 为调用 Gateway 所使用的 native Actions/Function Calling 是 Carrier transport/interaction mechanism；它不是本文件定义的 Capability Proposal。

因此：

```text
Custom GPT Action selection
→ Gateway route/domain call

Model Capability Proposal
→ caller validates
→ Execution admission/effect
```

两条链可以在同一 Worker Turn 中先后出现，但不得互相替代。尤其不能因为 Custom GPT 能 native Function Calling，就给本地 FAST/REASON 模型重新开放 autonomous Tool Loop。
