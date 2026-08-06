# SOL-CTL-001｜总控 Agent 与动态上下文 MVP 技术方案

## 2026-08-06 实现状态（覆盖本文早期 Candidate 描述）

| 项目 | 当前结论 |
|---|---|
| 状态 | **Implemented / Integrated** |
| 公共合同 | Controller Contract `1.0.0` + Phase 2 Integration Contract `1.0.0` |
| 运行状态真源 | 正式 `TaskControlService`，不再使用 Mock 作为综合链路真源 |
| Gateway 路由 | `/v1/controller/task-context`、`task-claim`、`task-command`、`task-release` |
| 已开放命令 | `CREATE_PLAN`、`REVISE_PLAN`、`ADVANCE_PLAN_NODE`、`REQUEST_ROLE_WORK`、`REQUEST_APPROVAL`、`BLOCK_TASK`、`COMPLETE_TASK` |
| 幂等恢复 | 首次 Command Receipt 持久化重放；响应缓存故障后可从 Task Control Receipt 恢复 |
| 跨域结果 | 仅消费 Result Ref、Evidence Ref 和摘要，不复制 LCL/BHR 正文 |

当前总控已经能通过正式 Task Intake 创建的任务执行“先查后领”，并把 Local Work 与 Browser Host Work 作为受版本、Claim 和幂等约束的业务命令提交给 TSK。`REQUEST_APPROVAL` 可登记一次性 Approval Grant，但 Grant 正文不进入 Task Store。


| 字段 | 值 |
|---|---|
| 方案 ID | `SOL-CTL-001` |
| 状态 | Implemented / Integrated |
| 所属阶段 | 第二阶段 MVP-1 |
| 文档类型 | Technical Design |
| 核心领域 | Controller Agent / Agent Profile |
| 第一宿主 | ChatGPT 网页端 Custom GPT |
| 运行状态真源 | Task Control（正式实现） |
| 配置真源 | Git |
| 后续衔接 | `SOL-LCL-001`、`SOL-TSK-001`、`SOL-BHR-001` |
| Git-only | 是，不进入 `docs/knowledge/**`，不触发飞书发布 |

## 一、本文拥有的问题

本文只回答一个核心问题：

> 如何把运行在 ChatGPT Custom GPT 中的无状态总控，配置成一个可版本化、可约束、可恢复的角色；并使它在收到 `task_id` 后，通过 Action 获取包含结构化计划在内的最新决策上下文，安全领取任务、调整计划并推进任务，直到等待下一角色、审批、结果或完成。

本文不是通用多 Agent 平台蓝图，也不负责实现完整任务中心、Local Control、浏览器扩展或审批系统。

本方案的核心结论是：

```text
Git 管总控配置
Task Control 管任务、计划和运行状态
Custom GPT 总控负责理解、规划和决策
Action / Gateway 负责认证、校验和领域路由
Local Control、Browser Host、Approval 各自守住自己的领域边界
```

## 二、已确认前提与设计约束

### 2.1 已确认前提

1. 总控 Agent 运行在 ChatGPT 的 Custom GPT 中。
2. Custom GPT 在线配置包括指令、知识、能力和 Action；对应版本化资产维护在 Git。
3. 前期由人工将 Git 中的候选配置更新到 Custom GPT，后续再评估自动发布。
4. 总控本身无状态；正式运行状态通过 Action 从任务中心、Local Control、知识资产或其他领域实时获取。
5. 大部分任务由总控创建或推进；任务也可以由前置产品经理角色、管理后台、测试 Fixture 或数据库导入入口产生。
6. 任务长期归属于角色，而不是永久绑定某个 ChatGPT 会话；停滞任务可以由同一角色的总控继续驱动。
7. 任务中必须存在结构化 `plan` 字段。计划可以由前置需求规划生成，也可以由总控在任务开始时生成。
8. 任务流转不仅更新任务状态，还必须根据决策同步更新计划内容、节点状态和计划版本。
9. 总控获得 `task_id` 后，必须先查询完整决策上下文，再决定是否领取任务。
10. Action 的任务控制语义不等待 CLI 命令设计；Local Control 能力合同与 CLI 由 `SOL-LCL-001` 负责收敛。

### 2.2 设计原则

| 原则 | 解释 |
|---|---|
| 回归本源 | MVP 只证明总控配置、动态上下文和计划推进闭环，不提前建设完整平台。 |
| 领域边界清晰 | 每个领域只拥有自己的模型、状态和不变量，通过接口或事件协作。 |
| 任务内计划 | MVP 中 `plan` 是 Task Aggregate 的版本化字段，不另建复杂 Planning 平台。 |
| 先查后领 | 总控先读取 Goal / Requirement、Plan、Task、Event、Result、约束和审批，再领取短期处理权。 |
| 角色归属 | 任务长期由 `required_role` 负责；具体总控只持有可过期 Claim。 |
| 业务命令 | 总控不能直接 Patch 数据库字段，只能提交受约束的 Controller Command。 |
| 动态按需 | 默认返回当前快照摘要与增量事件；完整历史、文件、日志和知识按需查询。 |
| 配置与状态分离 | Git 中保存静态配置和 Schema；数据库保存任务运行状态；聊天记录不是正式真源。 |
| 适配器不反向定义领域 | Action、CLI、后台和扩展是入口适配器，不拥有 Task 或 Plan 规则。 |

## 三、MVP 目标、通过条件与非目标

### 3.1 MVP 目标

本 MVP 验证以下闭环：

