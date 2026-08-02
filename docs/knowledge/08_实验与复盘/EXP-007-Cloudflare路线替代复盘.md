# EXP-007 Cloudflare 路线替代复盘

## 1. 文档定位

本文复盘为什么项目从 Cloudflare Worker / Edge Bridge 路线切换为 Microsoft Dev Tunnels 开发期入口，以及哪些结论仍可复用。

## 2. 原路线

初期目标是使用 Cloudflare Worker 提供固定 HTTPS 入口，再通过 Tunnel 或 Bridge 连接本机 Gateway。项目完成过 Worker、健康检查、真实公网部署和安全审计，也探索过 Edge Bridge。

## 3. 暴露的问题

- Worker 在线不等于已经连接本机；
- Edge、Tunnel、Origin、Secret 和 Gateway 同时引入，变量过多；
- 远端 Secret 漂移和阶段超时使证据难以稳定复现；
- 为验证 Custom GPT Actions，先维护完整边缘基础设施成本过高；
- 用户当前目标是开发期 MVP，不是生产公网平台。

## 4. 替代决定

项目选择 Microsoft Dev Tunnels 作为开发期公网入口：

```text
Custom GPT
→ Dev Tunnels
→ Loopback Gateway
→ Loopback Runtime
```

Cloudflare 文档和历史实现保留为 Superseded 审计证据，但不再作为当前运行指南。

## 5. 可复用经验

- 公网可访问、Origin 可达和业务链路成功是不同证据；
- 先验证最短用户路径，再决定生产基础设施；
- 阶段性工具可以替换，但 Contract、认证和 Policy 应保持稳定；
- 删除当前实现前保留历史原因和证据。

## 6. 当前事实边界

当前公网开发入口由 `apps/dev-tunnel/` 管理。旧 Cloudflare Edge Bridge 脚本已删除；Cloudflare 安全文档标为 Superseded。

## 7. 后续边界

只有出现生产部署需求、域名、安全和 SLA 约束后，才重新评估 Cloudflare 或其他边缘方案。

## 8. 结论与原则

- 基础设施选择服务于当前验证目标。
- 替代路线保留历史证据。
- 不把固定 URL 等同于完整链路。
- Contract 与安全边界应独立于公网 Provider。

## 9. 关联资产

- [DEC-001 架构决策演进](../00_项目入口/DEC-001-架构决策演进摘要.md)
- [EXP-006 Gateway / Runtime / Tunnel](./EXP-006-Gateway-Local-Runtime与Dev-Tunnels实验.md)
- [PRD-005 平台能力与产品成熟度](../01_产品体系/PRD-005-平台能力地图与产品成熟度/README.md)
