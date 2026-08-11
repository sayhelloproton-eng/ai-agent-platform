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

## 6. Application Composition Root（留给五领域总纲）

尚未由单领域擅自冻结：

> 哪个本地应用进程装配 Task、Agent、Execution 等 in-process libraries，并作为真正 Deployment Unit 运行？

必须在五领域总纲中统一裁决，因为它跨越多个领域的物理进程边界。

Deployment 的约束：

- 不为方便自动创建 task-service/agent-service；
- 总纲一旦冻结 Composition Root，Deployment 将其作为普通 service Module/Deployment Unit 管理；
- 原本 in-process libraries 继续保持 library Module 身份。
