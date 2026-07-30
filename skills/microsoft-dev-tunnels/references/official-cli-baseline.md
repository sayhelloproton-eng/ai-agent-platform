# Official CLI Baseline

验证环境：macOS Ventura Intel x86_64，官方 app-local CLI `1.0.2010+aa42024ecd`。

安装入口由应用固定为 Microsoft 官方 `osx-x64-zip`。发现顺序是应用 `.runtime/bin/devtunnel`，然后才是 PATH。

本版本实际帮助确认：

- GitHub 设备登录：`user login --github --use-device-code-auth`；
- 所有权检查：`user show --json`；
- 持久创建：`create <id> --allow-anonymous --expiration 30d --json`；
- 端口创建：`port create <id> --port-number 8787 --protocol http --json`；
- 持久 Host：`host <id>`；
- 刷新：`update <id> --expiration 30d --json`；
- 查询：`show <id> --json`。

当前 JSON `tunnelId` 可能含服务集群后缀，应用配置仍保存用户指定的稳定 ID。已配置端口后，`host <id> --port-number 8787` 会被本版本拒绝为批量端口更新；主流程必须使用 `host <id>`。

CLI 仍处于 Preview，未来运行时先读实际 `--help`，再更新应用和本参考。
