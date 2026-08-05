# Local Control MVP Runbook

## 前置

- Node.js 20.x；
- npm 10.x；
- Git 可执行；
- `LOCAL_PROJECT_ROOT` 指向 `ai-agent-platform` 仓库，或当前工作目录位于该仓库内。

## 构建与测试

```bash
npm ci
npm run check:local-control
npm run pack:check --workspace @ai-agent-platform/local-control
```

## 机器调用示例

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
  "parameters": {}
}
JSON
```

## 仓库读取

调用端只能提供 `project_id=ai-agent-platform` 和相对路径。绝对路径、`..`、软链逃逸、`.env*`、私钥、认证缓存、`.git` 内部和 `node_modules` 会被拒绝。

## Runtime 与 Service

默认 Gateway Probe：

```text
http://127.0.0.1:8787/health
```

可以设置 `LOCAL_GATEWAY_HEALTH_URL`，但只接受 Loopback URL。

`local.service.ensure_running` 默认关闭。完成本机审计后显式设置：

```bash
export LOCAL_CONTROL_ALLOW_SERVICE_START=true
```

它只会运行注册模板 `npm run local:start`，不会接受调用端命令、参数或环境变量。

## 故障处理

- `PROJECT_NOT_REGISTERED`：设置 `LOCAL_PROJECT_ROOT`；
- `SENSITIVE_RESOURCE_DENIED`：改用非敏感、已治理的仓库文件；
- `PROCESS_TIMEOUT`：缩小请求或检查注册依赖；
- `OUTPUT_TOO_LARGE`：缩小行范围、页大小或 Batch；
- `SERVICE_START_NOT_ALLOWED`：不要绕过策略，先完成本机启动授权；
- `ACCEPTED`：由 Task Control 保存状态并按 `poll` 再查询。

不得通过修改 CLI Contract、放开任意 Shell 或删除安全测试来消除失败。
