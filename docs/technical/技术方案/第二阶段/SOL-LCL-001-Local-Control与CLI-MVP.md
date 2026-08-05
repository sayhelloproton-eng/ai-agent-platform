# SOL-LCL-001｜Local Control 与 CLI MVP 技术方案

| 字段 | 值 |
|---|---|
| 方案 ID | `SOL-LCL-001` |
| 状态 | Candidate |
| 版本 | `0.2.0-draft` |
| 所属阶段 | 第二阶段 MVP-2 |
| 核心领域 | Local Control / Local Resource Access |
| 第一消费者 | 总控 Custom GPT，经唯一 Gateway 调用 |
| 其他消费者 | 任务执行端、Browser Host 本机组件、自动化脚本、测试程序 |
| 实现载体 | 可发布 npm 包 `@ai-agent-platform/local-control` |
| CLI 二进制 | `aap-local` |
| MVP 安全级别 | 严格只读为主；只保留注册服务的受控启动实验 |
| 状态真源 | Task Control 保存任务与异步状态；CLI 不保存长期状态 |
| 文档边界 | Git-only，不进入 `docs/knowledge/**`，不触发飞书发布 |

## 一、本文拥有的问题

本文只回答一个问题：

> 上层调用端给出明确、受约束的本机能力请求后，Local Control CLI 能否在 Mac 上读取注册仓库、文件、Runtime、Executor 和 Service 的真实状态，并返回稳定、结构化、可审计的结果，使总控不再依赖完整 ZIP 或原始终端文本。

Local Control 是本机能力领域；本 MVP 选择一个可发布 npm CLI 作为实现载体，不建设第二个 Gateway、常驻 HTTP Service 或 Daemon。

## 二、关键结论

```text
Custom GPT Action / 其他受信任调用端
        ↓
唯一 Gateway：认证、预算、命名空间路由
        ↓ local.*
固定版本 Local Control CLI
        ↓
Git / Node fs / Runtime Probe / Executor / Registered Service
        ↓
Canonical Local Result
```

固定原则：

1. Gateway 是唯一外部入口；Local Control 不新增网关。
2. Gateway 通过安全进程 API 调用固定版本 CLI，`shell: false`。
3. CLI 一次请求、一次结果、一次退出，不保存 Task、Plan 或长期 Execution 状态。
4. 默认只读；唯一副作用实验是注册服务的 `ensure_running`。
5. 调用者只能引用注册资源，不能提交绝对路径、任意命令、任意参数或环境变量。
6. 同步读取可以在总控当前回合直接调用，不要求先创建 Work Item。
7. 只有跨回合、长时、需要角色交接或异步轮询的操作，才由 Task Control 建立 Work Item / Execution 状态。

## 三、领域边界

### 3.1 Local Control 拥有

- Local Capability Catalog；
- Project / Runtime / Executor / Service Registry；
- Local Request、Local Result、Local Error；
- 路径、敏感资源、命令模板和预算策略；
- Git、File、Runtime、Executor、Service Adapter；
- CLI stdin/stdout 机器协议；
- 当前观察的最小审计元数据。

### 3.2 Local Control 不拥有

| 对象 | 所属领域 |
|---|---|
| Goal、Requirement、验收语义 | Goal / Planning |
| Task、Plan、Plan Node、Task Version | Task Control |
| Controller Claim、Work Claim、Dispatch Claim | Task Control |
| 总控推理与 Controller Command | Controller |
| Browser Session、DOM、Screenshot | Browser Host |
| Approval 与一次性授权 | Approval |
| Artifact / Evidence 生命周期 | Artifact / Evidence |
| 模型推理 Provider、Role Profile | Model Inference |
| Codex / OpenCode 任务语义 | Execution |

关联字段只用于日志和结果回挂，不授予 Task 修改权：

```json
{
  "correlation": {
    "task_id": "task-001",
    "task_version": 8,
    "claim_id": "controller-claim-001",
    "plan_node_id": "node-runtime-check",
    "correlation_id": "corr-001"
  }
}
```

## 四、同步查询与异步工作

### 4.1 同步查询

以下场景可以由总控通过 Action → Gateway → CLI 直接读取：

- 当前仓库 HEAD 与工作区摘要；
- 指定受控文件片段；
- Runtime 当前状态；
- Git、Node、Codex、OpenCode 的安装与版本；
- 多个只读子查询组成的受预算 batch。

