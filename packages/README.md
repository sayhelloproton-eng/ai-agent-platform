# Shared Packages

## What

`packages/` 保存可由多个平台组件复用的运行时工程包。

## Why

跨 Gateway、Runtime 和 Capability 的稳定协议与基础能力需要独立边界，避免完整应用互相耦合。

## Contains

- `contracts/`：Task、Result、Error、Capability 与运行时校验的公共协议包。
- `auth/`：Bearer 解析、API Key 校验、安全比较和 Header 脱敏的基础认证包。

`contracts` 定义跨组件协议；`auth` 提供基础认证原语。两者都不承担完整应用职责。

## Boundary

- `apps/` 保存可运行、可部署的完整应用；
- `capabilities/` 保存白名单执行能力；
- `skills/` 保存 Agent Skill，不属于 npm workspace；
- `packages/` 不得放置完整应用、Provider 凭据或环境专属状态。

## Structure

每个包必须具有 README、测试、明确公共 API 和独立构建入口。只在存在真实调用边界时创建新包。

## Usage

从仓库根目录使用 npm workspace 命令构建或验证指定包：

```bash
npm run check:contracts
npm run check:auth
```

## Maintenance

公共协议或跨包边界变化时，先检查兼容性、测试和相关技术方案。不得用共享包绕过上层 Port、Contract 或权限边界。

## Related Docs

- [项目宪法](../AGENTS.md)
- [Gateway 技术方案](../docs/technical/技术方案/Gateway/README.md)
- [AI Knowledge Skill](../skills/ai-knowledge/README.md)
