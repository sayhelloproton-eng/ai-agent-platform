# 第二阶段技术方案

本目录承载 `ai-agent-platform` 第二阶段四个 MVP 的技术方案。

第二阶段不是一次实现完整 Agent 平台，而是按顺序证明四件事：

```text
总控能够稳定决策
→ 总控能够读取本机真实事实
→ 单个任务能够被持久化调度
→ 网页端 Agent 能够被平台可靠驱动
→ 四者组成最小真实闭环
```

上位决策：

- [ADR-004｜第二阶段四个 MVP 验证与串联](../../../adr/ADR-004-phase-2-four-mvp-validation.md)

## 一、文档清单

| 顺序 | 技术方案 | 核心验证对象 |
|---|---|---|
| 1 | [SOL-CTL-001｜总控 Agent 与动态上下文 MVP](./SOL-CTL-001-总控Agent与动态上下文MVP.md) | Custom GPT 总控角色、版本化上下文、结构化 Decision |
| 2 | [SOL-LCL-001｜Local Control 与 CLI MVP](./SOL-LCL-001-Local-Control与CLI-MVP.md) | 受控本机资源、只读 Capability、Canonical Result |
| 3 | [SOL-TSK-001｜任务消息中心与单任务调度 MVP](./SOL-TSK-001-任务消息中心与单任务调度MVP.md) | Task、Work Item、Event、Dispatch Signal、单任务状态机 |
| 4 | [SOL-BHR-001｜ChatGPT Browser Host Runtime 扩展 MVP](./SOL-BHR-001-ChatGPT-Browser-Host-Runtime扩展MVP.md) | 会话路由、网页端自调用驱动、页面观察、受控 UI 动作 |

## Git-only 边界

本目录及其上位 ADR 当前只进入 Git：

- 不进入 `docs/knowledge/**`；
- 不建立或更新飞书 Mapping；
- 不运行飞书 Publisher；
- 不触发飞书覆盖或 Readback；
- 待第二阶段实现与整个平台方案成熟后，再统一评估知识库发布。

## 二、固定实施顺序

```text
MVP-1 总控
→ MVP-2 Local Control / CLI
→ MVP-3 任务消息中心
→ MVP-4 Chrome 扩展
→ 综合串联验证
```

每个 MVP 先独立通过，再进入下一个。不得为了提前串联而破坏领域边界。

## 三、统一实施原则

### 3.1 DDD 边界优先

各限界上下文只拥有自身模型、状态与不变量，通过版本化接口、业务命令或领域事件协作。

- 总控不拥有 Task、Context、Execution、Approval 或 Browser 状态；
- Local Control 不拥有任务流转；
- 任务中心不读取本机资源，也不解释模型语义；
- Chrome 扩展不决定业务下一步，也不修改 Task；
- 本地视觉模型只感知页面，不构成审批授权。

### 3.2 共用实现暂缓

跨 MVP 共用的身份、事件、鉴权、审计、存储、管理后台和基础设施，当前允许使用：

- 接口占位；
- 引用字段；
- Fake / Mock Adapter；
- 测试 Fixture；
- 明确的待决事项。

四个 MVP 分别通过后，再基于真实重复点决定哪些内容应归入任务中心、共享契约包、基础设施或独立领域。

### 3.3 脚本优先

确定性工作优先脚本化。模型负责语义判断、能力选择和结果解释，不重复执行可以确定化的机械操作。

### 3.4 版本、幂等与可解释

跨领域写命令至少预留：

```text
expected_version
request_id
correlation_id
idempotency_key
```

每个 MVP 都必须能够解释：输入基于哪个版本、发生了什么、产生了什么引用、为什么继续或停止。

### 3.5 先正文，后正式图片

复杂架构、跨域协作、多泳道流程、状态机和审批闭环，在正文 Review 定稿后生成正式图片资产；当前不以 Mermaid 或临时图替代最终复杂图。

## 四、第二阶段结束条件

四篇方案对应的 MVP 分别通过，并完成以下真实串联：

```text
总控恢复角色与动态上下文
→ Action 获取本机真实状态
→ 总控提交结构化 Decision
→ 任务中心验证并产生 Work Item
→ Local Control / 本地执行端返回 Result Ref
→ 任务中心生成 Host Command
→ Browser Host 唤醒网页端总控
→ 总控读取最新事实并继续或完成
```

第二阶段结束后，第三阶段再扩展：

- 完整 Task Control；
- 多任务与任务依赖；
- 多角色与多执行器；
- Approval、Evidence、Recovery；
- 并行调度与生产治理；
- 完整 Platform Management Console；
- AI 视频工作流等真实产品闭环。