```text
Custom GPT 加载版本化总控配置
→ Task Intake、用户或测试 Fixture 提供 task_id
→ 总控查询 Task Decision Context
→ 总控判断角色、计划、节点、阻塞和最新事件
→ 总控领取短期处理权
→ 总控创建或修订结构化计划
→ 总控提交受约束的 Controller Command
→ 正式 Task Control 原子更新 Task + Plan + Work / Dispatch + Event
→ 任务等待结果、审批或再次停滞
→ 新会话中的同角色总控重新查询并继续推进
```

### 3.2 MVP 必须证明

- Custom GPT 的分级配置可以从 Git 组合出一个明确的线上发布候选。
- 总控不依赖旧聊天全文，也能通过 `task_id` 恢复当前工作。
- 总控查询的是完整决策上下文，不是单条 Task 记录。
- 任务缺少计划时，总控可以生成最小结构化计划。
- 任务已有前置计划时，总控优先消费并按实际结果修订，而不是重新发明全部计划。
- 总控只能领取 `required_role` 与自身角色匹配的任务。
- Claim 只表示当前处理租约，不改变任务的长期角色归属。
- 一次推进可以在同一事务语义中更新 Task、Plan、Plan Node 和 Event。
- 任务停滞或 Claim 过期后，同角色总控可以继续接管。
- 重复 Action、旧版本和非法计划变更不会产生重复或越权副作用。

### 3.3 非目标

- 不由 CTL 实现 Task Store、消息队列和生产调度器；这些能力由正式 TSK 领域提供。
- 不实现多任务依赖图、并行计划和通用 Workflow DSL。
- 不实现真实 Local Control 写操作或任意 Shell。
- CTL 不直接操作 Chrome；自动唤醒和页面驱动由已接入的 BHR 领域负责。
- 不实现飞书、微信或管理后台审批产品；综合层已提供受认证的 Approval Grant 签发与一次性消费接口。
- 不实现自动发布或自动修改 Custom GPT 在线配置。
- 不实现完整 RAG、向量库、图数据库或长期 Memory Framework。
- 不把 ChatGPT 会话、GPT URL 或浏览器标签页作为任务状态真源。
- 不创建根级 `agents/` 目录。

## 四、领域与边界

### 4.1 领域责任矩阵

| 领域 | 拥有 | 不拥有 |
|---|---|---|
| Agent Profile | 公共基线、角色配置、具体 Custom GPT Profile、知识清单、Action Profile、发布记录 | Task、Plan 运行状态、浏览器会话、执行日志 |
| Controller Agent | 目标理解、计划生成与修订、下一步决策、任务推进、审批识别、结果复审 | 数据库存储、状态机规则、底层执行、浏览器 DOM |
| Task Control | Task Aggregate、嵌入式 Plan、Plan Node 状态、Event、Claim、版本、幂等、合法迁移 | 模型推理、Git 文件读取、Shell、浏览器操作 |
| Local Control | 注册本机资源、只读 Capability、Canonical Result、Git / File / Runtime Adapter | Goal、Plan 语义、任务调度、总控角色规则 |
| Browser Host | 会话定位、页面唤醒、输入消息、页面观察和投递回报 | 任务语义、计划修订、审批决定、Task 状态 |
| Approval | 审批请求、批准或拒绝、审计记录 | 总控推理、任务计划、执行实现 |
| Gateway / Action Adapter | 认证、外部 Schema、输入校验、限流、领域路由、响应适配 | Task / Plan 业务规则、Local Control 内部实现 |

### 4.2 关键所有权规则

1. **计划语义由规划角色或总控产生。**
2. **计划运行态由 Task Control 保存和校验。**
3. **总控不能直接修改 `task.status`、`plan.nodes` 或数据库字段。**
4. **Task Control 不能自行推理应插入什么节点。**
5. **Local Control 只返回事实和结果引用，不解释计划下一步。**
6. **Browser Host 只负责唤醒与投递，不读取完整业务模型做决策。**
7. **动态上下文可以聚合多个领域公开结果，但聚合不转移数据所有权。**

## 五、Custom GPT 可配置项与 Git 分级配置

### 5.1 ChatGPT Builder 的配置面

根据 OpenAI 当前官方说明，Custom GPT 的可配置面至少包括：

| Builder 配置面 | 作用 | Git 中的对应资产 |
|---|---|---|
| Name / Description / Conversation Starters | 用户可见身份与入口 | `builder.yaml` |
| Instructions | 角色、规则、工作流与输出约束 | `instructions.md` |
| Knowledge | 稳定参考资料，不应承载核心行为规则 | `knowledge-manifest.yaml` |
| Recommended Model | 建议使用的模型；用户仍可能切换 | `builder.yaml` |
| Capabilities | Web、图像、Canvas、数据分析等内置能力开关 | `builder.yaml` |
| Apps 或 Actions | 外部工具入口；当前官方规则下二者不能同时启用 | `action-profile.yaml` / `openapi.yaml` |
| Authentication | None、API Key 或 OAuth | Builder 在线 Secret 配置；Git 只保存模式和引用，不保存密钥 |
| Sharing / Publishing | 私有、链接、工作区或公开发布 | `builder.yaml` / `release.yaml` |
| Version History | 在线配置历史 | Git Commit + `release.yaml` 作为项目侧正式记录 |

官方资料：

