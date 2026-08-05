# Local Control CLI

## What

`@ai-agent-platform/local-control` 是 `SOL-LCL-001` 的本机能力实现包。它以机器可调用 CLI 暴露受控的 `local.*` Capability，读取注册项目、Git、文件、Runtime、Executor 和 Service 的当前事实。

正式机器入口：

```bash
aap-local invoke --input - --output json
```

stdin 只接收一个 `LocalRequest` JSON，stdout 只返回一个 `LocalResult` JSON。CLI 一次请求、一次结果、一次退出，不保存 Task、Plan、Claim 或长期 Execution 状态。

## Boundary

本包拥有：

- Local Request / Result / Error；
- Capability Catalog；
- Project / Runtime / Executor / Service Registry；
- 路径、敏感资源、命令模板和预算策略；
- Git / File / Runtime / Executor / Service Adapter。

本包不拥有：

- Task、Plan、Claim 和调度状态；
- 总控推理；
- Browser DOM；
- 模型推理 Provider；
- Approval、Artifact 或 Evidence 生命周期；
- Local Control HTTP Service 或 Daemon。

## Capability

- `local.health.read`
- `local.capabilities.read`
- `local.project.describe`
- `local.repository.snapshot.read`
- `local.repository.tree.read`
- `local.repository.file.read`
- `local.runtime.status.read`
- `local.executor.status.read`
- `local.query.batch`
- `local.service.ensure_running`

默认全部只读。唯一副作用实验 `local.service.ensure_running` 只能使用本机注册表中的固定启动模板，并且默认需要显式设置 `LOCAL_CONTROL_ALLOW_SERVICE_START=true`。

## Registry

MVP 只注册 `ai-agent-platform`。项目根目录按以下顺序解析：

1. `LOCAL_PROJECT_ROOT`；
2. 从当前工作目录向上查找 `package.json` 中名称为 `ai-agent-platform` 的目录。

默认注册：

- Runtime / Service：`gateway`；
- Executor：`git`、`node`、`codex`、`opencode`。

Gateway Health Probe 默认是 `http://127.0.0.1:8787/health`，可通过 `LOCAL_GATEWAY_HEALTH_URL` 覆盖，但仍只接受 Loopback URL。

## Development

```bash
npm run check:local-control
npm run pack:check --workspace @ai-agent-platform/local-control
```

测试覆盖 npm 打包、stdin/stdout 协议、真实 Git 仓库读取、分页 Tree、文件范围、路径逃逸、敏感资源、Runtime、Executor、Batch 和受控 Service 启动。

## Related

- `docs/technical/技术方案/第二阶段/SOL-LCL-001-Local-Control与CLI-MVP.md`
- `docs/GATEWAY-INTEGRATION.md`
- `docs/RUNBOOK.md`
- `docs/MVP-VERIFICATION.md`
- `AGENTS.md`
- `packages/README.md`
