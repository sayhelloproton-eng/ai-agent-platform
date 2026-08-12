---
docId: EXECUTION-DOC-03-03
title: 09 · Result、Evidence、UNKNOWN_SIDE_EFFECT 与恢复
docType: recovery
authority: normative
lifecycle: frozen
domain: execution
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 09 · Result、Evidence、UNKNOWN_SIDE_EFFECT 与恢复

## 1. Result vs Evidence

Result：Execution 对这笔执行的可信结论。

Evidence：支持这个结论的现实证据。

```text
Result = SUCCEEDED
Evidence = commit SHA / file hash / DOM message / HTTP status / screenshot / test report ...
```

模型自述不算执行 Evidence。

## 2. 统一 Result Envelope

详见 `06`。公共字段统一；`data` 仍按 Capability 强类型。

## 3. Delivery / Receipt 的使用边界

Delivery 只用于真实投递边界，例如 Runtime→Browser Extension command、Collaboration message→目标 Conversation。Local 同进程文件读取/函数调用不制造虚假的 Delivery/Receipt 状态。

## 4. Evidence 存储

小结构化 evidence 可入 record；大 evidence 只引用：

```text
logs
screenshots
test reports
large stdout/stderr
artifacts
```

建议 `EvidenceRef` 指向 `.ai-agent-platform` 管理的持久 artifact/log 路径或内部对象引用。

## 5. Browser 写动作可信链

```text
Precondition Evidence
→ Effect
→ Postcondition Evidence
→ Result
```

不能把 transport/click 当 Result。

### Submit

成功：目标 Conversation 中出现目标 message fingerprint。

### WAKE

成功：trigger message 真正进入目标 Worker；generation/action signal 可作为增强 evidence。

### Action Allow

成功：permission dialog 消失 + Action state changed/started/result。

### CREATE

成功：正确 Role URL → 新 c-id → identity verified → Task bind separately succeeds。

## 6. Local Evidence

写文件：before/after hash + diff。

Git commit：commitSha + HEAD。

测试：exitCode + report/log refs。

进程：processRef + pid + readiness + port/log。

Network：status + response metadata。

## 7. UNKNOWN Trigger

统一原则：

```text
side effect NOT_STARTED
+ failure
→ FAILED / NOT_APPLIED

side effect STARTED
+ insufficient postcondition evidence
→ UNKNOWN / UNKNOWN_SIDE_EFFECT
```

## 8. UNKNOWN Recovery

恢复不能“再执行一遍”，而是先问现实：

```text
Did it already happen?
```

### Browser

- message 是否已经存在；
- permission 是否已经消失；
- Action 是否开始/完成；
- Conversation 是否已经创建。

### Local

- file hash；
- Git HEAD；
- manifest/lockfile；
- managed process/port；
- endpoint state。

确认 applied → SUCCEEDED。

确认 not applied → 可重新校验并决定继续。

仍不明确 → UNKNOWN/STOP/Human。

## 9. Retryable

`retryable` 是上层提示，不是 Runtime 自动重放授权。

即使 retryable=true，也要在执行前重新校验 scope/precondition/fingerprint。

UNKNOWN 通常 retryable=false，直到 reality reconciliation 把状态转成可安全继续。

## 10. Carrier File Bridge 的 Result / UNKNOWN 边界

Carrier 文件传输失败与真实 Effect UNKNOWN 必须分开：

```text
download_link expired / relay fetch timeout / OpenAI 10s file fetch failure
→ carrier/file transport failure
→ 不自动推导 UNKNOWN_SIDE_EFFECT
```

只有真实 Effect 已 `STARTED` 且无法确认现实结果时才进入 Execution UNKNOWN。

若文件 bytes 已成功下载但 TaskDocument 尚未正式接收，Execution 可以保留受控 temporary result/evidence 并由上游重新提交 canonical write；不能因为 OpenAI 临时 URL 过期就重复执行已经发生的真实外部 Effect。