- [Creating and editing GPTs](https://help.openai.com/en/articles/8554397-creating-and-editing-gpts)
- [Configuring actions in GPTs](https://help.openai.com/en/articles/9442513-configuring-actions-in-gpts)
- [Sharing and publishing GPTs](https://help.openai.com/en/articles/8798878-sharing-and-publishing-gpts)

### 5.2 仓库目录决策

禁止创建根级 `agents/`，避免 Codex、OpenCode 等工具把它当作宿主特殊目录自动读取。

本 MVP 采用以下目标目录：

```text
agent-profiles/
├── README.md
├── shared/
│   ├── platform-baseline.md
│   ├── security-boundaries.md
│   └── task-control-rules.md
├── roles/
│   └── controller/
│       ├── role.yaml
│       ├── instructions.md
│       ├── permissions.yaml
│       └── action-intent.yaml
├── custom-gpts/
│   └── ai-agent-platform-controller/
│       ├── profile.yaml
│       ├── builder.yaml
│       ├── instructions.md
│       ├── knowledge-manifest.yaml
│       ├── action-profile.yaml
│       └── deployment.yaml
└── releases/
    └── ai-agent-platform-controller/
        └── 0.1.0.yaml
```

说明：

- `agent-profiles/` 保存面向 Agent 宿主的版本化配置资产，不保存运行状态。
- `platform-registry/` 只登记这些资产的身份、关系、实现状态和发布记录，不保存大段 Instructions 正文。
- `packages/contracts/` 保存跨应用真正复用的运行时 Schema 和校验器。
- `knowledge-packs/` 只有在首个稳定知识包真正物化时再建立，不作为本 MVP 的空目录前置条件。

### 5.3 四级配置继承

```text
L1 平台公共基线
    ↓
L2 角色配置（controller）
    ↓
L3 具体 Custom GPT Profile
    ↓
L4 发布版本 / Builder 投影
```

#### L1：平台公共基线

所有专有 GPT 共同继承：

- Git 唯一真源；
- 安全底线；
- 不得伪造事实；
- 动态状态必须从领域接口获取；
- 任务、计划、事件和审批的公共术语；
- 不得把聊天记录当作正式运行状态；
- 结果必须区分事实、决策、建议和待确认项。

#### L2：角色配置

定义 `controller` 角色：

```yaml
role_id: controller
role_version: 1.0.0
responsibilities:
  - understand_requirement
  - create_or_revise_plan
  - inspect_task_context
  - claim_controller_task
  - advance_task
  - request_approval
  - handle_failure
  - complete_task
permissions:
  - task.context.read
  - task.claim
  - task.plan.create
  - task.plan.revise
  - task.command.submit
  - task.history.read
  - approval.request
forbidden:
  - database.raw_write
  - shell.raw_execute
  - browser.raw_script
  - task.field_patch
```

#### L3：具体 Custom GPT Profile

定义某个具体专有 GPT 的项目范围和差异配置：

```yaml
profile_id: ai-agent-platform-controller
role_id: controller
project_scope:
  - ai-agent-platform
provider:
  type: chatgpt_custom_gpt
  provider_resource_id: g-6a6b7f3aa60881918d7bff102b3d6623
configuration:
  builder_ref: ./builder.yaml
  instructions_ref: ./instructions.md
  knowledge_manifest_ref: ./knowledge-manifest.yaml
  action_profile_ref: ./action-profile.yaml
```

`provider_resource_id` 只用于部署登记和未来 Browser Host 页面定位，不作为平台授权凭证。总控 Action 身份由 Gateway 根据 Builder 中配置的认证凭据反向绑定到 `profile_id` 和 `role_id`，不得依赖模型自己填写身份。

#### L4：发布版本

记录 Git 候选配置与线上 Custom GPT 的对应关系：

```yaml
release_id: ai-agent-platform-controller@0.1.0
profile_id: ai-agent-platform-controller
source_commit: <git-sha>
configuration_hash: sha256:<hash>
deployment_mode: manual
provider_resource_id: g-6a6b7f3aa60881918d7bff102b3d6623
status: verified
```

### 5.4 配置组合与人工发布

MVP 发布流程：

```text
读取 shared
+ 读取 controller role
+ 读取具体 profile
→ 生成发布候选清单
→ 人工更新 Custom GPT Builder
→ Preview 验证 Instructions / Knowledge / Action
→ 回填 release 状态和证据
```

不要求第一版实现自动编译器，但所有线上字段必须能追溯到 Git 文件，不能只存在于 Builder 页面。

## 六、Task Aggregate 与结构化计划

### 6.1 MVP 的简化模型

为避免过早拆出复杂 Planning 平台，本 MVP 将计划作为 Task Aggregate 内的版本化字段：

```text
Task
├── requirement / goal reference
├── required_role
├── status
├── plan
│   ├── plan_version
│   ├── source
│   ├── current_node_id
│   └── nodes[]
├── recent event cursor
├── result references
├── approval references
└── claim
```

计划可以来自：

```text
用户或需求正文
产品经理 / 规划角色
总控首次处理时生成
导入的结构化任务模板
```

简单任务仍然必须有计划，但计划可以只有一个节点。

### 6.2 Task 最小结构

```json
{
  "task_id": "task-001",
  "task_version": 7,
  "title": "验证本地 Runtime 当前状态",
  "objective": "获取 Runtime 状态并决定是否继续后续验证",
  "requirement_ref": "req-001",
  "required_role": "controller",
  "status": "READY_FOR_CONTROLLER",
  "plan": {
    "plan_version": 3,
    "source": {
      "type": "controller",
      "ref": "ai-agent-platform-controller"
    },
    "status": "ACTIVE",
    "current_node_id": "node-02",
    "nodes": []
  },
  "latest_event_id": "event-103",
  "result_refs": [],
  "approval_refs": [],
  "claim": null
}
```

### 6.3 Plan Node 最小结构

```json
{
  "node_id": "node-02",
  "title": "判断是否需要启动 Runtime",
  "kind": "DECISION",
  "status": "BLOCKED",
  "required_role": "controller",
  "depends_on": ["node-01"],
  "acceptance_criteria": [
    "根据最新 Runtime Result 给出下一步"
  ],
  "work_refs": [],
  "result_refs": ["result-runtime-001"],
  "summary": "Runtime 当前不可连接"
}
```

### 6.4 MVP 允许的计划形态

MVP 使用版本化 Node List：

- 默认按顺序推进；
- 节点可以声明少量 `depends_on`；
- 支持插入、替换、跳过、取消和完成节点；
- 支持一个节点关联一个或多个工作引用；
- 不实现任意 DAG 编排、并行 Join、循环表达式和通用条件 DSL。

### 6.5 计划与任务必须一起推进

以下操作不能只修改 `task.status`：

| 场景 | Task 变化 | Plan 变化 |
|---|---|---|
| 执行节点成功 | 记录结果并进入下一处理阶段 | 当前节点完成，下一个节点变为 Ready |
| 执行节点失败 | 重新调度总控或进入 Blocked | 当前节点记录失败；总控决定重试、替换或插入补救节点 |
| 总控调整方案 | 任务版本递增 | 计划版本递增，节点结构或状态变化 |
| 请求审批 | 任务等待审批 | 当前节点进入 Waiting Approval，并绑定 `approval_ref` |
| 完成任务 | Task 进入 Completed | 计划进入 Completed，所有必需节点满足验收 |
| 终止任务 | Task 进入 Cancelled / Failed | 未执行节点取消，并记录停止原因 |

Task Control 必须在一个应用事务语义中：

```text
校验 Claim 与版本
→ 校验 Controller Command
→ 更新 Task Snapshot
→ 更新 plan / node
→ 生成不可变 Task Event
→ 创建必要的 Work / Approval / Dispatch 引用
```

## 七、动态决策上下文

### 7.1 动态上下文的定义

动态上下文不是一份无限增长的 Prompt，也不是单纯的 RAG 结果。

本方案中的动态决策上下文是：

> Task Control 以 `task_id` 为入口形成的 Controller Decision Context 读模型。它聚合当前 Task Snapshot、嵌入式 Plan、当前节点、增量事件、最新结果摘要、约束、审批和其他领域引用，为总控本轮决策提供最新受控输入。

该读模型不取代平台更广义的 Context & Knowledge 领域。Git 文档、稳定知识、历史记录、Local Result 和 Browser Observation 仍由各自领域拥有，通过受控引用或查询端口进入。

### 7.2 查询顺序

总控收到 `task_id` 后必须执行：

```text
1. 查询 Decision Context
2. 判断任务是否仍需 controller 处理
3. 判断自身角色是否匹配
4. 判断 Plan 是否存在、是否仍成立
5. 判断是否需要补充历史、知识或本机事实
6. 再领取任务 Claim
7. 提交计划或任务命令
```

禁止：

```text
收到 task_id
→ 未查询上下文
→ 直接 claim / complete / retry
```

### 7.3 Decision Context 最小合同

```json
{
  "contract_version": "1.0.0",
  "task": {
    "task_id": "task-001",
    "task_version": 7,
    "required_role": "controller",
    "status": "READY_FOR_CONTROLLER",
    "objective": "获取 Runtime 状态并决定下一步",
    "plan": {
      "plan_version": 3,
      "current_node_id": "node-02",
      "nodes": []
    }
  },
  "requirement": {
    "ref": "req-001",
    "summary": "只读检查 Runtime，不允许启动或修改服务",
    "acceptance_criteria": []
  },
  "recent_events": [],
  "latest_results": [],
  "constraints": [],
  "pending_approvals": [],
  "available_context_refs": [],
  "allowed_controller_commands": [],
  "next_event_cursor": "event-103"
}
```

### 7.4 增量与历史

默认返回：

```text
当前 Task / Plan 快照
+ 上一个 cursor 之后的增量事件
+ 最新结果摘要
+ 可继续查询的引用
```

完整历史仅在以下场景按需查询：

- 当前计划与历史结果矛盾；
- 需要确认某节点为何被插入或取消；
- 需要复盘重复失败；
- 需要恢复长期停滞任务；
- 需要审计审批、执行或交接。

本 MVP 不引入“Context 自动过期”领域。每次读取返回当前数据库状态；写命令仍必须携带 `expected_task_version` 和 `expected_plan_version`，避免查询后状态已被其他入口修改。

### 7.5 其他动态来源

| 来源 | 通过何种引用进入 | 所属领域 |
|---|---|---|
| 需求 / Goal | `requirement_ref` / `goal_ref` | Requirement / Planning |
| Task / Plan / Event | Decision Context 内嵌或引用 | Task Control |
| Git / 文件 / Runtime | `result_ref` / `resource_ref` | Local Control |
| 稳定项目知识 | `knowledge_ref` / Git 路径 | Knowledge |
| 审批 | `approval_ref` | Approval |
| 浏览器会话 | `conversation_ref` / `dispatch_ref` | Browser Host |

知识库、Git 文档、RAG、文件和日志都只是来源，不拥有任务状态。

## 八、角色归属、查询与 Claim

### 8.1 长期归属与短期处理权

```text
required_role = controller
```

表示任务长期需要总控角色处理。

```text
claim
```

表示当前由某个具体总控 Profile 临时处理。

因此：

> 任务归属于角色；具体总控只领取短期、可过期的处理租约。

### 8.2 Claim 前置条件

Task Control 只在以下条件全部满足时发放 Claim：

- Task 当前允许总控处理；
- 调用凭据解析出的 `role_id` 与 `required_role` 匹配；
- `expected_task_version` 与当前版本一致；
- 当前没有有效 Claim，或旧 Claim 已过期；
- 调用 Profile 的项目范围包含当前任务；
- 请求满足幂等规则。

### 8.3 Claim 最小结构

```json
{
  "claim_id": "claim-001",
  "claimed_by_profile": "ai-agent-platform-controller",
  "role_id": "controller",
  "claimed_from_task_version": 7,
  "expires_at": "2026-08-05T08:30:00+08:00"
}
```

`claimed_by_profile` 由 Gateway 根据认证绑定注入，不允许模型自行伪造。

### 8.4 同角色接管

以下场景可以由同角色总控接管：

- 原 Chat 会话关闭；
- 原 Claim 超时；
- 总控主动释放；
- Browser Host 改为打开新的同角色会话；
- 人工在另一个同角色 Custom GPT 中输入 `task_id`；
- 任务因新结果、审批或错误重新进入待总控处理状态。

新总控不继承旧聊天全文，只需重新读取 Decision Context 和必要历史。

## 九、总控决策循环

### 9.1 标准循环

```text
Wake(task_id / event_id)
→ getTaskDecisionContext
→ 判断角色、任务和计划
→ 必要时按引用补充上下文
→ claimControllerTask
→ 形成内部 Decision
→ submitControllerCommand
→ Task Control 校验并原子写入 Task + Plan + Event
→ 释放 Claim 或进入等待
→ 后续由人工、Task Signal 或 Browser Host 再次唤醒
```

### 9.2 计划缺失

```text
Decision Context：plan = null
→ 总控判断任务不是无需规划的即时查询
→ Claim
→ 提交 CREATE_PLAN
→ Task Control 保存 plan_version = 1
→ 当前首节点进入 READY / IN_PROGRESS
```

简单任务可生成单节点计划：

```json
{
  "nodes": [
    {
      "node_id": "node-01",
      "title": "读取并汇总 Runtime 当前状态",
      "kind": "ACTION",
      "status": "READY"
    }
  ]
}
```

### 9.3 计划仍成立

总控不重写全部计划，只推进当前节点：

```text
读取最新 Result
→ 完成当前节点
→ 激活下一节点
→ 请求下一角色工作或等待结果
```

### 9.4 计划需要修订

例如 Runtime 不可连接，而原计划缺少启动或诊断步骤：

```text
当前检查节点 = BLOCKED
→ 插入“检查连接配置”节点
→ 或插入“申请启动 Runtime”审批节点
→ plan_version + 1
→ 创建新的 Work / Approval 引用
```

### 9.5 等待与再次唤醒

Custom GPT Action 是请求—响应式调用，外部系统不能把异步结果直接推入已经空闲的模型推理轮次。

MVP 使用：

```text
人工输入 task_id / 继续
或 Mock Wake Message
```

后续由 Browser Host Runtime：

```text
Task Signal
→ 找到同角色 Custom GPT / 会话
→ 注入最小 Wake Envelope
→ 总控重新查询正式上下文
```

## 十、Controller Command 与 Action 适配

### 10.1 Decision 与 Command 的区别

- **Decision**：总控内部形成的业务判断。
- **Controller Command**：总控通过 Action 提交给 Task Control 的结构化业务命令。
- **Task Event**：Task Control 接受命令后产生的不可变事实。

MVP 不单独建设一个沉重的 Decision Store。审计保存 Command、版本依据、业务原因摘要和产生的 Event 即可。

### 10.2 最小命令类型

```text
CREATE_PLAN
REVISE_PLAN
ADVANCE_PLAN_NODE
REQUEST_ROLE_WORK
REQUEST_APPROVAL
BLOCK_TASK
COMPLETE_TASK
RELEASE_CLAIM
```

命令表达业务意图，不允许提交任意字段 Patch。

### 10.3 命令信封

```json
{
  "command_contract_version": "1.0.0",
  "task_id": "task-001",
  "claim_token": "claim-token",
  "expected_task_version": 8,
  "expected_plan_version": 3,
  "idempotency_key": "controller-run-001:revise-plan",
  "command": {
    "type": "REVISE_PLAN",
    "reason_summary": "Runtime 不可连接，原计划缺少连接诊断步骤",
    "payload": {
      "operations": [
        {
          "operation": "INSERT_NODE_AFTER",
          "after_node_id": "node-01",
          "node": {
            "node_id": "node-01b",
            "title": "检查 Gateway 与 Runtime 的连接状态",
            "kind": "ACTION",
            "required_role": "runtime_inspector"
          }
        }
      ]
    }
  }
}
```

服务器拥有并自动生成：

- 调用者 Profile 与 Role；
- `command_id`；
- Event ID；
- 时间戳；
- 当前认证信息；
- 内部工作单 ID；
- 审计元数据；
- 任何不应由模型控制的 Task 内部字段。

### 10.4 Custom GPT Action 的最小 Operation

为避免 Builder 中出现大量相似操作，MVP 收敛为四个高层业务 Operation：

```text
getTaskDecisionContext
claimControllerTask
submitControllerCommand
releaseControllerTask
```

审批、角色工作请求和计划修订作为受控 `Controller Command` 类型提交。后续如果 Builder 选择错误频繁，再基于真实证据拆分 Operation，不提前扩张接口数量。

### 10.5 Action Adapter 边界

Action Schema 必须遵循仓库 `custom-gpt-actions` Skill：

- 使用 Builder 可解析的显式 OpenAPI；
- `components.schemas` 显式存在；
- 身份和密钥不进入 Schema；
- Gateway 根据凭据生成调用者身份和内部字段；
- 不向模型暴露通用内部 TaskRequest；
- 不允许模型覆盖服务端字段；
- Builder Preview 真实调用通过后，才声明 Action 可用。

### 10.6 Action 与 CLI 的关系

依赖方向固定为：

```text
领域能力 / Application Contract
        ↓
Gateway / Application Service
        ↓
Custom GPT Action、CLI、管理后台、测试 Adapter
```

不是：

```text
Action → CLI
CLI → Action
先设计 CLI 命令 → 再倒推领域接口
```

本方案现在可以冻结 Task Control 侧的总控语义：

```text
task decision context
controller claim
controller command
claim release
```

本地资源能力只在本方案中声明消费者需求，例如：

```text
需要 Runtime 当前状态
需要仓库 HEAD 与工作区摘要
需要指定文件片段
需要执行器当前状态
```

`SOL-LCL-001` 负责决定：

- Local Control Capability 名称；
- Canonical Result；
- CLI 命令；
- Action JSON Presenter；
- Git / File / Runtime Adapter；
- 安全、预算和错误语义。

因此结论是：

> Action 的任务控制部分不等待 CLI；Local Control 相关 Action 的最终 Schema 等待 `SOL-LCL-001` 的能力合同，不等待 CLI 命令表。

## 十一、安全、并发与失败语义

### 11.1 身份与权限

- Gateway 根据 Custom GPT Action 认证凭据解析 `profile_id` 和 `role_id`。
- 模型提交的任何身份字段都不能作为授权依据。
- GPT URL 中的 `g-...` 只作为 Provider 资源登记和 Browser Host 定位信息。
- `conversation_id` 只作为唤醒位置，不作为任务身份和状态真源。
- Prompt 中的权限说明是行为约束；Gateway、Task Control 和 Local Control 各自执行强制权限校验。

### 11.2 版本冲突

```text
expected_task_version != current_task_version
→ TASK_VERSION_CONFLICT
→ 不更新 Task、Plan 或 Event
→ 总控重新查询 Decision Context
```

```text
expected_plan_version != current_plan_version
→ PLAN_VERSION_CONFLICT
→ 不应用部分计划变更
```

### 11.3 Claim 冲突

```text
已有有效 Claim
→ TASK_ALREADY_CLAIMED
→ 返回最小处理状态，不泄露不必要信息
```

Claim 过期后，同角色可以重新领取。

### 11.4 幂等

相同 Profile、Task 和 `idempotency_key` 的重复命令：

- 返回第一次成功或失败结果；
- 不重复插入节点；
- 不重复创建 Work、Approval 或 Event；
- 不重复完成任务。

### 11.5 非法计划操作

以下情况必须拒绝：

- 修改不存在的节点；
- 完成仍有未满足依赖的节点；
- 取消已经完成且被后续节点引用的节点而无替代说明；
- 在无 Claim 时提交写命令；
- 用测试、汇报等低权限角色修订总控计划；
- 直接提交任意 `task.status` 或完整数据库对象覆盖。

### 11.6 审批

总控在计划阶段应识别可能需要审批的操作并提交 `REQUEST_APPROVAL`。

各专业领域仍保留强制审批权。即使总控漏判，Local Control 或其他领域也可以返回：

```text
APPROVAL_REQUIRED
```

MVP 只实现：

```text
PENDING → APPROVED / REJECTED
```

审批结果产生事件，并在下一次唤醒时进入 Decision Context。

### 11.7 无进展

连续出现以下情况时进入人工复核：

- 相同计划修订重复提交；
- 同一节点重复失败且无新证据；
- 总控连续请求相同上下文但结果无变化；
- Claim 多次过期且没有有效 Command；
- 计划节点形成无法推进的依赖关系。

正式 Task Control 可基于 Timeline、相同命令指纹、Claim 过期和无新证据次数确定性地产生 `NO_PROGRESS` 或人工复核信号；Mock 仅允许作为局部测试 Fixture，不再作为综合链路真源。

## 十二、MVP 最小实现

### 12.1 最小组件

```text
Controller MVP
├── Git 版本化 Agent Profile
│   ├── shared
│   ├── controller role
│   ├── concrete Custom GPT profile
│   └── release record
├── Controller Contracts
│   ├── Task Decision Context
│   ├── Task Plan / Plan Node
│   ├── Controller Claim
│   └── Controller Command
├── Formal Task Control Adapter
│   ├── context query
│   ├── claim
│   ├── command validation
│   ├── atomic task + plan update
│   └── event timeline
├── Builder-compatible Action OpenAPI
├── Test Fixtures
├── Manual Test Runbook
└── Evaluation Report
```

### 12.2 建议仓库落位

```text
agent-profiles/**
packages/contracts/**                    # 仅新增真实复用的合同与校验
apps/action-gateway/**                   # 正式 Action Adapter / Phase 2 Integration Routes
apps/action-gateway/**/__fixtures__/**   # 或项目现有测试 Fixture 位置
docs/technical/技术方案/第二阶段/**       # 方案、测试 Runbook、评估记录
platform-registry/**                     # 仅登记物化后的资产和关系
```

具体实现路径必须在执行任务前基于最新仓库结构冻结；不得为了本 MVP 创建空壳目录、重复包或未被实际调用的通用框架。

### 12.3 正式 Task Control 与测试 Fixture

自动化测试仍保留可重置的单任务 Fixture，但生产综合链路使用正式 Task Control。测试至少支持：

- 有前置计划；
- 无计划；
- 节点执行成功；
- 节点执行失败；
- 等待审批；
- 旧版本；
- Claim 冲突与过期；
- 同角色新会话接管；
- 重复命令；
- 非法计划操作。

Fixture 只用于确定性测试，不是生产状态真源；生产链路以 TaskControlService 和持久化 Store 为准。

## 十三、验证场景

### 13.1 配置组合与人工发布

```text
Git 中读取 shared + role + profile
→ 生成配置清单和 Hash
→ 人工更新 Custom GPT
→ Builder Preview 通过
→ release.yaml 记录 source_commit 与验证状态
```

通过条件：线上配置可追溯到 Git，密钥不进入仓库。

### 13.2 消费前置计划

```text
Task 已包含 plan_version = 1
→ 总控查询上下文
→ 确认当前节点和验收标准
→ Claim
→ 推进节点，不重建全部计划
```

### 13.3 总控生成计划

```text
Task.plan = null
→ 总控查询 Requirement 与约束
→ Claim
→ CREATE_PLAN
→ 生成一个或多个结构化节点
→ Task + Plan + Event 同步更新
```

### 13.4 失败后修订计划

```text
节点“检查 Runtime”返回 runtime_unreachable
→ Task 再次需要 controller
→ 总控查询最新 Context
→ Claim
→ 插入“检查连接配置”或“请求启动审批”节点
→ 原节点保持 Blocked 或等待重试
→ plan_version + 1
```

### 13.5 同角色接管

```text
原总控 Claim 过期
→ 新 Chat 或另一个同角色 Profile 收到 task_id
→ 查询完整 Decision Context
→ 领取新 Claim
→ 继续当前计划
```

通过条件：不复制旧聊天全文，不改变 `required_role`，不会重复执行已完成节点。

### 13.6 角色不匹配

测试或汇报角色查询任务时可以获得受限摘要，但 Claim 或计划修订必须返回 `ROLE_NOT_ALLOWED`。

### 13.7 版本冲突

使用旧 `task_version` 或 `plan_version` 提交命令：

```text
→ 拒绝
→ 无 Task / Plan / Event 副作用
→ 返回当前版本并提示重新查询
```

### 13.8 幂等

重复提交同一 `REVISE_PLAN`：

```text
→ 节点只插入一次
→ Event 只生成一次
→ 返回第一次结果
```

### 13.9 Approval Grant 与审批等待

```text
总控提交 REQUEST_APPROVAL
→ Task 等待审批
→ 受认证入口签发一次性 Approval Grant
→ BHR 校验并消费 Grant，或审批领域回报 Resolution
→ 生成 Approval Event
→ 新一轮总控读取后继续计划
```

### 13.10 新会话恢复

在没有旧聊天记录的新会话中输入：

```text
继续处理 task-001
```

总控必须通过 Action 恢复 Task、Plan、当前节点、最新事件和结果，并给出与当前事实一致的下一步。

## 十四、验收标准

MVP 通过必须同时满足：

### 14.1 配置

- 不创建或使用根级 `agents/`；
- `agent-profiles/` 四级配置可以解释线上 Custom GPT 的主要 Builder 字段；
- Instructions、Knowledge、Capabilities / Actions 职责分离；
- Profile、Role 和 Release 有版本；
- 密钥不进入 Git；
- 人工发布后有 Preview 验证与发布记录。

### 14.2 动态上下文

- 总控以 `task_id` 查询完整 Decision Context；
- Context 至少包含 Task、Plan、当前节点、Requirement 摘要、增量 Event、最新 Result、约束和 Allowed Commands；
- 默认使用当前快照 + 增量事件，完整历史按需获取；
- 新会话不依赖旧 Chat 全文即可恢复任务。

### 14.3 计划与任务推进

- Task 中存在结构化 `plan`；
- 无计划任务可以由总控生成最小计划；
- 计划节点可插入、推进、阻塞、完成、跳过和取消；
- 任务推进能够同步更新 Task、Plan、Node 和 Event；
- 任务完成必须满足计划的必要节点和验收条件；
- 总控不能直接 Patch 状态字段。

### 14.4 角色与接管

- 总控先查询上下文，再 Claim；
- 任务长期归属于 `required_role`；
- Claim 是可过期短期租约；
- 同角色新会话可在 Claim 释放或过期后接管；
- 角色不匹配时不能领取和修改计划。

### 14.5 安全与一致性

- Gateway 从认证绑定解析调用 Profile 和 Role；
- GPT ID 与 Conversation ID 不作为授权凭证；
- 旧版本、非法命令和重复调用无错误副作用；
- Action Schema 通过本地校验、Builder 解析和 Preview 实际调用；
- 不暴露任意 Shell、数据库 Patch 或通用内部 TaskRequest。

## 十五、与后续 MVP 的合同

### 15.1 对 `SOL-LCL-001`

本方案输出总控的本地事实消费需求，不定义 CLI 命令：

```text
LocalContextNeed
├── project bootstrap
├── repository state
├── file / document fragment
├── runtime state
├── executor state
└── canonical result reference
```

`SOL-LCL-001` 负责 Capability、Result Contract、CLI 和 Gateway Presenter。同步只读查询可以在当前总控回合直接返回，不强制创建 Work Item；跨回合、长时、需要交接、轮询或副作用的操作才进入 Task Control 的 Work Item / Execution 协调。

### 15.2 对 `SOL-TSK-001`

`SOL-TSK-001` 必须吸收以下正式要求：

- Task Aggregate 包含版本化 `plan`；
- Plan Node 与 Task 业务流转一致；
- Controller Decision Context 是总控读取入口；
- 任务长期归属于角色；
- Controller Claim 是查询后领取的短期租约；
- Controller Command 原子更新 Task + Plan + Event；
- 不再把总控仅视为提交静态 Decision 的无状态输出器。

### 15.3 对 `SOL-BHR-001`

Browser Host 只需获得最小唤醒信息：

```text
task_id
required_role
event_id / dispatch_ref
可选 conversation_ref
```

扩展不携带完整上下文，不决定计划，不修改 Task。总控被唤醒后重新通过 Action 查询正式 Decision Context。

### 15.4 对 `SOL-MOB-001`

总控只消费稳定的 Model Inference Result Ref，不依赖 DeepSeek、手机设备或具体模型品牌。手机模型没有 Task、Plan、Approval、Local Control 或 Browser Action 权限；未实现或未达标时继续使用 DeepSeek，不阻塞总控 MVP。

## 十六、实施顺序

```text
1. 冻结本文与配置目录命名
2. 建立 agent-profiles 最小四级配置
3. 定义 Task Plan、Decision Context、Claim、Controller Command Schema
4. 实现并接入正式 Task Control Adapter
5. 生成 Builder-compatible Action OpenAPI
6. 人工更新一个 Controller Custom GPT
7. 执行正常、失败、修订、接管、冲突和审批场景
8. 形成评估报告
9. 将真实消费需求交给 SOL-LCL-001
10. 将 Task + Plan + Claim 要求交给 SOL-TSK-001
```

## 十七、风险与暂缓决策

| 项目 | 当前处理 |
|---|---|
| Custom GPT 是否能感知自身 `g-...` | 不作为 MVP 前提；Gateway 通过认证绑定 Profile，扩展未来观察 URL。 |
| 一个 GPT 多个会话如何路由 | 由 Browser Host MVP 处理；Task 不绑定会话真源。 |
| Plan 是否未来拆成独立 Aggregate | MVP 保持 Task 内嵌；真实复杂度出现后再评估。 |
| 多总控竞争与抢占 | MVP 使用简单可过期 Claim；不做复杂分布式租约。 |
| Action 操作是否继续拆分 | 先用四个高层 Operation，以 Builder 实测结果决定。 |
| 自动同步 Custom GPT 配置 | 暂缓；先人工发布并记录 Hash、Commit 和验证证据。 |
| 正式 Approval 入口 | 已提供 `/v1/approvals/grants` 与 BHR Get/Consume；管理后台审批产品仍暂缓。 |
| RAG / 向量 / 图谱 | 非 MVP 必需；先用受控引用和按需读取。 |

## 十八、正式图信息图谱（正文 Review 后单独制作）

本文正文确认后，应制作一张正式架构与运行闭环图，不在正文未冻结时生成临时视觉。

建议资产主题：

```text
SOL-CTL-001 总控配置、动态上下文与计划推进闭环
```

图中必须包含：

1. 左侧 Git 配置区：Shared → Role → Custom GPT Profile → Release。
2. 上方 ChatGPT Host：Instructions、Knowledge、Capabilities、Actions。
3. 中央 Controller Agent：Query → Understand → Claim → Decide → Command。
4. 右侧 Task Control：Task Snapshot、Embedded Plan、Event、Claim。
5. 下方外部领域：Local Control、Approval、Browser Host、Knowledge。
6. 明确数据所有权与接口方向。
7. 明确“Task belongs to Role；Claim belongs temporarily to Profile”。
8. 明确 Task 和 Plan 在同一业务命令中一致推进。

正式图片必须紧随 AI 可读语义镜像；图片资产和正文应在同一 Document Bundle 中管理。是否将当前单文件升级为 Bundle，在正文 Review 通过后由知识治理流程决定。

## 十九、来源与相关文档

### 19.1 项目内文档

- [ADR-004｜第二阶段核心四个 MVP 验证与可选端侧推理扩展](../../../adr/ADR-004-phase-2-four-mvp-validation.md)
- [SOL-LCL-001｜Local Control 与 CLI MVP](./SOL-LCL-001-Local-Control与CLI-MVP.md)
- [SOL-TSK-001｜任务消息中心与单任务调度 MVP](./SOL-TSK-001-任务消息中心与单任务调度MVP.md)
- [SOL-BHR-001｜ChatGPT Browser Host Runtime 扩展 MVP](./SOL-BHR-001-ChatGPT-Browser-Host-Runtime扩展MVP.md)
- [SOL-MOB-001｜手机端单模型多角色服务 MVP](./SOL-MOB-001-手机端单模型多角色服务MVP.md)
- [`engineering-document-authoring`](../../../../skills/engineering-document-authoring/SKILL.md)
- [`custom-gpt-actions`](../../../../skills/custom-gpt-actions/SKILL.md)

### 19.2 外部事实来源

最后复核：2026-08-05。

- [OpenAI Help Center：Creating and editing GPTs](https://help.openai.com/en/articles/8554397-creating-and-editing-gpts)
- [OpenAI Help Center：Configuring actions in GPTs](https://help.openai.com/en/articles/9442513-configuring-actions-in-gpts)
- [OpenAI Help Center：Sharing and publishing GPTs](https://help.openai.com/en/articles/8798878-sharing-and-publishing-gpts)
