# MVP Runbook

从仓库根目录执行：

```bash
npm run dev-tunnel:doctor
npm run dev-tunnel:install
npm run dev-tunnel:setup
npm run dev-tunnel:start
```

`start` 是前台生命周期管理器。另开终端：

```bash
npm run dev-tunnel:status
npm run dev-tunnel:verify
npm run dev-tunnel:openapi
```

稳定性验收：

1. 记录私有配置中的现有 URL，但不输出；
2. `npm run dev-tunnel:stop`；
3. 用同一 ID 再次 `npm run dev-tunnel:start`；
4. `status` 必须显示 `public_url_stable: yes`；
5. 再次运行 `verify`；
6. 验证同一公开 taskId 出现在 Gateway 与 Runtime 日志。

正常停止只用 `npm run dev-tunnel:stop`。禁止 `pkill node`、`killall node`、`pkill devtunnel` 或删除 Tunnel 来完成重启。