同步结果直接返回当前 Agent 回合，并可按需形成 `result_ref`。Task Control 可以记录引用，但不需要为了每次读取创建 Work Item。

### 4.2 异步或可交接工作

出现下列任一条件时，应由 Task Control 建立 Work Item 或 Execution 状态：

- 操作跨越当前请求预算；
- 需要轮询；
- 需要其他角色领取；
- 需要重试、暂停或恢复；
- 具有副作用；
- 结果将在后续回合消费。

`local.service.ensure_running` 属于异步实验：CLI 只执行一次受控“确保运行”尝试并返回当前观察与轮询提示，Task Control 保存后续状态。

## 五、唯一 Gateway 与 CLI 协议

### 5.1 Gateway 负责

- 外部认证与调用者识别；
- Action Schema、大小、频率和预算校验；
- 路由 `local.*`；
- 注入 Actor 与 Correlation；
- 调用锁定版本的 `aap-local`；
- 设置超时和输出上限；
- 解析并返回 Local Result。

Gateway 不拼接底层命令，不判断文件路径安全，也不解释 Git 输出；这些属于 Local Control。

### 5.2 机器入口

```bash
aap-local invoke --input - --output json
```

- stdin：一个完整 Local Request JSON；
- stdout：一个完整 Local Result JSON；
- stderr：受控诊断，不含 Secret、正文、绝对路径或 Stack；
- 不输出 Banner、ANSI、npm 提示或其他混杂文本。

Gateway 通过锁文件和精确版本调用本地已安装包，不在每次请求时联网下载浮动版本。

### 5.3 候选 HTTP 映射

```text
POST /v1/local/queries
POST /v1/local/commands
```

`queries` 仅接收读取能力；`commands` 在 MVP 仅接收注册服务的 `ensure_running`。路径和 Operation ID 在四个 MVP 接口审计后冻结。

## 六、最小 Capability Catalog

| Capability | 模式 | 副作用 | 主要结果 |
|---|---|---:|---|
| `local.health.read` | SYNC | 否 | CLI、合同、注册表健康 |
| `local.capabilities.read` | SYNC | 否 | 能力、模式、预算、错误摘要 |
| `local.project.describe` | SYNC | 否 | 注册项目公开元数据 |
| `local.repository.snapshot.read` | SYNC | 否 | Branch、HEAD、Upstream、工作区、最近提交 |
| `local.repository.tree.read` | SYNC | 否 | 分页目录树 |
| `local.repository.file.read` | SYNC | 否 | 文本片段、Hash、Git 状态 |
| `local.runtime.status.read` | SYNC | 否 | 生命周期、健康、版本、错误摘要 |
| `local.executor.status.read` | SYNC | 否 | Git / Node / Codex / OpenCode 状态 |
| `local.query.batch` | SYNC | 否 | 受预算的只读子结果集合 |
| `local.service.ensure_running` | ASYNC | 是 | 启动尝试、当前状态、轮询提示 |

能力不能退化为 `git.raw`、`shell.exec`、任意 URL、任意脚本或任意文件读取。

## 七、Local Request Contract

```json
{
  "local_request_version": "0.1.0",
  "request_id": "req-001",
  "capability": "local.repository.snapshot.read",
  "execution_mode": "SYNC",
  "actor": {
    "actor_type": "gateway",
    "actor_id": "action-gateway-primary"
  },
  "correlation": {
    "task_id": "task-001",
    "task_version": 8,
    "claim_id": "controller-claim-001",
    "plan_node_id": "node-runtime-check",
    "correlation_id": "corr-001"
  },
  "scope": {
    "project_id": "ai-agent-platform"
  },
  "parameters": {},
  "budget": {
    "timeout_ms": 5000,
    "max_stdout_bytes": 65536,
    "max_result_chars": 50000
  },
  "idempotency_key": "idem-001"
}
```

规则：

- 所有读取只接受 `SYNC`；
- `ensure_running` 只接受 `ASYNC`；
- Actor 不是无限授权，CLI 仍校验 Capability、Project、Registry 与 Policy；
- CLI 不校验 Task 合法迁移；
- 读取天然可重试；`ensure_running` 的幂等语义是“确保目标服务处于运行”，不是重复执行启动脚本。

## 八、Local Result Contract

