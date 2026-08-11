# 10 · Runtime Health 与推理可观测性

## 1. [FROZEN] Runtime 状态

```text
READY
DEGRADED
UNAVAILABLE
```

推荐语义：

- READY：Runtime 可服务，当前必需逻辑角色按已验证配置可用；
- DEGRADED：服务仍可响应，但 FAST/REASON 至少一项不可用或近期 provider health 异常；
- UNAVAILABLE：Runtime 无法提供实际 inference。

不要用持久化旧状态制造假 READY。

## 2. [FROZEN] Role 状态

```text
FAST   READY | UNAVAILABLE
REASON READY | UNAVAILABLE
```

状态必须结合当前配置、最近健康与能力验证结论。

## 3. [FROZEN] Lane 状态

```text
IDLE | BUSY
```

显示 activeInferenceRef / activeRole，便于跨域排障。

## 4. [FROZEN] 最小可观测指标

- queue depth；
- queue latency；
- inference latency；
- total latency；
- requested/actual mode；
- validation result；
- repair count；
- escalation；
- provider error；
- schema failure；
- last success/failure。

v1 不建设 metrics DB。

## 5. [FROZEN] 结构化日志落盘

路径：

```text
.ai-agent-platform/logs/model/
```

每笔有 `inferenceRef` 并尽量携带 caller trace refs。

## 6. [FROZEN] 隐私与 Context

默认不保存完整：

- Prompt；
- Task 文档；
- 源码；
- screenshot base64；
- secret；
- provider credential。

保存 bounded sanitized snapshot/fingerprint。

## 7. [DEFERRED] 管理 UI

Model Domain 定义 RuntimeStatus；最终是否在管理控制台或 Browser Side Panel 显示，由总纲/Deployment 决定，不新增 Model UI 服务。
