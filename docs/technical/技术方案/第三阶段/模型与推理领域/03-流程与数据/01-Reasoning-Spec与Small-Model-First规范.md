---
docId: MODEL-DOC-03-01
title: 04 · Reasoning Spec 与 Small-model-first 规范
docType: domain-rule
authority: normative
lifecycle: frozen
domain: model-reasoning
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 04 · Reasoning Spec 与 Small-model-first 规范

## 1. [FROZEN] 为什么 Reasoning Spec 是核心

第一版部署的是小模型或能力不统一的 API 模型。稳定性不能建立在“模型足够聪明，会自己理解所有上下文”上。

因此 Reasoning Spec 是 P0 控制合同，而不是 Prompt 调优附件。

## 2. [FROZEN] Spec 必备字段语义

概念结构：

```ts
interface ReasoningSpec<I, O> {
  id: string;
  version: string;
  purpose: string;

  allowedModes: readonly ("fast" | "reason" | "auto")[];
  requiredModalities: readonly ("text" | "image")[];

  inputSchema: RuntimeSchema<I>;
  outputSchema: RuntimeSchema<O>;

  instruction: string;

  maxContextBytes?: number;
  maxOutputTokens: number;

  routing?: AutoRoutingPolicy;
  repair?: "none" | "once";
}
```

实际 runtime schema 库由新仓库实施时统一选择；不得用 TS 类型代替运行时校验。

## 3. [FROZEN] 输入规范

调用方不传任意 prompt 字符串作为控制接口；传：

```text
specRef
mode
priority
trace refs
payload
optional image parts
```

Payload 必须先过 Spec input schema。

## 4. [FROZEN] 输出规范

控制类输出必须有限词汇：

例如：

```text
ALLOW | DENY | ESCALATE
IDLE | BUSY | BLOCKED | UNKNOWN
PROPOSE_CAPABILITY | NONE | NEED_MORE_INFO | ESCALATE
```

具体 vocabulary 归对应 Spec。

输出包含需要时的：

```text
decision
confidence
reasonCode
short rationale
```

不依赖长 CoT。

## 5. 示例：command risk

输入应提供确定性事实，而不是让模型重新猜：

```json
{
  "command": {"program":"git","args":["push","origin","main"]},
  "scope": {"targetWithinProject":true},
  "facts": {
    "forcePush":false,
    "remoteExpected":true,
    "branchExpected":true
  }
}
```

输出：

```json
{
  "decision":"ALLOW",
  "confidence":0.96,
  "reasonCode":"NORMAL_EXPECTED_OPERATION",
  "rationale":"目标 remote 与 branch 均符合当前执行上下文"
}
```

## 6. 示例：Browser page state

DOM/URL deterministic facts 优先由 Browser Extension 采集；只有冲突/不确定时才把结构化 facts + screenshot 给模型。

输出固定为页面状态、activityKind、confidence、建议的有限下一动作类型。

## 7. [FROZEN] Spec 版本化

Reasoning Spec：

- 代码内 TypeScript 定义；
- Git 版本化；
- spec id/version 显式；
- 修改 schema/decision vocabulary 是合同变更；
- 不做运行时 Prompt CRUD。

## 8. [FROZEN] Context 超限

Runtime 不偷偷摘要、裁剪、丢字段。

超限 → `CONTEXT_TOO_LARGE`。

调用方重组 Context 后重新调用。

## 9. [FROZEN] Small-model-first 验收

一个 Spec 只有在 M3 场景回归中对 FAST/REASON 配置模型表现稳定，才可以成为平台控制路径依赖。

Prompt “看起来合理”不等于 Spec 合格。
