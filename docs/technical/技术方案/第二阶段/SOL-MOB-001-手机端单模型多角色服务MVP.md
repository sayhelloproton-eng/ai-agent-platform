# SOL-MOB-001｜手机端单模型多角色服务 MVP 技术方案

| 字段 | 值 |
|---|---|
| 方案 ID | `SOL-MOB-001` |
| 状态 | Candidate / Optional |
| 所属阶段 | 第二阶段可选后置 MVP |
| 核心领域 | Model Inference Provider / Edge Model Runtime |
| 设备基线 | iPhone 17 Pro |
| 上游参考 | [`端侧模型节点与单模型多角色服务构想与验证方案`](../端侧模型/端侧模型节点与单模型多角色服务构想与验证方案.md) |
| 第一消费者 | Browser Host 页面感知、后续任务结果解释 |
| 当前替代方案 | DeepSeek Provider / 测试 Fixture |
| 是否为第二阶段完成门槛 | 否 |

## 一、本文拥有的问题

本文只回答一个问题：

> 在不让手机模型拥有 Task、审批、工具执行或 Git 权限的前提下，能否用一个 iPhone App、一个当前基础模型和多个隔离 Role Profile，提供一个可被 DeepSeek 等外部 Provider 无缝替换的结构化推理服务？

本 MVP 不是“把整个平台搬进手机”，也不是“训练一个永不犯错的模型”。它只验证端侧模型能否成为一个受控的推理 Provider。

## 二、优先级决定

第二阶段的四个核心 MVP 不依赖手机模型：

```text
SOL-CTL-001
→ SOL-LCL-001
→ SOL-TSK-001
→ SOL-BHR-001
→ 核心串联完成
```

页面理解、截图分析和结构化判断在手机 MVP 完成前，允许使用：

```text
DeepSeek Provider
或
确定性 Vision / Inference Fixture
```

手机模型的实施顺序为：

```text
先冻结 Model Inference Contract
→ 先用 DeepSeek 跑通真实消费者
→ 手机 App 实现同一合同
→ 影子对比
→ 达标后才允许承担低风险请求
```

因此：

- `SOL-MOB-001` 可以在核心四个 MVP 后实施；
- `SOL-BHR-001` 不得把手机模型作为启动前置；
- DeepSeek 只是当前 Provider，不是领域真源；
- 手机模型达不到门槛时，平台继续使用 DeepSeek，不阻塞第二阶段。

## 三、领域边界

### 3.1 手机端 Model Inference Provider 拥有

- 当前加载的模型运行实例；
- 模型 Artifact 的本地版本引用；
- Role Profile 到推理配置的映射；
- 推理请求队列和预算；
- 会话隔离；
- 输入预处理和结构化输出校验；
- 模型运行健康状态；
- 推理耗时、内存、温度和错误摘要；
- Provider 自身的本地恢复。

### 3.2 手机端不拥有

| 对象 | 所属领域 |
|---|---|
| Goal、Task、Plan、Plan Node | Task Control / Planning |
| 当前任务由谁推进 | Task Control |
| Custom GPT 角色规则 | Agent Governance |
| 浏览器标签页、截图采集和 DOM | Browser Host |
| 是否允许真实点击或副作用 | Approval / Policy |
| Git、文件、Runtime 和 Shell | Local Control / Execution |
| 证据生命周期 | Evidence |
| 知识真源 | Git / Knowledge |
| 最终业务完成判定 | Controller / Reviewer |

核心规则：

> 模型只产生观察、分类、解释和动作提案；Runtime、Task Control、Policy 和 Approval 决定能否进入下一步。

## 四、Provider 抽象

消费者不能直接依赖：

```text
DeepSeek API
Gemma
Qwen
MLX
LiteRT
某个 iPhone App
```

消费者只依赖统一的 Model Inference Port：

```text
Browser Host / Controller / Reviewer
              ↓
      Model Inference Port
       ┌──────┴──────┐
       ↓             ↓
DeepSeek Adapter   Mobile Adapter
       ↓             ↓
远端模型          iPhone 单模型 Runtime
```

Model Inference Router 可以根据：

- 请求类型；
- 风险等级；
- 是否包含敏感数据；
- 手机在线状态；
- 延迟预算；
- 影子评测策略；
- 当前发布状态；

选择 DeepSeek、手机模型或 Fixture。

Provider 选择不改变 Task、Browser Host 或 Controller 合同。

## 五、一个 App、一个当前模型、多个角色

### 5.1 运行约束

第一版固定：

```text
一个 iPhone App
一个当前基础模型
一个推理 Runtime
多个隔离 Role Profile
局域网受控 API
```

