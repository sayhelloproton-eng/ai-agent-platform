# Local Control Integration Runbook

## Prerequisites

- Node.js 20.x；
- npm 10.x；
- Git；
- `LOCAL_PROJECT_ROOT` 指向 `ai-agent-platform`；
- 固定安装的 `@ai-agent-platform/local-control`。

## Build and verify

```bash
npm ci
npm run check:local-control
npm run pack:check --workspace @ai-agent-platform/local-control
```

## Direct machine protocol

```bash
cat <<'JSON' | ./node_modules/.bin/aap-local invoke --input - --output json
{
  "local_request_version": "0.1.0",
  "request_id": "req-health-001",
  "capability": "local.health.read",
  "execution_mode": "SYNC",
  "actor": {
    "actor_type": "gateway",
    "actor_id": "action-gateway-primary"
  },
  "parameters": {},
  "budget": {
    "timeout_ms": 5000,
    "max_stdout_bytes": 65536,
    "max_result_chars": 50000
  }
}
JSON
```

## Gateway Process Adapter

```ts
import { createLocalControlProcessClient } from "@ai-agent-platform/local-control";

const client = createLocalControlProcessClient({
  executable: absoluteAapLocalPath,
  cwd: repositoryRoot,
  environment: {
    LOCAL_PROJECT_ROOT: repositoryRoot,
  },
});

const result = await client.execute(localRequest);
```

Gateway 必须自己处理认证、HTTP 和 Transport Error 映射。

## Work Consumer Adapter

```ts
import { createLocalWorkConsumer } from "@ai-agent-platform/local-control";

const consumer = createLocalWorkConsumer({
  client,
  resultPersistence,
});

const report = await consumer.run(localRequest);
```

Task Control / Worker 必须自己处理 WorkItem Claim、状态、去重、重试和 Result Ref 持久化。

## Service start

`local.service.ensure_running` 默认关闭。完成本机审计后显式设置：

```bash
export LOCAL_CONTROL_ALLOW_SERVICE_START=true
```

它只运行 Service Registry 固定模板，不接收调用端命令。

## Troubleshooting

- `LOCAL_CLI_NOT_AVAILABLE`：检查固定 npm 包和 Binary Path；
- `LOCAL_CLI_TIMEOUT`：检查 Gateway 上限和 Local Request Budget；
- `LOCAL_CLI_OUTPUT_TOO_LARGE`：缩小读取范围；
- `LOCAL_CLI_INVALID_RESULT`：停止接入，检查包版本或 stdout 污染；
- `PROJECT_NOT_REGISTERED`：设置 `LOCAL_PROJECT_ROOT`；
- `SENSITIVE_RESOURCE_DENIED`：不得绕过策略；
- `ACCEPTED`：Task Control 保存状态并按 Poll Hint 继续查询。
