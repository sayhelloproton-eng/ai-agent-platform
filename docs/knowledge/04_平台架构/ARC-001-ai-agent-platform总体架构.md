# ARC-001 平台目标架构

> 本文描述长期目标架构，不代表全部已经实现。当前代码和可执行资产主要集中在 AI Knowledge Skill 与 Knowledge Foundation；Gateway、Runtime、Coding Workflow 和 Video Workflow 分属 Next 或 Later。

## 架构驱动因素

- Agent 可恢复、任务可追踪、结果可验证。
- 业务与模型、设备、工具和 Provider 解耦。
- 降低上下文、Token、生成成本和失败重跑范围。
- 支持 Git 唯一真源、飞书投影与多知识 Provider。
- 安全边界、审批、审计和可观测性内建。

## 架构概览

```text
用户 / Agent / 客户端
        |
        v
Gateway / 入口
        |
        v
应用服务 <----- Workflow / 业务场景
        |
        +----------------+----------------+
        |                |                |
        v                v                v
DDD 核心领域       能力 Port          数据与存储
                         |
                         v
              基础设施 Adapter
                         |
                         v
                   外部能力

[横切关注点]
安全 / 策略 / 可观测性
        +--> Gateway / 入口
        +--> 应用服务
        `--> 基础设施 Adapter
```

## 用户访问层

- Chat / Web / CLI / IDE / 移动客户端。
- 人工 Review、审批和结果查看入口。
- Agent 以结构化请求访问平台，不直接操作基础设施。

## Gateway / 入口层

- API Gateway、Task Intake 和协议适配。
- 身份、权限、Schema 校验、幂等键和速率限制。
- 将外部输入转换为 Application Command / Query。

## DDD 核心领域

- `Task`：目标、输入、约束、交付物、验收。
- `Agent`：职责、授权和执行主体。
- `Capability`：抽象可调用能力及契约。
- `Workflow`：步骤、依赖、路由、补偿。
- `Knowledge`：发现、检索、捕获和维护行为。
- `Result`：产物、证据、错误和验收状态。
- `Execution`：运行实例、状态转换和重试。
- `Knowledge Asset`：Asset ID、路径、状态、证据和关系。
- `Decision`：被接受、替代或拒绝的架构判断。
- `Experiment`：假设、方法、结果和可复现证据。

## 应用服务

- Task 命令 / 查询服务。
- Context 检索与 Knowledge 捕获服务。
- Workflow 编排服务。
- Execution / Result 跟踪服务。
- 评审 / 发布服务。

Application Service 编排领域对象和 Port，不包含具体 CLI、模型或文档 API 细节。

## 基础设施 Adapter

- Codex、模型和 Tool Adapter。
- Git、Feishu、本地文件、Web Knowledge Adapter。
- 视频、图像、语音 Provider Adapter。
- 队列、调度器、通知和可观测性 Adapter。

## 数据与存储

- Git：代码、Schema、Skill、架构、ADR、状态和正式知识资产。
- Feishu：Git 资产投影及受治理的 Native / Capture 内容。
- Execution Store：任务状态、结果、错误和追踪标识。
- Artifact Store：中间产物与媒体资源。
- Index：资产元数据、关系和检索提示；不替代 Canonical Asset。

## Workflow / 业务场景

- 知识查询 / 捕获 / 维护。
- ChatGPT → Task → Codex → Git。
- Story → Character / Scene → Shot / Prompt → 媒体生成。
- Review、失败重试、结果验收与知识回写。

## 外部能力

- LLM、Embedding、Search、MCP 和 Tool Calling。
- GitHub、Feishu OpenAPI / `lark-cli`。
- Codex 执行入口。
- 图像、视频、语音和字幕服务。
- 本地设备与云端计算节点。

## 横切关注点

- 身份、授权和密钥管理。
- Schema 校验、幂等和限流。
- 日志、追踪、指标和成本核算。
- 评估、内容安全和人工审批。
- 版本管理、兼容性、审计和数据保留。

## 数据流

1. 用户或 Agent 提交请求。
2. Gateway 校验并生成 Task。
3. Application Service 通过 Index 获取最小必要上下文。
4. Workflow 调用领域能力及相应 Adapter。
5. Adapter 返回 Result 和 Execution Evidence。
6. Review 通过后，正式资产写入 Git；需要时生成飞书投影。

## 控制流

1. Policy 决定允许的动作和审批门禁。
2. Orchestrator 按 Task 状态驱动步骤。
3. 每步先校验输入，再执行，再验证输出。
4. 失败局部重试或补偿，不默认重跑整个 Workflow。
5. 最终由人工或明确策略接受结果。

## 安全边界

- 公开 Git 与 `.private-context/` 明确隔离。
- Secret 只通过环境或专用凭证存储进入 Adapter，不进入资产或日志。
- Agent 仅获得任务必要权限。
- 飞书写入、删除、移动、权限、公开分享和 Git 高风险操作受人工门禁。
- 第三方内容记录来源与许可，不默认纳入公开 Canonical Assets。

## 权衡

- Git 唯一真源提高可审计性，但飞书变更不能直接成为正式事实。
- 薄 Bridge 降低复杂度，但早期自动路由能力有限。
- Port / Adapter 增加初期设计成本，换取模型和 Provider 可替换性。
- 最小上下文降低 Token，但依赖高质量索引与关系维护。
- Human-in-the-loop 降低自动化速度，换取安全和事实可靠性。

## 演进策略

- **当前阶段**：Knowledge Asset、Feishu Projection、AI Knowledge Skill。
- **下一阶段**：Task Contract、Gateway / Bridge、Codex Adapter、Execution Tracking。
- **后续阶段**：AI Video Workflow、多媒体 Provider 和高级编排。
- 只有在真实用例、测试和证据出现后，才将目标组件升级为已实现状态。