不要求：

- 两个模型同时常驻；
- 两个 App 协作；
- 后台永久运行；
- 动态下载任意模型；
- 多用户公网服务。

### 5.2 Role Profile

MVP 至少验证两个 Profile：

```text
page-observer
result-interpreter
```

`page-observer`：

- 消费截图、DOM 候选和期望页面状态；
- 输出页面状态、候选元素、置信度和警告；
- 无工具权限；
- 无审批权。

`result-interpreter`：

- 消费 Local Result 摘要、错误码和验收条件；
- 输出结构化解释、风险和建议动作；
- 不修改 Task；
- 不调用本机工具。

后续可增加：

```text
task-understander
recovery-advisor
knowledge-assistant
public-showcase
learning-coach
```

但不属于本 MVP。

### 5.3 角色隔离

至少隔离：

| 隔离项 | MVP 规则 |
|---|---|
| API Operation | 每类请求使用明确 Operation 或服务端 Profile 映射 |
| 身份认证 | 只接受 Gateway / 受控 Mac Client |
| System Prompt | 每个 Profile 独立，不在请求中自由覆盖 |
| Session | 按 Request / Task Ref 分离 |
| Tool Policy | 全部为 `none`；手机模型不直接执行工具 |
| Knowledge | MVP 不加载共享长期 RAG；输入只使用显式 Ref |
| Memory | 不跨 Task 自动共享长期记忆 |
| Log | Profile、请求和输出分区记录 |
| Priority | 平台内部请求优先于调试聊天 |
| Output Schema | 每个 Profile 固定 Schema |

调用方不能通过请求参数把普通 Profile 提升为更高权限角色。

## 六、Inference Contract

### 6.1 请求信封

```json
{
  "inference_contract_version": "1.0.0",
  "request_id": "infer-001",
  "profile_ref": "page-observer@1.0.0",
  "task_ref": {
    "task_id": "task-001",
    "task_version": 12
  },
  "input": {
    "screenshot_ref": "artifact-shot-001",
    "dom_candidates_ref": "artifact-dom-001",
    "expected_state": "APPROVAL_REQUIRED"
  },
  "output_schema_ref": "page-observation-result@1.0.0",
  "budgets": {
    "timeout_ms": 15000,
    "max_output_chars": 8000
  },
  "idempotency_key": "host-command-001:page-observe"
}
```

服务器拥有并注入：

- 已认证调用者；
- 实际 Provider；
- 实际模型 Artifact；
- Profile Prompt；
- 工具权限；
- 日志和时间戳。

模型不能覆盖这些字段。

### 6.2 通用结果信封

```json
{
  "result_contract_version": "1.0.0",
  "request_id": "infer-001",
  "provider": "mobile",
  "model_artifact_ref": "model-current@sha256:...",
  "profile_ref": "page-observer@1.0.0",
  "status": "SUCCEEDED",
  "data": {},
  "summary": "页面处于审批等待状态，存在一个唯一的允许按钮候选。",
  "confidence": 0.94,
  "warnings": [],
  "evidence_refs": [],
  "generated_at": "..."
}
```

结果只表达模型观察或建议，不表达：

```text
审批已通过
Task 已完成
按钮允许被点击
Git 可以写入
```

### 6.3 页面观察结果

```json
{
  "page_state": "APPROVAL_REQUIRED",
  "candidates": [
    {
      "role": "button",
      "text": "允许",
      "candidate_ref": "dom-candidate-03",
      "confidence": 0.96
    }
  ],
  "ambiguities": [],
  "warnings": []
}
```

Browser Host 必须使用当前 DOM 重新校验；模型输出不能直接触发坐标点击。

### 6.4 结果解释输出

```json
{
  "result_state": "FAILED_RETRYABLE",
  "observations": [
    "Runtime 当前不可连接"
  ],
  "suggested_actions": [
    {
      "type": "REQUEST_CONTROLLER_REVIEW",
      "reason": "需要总控判断是检查连接配置还是申请启动 Runtime"
    }
  ],
  "approval_required": false,
  "uncertainties": []
}
```

Task Control 和总控决定是否接受建议。

## 七、手机 App 最小架构

```text
iPhone Edge Model App
├── Local HTTP Server
├── Authentication Guard
├── Request Router
├── Role Profile Registry
├── Prompt / Output Schema Resolver
├── Single Model Runtime
├── Inference Queue
├── Input Adapter
├── Output Validator
├── Health / Metrics
└── Local Recovery State
```

### 7.1 Local HTTP Server

最小接口：

