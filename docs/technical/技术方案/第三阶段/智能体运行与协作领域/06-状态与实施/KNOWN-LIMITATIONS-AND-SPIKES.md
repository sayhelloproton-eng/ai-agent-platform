---
docId: AGENT-LIMITATIONS
title: 智能体运行与协作领域｜待确认项、限制与 Spike
docType: limitations
authority: normative
lifecycle: active
domain: agent-runtime-collaboration
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 智能体运行与协作领域｜待确认项、限制与 Spike

## 状态规则

```text
TODO = 正确目标和实施方法已经确定，但尚未完成
PENDING_SPIKE = 外部行为或关键假设尚未通过真实验证
KNOWN_LIMITATION = 已知限制，必须有当前 fallback / operator action
FUTURE = 不属于 v1 当前范围
```

任何 `PENDING_SPIKE` 都不得成为没有 fallback 的 correctness dependency。只有真实 E2E/实验通过，并确认不破坏 ownership / contract / recovery 后，才可提升为正式主路径。

## OAI-CARRIER-001｜Always Allow 稳定性
- Type: `PENDING_SPIKE`
- 目标：验证 `x-openai-isConsequential:false` 后 routine Action 是否可长期稳定免确认。
- Current fallback: Browser permission detection/handling。
- Blocks P0: No。

## OAI-CARRIER-002｜Multi-Action Worker Turn
- Type: `PENDING_SPIKE`
- 目标：验证单个 Worker Turn 内多次 Action 调用的真实稳定性。
- Current fallback: bounded multiple Worker Turns；每 Turn 前重读 owner facts；不得重放已成功 Action/Effect。
- Blocks P0: No。

## OAI-CARRIER-003｜Conversation-native file handling
- Type: `PENDING_SPIKE`
- 目标：验证返回/输入文件在后续 Conversation file search / Code Interpreter 中的稳定可用性。
- Current fallback: TaskDocument canonical truth + 显式 File Bridge/typed Action。
- Blocks P0: No。

## OAI-CARRIER-004｜Context Pack → Code Interpreter → Patch round trip
- Type: `PENDING_SPIKE`
- 目标：验证代码上下文打包、Code Interpreter 修改、文件回传、Execution apply/verify 的稳定链路。
- Current fallback: 2–10 个显式 code/text files + typed deterministic Execution capability。
- Blocks P0: No。

## OAI-CARRIER-005｜ZIP Context Pack
- Type: `PENDING_SPIKE`
- 目标：验证 ZIP 作为动态代码上下文载体的兼容性和可重复性。
- Current fallback: 多文件明确传输，不依赖 ZIP。
- Blocks P0: No。

## AGT-CARRIER-006｜非 Browser 的 c-id shortcut
- Type: `PENDING_SPIKE`
- 当前 correctness path: Browser 从真实 Conversation URL 观察/校验 c-id。
- 任何 current-link/Action shortcut 只能作为优化，未验证前不能替代 Browser identity path。
