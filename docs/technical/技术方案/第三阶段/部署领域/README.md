# Phase 3｜Deployment Domain（部署领域）冻结包

> 状态：**FROZEN / Phase 3 v1-P0**  
> 日期：2026-08-12  
> 用途：作为后续五领域总纲、新仓库实现、模块创建/测试/部署/升级治理的 Deployment Domain 优先技术真源。

## 1. 领域一句话

Deployment Domain 是平台的**软件落地、模块治理与运行装配层**：把平台内部软件包、运行单元和外部资源统一抽象为 Module，按统一 Contract / Template / Conformance / Platform CLI / Module Skill 进行创建、依赖解析、配置、部署、验证、诊断、升级和迁移。

核心原则：

> **智能在 AI，确定性在 CLI。**

> **所有外部资源必须以 Module 方式进入统一治理，不允许形成旁路。**

> **满足真实需求与稳定性后停止设计，不建设当前 v1 不需要的复杂部署基础设施。**

## 2. 冻结的软件形态

Deployment Domain v1 固定五个 npm 包：

1. `module-contract`
2. `module-template`
3. `deployment-conformance`
4. `platform-cli`
5. `module-skill`

运行形态：

> **5 个 npm 包 / 0 个 Deployment 后台 daemon / 1 个 Platform CLI 应用。**

五包形成统一治理链：

```text
module-contract
      ↓
module-template
      ↓
deployment-conformance
      ↓
platform-cli
      ↓
module-skill（AI 开发辅助，不能绕过前三者）
```

## 3. 最重要的边界

- `Module` 是平台统一治理单元，不等于 npm Package。
- `Package != Service != Process != Deployment Unit`。
- 所有平台正式 npm 包都属于 Module Governance。
- 只有具备真实运行生命周期的 Module 才是 Deployment Unit。
- 外部资源本身可以不是 npm 包，但必须通过 Module Adapter / Module Package 纳入统一治理。
- Deployment 不拥有 Task、Agent、Execution、Model 的业务 READY 语义，只负责调用并汇总其公开验证事实。
- Deployment 不为了部署方便把 in-process library 强行变成独立 Service。

## 4. v1 主链

```text
Target Module Set / Versions
        ↓
读取 Module Descriptor
        ↓
Provides / Requires 解析
        ↓
Requirements / Config Slots 解析
        ↓
platform preflight
        ↓
platform plan
        ↓
生成不可变 Deployment Plan + 实例级 INSTALL
        ↓
AI / Human 集中确认
        ↓
platform apply <planRef>
        ↓
必要时 ACTION_REQUIRED → STOP → 人工完成 → 再 apply
        ↓
start（仅需要运行的 Deployment Unit）
        ↓
verify
        ↓
platform manifest
        ↓
PLATFORM READY / DEGRADED / ACTION_REQUIRED / NOT_READY
```

## 5. 结构化状态存储

Deployment v1 **不使用 SQLite**。部署低频、并发低，采用 repo-local 文件：

```text
.ai-agent-platform/deployment/
├── state.json
├── plans/
├── verification/
├── generated/
└── logs/
```

`state.json` 只保存部署事实与索引，**不能冒充当前 Runtime reality**。

## 6. 文档索引

- `00-完整技术方案与上下文真源.md`：总真源
- `01-领域宪章与边界.md`
- `02-五包架构与Module治理模型.md`
- `03-module-contract-详细技术方案.md`
- `04-外部资源Module统一治理.md`
- `05-module-template-详细技术方案.md`
- `06-deployment-conformance-详细技术方案.md`
- `07-platform-cli-详细技术方案.md`
- `08-Deployment-Plan-Apply-ACTION_REQUIRED与恢复.md`
- `09-版本-升级-兼容性-模板迁移.md`
- `10-Verify-Doctor-Manifest与Platform-READY.md`
- `11-部署状态-目录-Secret与安全.md`
- `12-跨领域Deployment-Matrix与Composition-Root交接.md`
- `13-INSTALL与AI-native部署.md`
- `14-测试门禁与真实验收.md`
- `15-新仓库实施顺序-停止门与非目标.md`
- `90-决策演进与覆盖清单.md`
- `91-聊天讨论主题索引与结论映射.md`
- `92-冻结结论覆盖检查表.md`
- `99-下一Chat交接上下文.md`

## 7. 真源优先级

1. 本冻结包；
2. Task / Agent / Execution / Model 各自最新冻结包；
3. Phase 3 跨领域公共规范；
4. 本轮输入的旧 Deployment 草案只作为历史证据，若与本冻结包冲突，以本冻结包为准。
