# Action Gateway

`@ai-agent-platform/action-gateway` 是 `ai-agent-platform` 的唯一外部 HTTP 入口。它负责认证、限流、并发预算、公共合同校验和领域 Adapter 路由，不拥有 Task、Local Resource、Browser DOM 或 Approval 语义。

## 当前接口

公开：

```text
GET /health
GET /ready
```

受 Bearer API Key 保护：

```text
GET  /v1/capabilities
POST /v1/tasks                         # 旧 Local Runtime 直通链路
POST /v1/runtime/status
POST /v1/task-control/intake           # Phase 2 Task Intake v1
POST /v1/controller/task-context
POST /v1/controller/task-claim
POST /v1/controller/task-command
POST /v1/controller/task-release
POST /v1/browser-host/invoke           # BHR Server Contract v1
POST /v1/approvals/grants              # 单次 Approval Grant 签发
```

## Phase 2 生产组合

Gateway 启动时组装：

- `TaskControlService` 与持久化 JSON Store；
- 正式 Controller Adapter；
- Phase 2 Integration Store；
- TSK → LCL Local Work Worker；
- Browser Host Server Adapter；
- Local Runtime 兼容链路。

Task Store 只保存状态与引用。Payload、Approval Grant、Local Result 和 Evidence 正文进入 Integration Store 或相应领域 Store。

## Local Work Worker

Worker 定期查询 `targetDomain=local-control` 的 Pending Work Item，执行：

```text
claim → start → Local Control Client → progress / complete / fail
```

`PARTIAL` 是一次 Local Request 的终态，但映射为 Work Item 非终态进度。Worker 使用 Work Item + Attempt 派生幂等键，不解释 Task 业务语义。

## Browser Host

`/v1/browser-host/invoke` 支持 Host Registry、Dispatch、Payload、Approval 和结果回报。凭证生命周期为：

```text
Claim Token → Delivery Receipt + Report Token → Host Result / Uncertain
```

注册 Host 必须存活且声明匹配 Capability；Delivery/Result/Uncertain 的 Task、Dispatch 和 Command 身份必须一致。

## 安全

- 默认只监听 Loopback；
- 外部 Key 与 Runtime 内部 Key 分离；
- 固定 Body、Timeout、Rate Limit 与并发预算；
- 不透传外部 Authorization；
- 错误响应不输出 Stack、Secret、DOM、stdout/stderr；
- Phase 2 Store 文件使用受控路径和 `0600` 写入；
- BHR `UNCERTAIN` 不自动重试可能已经发生的网页副作用。

## 配置

除原有 Gateway/Runtime 配置外，Phase 2 使用：

```text
ACTION_GATEWAY_TASK_CONTROL_STATE_PATH
ACTION_GATEWAY_CONTROLLER_IDEMPOTENCY_STATE_PATH
ACTION_GATEWAY_PHASE2_INTEGRATION_STATE_PATH
ACTION_GATEWAY_LOCAL_WORKER_POLL_MS
ACTION_GATEWAY_PROJECT_ROOT
```

## 验证

```bash
npm run verify --workspace @ai-agent-platform/action-gateway
npm run check:phase2-integration
```

`phase2-four-domain-e2e.test.mjs` 使用真实 HTTP Gateway、正式 CTL/TSK、真实 Local Control Capability 和 BHR 生产 HTTP Client 完成自动化闭环。真实 Chrome/ChatGPT 页面操作另按手工 Runbook 验收。
