# Gateway Integration Contract

本文件只描述 Local Control 对唯一 Gateway 提供的接入合同，不实现 Gateway 领域内部路由。

## 固定调用

Gateway 使用锁定版本的本地安装包，通过安全进程 API 调用：

```text
executable: <repository>/node_modules/.bin/aap-local
args: ["invoke", "--input", "-", "--output", "json"]
shell: false
stdin: JSON.stringify(LocalRequest)
stdout limit: Local Request budget 与 Gateway 上限的较小值
stderr: 仅诊断，不转发给 Action
```

Gateway 必须：

- 从认证绑定注入 Actor；
- 注入 Correlation，不允许模型伪造受信任身份；
- 只路由 `local.*`；
- 为副作用命令要求 `idempotency_key`；
- 解析 stdout 中唯一 Local Result；
- 将 CLI 进程异常与领域 `FAILED` 结果区分；
- 不解析 Git 文本、不拼接底层命令、不读取 Local Control 注册表。

## 同步与异步

- `SYNC` 读取可在当前 Action 回合返回，不强制创建 Work Item；
- `ASYNC` 的 `local.service.ensure_running` 返回 `ACCEPTED` 或 `SUCCEEDED`；
- Task Control 保存 `process_ref`、`poll`、Execution State 和 Result Ref；
- CLI 不保存长期状态。

## CLI 进程故障映射候选

| 场景 | Gateway 候选处理 |
|---|---|
| exit `0` + 合法 Local Result | 按 Local Result 返回 |
| exit `2` | Gateway Adapter 请求构造或输入序列化错误 |
| exit `3` | Local Control 启动配置错误 |
| exit `4` | Local Result 序列化错误 |
| exit `10`、超时、信号退出 | Local Control 不可用或内部故障 |
| stdout 非单一 JSON | 无效下游响应，禁止猜测 |

最终 HTTP 路径、Operation ID、Gateway Envelope 和公共 Error 映射由跨领域审计冻结。
