# ADR-004 第二阶段四个 MVP 验证与串联

- 状态：Accepted
- 日期：2026-08-04
- 决策者：Project Owner
- Supersedes：无
- Superseded By：无

> 本 ADR 只进入 Git，不进入 `docs/knowledge/**`，不触发飞书映射、覆盖或发布。飞书知识库保持冻结，待平台方案与实现充分验证、正文成熟后再统一评估。

## Decision

`ai-agent-platform` 第二阶段不以“一次实现完整 Agent 平台”为目标，而以四个边界清晰、可以独立验收的纵向 MVP 为主线：

```text
MVP-1 总控 Agent 与动态上下文
→ MVP-2 Local Control / CLI
→ MVP-3 任务消息中心
→ MVP-4 ChatGPT Browser Host Runtime 扩展
→ 四个 MVP 串联验证
```

四个 MVP 依次验证。每个 MVP 只实现自身最小闭环；跨 MVP 共用的数据结构、事件、存储、鉴权、审计、管理后台和基础设施，当前只保留接口占位、引用字段、Fake / Mock Adapter 与待决事项，不提前建设泛化共享层。

第二阶段完成的唯一判据是：

> 四个 MVP 分别通过后，能够组成一条真实、可解释、可恢复到明确停止点的单任务闭环。

第二阶段通过后，第三阶段再扩展多任务、多角色、多执行器、正式审批、Evidence、恢复、并行调度和完整平台管理后台。

## Context

### 为什么采用四个独立 MVP

此前平台已经完成知识、Context、Registry、Gateway、Local Runtime、Dev Tunnel、Auth、Policy、Contract 等基础建设，但仍缺少以下真实能力：

1. 网页端总控无法稳定恢复项目状态并输出统一决策；
2. 总控无法直接获取本机仓库、文件、Runtime 和 Artifact 的最新事实；
3. 任务流转仍依赖聊天文本和人工转交，缺少可持久化的调度真源；
4. ChatGPT 网页端无法被平台可靠地重新唤醒、切换角色、恢复会话或执行经过审批的网页操作。

若直接建设完整平台，四类问题会被一次性耦合，难以判断失败属于模型、上下文、本机资源、任务状态还是网页宿主。因此第二阶段采用顺序化 MVP：

```text
先证明“大脑能工作”
→ 再证明“大脑能读取真实世界”
→ 再证明“流程能够被持久化和调度”
→ 最后证明“网页端角色能够被真实驱动”
```

## Architecture Boundaries

### 核心角色定位

### 3.1 总控 Custom GPT：语义大脑

总控负责：

- 理解 Goal、Task 和当前上下文；
- 判断缺失信息；
- 选择下一项能力；
- 产生结构化 Decision；
- 对结果进行语义复审；
- 判断继续、暂停、请求澄清、失败或完成。

总控不拥有 Task、Context、Execution、Approval、Evidence 或浏览器状态，不直接修改数据库，也不直接运行本机 Shell。

### 3.2 Local Control / 本地执行端：真实能力与执行入口

Local Control 负责：

- 读取受控本机资源；
- 调用 Git、文件、Runtime、Artifact 等适配器；
- 执行确定性脚本和受控能力；
- 返回结构化结果、错误与证据引用。

CLI 只是 Local Control 的人类与调试 Adapter。Custom GPT Action、未来 MCP、后台管理 API 或本地 Agent 都可以调用同一个 Application Service。

Codex、OpenCode、本地脚本和未来其他模型属于执行端，不是平台总控。

### 3.3 任务消息中心：调度中心与工作流控制面

任务消息中心是平台串联一切的可持久化工作流语言，回答：

```text
任务是什么？
当前到哪一步？
为什么发生这次流转？
现在由谁处理？
下一步交给谁？
等待什么条件？
产生了哪些领域引用？
```

任务中心拥有 Task、版本、工作流状态、处理者、Work Item、Task Event、Dispatch Signal 和合法迁移规则；不复制 Context、Resource、Artifact、Execution、Approval 或 Evidence 的内部实体。

### 3.4 Chrome 扩展：Browser Host Runtime Adapter

扩展负责把任务中心的 Host Command 转换为真实网页操作：

- 绑定或恢复既有会话；
- 继续驱动总控下一轮；
- 为指定角色打开新页面或新会话；
- 注入最小任务引导；
- 观察消息发送和响应生命周期；
- 采集截图、DOM 和页面状态；
- 回报投递与宿主状态；
- 在获得一次性正式授权后执行精确 UI 操作。