```json
{
  "local_result_version": "0.1.0",
  "request_id": "req-001",
  "capability": "local.repository.snapshot.read",
  "status": "SUCCEEDED",
  "data": {},
  "error": null,
  "warnings": [],
  "evidence": {
    "source_type": "local_observation",
    "content_hash": "sha256:...",
    "observed_at": "2026-08-05T12:00:00+08:00"
  },
  "meta": {
    "cli_package": "@ai-agent-platform/local-control",
    "cli_version": "0.2.0",
    "duration_ms": 31,
    "truncated": false
  }
}
```

状态：

```text
SUCCEEDED
PARTIAL
ACCEPTED
FAILED
```

- `PARTIAL` 用于分页、截断或 batch 部分失败；
- `ACCEPTED` 仅表示异步动作已形成合法初始结果，不代表任务完成；
- `FAILED` 返回稳定 Error Code，不要求上层解析 stderr。

结果正文超过 Action 预算时，返回摘要、分页 cursor 或受治理的 `result_ref`，Artifact / Evidence 的正式创建与保留由相应领域决定。

## 九、本机注册表

MVP 仅注册一个项目：

```yaml
projects:
  ai-agent-platform:
    root: ${LOCAL_PROJECT_ROOT}
    access_mode: READ_ONLY_WITH_CONTROLLED_SERVICE_START
```

调用端只能传 `project_id` 和注册引用。真实绝对路径、可执行文件、固定参数、工作目录、环境白名单和启动模板只存在于本机配置。

Registry 至少包括：

- Project Registry；
- Runtime Registry；
- Executor Registry；
- Service Registry。

未注册引用一律拒绝。

## 十、安全策略

### 10.1 路径

- 只接受项目相对路径；
- 禁止绝对路径、`..` 和设备文件；
- 使用 `realpath` 归一化；
- 校验项目根前缀；
- 检测符号链接逃逸；
- 正常结果不暴露绝对路径。

### 10.2 敏感资源

默认拒绝：

```text
.env*
*.pem
*.key
SSH 私钥
浏览器 Cookie / Token / 认证缓存
系统 Keychain
.git/objects
node_modules
二进制大文件
仓库外资源
```

敏感资源即使位于项目根目录内也不能读取。

### 10.3 命令与进程

- 固定可执行文件和参数模板；
- 使用 `spawn` 或等价 API；
- `shell: false`；
- 环境变量白名单；
- 固定工作目录；
- 超时、输出和并发上限；
- 安全终止超时子进程；
- 不接受模型生成的任意命令。

### 10.4 预算

每个请求限制时间、输出字节、结果字符、树深度、文件行数、Batch 子项和并发。超预算返回稳定 `PARTIAL` 或 Error，不静默丢失。

## 十一、包内部结构

```text
packages/local-control/
├── package.json
├── src/
│   ├── cli.ts
│   ├── invoke.ts
│   ├── request-validator.ts
│   ├── capability-registry.ts
│   ├── result-builder.ts
│   ├── contracts/
│   ├── capabilities/
│   ├── adapters/
│   ├── registry/
│   └── policy/
└── tests/
```

Adapter 是包内模块，不是独立服务。Git Adapter 只允许固定读取操作；File Adapter 使用 Node 文件 API；Runtime / Executor / Service Adapter 只操作注册探针和模板。

## 十二、错误语义

至少固定：

```text
INVALID_REQUEST
CAPABILITY_NOT_FOUND
EXECUTION_MODE_NOT_SUPPORTED
PROJECT_NOT_REGISTERED
RESOURCE_NOT_REGISTERED
PATH_OUT_OF_SCOPE
SENSITIVE_RESOURCE_DENIED
BUDGET_EXCEEDED
OUTPUT_TOO_LARGE
PROCESS_TIMEOUT
PROCESS_FAILED
RESULT_SERIALIZATION_FAILED
SERVICE_NOT_REGISTERED
SERVICE_START_NOT_ALLOWED
```

Task 版本冲突、Controller Claim 冲突和 Plan 操作非法不属于 Local Control Error，由 Task Control 返回。

## 十三、MVP 验证场景

