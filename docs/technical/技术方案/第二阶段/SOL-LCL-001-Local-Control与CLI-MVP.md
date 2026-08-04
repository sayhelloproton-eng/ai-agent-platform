# SOL-LCL-001｜Local Control 与 CLI MVP 技术方案

| 字段 | 值 |
|---|---|
| 方案 ID | `SOL-LCL-001` |
| 状态 | Candidate |
| 所属阶段 | 第二阶段 MVP-2 |
| 核心领域 | Local Resource Access / Local Control |
| 第一消费者 | 总控 Custom GPT |
| 其他消费者 | CLI、测试、未来 Task / MCP / 管理后台 |
| MVP 安全级别 | 严格只读 |

## 一、目标

本 MVP 解决当前最直接的工程问题：

> 总控无需手工接收完整仓库 ZIP，即可通过受控接口获得本机仓库、文件、Runtime 和 Artifact 的真实最新状态。

CLI 不是核心领域，而是 Local Control Application Service 的一个 Adapter：

```text
Custom GPT Action ─┐
CLI ───────────────┼→ Local Control Application Service
测试 Adapter ──────┘              ↓
                       Git / File / Runtime / Artifact Adapters
```

## 二、需要回答的核心问题

1. 总控能否通过一次高层请求获得足够的项目 Bootstrap？
2. Local Control 能否只读取注册项目，拒绝任意路径和任意 Shell？
3. 同一能力能否同时通过 Action JSON 和 CLI 人类视图消费？
4. 大结果能否以摘要、分页和 Artifact Ref 返回，而不是占满模型上下文？
5. 未提交修改能否被正确标记，而不是与正式 Commit 混淆？
6. 敏感文件、软链逃逸、绝对路径和 `../` 是否始终被拒绝？
7. 结果是否具备版本、来源、Hash、时间和稳定错误语义？

## 三、领域边界

### 3.1 本领域拥有

- 注册项目和资源配置；
- 本机资源定位规则；
- Capability Catalog；
- Resource Snapshot；
- Canonical Result；
- Resource Error；
- Git / File / Runtime / Artifact Adapter；
- 读取预算与安全策略；
- CLI、Action 和测试 Presenter。

### 3.2 本领域不拥有

- Goal 和 Task；
- 总控语义决策；
- 工作流状态和处理者；
- 执行器调度；
- 浏览器页面和会话；
- 审批；
- Artifact 的完整业务生命周期；
- 管理后台业务流程。

Task、Context 和总控只保存或消费 `resource_ref / result_ref`，不得直接读取 Local Control 内部表或路径。

## 四、MVP 范围

### 4.1 固定环境

```text
单用户
单 Gateway
单 Mac Local Runtime
单注册项目：ai-agent-platform
单项目固定根目录
```

合同仍预留：

```text
actor_id
project_id
capability_id
request_id
snapshot_id
```

### 4.2 严格只读

MVP 禁止：

```text
file.write
git.commit
git.push
process.exec
shell.exec
git.raw
任意命令拼接
```

可以读取未提交内容，但必须准确标记：

```text
committed
modified
staged
untracked
```

## 五、最小架构

```text
Local Control
├── Application Service
├── Project Registry
├── Capability Registry
├── Request Validator
├── Budget Guard
├── Security Policy
├── Resource Adapters
│   ├── Git Adapter
│   ├── File Adapter
│   ├── Runtime Adapter
│   └── Artifact Adapter
├── Canonical Result Builder
└── Presenters
    ├── Action JSON
    ├── CLI Human View
    └── Test Fixture View
```

### 5.1 Application Service

负责：

- 校验调用者、项目和 Capability；
- 解析受控参数；
- 调用专业 Adapter；
- 应用时间、文件、字符和结果预算；
- 生成统一 Result / Error；
- 记录最小审计元数据。

### 5.2 Project Registry

MVP 只注册：

```json
{
  "project_id": "ai-agent-platform",
  "root_alias": "project-root",
  "allowed_resource_types": [
    "git",
    "file",
    "runtime",
    "artifact"
  ]
}
```

