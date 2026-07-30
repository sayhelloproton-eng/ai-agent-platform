# Troubleshooting

已观察并修正：

- 对已有独立端口的持久 Tunnel 执行 `host <id> --port-number 8787`，当前 CLI 返回不支持批量更新端口。改为 `host <id>`。
- Host URL 只出现在前台 Host 输出，不一定出现在 `show --json`。应用从本次清空后的 Host 日志有界提取，并在找不到时失败关闭。
- 当前 CLI 的 JSON `tunnelId` 可能含点号集群后缀，解析器必须接受服务限定形式，但 Host 仍使用配置的稳定 ID。
- 短命父命令退出可能导致托管环境回收子进程。`start` 因此保持前台并监测三个子进程。
- OpenAPI Secret 扫描不能把文档中的普通 “Bearer authentication” 描述误判为真实 Token；只拒绝类似长凭据的 Bearer 值。
- 症状：Custom GPT Preview 的 Bearer 认证成功，但 Gateway 返回 `INVALID_TASK`。实际原因是 Preview 未严格生成内部 Task Contract，例如把 capability 改为其他名称、把 `requestedBy.type` 改为 `user`，并遗漏空 `input`。稳定修复是让 Action 使用零参数 `POST /v1/runtime/status`，由 Gateway 服务端生成 `taskId`、`runtime.status` capability、`custom-gpt` requester、空 input 和 requestedAt；不得放宽通用 `POST /v1/tasks`。

不要在这些错误后切换到其他 Tunnel 提供商，也不要创建第二个 Tunnel。