扩展不负责语义决策、任务状态迁移或审批判断。本地视觉模型只负责页面感知与证据生成，不能单独构成授权。

## MVP Definition

| 顺序 | MVP | 核心验证问题 | 最小真实产物 | 明确不做 |
|---|---|---|---|---|
| 1 | 总控 Agent 与动态上下文 | 新会话中的版本化总控能否读取动态上下文并输出稳定 Decision | `controller-role@v1`、输入合同、Decision 合同、Mock Action、测试集 | 真实 CLI、任务数据库、扩展、多角色编排 |
| 2 | Local Control / CLI | 总控需要的本机事实能否通过受控接口真实获取 | 只读 Local Control、CLI Adapter、Action Adapter、Canonical Result | 任意 Shell、写 Git、任务调度、浏览器操作 |
| 3 | 任务消息中心 | 单个任务能否被版本化规则从总控流转到执行端并再次调度总控 | Task、Work Item、Event、Dispatch Signal、单任务状态机 | 多任务依赖图、复杂队列、正式审批和恢复 |
| 4 | Browser Host Runtime 扩展 | 平台调度能否转成可靠的 ChatGPT 网页会话、消息与受控 UI 操作 | 会话注册、Host Command、页面 Adapter、响应观察、截图/DOM、回报 | 通用网页 Agent、业务判断、无授权自动确认 |

## Reasons and Dependency Order

### 5.1 MVP-1 先确定消费者

总控先定义：

- 自己是谁；
- 需要哪些输入；
- 如何判断上下文是否有效；
- 能产生哪些 Decision；
- 下游应返回什么结果；
- 什么情况下必须停止。

这样后续 Local Control 不会先做成一组缺少真实消费者的命令集合。

### 5.2 MVP-2 提供真实本机事实

Local Control 根据总控已经暴露的真实需求，实现最小资源能力。它替换手工上传 ZIP 的现状，使总控可以获得：

- 仓库 SHA、分支、工作区状态；
- 受控文件内容；
- Runtime 与服务状态；
- Artifact 与执行结果；
- 分页、摘要、Hash 和证据引用。

### 5.3 MVP-3 在真实接口基础上形成调度真源

总控 Decision 与 Local Control Result 稳定后，任务中心才能准确设计：

- Task 当前状态；
- 合法迁移；
- Work Item；
- 当前和下一处理者；
- 待唤醒信号；
- 事件时间线。

任务中心不是先验设计的万能工作流引擎，而是根据前两个 MVP 的真实协作形成最小控制面。

### 5.4 MVP-4 将控制面接入真实网页宿主

扩展最后接入稳定的 Host Command。它无需猜测业务，只把任务中心的调度意图转成：

- 继续已有总控会话；
- 打开固定测试审计角色会话；
- 注入最小 Task 引导；
- 观察一轮响应；
- 回报页面状态；
- 执行经过授权的测试 UI 动作。

## DDD Boundaries

复杂系统必须按限界上下文划分，各领域只通过版本化接口或领域事件协作。

第二阶段直接涉及：

| 限界上下文 | 拥有的模型 | 只提供的接口 |
|---|---|---|
| Agent Governance / Controller | 角色定义、能力和决策规范 | 获取角色版本、提交 Decision |
| Context | Context Instance、来源、版本和失效规则 | Bootstrap、Refresh、Collect |
| Local Resource Access | Resource Registry、Snapshot、Result | Describe、Collect、Fetch |
| Task Control | Task、Workflow State、Work Item、Event、Signal | Create、Get、Submit、Claim、Report |
| Browser Host | Session Binding、Page State、Host Command Result | Open、Continue、Observe、Execute Authorized UI Action |
| Execution | Execution Attempt、Heartbeat、Result | Dispatch、Report |
| Approval | Approval、授权条件、一次性令牌 | Request、Decide、Validate |
| Evidence | Log、截图、Hash、Readback | Append、Query |

第二阶段允许使用 Fixture 替代尚未实现的上下游领域，但不得：

- 让一个 MVP 直接读取另一个领域数据库；
- 把跨领域引用误写成内部实体；
- 让扩展修改 Task；
- 让任务中心解释模型语义；
- 让总控直接执行 Shell；
- 让视觉模型自行批准点击。

## Shared Capability Decision

第二阶段不提前创建泛化 Shared Kernel。跨 MVP 共用部分按以下方式处理：

```text
当前：
接口占位 + 引用字段 + Fake / Mock + 待决清单

串联阶段：
根据真实重复点与稳定性统一审视

最终：
决定归入任务中心、共享契约包、基础设施或独立领域
```

