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

## Boundary

本目录只处理跨仓库职责；`skills/*/scripts` 继续由各 Skill 独立维护。脚本默认不得写入远程系统、修改用户环境、读取 Secret 内容或自行修复失败项。

## Structure

当前包含根级仓库基线检查、真实本地链路验证和前台 Local Stack 启停编排。公网 Tunnel 与部署编排尚未落位。

## Usage

从仓库根目录运行：

```bash
npm run check:repo
npm run check:local-chain
npm run check:local-stack
npm run local:start
npm run verify
```

## Maintenance

根级必要资产、workspace 契约或工程基线变化时同步更新检查逻辑和本 README。本地 Gateway → Runtime 链路已实现，但公网 Action 链路尚未建立。

## Related Docs

- [项目宪法](../AGENTS.md)
- [Gateway MVP 渐进式实施方案](../docs/technical/技术方案/Gateway/SOL-005-Custom-GPT-Actions与Gateway-MVP渐进式实施方案.md)
- [AI Knowledge Skill](../skills/ai-knowledge/README.md)