对外永不返回真实绝对路径。调用方只能使用 `project_id` 和项目相对资源标识。

## 六、最小 Capability Catalog

### 6.1 `capabilities.describe`

返回：

- 可用能力；
- 输入 Schema；
- 输出类型；
- 读取预算；
- 是否依赖 Snapshot；
- 可能错误；
- 结果分页方式。

### 6.2 `context.bootstrap`

为总控提供高信息密度本机事实摘要：

```text
项目身份
当前分支与 HEAD
Worktree 状态摘要
关键 Context 文件索引
关键 Registry 状态
Runtime 服务摘要
可继续查询的资源
Snapshot ID
```

它不是完整 Context 领域，只是 Local Control 提供的本机事实包。

### 6.3 `context.collect`

一次执行多个受控子查询：

```json
{
  "snapshot_id": "snap-001",
  "queries": [
    {"type": "git.status"},
    {"type": "file.read", "resource": "context/current-status.md"},
    {"type": "runtime.status"}
  ]
}
```

请求必须设置或由服务端强制设置：

```text
max_queries
max_files
max_total_chars
timeout_ms
```

### 6.4 `resource.fetch`

获取单个已注册资源或分页结果：

- 文件片段；
- 目录树；
- Diff 摘要；
- 日志页；
- Artifact 元数据；
- Registry 记录摘要。

### 6.5 `artifact.ingest`

用于 ChatGPT 生成文件进入本机 Artifact Store 的控制通道。MVP 可验证以下可靠路径：

```text
Action 接收文件引用
→ Gateway 下载临时文件
→ 校验大小、类型和 Hash
→ 写入受控 Artifact 目录
→ 返回 artifact_id
```

Artifact Store 的正式领域模型可后续实现；本 MVP 只提供受控落地 Adapter 和引用。

## 七、Canonical Result

所有 Adapter 返回统一结果：

```json
{
  "result_contract_version": "1.0.0",
  "request_id": "req-001",
  "operation": "context.bootstrap",
  "project_id": "ai-agent-platform",
  "snapshot_id": "snap-001",
  "status": "SUCCEEDED",
  "data": {},
  "summary": "仓库位于 main，工作区干净。",
  "warnings": [],
  "errors": [],
  "evidence_refs": [],
  "cursor": null,
  "truncated": false,
  "generated_at": "2026-08-04T12:00:00Z"
}
```

### 7.1 Presenter 分离

同一 Canonical Result 可以投影为：

```text
Action：紧凑 JSON
CLI：人类可读文本
Context：Bootstrap / Delta 输入
Task：Result Ref 和摘要
Evidence：Hash、日志和来源
```

禁止把带 ANSI 的 Git 原始终端输出作为领域合同。

## 八、错误模型

最小稳定错误代码：

```text
PROJECT_NOT_REGISTERED
CAPABILITY_DENIED
RESOURCE_NOT_REGISTERED
PATH_OUT_OF_SCOPE
SYMLINK_ESCAPE
SENSITIVE_RESOURCE
SNAPSHOT_EXPIRED
RESULT_TOO_LARGE
TIMEOUT
RUNTIME_UNAVAILABLE
REPOSITORY_DIRTY
CURSOR_INVALID
```

结构：

```json
{
  "code": "PATH_OUT_OF_SCOPE",
  "message": "请求资源不在注册项目范围内。",
  "retryable": false,
  "recommended_action": "使用 project-relative resource id。",
  "details_ref": null
}
```

总控不需要解析自然语言日志来判断是否可重试。

## 九、安全设计

### 9.1 路径治理

必须执行：

- project-relative path；
- `realpath` 归一化；
- 根目录前缀校验；
- 软链逃逸检测；
- 禁止绝对路径；
- 禁止 `..`；
- 禁止未注册目录；
- 禁止设备文件和特殊文件。

### 9.2 敏感资源

默认排除：

```text
.env*
SSH 私钥
浏览器 Cookie
证书和 Key
Token 缓存
系统 Keychain
二进制大文件
node_modules
.git/objects
```

敏感路径即使位于项目根目录内也必须拒绝。