允许提前保留的最小公共字段包括：

```text
actor_id
project_id
goal_ref
task_id
task_version
context_ref
capability_ref
resource_ref
artifact_ref
result_ref
request_id
correlation_id
idempotency_key
created_at
```

这些字段只是跨领域引用，不代表当前必须建设统一公共模块。

## Validation Flow

最终验收链路固定为：

```text
新建或恢复总控会话
→ 总控获取角色版本和 Context Bootstrap
→ 总控通过 Action 请求本机真实状态
→ Local Control 返回 Canonical Result
→ 总控提交结构化 Decision
→ 任务中心验证版本与状态迁移
→ 任务中心生成 Work Item
→ Local Control / 本地执行端完成工作并上报 Result Ref
→ 任务中心生成 Controller Host Command
→ Chrome 扩展继续唤醒原总控会话
→ 总控读取最新 Task / Context / Result
→ 总控继续、暂停、请求澄清或完成
```

扩展还需使用固定测试角色验证：

```text
任务中心生成 reviewer Host Command
→ 扩展打开指定 Custom GPT 页面或新会话
→ 注入 task_id + role_ref + dispatch_token
→ 审计角色通过 Action 获取正式上下文
```

受控 UI 动作使用测试审批 Fixture 验证：

```text
页面出现确认状态
→ 扩展采集截图与 DOM
→ 本地视觉模型返回候选和置信度
→ 测试审批记录生成一次性授权
→ 扩展重新校验 DOM 后点击一次
→ 回报动作与页面变化
```

该测试只验证 Browser Host 能力，不代表第二阶段已实现完整 Approval 领域。

## Acceptance Criteria

四个 MVP 必须分别满足自身验收标准，并通过最终串联测试。

### 9.1 必须满足

- 总控在无历史新会话中能够恢复角色和当前目标；
- 总控能够识别 Context 版本变化、信息不足和冲突；
- Local Control 能够返回真实本机资源且严格只读；
- 任务中心能够解释单个任务的全部流转；
- 旧版本、重复请求和非法状态迁移被拒绝；
- 扩展能够可靠继续原会话并打开固定角色新会话；
- 扩展重启后可恢复未完成 Host Command；
- 截图感知、审批授权和 DOM 执行三者相互分离；
- 最终闭环能够明确完成、暂停或停止，而不是无限循环。

### 9.2 第二阶段明确不要求

- 多任务并发；
- 通用多角色编排；
- 动态执行器竞争与租约；
- 完整 Goal Planning 引擎；
- 正式 Approval / Evidence / Recovery；
- 生产级消息队列；
- 完整 Platform Management Console；
- AI 视频工作流；
- 无人监督的任意网页自动化；
- 完整长期自主 Agent Runtime。

## Platform Management Console Impact

整个平台未来建设统一的 `Platform Management Console`，任务消息中心只是其中一个模块。

未来模块包括：

```text
平台总览
Goal / Planning
任务与工作流
Agent / Role
Context
Local Control
执行器与执行记录
Artifact / Evidence
审批与安全
Browser Host
Runtime / 服务状态
配置与审计
```

第二阶段不增加第五个“管理后台 MVP”。各 MVP 只保留：

- 查询接口；
- 基础管理读模型；
- 调试或测试入口；
- 必要的状态可视化数据。

完整控制台在串联完成后统一规划，避免前端直接依赖领域表或提前耦合未稳定的合同。

## Trade-offs and Risks

| 风险 | 控制措施 |
|---|---|
| 总控依赖长聊天历史 | 新会话 Bootstrap、版本化 Context、旧版本失效规则 |
| CLI 演变成任意 Shell | 只暴露高层 Capability、固定项目根、路径治理、严格只读 |
| 任务中心膨胀成超级领域 | 只拥有协调状态与引用，不复制专业领域实体 |
| 扩展误发到错误会话 | 角色、会话、Task、版本、Token 多重绑定 |
| 页面变化导致错误点击 | DOM 与视觉双证据、动作前重新校验、无法确定立即停止 |
| 视觉模型把“看到”当成“批准” | 感知与授权完全分离，一次性审批令牌 |
| 过早抽象共享层 | 四个 MVP 完成后再统一抽象 |
| 无限自调用 | Loop Budget、无进展次数、超时、终止状态和人工接管 |

## 2026-08-09 Closeout Review Checkpoint（不改变本 ADR 的 Accepted 决策）

> 本节记录真实串联验收后的收口状态与评估方法，不把尚未共同裁决的 Phase 2.1 边界提升为新的 ADR 决策。

