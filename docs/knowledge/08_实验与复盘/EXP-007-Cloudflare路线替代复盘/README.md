# EXP-007 Cloudflare 到 Dev Tunnels 路线替代复盘

> 核心结论：开发期验证应优先选择变量最少、证据最短的用户路径；公网 Provider 可以替换，但 Gateway / Runtime Contract、认证、Policy 和本机边界必须保持稳定。

## 1. 复盘问题

为什么项目从 Cloudflare Worker / Edge Bridge 路线切换到 Microsoft Dev Tunnels，哪些内容被替代，哪些工程结论继续保留？

## 2. 原路线

初期路线计划：

```text
Custom GPT
→ Cloudflare Worker / Edge
→ Tunnel or Bridge
→ Local Gateway
→ Local Runtime
```

项目完成过 Worker、健康检查、真实公网部署和安全审计，也探索过 Edge Bridge。

## 3. 暴露的问题

- Worker 在线不等于本机 Origin 可达；
- Edge、Tunnel、Origin、Secret、Gateway 和 Runtime 同时引入，变量过多；
- 远端 Secret 漂移和阶段超时使证据难以稳定复现；
- 验证 Actions 到本机链路之前，先维护完整边缘基础设施成本过高；
- 当前目标是开发期 MVP，不是生产公网平台。

## 4. 替代决定

当前开发入口改为：

```text
Custom GPT
→ Microsoft Dev Tunnels
→ Loopback Gateway
→ Loopback Runtime
```

Cloudflare 历史实现和安全文档保留为 Superseded 证据，不再作为当前运行指南。

## 5. 为什么替换入口而不重写核心

保持不变：

- Action Contract；
- Gateway / Runtime 分层；
- 外部与内部 Key；
- 默认拒绝 Policy；
- Runtime Loopback；
- Capability 边界；
- 错误和回读规则。

被替换的是开发期公网 Adapter，而不是平台内部信任模型。

## 6. 效果

替代后：

- 减少 Edge 和 Origin 的中间变量；
- 更快证明 Custom GPT 到本机 Runtime 的真实路径；
- 保留未来重新接入 Cloudflare 或其他 Provider 的接口边界；
- Cloudflare 不再占据当前 MVP 的主要维护成本。

## 7. 可复用经验

1. 公网可访问、Origin 可达和业务链路成功是三类证据。
2. 先验证最短用户路径，再决定生产基础设施。
3. 阶段性工具可以替换，内部 Contract 不随 Provider 漂移。
4. 替代路线必须保留历史原因和真实证据。
5. 只有出现域名、SLA、边缘安全或生产部署约束后，才重新评估生产入口。

## 8. 当前事实边界

当前公网开发入口由 `apps/dev-tunnel/` 管理。Cloudflare Edge Bridge 不在当前执行路径。本文不声称 Dev Tunnels 是生产方案，也不否定未来重新采用 Cloudflare。

## 9. 关联资产

- [EXP-006 Gateway、Local Runtime 与 Dev Tunnels 安全链路实验](../EXP-006-Gateway-Local-Runtime与Dev-Tunnels实验/README.md)
- [DEC-001 架构决策演进摘要](../../00_项目入口/DEC-001-架构决策演进摘要.md)
- [PRD-005 平台能力地图与产品成熟度](../../01_产品体系/PRD-005-平台能力地图与产品成熟度/README.md)
