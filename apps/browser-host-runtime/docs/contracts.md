# BHR 最终客户端合同候选

> 本文是 BHR 客户端候选和总控接线说明，不代表本领域冻结平台公共语义。

## Operation

| Operation | 请求 | 成功 `data` | 凭证用途 |
|---|---|---|---|
| `browser.dispatch.listPending` | `{host_id, limit}` | `DispatchSummary[]` | 无 |
| `browser.dispatch.claim` | `{dispatch_ref, host_id}` | `{claim_token, expires_at?}` | 领取投递阶段 |
| `browser.dispatch.get` | `{dispatch_ref, claim_token}` | `HostCommand` | 读取命令 |
| `browser.payload.resolve` | `{payload_ref}` | 非空 Payload | 解析最小 Wake/动作数据 |
| `browser.dispatch.deliveryAck` | `{dispatch_ref, claim_token, delivery}` | `{delivery_receipt, report_token}` | 确认网页副作用已经发生 |
| `browser.dispatch.hostResult` | `{dispatch_ref, report_token, result}` | Receipt | 回报回答观察/动作结果 |
| `browser.dispatch.uncertain` | `{dispatch_ref, credential, uncertain}` | Receipt | 副作用可能发生，进入复核 |
| `browser.dispatch.fail` | `{dispatch_ref, claim_token, result}` | Receipt | 仅投递前确定失败 |
| `approval.grant.get` | `{approval_ref}` | Approval Grant | 获取授权 |
| `approval.grant.consume` | `{approval_ref, grant_id, command_id}` | Receipt | 一次性消费授权 |

所有 HTTP 成功响应使用：

```json
{"ok":true,"requestId":"...","data":{}}
```

正式 HTTP 模式失败时不得回退 Fixture。

## Journal 状态

```text
RECEIVED
→ CLAIMED
→ PREPARED
→ EXECUTING

投递前确定失败：
→ PRE_DELIVERY_FAILURE_PENDING → REPORTED

网页副作用已经确认：
→ DELIVERY_ACK_PENDING → DELIVERY_ACKED
→ HOST_RESULT_PENDING → REPORTED

副作用是否发生不确定：
→ UNCERTAIN → REPORTED（服务端进入复核/人工接管）

记录结构损坏或持续不可恢复：
→ QUARANTINED（保留，不自动重试、不容量裁剪）
```

`UNCERTAIN`、全部 `*_PENDING`、`DELIVERY_ACKED` 和 `QUARANTINED` 均属于受保护非终态。只有超过保留期的 `REPORTED/FAILED` 可以清理。

## 幂等

BHR 同时约束：

```text
command_id
idempotency_key + logical_command_fingerprint
```

逻辑指纹不包含 `command_id` 和 `dispatch_ref`，因此服务端更换传输 ID 也不能造成重复网页副作用。同键不同指纹确定冲突；同键同指纹只接受一个逻辑命令。

## Uncertain Side Effect 候选

候选数据保留：

- `command_id / dispatch_ref / task_id`；
- `idempotency_key / command_fingerprint`；
- `binding_id / page_identity`；
- 最后执行阶段；
- 原因、错误和 Evidence 引用；
- 观察时间。

它不得映射为普通 Delivery Fail，不得触发自动重发。正式状态名称、凭证和服务端状态由总纲冻结。
