# Gateway → Local Control Process Adapter

## Status

`@ai-agent-platform/local-control` 现在正式导出：

```ts
createLocalControlProcessClient(options)
```

它实现唯一 Gateway 调用 `aap-local` 所需的安全进程边界。Gateway 领域仍负责 HTTP 路由、认证、限流和外部错误映射；本包不新增 Gateway 路由，也不拥有 Action OpenAPI。

## Fixed invocation

Adapter 固定追加：

```text
invoke --input - --output json
```

调用规则：

```text
trusted absolute executable
+ trusted fixed prefix args
+ fixed Local Control args
+ shell:false
+ stdin one LocalRequest JSON
+ stdout one LocalResult JSON
```

推荐 Workspace 配置：

```ts
const client = createLocalControlProcessClient({
  executable: resolve(repoRoot, "node_modules/.bin/aap-local"),
  cwd: repoRoot,
  environment: {
    LOCAL_PROJECT_ROOT: repoRoot,
  },
});
```

测试环境可以使用：

```ts
executable: process.execPath
trustedPrefixArgs: [resolve(packageRoot, "dist/cli.js")]
```

`trustedPrefixArgs` 只能来自服务器配置，不能由 Action、模型或 WorkItem Payload 提供。

## Security invariants

Adapter 强制：

- `executable` 和 `cwd` 必须是绝对路径；
- `shell:false`；
- 调用端不能改变固定 CLI 参数；
- 环境变量只允许：
  - `LOCAL_PROJECT_ROOT`；
  - `LOCAL_GATEWAY_HEALTH_URL`；
  - `LOCAL_CONTROL_ALLOW_SERVICE_START`；
- Timeout 取 Adapter 上限与 `LocalRequest.budget.timeout_ms` 的较小值；
- 调用方 `AbortSignal` 取消会终止子进程并返回 `LOCAL_CLI_CANCELLED`；
- stdout 上限取 Adapter 上限与 `LocalRequest.budget.max_stdout_bytes` 的较小值；
- stderr 独立限额，内容不进入 Action Response；
- stdout 必须只有一个 JSON Value；
- `request_id` 和 `capability` 必须与原请求一致；
- Canonical Local Result 必须通过运行时校验。

## Domain result vs transport error

```text
CLI exit 0 + valid LocalResult
→ 返回 LocalResult
→ 包括领域 FAILED 结果

CLI 未启动 / 超时 / 输出过大 / 非法 stdout
→ 抛出 LocalControlTransportError
→ Gateway 映射为自己的安全 Transport Error
```

稳定 Transport Error：

```text
LOCAL_CLI_NOT_AVAILABLE
LOCAL_CLI_CANCELLED
LOCAL_CLI_TIMEOUT
LOCAL_CLI_OUTPUT_TOO_LARGE
LOCAL_CLI_PROCESS_FAILED
LOCAL_CLI_INVALID_RESULT
```

Gateway 不得把 stderr、Stack、绝对路径或底层命令返回给 Action。

## Sync and async boundary

- 同步只读 `local.*` 可以在当前 Action 回合直接返回；
- `local.service.ensure_running` 返回 `ACCEPTED` 或最终 Local Result；
- Task Control 保存异步状态、轮询计划和 Result Ref；
- Process Adapter 不保存状态，也不执行重试和去重。

## Not implemented here

以下仍由总控和 Gateway 领域完成：

- `/v1/local/*` 最终 HTTP 路径；
- Operation ID；
- 外部 Request Envelope；
- Bearer 身份到 Local Actor 的绑定；
- Gateway Transport Error 到公共 Error 的映射；
- Custom GPT OpenAPI。
