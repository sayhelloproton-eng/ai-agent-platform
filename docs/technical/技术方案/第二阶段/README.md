# 第二阶段技术方案

本目录承载 `ai-agent-platform` 第二阶段核心四个 MVP，以及一个不构成阶段完成门槛的端侧推理扩展 MVP。

```text
核心：总控 → Local Control → Task Control → Browser Host → 真实单任务闭环
可选：DeepSeek 基线 → 手机单模型多角色 Provider → 影子评测与低风险灰度
```

上位决策：

- [ADR-004｜第二阶段核心四个 MVP 验证与可选端侧推理扩展](../../../adr/ADR-004-phase-2-four-mvp-validation.md)

## 一、方案清单

### 1.1 核心四个 MVP

| 顺序 | 技术方案 | 核心验证对象 |
|---|---|---|
| 1 | [SOL-CTL-001｜总控 Agent 与动态上下文 MVP](./SOL-CTL-001-总控Agent与动态上下文MVP.md) | Custom GPT 分级配置、Decision Context、先查后领、结构化 Plan 与 Controller Command |
| 2 | [SOL-LCL-001｜Local Control 与 CLI MVP](./SOL-LCL-001-Local-Control与CLI-MVP.md) | 唯一 Gateway、安全 npm CLI、受控本机 Capability 与 Canonical Local Result |
| 3 | [SOL-TSK-001｜任务消息中心与单任务调度 MVP](./SOL-TSK-001-任务消息中心与单任务调度MVP.md) | Task Aggregate、内嵌 Plan、三类 Claim、Work Item、Event、Browser Dispatch |
| 4 | [SOL-BHR-001｜ChatGPT Browser Host Runtime 扩展 MVP](./SOL-BHR-001-ChatGPT-Browser-Host-Runtime扩展MVP.md) | Session Binding、Observation、Wake、授权 Host Command、恢复与人工接管 |

### 1.2 可选后置 MVP

| 技术方案 | 定位 | 阶段关系 |
|---|---|---|
| [SOL-MOB-001｜手机端单模型多角色服务 MVP](./SOL-MOB-001-手机端单模型多角色服务MVP.md) | 可替换的 Model Inference Provider：一个 App、一个当前模型、多个隔离 Role Profile | 不阻塞核心四项；DeepSeek 先作为默认和兜底 |

## 二、Git-only 边界

本目录与上位 ADR 当前只进入 Git：

- 不进入 `docs/knowledge/**`；
- 不建立或更新飞书 Mapping；
- 不运行 Feishu Publisher；
- 不触发覆盖或 Readback；
- 待方案、实现和端到端证据稳定后再评估知识发布。

## 三、实施顺序

```text
MVP-1 Controller
→ MVP-2 Local Control / CLI
→ MVP-3 Task Control
→ MVP-4 Browser Host
→ 核心串联验证
```

设计与原型可以有限并行，但每个领域必须按自己的所有权冻结合同，不能通过共享表或直接读库提前耦合。

手机模型顺序：

```text
先冻结 Observation / Inference Contract
→ 先接 DeepSeek 真实运行
→ 手机实现同一合同
→ 影子评测
→ 达标后低风险灰度
```

## 四、统一领域边界

| 领域 | 拥有 | 不拥有 |
|---|---|---|
| Controller / Agent Profile | 配置、目标理解、计划语义、Controller Command | Task 持久化、本机资源、浏览器和审批状态 |
| Local Control | 本机 Capability、Registry、Policy、Adapter、Local Result | Task / Plan / Claim、模型推理、浏览器 DOM |
| Task Control | Task、内嵌 Plan、三类 Claim、Work Item、Event、Dispatch | Git / Runtime 事实、DOM、模型内部状态、审批实体 |
| Browser Host | Binding、Observation、页面动作、局部 Journal、Host Result | Task / Plan 修改、业务语义和正式授权 |
| Model Inference | Provider、Role Profile、推理队列、结构化 Result | Task、Approval、工具执行、Browser Action |
| Approval / Evidence | 决定、一次性 Grant、证据生命周期 | 总控语义、页面执行和本机资源 |

## 五、关键统一规则

### 5.1 任务包含计划

Task Aggregate 在 MVP 中内嵌一个版本化 Node List Plan。计划可以由上游 Requirement / Planner 提供，也可以由总控补建。关键任务流转必须评估并同步更新 Task、Plan Node 和 Event。

### 5.2 先查询，再 Claim

总控收到 `task_id` 后：

```text
查询 Controller Decision Context
→ 判断 required_role、版本和当前计划
→ 领取 Controller Claim
→ 按需查询本机 / 知识 / 历史证据
→ 提交 Controller Command
```

Task 长期归属于角色；具体 Profile 只获得短期处理租约。

### 5.3 三类 Claim 分离

- Controller Claim：Task 语义推进；
- Work Item Claim：专业执行工作；
- Browser Dispatch Claim：一次页面投递或动作。

不得使用一个通用 Claim 隐式赋予跨领域权限。

### 5.4 同步 Local Query 不强制建 Work Item

总控当前回合需要仓库、文件或 Runtime 事实时，可以直接通过 `local.*` 查询。跨回合、长时、异步、需要交接或副作用的工作才进入 Work Item / Execution。

### 5.5 正式结果不走聊天正文

BHR 可以把最小 Wake Envelope 输入 GPT；GPT 的正式命令必须经 Action 进入 Gateway。BHR 不解析聊天正文为 Task / Plan 更新。

### 5.6 感知不等于授权

Screenshot、DOM、DeepSeek 或手机模型判断只能形成 Observation / Assessment；高风险网页动作必须消费 Approval 的一次性 Grant。

### 5.7 版本、幂等与原子性

跨领域写命令至少携带：

```text
expected_task_version
expected_plan_version
claim_ref
request_id
correlation_id
idempotency_key
```

Task Control 接受命令时原子更新 Task、Plan / Node、Event 和必要下游引用；禁止直接字段 Patch。

## 六、核心结束条件

```text
已有或新建 Requirement / Goal
→ Task Control 保存带结构化 Plan 的 Task
→ BHR / 用户用 task_id 唤醒总控
→ 总控查询 Context 并 Claim
→ 总控直接查询 Local Control 真实事实
→ 提交 Controller Command
→ Task Control 原子推进 Task / Plan / Event
→ 产生 Work Item 或 Browser Dispatch
→ Worker / BHR 回报结果
→ 再次唤醒总控
→ 继续、审批、完成或明确停止
```

核心四项分别通过并跑通该链路，即可结束第二阶段核心验证。手机模型未实现、离线或不达标时继续使用 DeepSeek，不影响结束判定。

## 七、暂缓事项

- 多任务依赖与并发 Lane；
- 复杂 DAG / BPMN；
- 生产消息队列；
- 正式 Approval / Evidence / Recovery 产品；
- 完整 Platform Management Console；
- 多执行器竞争和自动路由；
- 无人监督任意网页自动化；
- 手机模型生产级接管；
- AI 视频工作流。

## 八、文档和视觉规则

正文先完成跨领域 Review。涉及总体闭环、状态机、Claim、审批和端侧 Provider 的复杂图，在合同冻结后生成正式图片与 AI 可读语义镜像；当前不以临时 Mermaid 代替最终资产。