```text
GET  /health
GET  /v1/runtime
GET  /v1/profiles
POST /v1/inference/page-observation
POST /v1/inference/result-interpretation
```

也可以内部收敛为一个 `POST /v1/inference`，但公开给 Gateway 的 Operation 必须是窄接口，不能允许任意 Prompt、任意角色和任意工具参数。

### 7.2 Single Model Runtime

MVP 只要求：

- 一个当前模型可稳定加载；
- 模型选择可替换；
- 上层 Profile 和合同不绑定模型名称；
- 模型更新有 Artifact Ref；
- App 重启后能重新加载当前发布版本。

Gemma、Qwen 等模型路线继续由上游端侧模型构想文档记录和实验。本 MVP 不把任何具体模型写成正式平台依赖。

### 7.3 Inference Queue

第一版允许串行：

```text
one active inference
+ bounded pending queue
```

必须有：

- 最大排队数量；
- 请求超时；
- 取消；
- 重复请求幂等；
- 高优先级内部请求；
- 健康状态回报。

## 八、DeepSeek 优先与手机影子模式

### 8.1 当前默认

核心四个 MVP 实施时：

```text
Model Inference Port
→ DeepSeek Adapter
```

DeepSeek 用于：

- 页面截图语义判断；
- DOM 候选辅助排序；
- Result 摘要解释；
- 手机 Provider 的对照基线。

不得让 DeepSeek 直接：

- 更新 Task；
- 领取 Controller Claim；
- 执行 DOM 点击；
- 批准高风险动作；
- 运行 Git / Shell。

### 8.2 手机影子模式

手机 MVP 接入后，先使用：

```text
同一 Request
→ DeepSeek 主结果
→ 手机影子结果
→ 离线比较
```

影子结果不进入业务决策，只进入评测记录。

比较至少包括：

- Schema 通过率；
- 状态分类正确率；
- 候选元素准确率；
- 关键越权错误；
- 延迟；
- 峰值内存；
- 温度与持续运行稳定性；
- 拒绝和升级是否正确。

### 8.3 接管门槛

只有同时满足：

- 固定测试集达标；
- 关键越权错误为零；
- 真实低风险任务表现不低于 DeepSeek 基线；
- 手机健康和热稳定性通过；
- Provider 可快速回退到 DeepSeek；

才允许手机模型承担低风险主请求。

## 九、安全边界

### 9.1 网络

- 默认只监听受控局域网接口；
- Gateway 使用专用认证；
- 不开放匿名公网推理；
- 不在日志中保存 Secret；
- 不返回手机本地绝对路径。

### 9.2 输入

- 只接收已登记 Profile；
- 只接收受控 Artifact / Result Ref；
- 限制图片、文本、Token 和请求大小；
- 敏感输入是否允许上手机由 Gateway Policy 决定；
- 手机 App 不自行扫描 Mac 或 Git。

### 9.3 输出

- 必须通过 JSON Schema 校验；
- 无法满足 Schema 时返回稳定错误；
- 高置信度也不等于授权；
- 不返回隐藏系统提示词；
- 不把输出自动写入训练集。

### 9.4 训练数据

MVP 只记录候选案例引用，不在手机上自动标注、训练或晋升数据。

真实训练闭环属于后续阶段：

```text
案例采集
→ Mac 脱敏、去重、人工纠正
→ 评审数据集
→ 云端训练
→ 模型 / Adapter 发布
→ 影子评测
```

## 十、错误模型

```text
MOBILE_PROVIDER_UNAVAILABLE
MODEL_NOT_LOADED
PROFILE_NOT_FOUND
PROFILE_NOT_ALLOWED
INPUT_REF_INVALID
INPUT_TOO_LARGE
INFERENCE_QUEUE_FULL
INFERENCE_TIMEOUT
OUTPUT_SCHEMA_INVALID
MODEL_RUNTIME_ERROR
THERMAL_LIMIT
MEMORY_LIMIT
REQUEST_CANCELLED
PROVIDER_RESULT_UNCERTAIN
```

错误必须包含：

```text
retryable
recommended_fallback
generated_at
provider_health_ref
```

Provider Router 可以在允许时回退到 DeepSeek，但回退必须可观察，不能伪装成手机结果。

## 十一、MVP 验证场景

### 11.1 健康与模型加载

Mac 通过局域网调用：

```text
/health
/v1/runtime
```

能够确认 App、模型和 Profile Registry 状态。

### 11.2 Page Observer

输入固定截图和 DOM Fixture，返回符合 Schema 的页面状态和候选元素。

### 11.3 Result Interpreter

输入固定 Local Result，返回结构化观察和建议，不修改 Task。

