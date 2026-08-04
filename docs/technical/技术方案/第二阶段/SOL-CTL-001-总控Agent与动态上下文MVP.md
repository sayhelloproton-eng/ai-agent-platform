# SOL-CTL-001｜总控 Agent 与动态上下文 MVP 技术方案

| 字段 | 值 |
|---|---|
| 方案 ID | `SOL-CTL-001` |
| 状态 | Candidate |
| 所属阶段 | 第二阶段 MVP-1 |
| 核心领域 | Agent Governance / Controller |
| 第一宿主 | ChatGPT 网页端 Custom GPT |
| MVP 上游 | Goal / Context Fixture |
| MVP 下游 | Mock Capability Action |
| 后续衔接 | Local Control、任务消息中心、Browser Host |

## 一、目标

本 MVP 只验证一件事：

> 一个版本化的总控 Agent，能否在真实 Custom GPT 宿主中读取版本化动态上下文，理解目标与当前状态，并输出稳定、可验证、可被下游领域消费的结构化 Decision。

它不验证真实本机资源、不验证任务数据库、不验证 Chrome 自调用，也不建设通用多 Agent 平台。

## 二、需要回答的核心问题

1. 总控能否脱离旧聊天历史，在新会话中恢复身份、目标和当前状态？
2. 总控能否区分固定角色规则、动态 Context、Goal / Task Snapshot 和上一轮结果？
3. Context 版本变化后，总控能否使用最新版本，而不是继续依赖旧事实？
4. 信息不足、版本冲突、目标冲突或权限不明时，总控能否停止并请求补充？
5. 总控能否输出稳定的结构化 Decision，而不是只给自然语言建议？
6. 将 Mock 替换为真实 Local Control 和任务中心后，是否无需改写总控核心行为规则？

## 三、领域边界

### 3.1 本 MVP 拥有

- `controller-role@v1` 角色定义；
- 总控固定 Host Instructions；
- Controller Input Contract；
- Controller Decision Contract；
- 动态 Context 的消费规则；
- 能力选择、停止、澄清和完成判定规则；
- Mock Action、测试 Fixture 与评估用例。

### 3.2 本 MVP 不拥有

| 对象 | 所属限界上下文 |
|---|---|
| Goal 正文、版本和规划 | Goal / Planning |
| Task 状态、流转和处理者 | Task Control |
| Context 编译、存储与刷新 | Context |
| 本机仓库、文件和 Runtime | Local Resource Access |
| 执行过程与 Attempt | Execution |
| 审批记录和授权 | Approval |
| Artifact 文件本体 | Artifact |
| 网页标签页、会话和 DOM | Browser Host |

MVP 阶段通过 Fixture 模拟这些领域的公开接口，不复制它们的内部实体，也不让总控直接修改任何领域数据库。

## 四、Custom GPT 宿主定位

一个 Custom GPT 可以承载一个专用 Agent Profile：

```text
固定 Instructions
+ Knowledge（稳定参考）
+ 当前会话
+ Actions
+ 宿主模型能力
```

但 Custom GPT 本身不提供平台级 Agent Registry、持久 Task Store、可编程多 Agent Handoff 或自主 Runtime Loop。

因此角色资产必须保持宿主无关：

```text
controller-role@v1
        ↓ 发布装载
Custom GPT Host

未来也可以装载到：
API Agent Runtime / Codex / OpenCode / 本地模型
```

Custom GPT Builder 配置是角色资产的发布投影，不是唯一真源。

## 五、最小组件

```text
Controller MVP
├── Role Profile
├── Fixed Host Instructions
├── Controller Input Contract
├── Decision Contract
├── Mock Context Action
├── Mock Capability Action
├── Test Fixtures
└── Evaluation Runner / Manual Test Runbook
```

### 5.1 Role Profile

建议最小结构：

```json
{
  "role_profile_id": "controller",
  "role_profile_version": "1.0.0",
  "name": "平台总控",
  "responsibilities": [
    "理解目标和当前状态",
    "识别缺失上下文",
    "选择下一项能力",
    "提交结构化决策",
    "复审结果并判断完成"
  ],
  "forbidden_behaviors": [
    "直接修改任务状态",
    "直接执行本机命令",
    "扩大目标或权限",
    "在版本冲突时猜测"
  ],
  "decision_contract_version": "1.0.0"
}
```

