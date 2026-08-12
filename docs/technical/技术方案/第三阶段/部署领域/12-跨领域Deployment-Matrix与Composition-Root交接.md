# 跨领域 Deployment Matrix 与 Composition Root 交接

> 本表只描述 Deployment 视角，不重命名其他领域冻结包。具体 npm package 名称以各领域真源为准。

## 1. Task & Orchestration

| 能力/包 | Module Kind | Deployment 处理 |
|---|---|---|
| Task Orchestration 业务包 | library/in-process | install/version/conformance/config/verify；不强造 daemon |
| SQLite Store 包 | library | install/version/config/verify |
| Migration Runner | cli/migration | upgrade plan 中按需要调用 migrate |

Task schema/migration 逻辑归 Task Owner。

## 2. Agent Runtime & Collaboration

| 能力/包 | Module Kind | Deployment 处理 |
|---|---|---|
| Agent runtime libraries | library/in-process | install/conformance/config |
| Gateway | service | configure/start/stop/status/verify |
| Product Agent Package | agent-package | GPT 创建/配置/注册所需 Plan + ACTION_REQUIRED |
| Controller+Dev Agent Package | agent-package | 同上 |
| Test+Ops Agent Package | agent-package | 同上 |
| ChatGPT Carrier | external-resource | login/availability/status/verify/doctor |

Role/Worker/Conversation 业务状态归 Agent。

## 3. Execution

| 能力/包 | Module Kind | Deployment 处理 |
|---|---|---|
| execution-contracts | library | conformance/version |
| execution-local | library/in-process | install/config/verify as library |
| execution-runtime | service | start/stop/status/verify/doctor |
| browser extension | browser-extension | package/install/config/status/verify；人工加载时 ACTION_REQUIRED |
| Chrome Runtime | external-resource | version/status/verify/doctor |

Execution effect/policy/evidence 不归 Deployment。

## 4. Model & Reasoning

| 能力/包 | Module Kind | Deployment 处理 |
|---|---|---|
| model-contracts | library | conformance/version |
| model-runtime | service | config/start/stop/status/verify |
| FAST Provider | external-resource | API config/credential/model id/capability verify |
| REASON Provider | external-resource | API config/credential/model id/capability verify |

Provider 可是同一个 API，也可以两个不同 API；Deployment 管实例映射，Model Domain 定义逻辑能力。

## 5. Cross-cutting external

| Resource | Module Kind | 处理 |
|---|---|---|
| Microsoft Dev Tunnel | external-resource | install/config/start/stop/status/verify/doctor/ACTION_REQUIRED |

其他进入平台运行链的外部资源也必须按同规则成为 Module。

## 6. Application Composition Root（RESOLVED by ALIGN）

> **Historical handoff：** 本节原问题“哪个本地应用进程承载 in-process libraries”已由 ALIGN-022～030/223/230 关闭，不再是待裁决项。

正式结论：

- `@ai-agent-platform/platform-host` = Application Composition Root / Local Platform Host；
- 不为方便自动创建 `task-service / agent-service`；
- Task Runtime、Agent Runtime 等仍是独立 npm package，由 host in-process 装配；
- platform-host 作为普通 service Module/Deployment Unit 被 Deployment 治理；
- Execution Runtime、Model Runtime、Agent Gateway 保持独立 Process/Deployment Unit；
- library Module 继续保持 library 身份，不伪造 start/stop。

---

<!-- ALIGNMENT-PATCH-20260812 -->

## ALIGN-001～250 最终 Composition Root 裁决回填

Application Composition Root 正式冻结为独立 npm package `@ai-agent-platform/platform-host`：只 instantiate / dependency injection / local transport / startup-shutdown / light health aggregation；不拥有任何业务状态。Task Runtime 与 Agent Runtime 各自仍是独立 npm package并由 host in-process 装配；Execution Runtime、Model Runtime、Agent Gateway 保持独立 Process/Deployment Unit。任何领域 package 不得反向依赖 platform-host。

v1 概念运行拓扑：External Resources → model-runtime/execution-runtime → platform-host → agent-gateway → browser-extension/carrier verification；实际并行启动由 Requires/Provides 图计算，不硬编码脚本。
