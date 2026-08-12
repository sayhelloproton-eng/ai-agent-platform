---
docId: DEPLOYMENT-DEPLOYMENT-CONFORMANCE-TECH-DESIGN
title: '`deployment-conformance` 详细技术方案'
docType: module-design
authority: normative
lifecycle: frozen
domain: deployment-governance
moduleRef: deployment-conformance
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs:
- DEPLOYMENT-DEPLOYMENT-CONFORMANCE-TECH-DESIGN
---

# `deployment-conformance` 详细技术方案

## 1. 定位

Conformance 回答：

> “这个 Module 是否可以被平台以统一、稳定、可升级的方式管理？”

它不替代领域业务测试。

## 2. Gate C1：Static Contract

检查：

- ModuleDescriptor schema；
- moduleRef/packageName/moduleVersion；
- Module Kind；
- templateVersion/platformCompatibility；
- Provides/Requires version 格式与冲突；
- Requirements 零副作用描述；
- Config Slot schema；
- Lifecycle 与 Kind 自洽；
- Verification Contract；
- Effects 描述；
- External Resource version 语义。

## 3. Gate C2：Package

检查：

- package exports；
- TypeScript 类型；
- runtime schema 可用；
- 标准 CLI/adapter entry；
- `--json` 或等价机器接口；
- stable result/error；
- secret 不泄漏；
- template compatibility；
- npm package version 与 descriptor 输出一致。

## 4. Gate C3：Behavior

对声明的 primitive 做合同级行为验证：

- `describe` 可读；
- `preflight` 无副作用；
- `status` 不伪造 READY；
- `verify` 返回真实 PASS/FAIL；
- `doctor` 默认无修复副作用；
- 声明 start/stop/restart/migrate 时验证基本行为和错误语义；
- ACTION_REQUIRED 可恢复语义。

## 5. 不验证什么

不判断：

- Model REASON 是否真的足够聪明；
- Browser CREATE/WAKE 的全部业务 E2E；
- Task 状态机是否业务正确；
- Agent askPeer/replyPeer 是否完整。

这些由对应领域 Gate 负责。

## 6. 执行位置

同一套 Conformance 用于：

```text
本地开发
CI
Package Release Gate
Upgrade Plan 前置检查
Template Migration 后复验
```

## 7. External Resource

Conformance 可以用 fake resource 验证 Adapter contract；真实资源可用性属于 deployment `verify`，不能让 CI 强依赖用户外部账号。

## 8. Custom GPT / Actions Conformance Profile

当 Module/Agent Package 声明 `custom-gpt` Carrier 时，Static/Behavior Gate 追加：

### Static

- every Action operation has explicit `x-openai-isConsequential`；
- no unsupported custom request headers；
- `operationId` unique and role-scoped；
- endpoint summary/description 与 parameter description 满足 OpenAI 当前长度约束；
- `openaiFileIdRefs` 只出现在需要 Conversation file ingress 的 operation；
- response schema 允许规范化 `openaiFileResponse`；
- Actions 与 Apps 不同时作为该 GPT 的 P0 capability。

### Gateway/File Bridge behavior

- runtime validates `openaiFileIdRefs` object shape；
- `agentGateway.fileBridge.maxInputFiles=10`、`maxInputFileBytes=10_000_000`、`maxAggregateInputBytes=50_000_000`；
- `agentGateway.fileBridge.inputFetchTimeoutMs=15_000`、`relayTtlMs=300_000`；
- transient `download_link` 不持久化；filename/MIME/URL 按 external-untrusted 验证；Carrier fetch 阻断 localhost/private/link-local/metadata SSRF；
- `openaiFileResponse` <= 10 files、<=10MB/file；
- image/video response file rejected；
- URL relay has `Content-Type` + `Content-Disposition`，token 必须 opaque、GET-only、single-purpose、artifact/outputRef scoped、bounded TTL；
- GPT-facing request/response 的**最终序列化字符数**必须 `<100,000`；inline base64 使 response `>=100,000` 时 serializer 必须在发送前切 URL relay，仍超限则返回 typed error；
- File Bridge typed errors 至少覆盖 invalid/count/size/aggregate/expired/fetch-timeout/fetch-failed/MIME-mismatch/unsupported-media/request-budget/response-budget/relay-expired/relay-scope-invalid；
- long operation does not rely on >45s blocking request；
- overload/server errors keep real 429/5xx semantics。

Conformance 只验证合同和 adapter 行为；Always Allow、Multi-Action Turn、Conversation file search、Code Interpreter Context Pack 的真实 ChatGPT 行为仍由 Carrier E2E Gate 判定。