### 5.2 固定 Host Instructions

固定 Instructions 只保存低频变化的行为规则：

- 你是平台总控，不是执行器；
- 启动时必须获取版本化 Bootstrap；
- 不把聊天历史当作项目当前真相；
- 只通过已注册领域接口获取动态事实；
- 最新有效 Context / Task 版本优先；
- 信息不足、冲突或风险不明时必须停止；
- 输出必须符合 Decision Contract；
- 动态 Context 不得突破固定安全边界；
- 不得直接修改 Task、Context 或数据库字段。

当前项目状态、Git SHA、Task 状态和执行结果不能写死在 Instructions 中。

## 六、Controller Input Contract

总控每轮被唤醒时，接收统一入口：

```json
{
  "input_contract_version": "1.0.0",
  "controller_ref": {
    "role_profile_id": "controller",
    "role_profile_version": "1.0.0"
  },
  "goal_ref": {
    "goal_id": "goal-fixture-001",
    "goal_version": 1
  },
  "task_ref": {
    "task_id": "task-fixture-001",
    "task_version": 3
  },
  "context_ref": {
    "context_instance_id": "ctx-fixture-003",
    "context_instance_version": 3,
    "content_hash": "sha256:..."
  },
  "capability_catalog_version": "1.0.0",
  "latest_result_refs": [],
  "budgets": {
    "max_loop_turns": 6,
    "max_no_progress_turns": 2
  }
}
```

MVP 中 `goal_ref` 和 `task_ref` 指向测试 Fixture。正文由 Mock Action 返回，而不是直接复制到固定提示词中。

## 七、动态 Context 模型

### 7.1 固定与动态分离

```text
固定：
角色行为、安全边界、接口使用规则、Decision 输出规则

动态：
Goal、Task、Git 状态、Runtime 状态、Capability Catalog、上一轮 Result
```

### 7.2 Context Instance

最小字段：

```json
{
  "context_instance_id": "ctx-001",
  "context_instance_version": 2,
  "role_profile_version": "1.0.0",
  "context_policy_version": "1.0.0",
  "capability_catalog_version": "1.0.0",
  "source_commit": "fixture-sha",
  "task_id": "task-fixture-001",
  "task_version": 2,
  "generated_at": "2026-08-04T12:00:00Z",
  "expires_at": "2026-08-04T12:30:00Z",
  "content_hash": "sha256:..."
}
```

### 7.3 Bootstrap 与 Refresh

MVP 提供两个 Mock Action：

```text
context.bootstrap
context.refresh
```

`bootstrap` 返回小型导航包：

- 当前角色版本；
- 当前 Goal / Task 引用；
- Context 版本；
- 可用能力目录；
- 最新正式状态摘要；
- 可按需获取的资源；
- 当前预算和停止条件。

`refresh` 返回：

- 最新 Context 版本；
- 自上一个版本以来的 Delta；
- 新增、变化和失效项；
- 是否必须丢弃旧版本；
- 版本冲突原因。

### 7.4 旧上下文处理

固定规则：

```text
只把最新、有效且 Hash 一致的 Context Instance 视为当前事实。
旧版本只用于历史解释。
版本冲突时不得自行合并或猜测。
```

## 八、Decision Contract

总控输出必须同时具备机器合同和人类摘要。

### 8.1 最小 Decision 类型

```text
REQUEST_CONTEXT
REQUEST_CAPABILITY
WAIT
REQUEST_CLARIFICATION
CONTINUE
PAUSE
FAIL
COMPLETE
```

### 8.2 结构

```json
{
  "decision_contract_version": "1.0.0",
  "decision_id": "decision-001",
  "decision_type": "REQUEST_CAPABILITY",
  "based_on": {
    "goal_version": 1,
    "task_version": 3,
    "context_instance_version": 3
  },
  "target": {
    "capability_ref": "repository.snapshot"
  },
  "arguments": {
    "project_id": "ai-agent-platform"
  },
  "expected_result": {
    "result_type": "repository_snapshot"
  },
  "next_handler_hint": "local_control",
  "reason_code": "MISSING_REPOSITORY_STATE",
  "human_summary": "缺少当前仓库状态，需要先获取只读快照。",
  "idempotency_key": "..."
}
```

