# Microsoft Dev Tunnels 应用

本目录是 Microsoft Dev Tunnels MVP 的可执行真源，负责官方 CLI 安装、持久 Tunnel 配置、本地 Runtime/Gateway/Tunnel Host 编排、验证和 Custom GPT OpenAPI 生成。

安全边界：

- Runtime 和 Gateway 只监听 `127.0.0.1`；
- Tunnel 仅转发 Gateway 的 `8787` 端口，不公开 Runtime `8790`；
- Tunnel 层可匿名访问，Gateway 仍强制 Bearer Key；
- CLI、实际公网 URL、PID、日志和解析后的 OpenAPI 都保存在忽略的 `.runtime/`；
-长期 Key 保存在用户私有的 `~/.config/ai-agent-platform/dev-tunnel.env`，不得提交或输出；
- `start` 必须指定已创建的持久 Tunnel ID，禁止临时 Tunnel；
- `stop` 只停止状态文件记录且签名匹配的本应用进程。

常用入口由根 `package.json` 提供：

```bash
npm run dev-tunnel:doctor
npm run dev-tunnel:install
npm run dev-tunnel:setup
npm run dev-tunnel:start
npm run dev-tunnel:status
npm run dev-tunnel:stop
npm run dev-tunnel:refresh
npm run dev-tunnel:verify
npm run dev-tunnel:openapi
```

Microsoft Dev Tunnels 仍是 Public Preview，无生产 SLA；持久 Tunnel 的开发期稳定 URL 也不等于永久域名所有权。连续 30 天无活动可能删除资源，维护由显式 `refresh` 命令完成，本应用不会自动安装后台保活任务。
