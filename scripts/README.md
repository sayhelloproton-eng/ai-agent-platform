# Repository Scripts

## What

本目录保存仓库级工程检查、验证和后续运行脚本。

## Why

根级脚本为知识资产、Skill 资产和未来 workspace 包提供统一、可复现的工程入口。

## Contains

- `repo-check.mjs`：检查 Node.js 基线、必要文件与目录、npm workspace 契约及敏感文件 Git 跟踪状态。
- `local-chain-test.mjs`：在随机 Loopback 端口真实启动 Gateway 与 Runtime，通过 6 个测试验证双层认证、双层 Policy 和 TaskResult；其中真实覆盖 Gateway Policy 放行 `system.info.safe`、Runtime Policy 二次拒绝并返回 rejected `TaskResult`；不访问公网。
- `local-stack.mjs`：校验三套显式 Key，依次启动并等待 Loopback Runtime、Gateway Ready，收到 SIGINT/SIGTERM 后清理两个子进程；不生成 Secret、不配置 Tunnel。
- `local-stack-test.mjs`：通过 5 个测试验证 Local Stack 配置失败、默认并发、启动顺序、真实 Task、Secret 日志、Shutdown、端口回收和无孤儿进程；不访问公网。
- `edge-bridge.mjs`：提供只读 `check` 和前台 `run` 两种模式，复用 Local Stack，把临时 Quick Tunnel 严格连接到 Loopback Action Gateway，并负责验证、状态和失败清理。
- `edge-bridge-test.mjs`：通过依赖注入模拟进程、Fetch、文件系统、时钟、信号与进程状态，不启动真实服务或访问真实网络。

## Boundary

本目录只处理跨仓库职责；`skills/*/scripts` 继续由各 Skill 独立维护。脚本默认不得写入远程系统、修改用户环境、读取 Secret 内容或自行修复失败项。

## Structure

当前包含根级仓库基线检查、真实本地链路验证、前台 Local Stack，以及代码就绪
的前台 Edge Bridge 编排。Batch 9B.1 不实际启动 Tunnel、部署 Worker 或配置
Secret。

## Edge Bridge

`edge:bridge:check` 是只读前置检查：确认平台与 `cloudflared`、Local Stack
Loopback 契约、认证变量名称、状态文件、用户 Cloudflare 配置文件，以及固定
Worker `/health`。发现 `~/.cloudflared/config.yaml`、`config.yml` 或任何现有
Bridge 状态文件时会安全阻塞，不移动、覆盖或删除文件；网络失败不会控制 VPN、
代理、DNS 或防火墙。

`edge:bridge:run` 是后续真实接入使用的前台长驻模式。它复用
`scripts/local-stack.mjs`，固定让 Quick Tunnel 只连接
`http://127.0.0.1:<gateway-port>`，绝不连接 Local Runtime。运行前要求 Gateway
外部 Key 与 Gateway→Runtime 内部 Key 均为 32～256 个无空白字符，两者必须
不同，且两份 Runtime 内部 Key 必须一致。Key 不写入状态、日志或 cloudflared
子进程环境。Gateway 的 Runtime URL 由 Bridge 强制锁定为
`http://127.0.0.1:<runtime-port>`；用户环境只能省略该值或提供规范化后完全
相同的地址，不能把 Gateway 指向 `localhost`、其他端口或任何外部 Runtime。

子进程环境按最小权限拆分：Build 不继承三套 Gateway/Runtime 运行时 Key；
Local Stack 获得运行所需 Key 和受控 Runtime URL，但不继承 Edge 或 Cloudflare
Secret；cloudflared 只获得运行所需的非 Secret 环境白名单，不获得任何
Gateway、Runtime、Edge 或 Cloudflare API Key。

Quick Tunnel 只接受单一合法随机子域的标准 HTTPS
`*.trycloudflare.com` 地址；拒绝凭据、端口、路径、Query 和 Fragment。所有
就绪请求均有超时与 65,536 字节响应上限，不无限重试。VPN 只是 Cloudflare
可达性的网络依赖，不承担身份认证，Bridge 不会控制 VPN。

运行状态文件固定为：

```text
/tmp/ai-agent-platform-edge-bridge.json
```

文件权限为当前用户读写，只记录版本、状态、时间、Bridge/cloudflared PID 和
临时 Origin，不保存 Secret、Authorization、环境变量或仓库路径。活动状态拒绝
重复启动；失效状态只在 `run` 前安全清理，不根据其中 PID 盲目终止进程。状态
创建使用独占写入和事务式权限设置：写入或 `chmod` 失败会回滚本次创建的文件，
中断发生在写入期间也会等待写入结束后清理，不会在 Bridge 返回后继续落盘，更
不会删除其他进程已存在的状态文件。

`run` 不使用 `nohup`、`launchd`、detached 子进程或自动重启。终端显示
`Ctrl+C to disconnect`；SIGINT/SIGTERM 会通过统一生命周期信号立即取消固定
Worker 检查、服务就绪轮询、轮询延迟、Tunnel URL 等待和 Tunnel 验证。
验证失败或受管进程异常退出时也只清理本次 Bridge 创建的 Build、Local Stack
和 cloudflared 句柄，随后删除本次拥有的状态文件。每个进程采用有限的两阶段
关闭：先 SIGTERM 并等待独立宽限时间，再 SIGKILL 并等待第二个确认截止时间；
Local Stack 的宽限时间为 5 秒，以覆盖其内部关闭预算。各资源并发清理，一个
进程失败不会阻止其他进程或状态文件的清理，也不会无限等待。端口占用时立即
失败，不杀进程、不接管服务、不更换端口。

## Usage

从仓库根目录运行：

```bash
npm run check:repo
npm run check:local-chain
npm run check:local-stack
npm run check:edge-bridge
npm run edge:bridge:check
npm run local:start
npm run verify
```

`npm run edge:bridge:run` 已实现但 Batch 9B.1 明确不实际执行。它将在后续经审计
授权的真实接入批次中使用。

## Maintenance

根级必要资产、workspace 契约或工程基线变化时同步更新检查逻辑和本 README。
本地 Gateway → Runtime 链路已实现；Edge Bridge 目前仅代码与本地测试就绪，
公网 Action 链路尚未建立。

## Related Docs

- [项目宪法](../AGENTS.md)
- [Gateway MVP 渐进式实施方案](../docs/technical/技术方案/Gateway/SOL-005-Custom-GPT-Actions与Gateway-MVP渐进式实施方案.md)
- [AI Knowledge Skill](../skills/ai-knowledge/README.md)