### 11.4 Profile 隔离

Page Observer 请求不能访问 Result Interpreter 的会话、Prompt 或历史；普通请求不能指定未授权 Profile。

### 11.5 无工具权限

任何要求手机模型直接运行 Git、Shell、点击或审批的输入都只能返回拒绝或动作提案。

### 11.6 Provider 替换

同一 Browser Host 请求可以在不修改 BHR 合同的情况下，从 DeepSeek 切换到 Mobile Adapter。

### 11.7 影子比较

DeepSeek 主请求和手机影子请求均完成，并生成可比较的评测记录。

### 11.8 恢复

App 重启后重新加载当前模型和 Role Profile；未完成请求返回明确失败，不伪造完成。

### 11.9 长时间运行

在约定时长内重复执行固定请求，记录：

- 成功率；
- 延迟；
- 内存；
- 温度；
- 网络断开和恢复；
- App 前台状态变化。

## 十二、交付物

```text
Model Inference Contract
DeepSeek Adapter Fixture / Baseline
Mobile Adapter
Single-Model iPhone App Skeleton
Role Profile Registry
Page Observer Profile
Result Interpreter Profile
Local Auth Guard
Inference Queue
Output Schema Validator
Health / Metrics Endpoint
Shadow Evaluation Runner
MVP Runbook
Evaluation Report
```

## 十三、验收标准

- 手机 MVP 不是核心四个 MVP 的前置；
- DeepSeek Provider 可以先完成真实消费者验证；
- 一个 iPhone App 只加载一个当前模型；
- 至少两个 Role Profile 在 Runtime 层隔离；
- 调用方不能自由覆盖系统 Prompt、权限或模型路径；
- 页面观察和结果解释均返回稳定 Schema；
- 手机模型不拥有 Task、Plan、Approval、Browser 或 Local Control 状态；
- 输出只是观察或建议，不直接触发副作用；
- DeepSeek 与 Mobile Adapter 使用同一 Provider 合同；
- Provider 切换不修改 BHR / Task Control 核心合同；
- 手机可以在影子模式下与 DeepSeek 对比；
- 关键越权测试全部通过；
- App 重启和 Provider 不可用都有明确恢复或回退路径。

## 十四、非目标

- 不训练 Qwen LoRA；
- 不完成 Gemma / Qwen 最终选型；
- 不建设端侧 RAG；
- 不建设公共 Web Chat；
- 不建设学习助手和作品集站点；
- 不让手机模型直接调用 Git、Shell 或浏览器；
- 不让手机模型担任总控；
- 不做多模型同时常驻；
- 不做公网多用户服务；
- 不以手机 MVP 作为第二阶段结束门槛。

## 十五、与其他 MVP 的合同

### 15.1 对 `SOL-BHR-001`

提供可替换的页面感知 Provider。BHR 负责截图、DOM、动作前重校验和 UI 执行；模型只返回观察。

### 15.2 对 `SOL-TSK-001`

Task Control 只保存 `inference_result_ref` 和必要摘要，不保存模型 Runtime 内部状态。

### 15.3 对 `SOL-CTL-001`

总控可以按需读取推理结果，但不依赖某个模型品牌，并对建议进行语义复审。

### 15.4 对 `SOL-LCL-001`

模型推理不进入 `local.*` Capability。Local Control 可以读取注册设备或服务的确定性在线状态，但不代理手机模型的 Role Profile、推理队列和语义结果；本机资源访问与 Model Inference 保持两个领域。

## 十六、实施顺序

```text
M0：定义 Provider Contract 与 DeepSeek Adapter
M1：由 BHR / 测试消费者跑通 DeepSeek
M2：iPhone 单 App + 单模型 + /health
M3：Page Observer Profile
M4：Result Interpreter Profile
M5：影子评测与长时稳定性
M6：决定继续、调整或停止
M7：达标后低风险灰度，不达标继续使用 DeepSeek
```

## 十七、相关文档

- [端侧模型节点与单模型多角色服务构想与验证方案](../端侧模型/端侧模型节点与单模型多角色服务构想与验证方案.md)
- [`SOL-BHR-001`｜ChatGPT Browser Host Runtime 扩展 MVP](./SOL-BHR-001-ChatGPT-Browser-Host-Runtime扩展MVP.md)
- [`SOL-TSK-001`｜任务消息中心与单任务调度 MVP](./SOL-TSK-001-任务消息中心与单任务调度MVP.md)
- [`SOL-CTL-001`｜总控 Agent 与动态上下文 MVP](./SOL-CTL-001-总控Agent与动态上下文MVP.md)