1. `npm pack`、固定版本安装与 `aap-local invoke` Smoke Test；
2. Gateway → CLI → JSON Result 真实链路；
3. 仓库 Snapshot：分支、HEAD、Upstream、Ahead/Behind、Staged/Modified/Untracked；
4. 分页 Tree 与受控 File Range；
5. Runtime 正常、未运行、超时和错误；
6. Git、Node、Codex、OpenCode 已安装与未安装；
7. 只读 Batch，单项失败不破坏其他结果；
8. 路径穿越、符号链接、敏感文件和绝对路径拒绝；
9. `ensure_running` 的已运行、未运行、未注册和非法输入；
10. Task Control 保存异步状态并轮询，CLI 无本地 Task 数据库；
11. stdout 只有一个 JSON，stderr 无 Secret；
12. 现有 Gateway、Runtime、Contracts、Auth、Policy 和本地链路无未解释回归。

## 十四、交付物

- `@ai-agent-platform/local-control` npm 包；
- `aap-local` CLI；
- Local Request / Result / Error Schema；
- Capability Catalog；
- 四类 Registry；
- Git / File / Runtime / Executor / Service Adapter；
- Gateway `local.*` Router 与 CLI Client；
- 安全策略与测试；
- Task Control Fixture Poll Test；
- Runbook 与验证报告。

## 十五、验收标准

MVP 通过必须同时满足：

- npm 包可打包、固定版本安装并运行；
- 唯一 Gateway 可安全调用 CLI；
- 不存在 Shell 拼接、任意 Shell 和任意路径；
- 能读取真实仓库状态、受控文件、Runtime 与 Executor 状态；
- 未提交修改与正式 Commit 表达准确；
- 大结果可分页、截断或稳定失败；
- 默认严格只读；
- `ensure_running` 只能使用注册模板；
- 路径、软链、敏感资源和预算测试通过；
- 同步查询不强制创建 Work Item；
- 异步状态由 Task Control 保存；
- CLI 不保存 Task、Plan、Claim 或 Execution 长期状态；
- 不新增 Local Control Service、Daemon 或第二 Gateway；
- 结果可替换总控 MVP 中相应 Fixture；
- 现有链路无未解释回归。

## 十六、非目标

不实现：任意 Shell、文件写入、Git 写操作、代码修改任务、完整 Artifact Ingest、正式 Approval、Browser DOM、模型推理服务、多项目 RBAC、消息队列、Local Control Daemon 或第二 Gateway。

## 十七、与其他 MVP 的合同

### 17.1 对 `SOL-CTL-001`

总控先查询 Task Decision Context并 Claim。需要本机事实时，直接调用高层 `local.*` Capability；Local Control 返回事实，总控解释并提交 Controller Command。Local Control 不决定计划下一步。

### 17.2 对 `SOL-TSK-001`

同步读取可以直接返回；Task Control只保存必要 Result Ref。异步、可交接或具有副作用的操作才建立 Work Item / Execution 状态。Local Control 不读取 Task 内部表。

### 17.3 对 `SOL-BHR-001`

Browser Host 不通过 DOM 搬运 Local Result。页面驱动与本机资源访问是两个领域；未来本机组件直接调用 CLI时也只能通过受控 Bridge，不能执行任意 Shell。

### 17.4 对 `SOL-MOB-001`

模型推理不进入 `local.*`。DeepSeek、手机模型和推理 Role Profile属于独立 Model Inference Port；Local Control只可提供设备或服务的确定性健康事实，不代理模型语义。

## 十八、待联合审计事项

- npm 包、二进制和合同正式版本；
- 最终 HTTP 路径与 Action Operation ID；
- Actor / Correlation 公共结构；
- Result Ref 由 Gateway、Task Control 还是 Evidence 创建；
- 合同提升到 `packages/contracts/` 的时机；
- 现有 `apps/local-runtime` 的兼容或退役策略。

## 十九、来源与相关文档

- [ADR-004｜第二阶段核心四个 MVP 与可选端侧推理扩展](../../../adr/ADR-004-phase-2-four-mvp-validation.md)
- [第二阶段技术方案目录](./README.md)
- [SOL-CTL-001](./SOL-CTL-001-总控Agent与动态上下文MVP.md)
- [SOL-TSK-001](./SOL-TSK-001-任务消息中心与单任务调度MVP.md)
- [SOL-BHR-001](./SOL-BHR-001-ChatGPT-Browser-Host-Runtime扩展MVP.md)
- [SOL-MOB-001](./SOL-MOB-001-手机端单模型多角色服务MVP.md)