### 9.3 预算

每次请求必须限制：

- 总时长；
- 子查询数量；
- 文件数量；
- 单文件字符；
- 总字符；
- 日志行数；
- Diff 大小；
- Artifact 大小。

### 9.4 大结果策略

默认返回：

```text
Summary + Index + Hash + Ref
```

只有总控明确请求时才分页读取正文。完整日志、Diff 和二进制内容通过受控 Artifact Ref 获取。

## 十、CLI Adapter

建议形态：

```text
aap-local capabilities describe
aap-local context bootstrap --project ai-agent-platform
aap-local context collect --request request.json
aap-local resource fetch --resource context/current-status.md
```

CLI 负责：

- 参数读取；
- 调用 Application Service；
- 人类输出；
- 退出码；
- 调试日志。

CLI 不实现业务逻辑，也不允许直接调用 Git 子进程绕开领域服务。

## 十一、Action Adapter

Action Schema 只暴露高层业务能力，不镜像 Git 命令。

建议 Operation：

```text
describeLocalCapabilities
getLocalContextBootstrap
collectLocalContext
fetchLocalResource
ingestArtifact
```

所有读取 Operation 明确为非副作用。未来写能力必须独立命名、独立权限和独立审批，不得在同一通用接口中通过参数切换。

## 十二、测试场景

### 12.1 正常 Bootstrap

```text
总控请求 context.bootstrap
→ 返回 main / SHA / dirty summary / runtime summary / snapshot_id
```

### 12.2 批量收集

一次请求包含 Git 状态、Context 文件和 Runtime 状态，结果在预算内返回。

### 12.3 未提交内容

修改一个测试文件后：

```text
→ 返回 modified
→ 同时保留 source_commit
```

不得把本地修改描述为正式 Git 真相。

### 12.4 路径攻击

测试：

```text
../../.ssh/id_rsa
/Users/...
symlink-to-secret
```

全部拒绝。

### 12.5 结果过大

大日志和大 Diff：

```text
→ truncated = true
→ 返回 cursor 或 artifact_ref
```

### 12.6 Action 与 CLI 一致性

同一请求的以下字段必须一致：

```text
status
snapshot_id
data hash
error code
```

允许 Presenter 文本不同。

### 12.7 Artifact Ingest

使用测试文件引用：

```text
下载
→ Hash 校验
→ 受控目录落地
→ 返回不含绝对路径的 artifact_id
```

## 十三、交付物

```text
Local Control Application Service
Project Registry
Capability Catalog
Git Adapter
File Adapter
Runtime Adapter
Artifact Adapter（最小）
Canonical Result / Error Schema
CLI Adapter
Action Adapter
Security Test Suite
Integration Fixture
Runbook
```

## 十四、验收标准

- 能真实读取 `ai-agent-platform`；
- 严格只读；
- Action 和 CLI 共用核心服务；
- 总控可以完成 Bootstrap 与定向 Fetch；
- 路径和敏感文件门禁通过；
- 大结果支持摘要、分页或 Ref；
- 未提交状态表达准确；
- 所有错误结构化；
- 不暴露绝对路径；
- 不提供通用 Shell；
- 结果可以直接替换总控 MVP 的 Mock Result。

## 十五、非目标

- 不修改文件；
- 不 Commit / Push；
- 不调用 Codex 执行写任务；
- 不管理 Task；
- 不驱动 Chrome；
- 不建设完整 Artifact / Evidence 领域；
- 不支持任意本机目录；
- 不支持多用户和多 Runtime；
- 不建设完整后台页面。

## 十六、后续衔接

MVP-3 只保存：

```text
capability_ref
work_item_id
resource_result_ref
summary
error_code
```

不得复制 Local Control 的详细资源数据。

MVP-4 不通过 DOM 搬运 Local Control 结果。网页端角色始终通过 Action 获取正式 Result。

## 十七、外部事实来源

最后复核：2026-08-04。

- OpenAI Help Center：Configuring actions in GPTs
  https://help.openai.com/en/articles/9442513-configuring-actions-in-gpts