截至最近一次已确认仓库基线 `main@c2bded0fbe9b6c6bf5940d890b1e90a4588929e9`，自动化与真实浏览器验收已经证明：

- Level 2 真实四域只读链路已完成并进入 `Task COMPLETED`；
- Level 3 写链已经真实走过 `Browser Dispatch → Approval Draft → 人工明确批准 → one-time Grant → same-command Resume → PREPARED / EXECUTING`；
- 旧 Level 3 Task `phase2-l3-real-20260809-0934-01` 在多轮代码版本和失败 Attempt 后已不再适合作为干净 Happy Path 样本，应封存为 `UNCERTAIN / no-blind-retry / recovery` 历史证据；
- `attempt-04` 的 Browser Host Journal 最终记录为 `UNCERTAIN / USER_CONTROL_ACTIVE`，且其 Binding、GPT、Conversation、Page Fingerprint、Action Fingerprint 与 Approval Precondition Hash 在 Resume 历史中保持一致；
- `attempt-05` 实际未创建：Controller Claim 成功，但 `submitControllerCommand` 以 `CONTROLLER_COMMAND_NOT_ALLOWED / Current Plan Node is not executable` 拒绝，没有新 Command、WorkItem、Dispatch 或 Browser Side Effect；
- 后续已经落库 `USER_CONTROL_ACTIVE` execution gate 与 Controller Decision Context admissible-command filtering。

### 收口评估原则

当前不再采用“现场失败 → 立即打一个窄补丁 → 继续旧 Task”的调试方式。新 ChatGPT + Codex 收口评估必须：

1. 以当前真实仓库 HEAD 为代码真源，以 Browser Host Journal / Task Event / 明确页面证据为现场真源；
2. 区分“已被证据证明的缺陷”与“历史 ChatGPT 根因推测”，不得机械应用历史 Overlay；
3. 先离线完成 Task Control → Controller Adapter → Browser Host → Approval → Grant → Resume → SUBMIT_MESSAGE → Result 的集中审计；
4. 只在代码已冻结且被判定具备条件时，执行**一次全新 Task、无诊断干扰的 Level 3 Happy Path**；
5. 该干净 Happy Path 若失败，停止现场 attempt 循环，记录为未通过并转离线修复；
6. Level 4 / Browser resilience 是否拆为 Phase 2.1 Hardening，由收口评估共同裁决，不在本节预先决定。

详细现场证据与 Codex 接管说明见：

- `docs/technical/技术方案/第二阶段/PHASE2-MVP-CLOSEOUT-HANDOFF-20260809.md`

## Implementation Impact and Follow-up

本决策对应四篇技术方案：

1. `SOL-CTL-001`：总控 Agent 与动态上下文 MVP；
2. `SOL-LCL-001`：Local Control 与 CLI MVP；
3. `SOL-TSK-001`：任务消息中心与单任务调度 MVP；
4. `SOL-BHR-001`：ChatGPT Browser Host Runtime 扩展 MVP。

当前先完成正文 Review。涉及跨领域协作、运行链路、Host Command、截图审批链路和串联闭环的复杂图，应在正文定稿后生成正式图片资产并与文档同批落库。

## References

### 仓库内部

- `ARC-001-ai-agent-platform总体架构`
- `ARC-016-能力依赖多任务并行与分阶段MVP路线图`
- `THY-004-DDD与Agent系统边界建模`
- `WFL-002-目标进入决策规划与任务分解`
- `WFL-005-任务合同与多角色协作`
- `WFL-006-执行通道验证复审与集成`
- `WFL-007-任务状态Checkpoint移交与恢复`
- `WFL-009-审批权限校验与副作用治理`
- `EXP-005-Custom-GPT-Actions链路实验`
- `EXP-006-Gateway-Local-Runtime与Dev-Tunnels实验`

### 外部事实来源

最后复核：2026-08-04。

- OpenAI Help Center：Creating and editing GPTs
  https://help.openai.com/en/articles/8554397-creating-and-editing-gpts-with-actions
- OpenAI Help Center：Configuring actions in GPTs
  https://help.openai.com/en/articles/9442513-configuring-actions-in-gpts
- Chrome for Developers：Manifest、Extension Service Worker、Content Scripts、Tabs API
  https://developer.chrome.com/docs/extensions/reference/manifest
  https://developer.chrome.com/docs/extensions/develop/concepts/service-workers
  https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts
  https://developer.chrome.com/docs/extensions/reference/api/tabs
- MCP-SuperAssistant
  https://github.com/srbhptl39/MCP-SuperAssistant