`next_handler_hint` 只是总控建议。未来由任务中心根据合法迁移决定是否接受，不能让总控直接写 `task.status`。

## 九、Mock Action

MVP 的 Action 可收敛为四个高层 Operation：

```text
getControllerBootstrap
refreshControllerContext
getFixtureCapabilityResult
submitControllerDecision
```

Mock 服务至少保存：

- 当前 Context Fixture 版本；
- Goal / Task Fixture；
- 已提交 Decision；
- 下一轮测试结果；
- 过期、冲突和无进展场景；
- 幂等键与调用记录。

Action 返回高信息密度结果，不按文件或字段拆成大量低层调用。

## 十、最小验证场景

### 10.1 正常三轮

```text
Context v1：缺少仓库状态
→ 总控输出 REQUEST_CAPABILITY(repository.snapshot)

Context v2：仓库干净、SHA 已知
→ 总控输出 CONTINUE 或下一项 REQUEST_CAPABILITY

Context v3：模拟结果满足 Acceptance
→ 总控输出 COMPLETE
```

### 10.2 信息不足

缺少目标验收标准：

```text
→ REQUEST_CLARIFICATION
```

不得自行发明验收条件。

### 10.3 旧版本

总控收到 `task_version=2`，Mock 当前为 3：

```text
→ PAUSE 或 REQUEST_CONTEXT
```

不得继续提交基于旧版本的执行决策。

### 10.4 Context 与能力冲突

Goal 要求只读，但 Capability Fixture 标记为写操作：

```text
→ PAUSE
→ reason_code = CAPABILITY_OUT_OF_SCOPE
```

### 10.5 新会话恢复

打开一个没有旧聊天记录的新总控会话：

```text
加载固定 Instructions
→ context.bootstrap
→ 识别当前 Goal / Task / Context
→ 输出与旧会话语义一致的 Decision
```

### 10.6 无进展保护

连续两轮请求相同信息但 Context 无变化：

```text
→ PAUSE
→ reason_code = NO_PROGRESS
```

## 十一、交付物

```text
controller-role@v1
controller-host-instructions@v1
controller-input-contract@v1
controller-decision-contract@v1
mock-context-action
mock-capability-action
test-fixtures
manual-test-runbook
evaluation-report
```

具体仓库落位在实现前依据最新目录和 Registry 规则确定。本方案不默认创建空 `agents/` 或 `knowledge-packs/`；首个真实 Agent Profile 的落位必须在实现任务中明确授权。

## 十二、验收标准

MVP 通过必须同时满足：

- 在真实 Custom GPT 中运行；
- 角色、输入和 Decision 合同均有版本；
- 无历史新会话可以恢复当前测试任务；
- 能识别 Context 版本变化与失效；
- 信息不足时主动请求；
- 版本冲突时停止；
- 能消费动态 Context v1 → v2 → v3；
- Decision JSON 可通过 Schema 校验；
- 不依赖手工复制旧 Chat 全文；
- 替换 Mock 下游时不修改核心角色规则。

## 十三、非目标

- 不实现真实 Local Control；
- 不实现 Task Store；
- 不实现 Chrome 自动唤醒；
- 不实现通用子 Agent；
- 不实现多任务；
- 不实现完整 Context Compiler；
- 不执行 Git 写入；
- 不建设完整管理后台；
- 不验证长期无人值守运行。

## 十四、后续衔接

MVP-2 根据本方案真实产生的 `REQUEST_CAPABILITY`、参数和 `expected_result` 设计 Local Control，而不是从 Git 命令列表反推接口。

MVP-3 根据 Decision Contract 设计合法 Task Transition，而不是让总控直接修改状态。

MVP-4 只注入最小 `task_id / role_ref / dispatch_token`，总控仍通过 Action 获取正式输入。

## 十五、外部事实来源

最后复核：2026-08-04。

- OpenAI Help Center：Creating and editing GPTs
  https://help.openai.com/en/articles/8554397-creating-and-editing-gpts-with-actions
- OpenAI Help Center：Configuring actions in GPTs
  https://help.openai.com/en/articles/9442513-configuring-actions-in-gpts
