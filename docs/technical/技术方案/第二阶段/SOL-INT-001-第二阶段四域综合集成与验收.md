# SOL-INT-001｜第二阶段四域综合集成与验收

| 字段 | 值 |
|---|---|
| 方案 ID | `SOL-INT-001` |
| 状态 | Implemented / Automated E2E Passed / Manual Chrome Acceptance Pending |
| 公共合同版本 | `1.0.0` |
| 实现基线 | `main@f3ecb0632e42a82f9b67246acf0d02569f2ff422` 的累计增量 |
| 涉及领域 | CTL、TSK、LCL、BHR、Approval / Integration Store |
| Git-only | 是，不进入 `docs/knowledge/**`，不触发飞书发布 |

## 一、目标

本文冻结第二阶段四个核心 MVP 的公共语义、生产 Adapter、自动化端到端门禁与人工验收边界。四个领域继续拥有各自内部模型；综合层只提供版本化合同、路由、引用保存和运行时接线。

## 二、正式运行链路

```text
Task Intake
→ Controller 查询 Decision Context 并 Claim
→ REQUEST_ROLE_WORK
→ TSK 创建 Work Item / Browser Dispatch
→ LCL Worker 或 BHR Host 执行
→ Result / Progress / Uncertain 以引用回报 TSK
→ Controller 再次查询、Claim、推进 Plan
→ COMPLETE_TASK / BLOCK / Approval / 人工恢复
```

正式 HTTP 入口：

| 路由 | 用途 |
|---|---|
| `POST /v1/task-control/intake` | 创建带版本化 Plan、Payload Ref 和幂等键的 Task |
| `POST /v1/controller/task-context` | 先读取最新 Decision Context |
| `POST /v1/controller/task-claim` | 获取短期 Controller Claim |
| `POST /v1/controller/task-command` | 提交受约束的 Controller Command |
| `POST /v1/controller/task-release` | 主动释放 Controller Claim |
| `POST /v1/browser-host/invoke` | BHR 注册、Dispatch、Payload、Approval 和结果回报复用入口 |
| `POST /v1/approvals/grants` | 签发一次性 Approval Grant |

## 三、九类冻结合同

| 合同 | 版本 | 核心语义 |
|---|---:|---|
| Task Intake | `1.0.0` | Intake 幂等创建 Task；正文资源先登记为 Ref |
| Command Receipt | `1.0.0` | 重放必须返回首次提交的 Task/Plan 版本、Event 和创建引用 |
| Local Work Handoff | `1.0.0` | Work Item 只携带 Capability/Input/Result Type 引用 |
| Browser Host Server | `1.0.0` | 单一 Invoke Envelope 与受支持 Operation 枚举 |
| Dispatch Credential | `1.0.0` | Claim Token、Delivery Receipt、Report Token 严格分离 |
| Approval Grant | `1.0.0` | Command、动作指纹、Binding、页面前置条件、过期时间和单次消费绑定 |
| Result / Progress / Outcome | `1.0.0` | `ACCEPTED`、`PARTIAL`、`SUCCEEDED`、`FAILED`、`UNCERTAIN` 按层级解释 |
| Cancellation Event | `1.0.0` | Task/Work/Dispatch 取消均有 Trigger、Target、Reason 和时间 |
| Reference Storage | `1.0.0` | Task Store 只存引用；正文归 Integration/Artifact/Evidence 所有者 |

合同实现位于 `packages/contracts/src/phase2-integration.ts`。

## 四、凭证与副作用安全

1. **Claim Token** 只允许一个注册且 Capability 匹配的 Host 获取命令。
2. **Delivery Receipt** 证明指定 Command 已交付到指定 Binding；交付后 Claim 失效。
3. **Report Token** 独立签发，专门用于 Host Result 或交付后 `UNCERTAIN` 回报；终态后消费。
4. **Approval Grant** 是一次性对象，绑定 `task_id`、`command_id`、动作指纹、Binding 和页面前置条件哈希。
5. `UNCERTAIN` 不等于普通失败，不允许自动重发可能产生副作用的网页动作。
6. Host Result、Delivery Fact 和 Uncertain Report 的 Command/Dispatch/Task 身份必须一致。

## 五、`PARTIAL` 的双层语义

- 在 LCL 的 **Local Request 层**，`PARTIAL` 表示本次有界请求已经终止，并给出 Cursor 或继续引用。
- 在 TSK 的 **Work Item 层**，同一结果映射为非终态进度；Work Item 保持运行/等待，总控决定是否派生下一次请求或接受部分结果。
- 自动续跑必须使用新的派生幂等键；不得用同一幂等键改变请求参数。

## 六、数据所有权

| 数据 | 所有者 |
|---|---|
| Task、Plan、Claim、Work、Dispatch、Event | Task Control Store |
| Payload Ref 对应正文 | Phase 2 Integration Store / 后续 Artifact Store |
| Local Result 与 Evidence 正文 | Local Control Result/Evidence Sink |
| Approval Grant 正文与消费状态 | Approval / Integration Store |
| DOM、截图、Visible Text、Browser Journal | Browser Host |
| Controller Instructions / Profile | Git Agent Profile |

## 七、自动化验收

`apps/action-gateway/tests/phase2-four-domain-e2e.test.mjs` 使用：

- 真实 Gateway HTTP Server；
- 正式 Controller Adapter；
- 正式 TaskControlService；
- 正式 TSK → LCL Worker；
- 真实 `local.health.read` Capability；
- BHR 生产 `HttpGatewayClient` 与 `DispatchClient`；
- Claim、Delivery Receipt、Report Token 和 Host Result 完整生命周期。

验收路径为：

```text
Intake → CTL Request Local Work → LCL Result
→ CTL Advance → CTL Request Browser Work
→ BHR Register/Claim/Get/Delivery/Result
→ CTL Advance/Complete → Task COMPLETED
```

附加测试覆盖 Approval Grant 单次消费、绑定冲突和 `PARTIAL` 双层语义。

本轮 Gate 0 子集环境的可执行结果：

- 九个工作区与 Local Chain / Local Stack：`399/399`；
- Phase 2 综合门禁独立复跑：`3/3`；
- Browser Host 静态验证：`33` 个源文件通过。

当前审计容器是 Node 22，且 Gate 0 包未包含 `.git` 与 `skills/**`，因此根 `npm run verify` 的仓库治理段不能在该子集内形成正式结论。Overlay 落库后必须在完整仓库、Node 20 / npm 10 下执行根门禁。

## 八、统一门禁

根 `npm run verify` 必须显式执行：

- 四域原有单元/集成测试；
- Browser Host 静态与动态验证；
- Phase 2 Integration tests；
- 四域真实 HTTP E2E；
- Local Chain / Local Stack 历史回归；
- Registry、文档、Skill 和仓库治理检查。

正式环境仍以 Node 20 / npm 10 为准。

## 九、仍需本机人工验收

自动化环境不能替代以下事实：

1. 在 Chrome 中加载实际 MV3 扩展；
2. 注册并绑定真实 ChatGPT / Custom GPT 标签页；
3. 验证 Conversation Ref、GPT Ref 与页面身份一致；
4. 执行一次 `OBSERVE_PAGE`；
5. 对一个需要批准的页面动作签发并消费 Approval Grant；
6. 验证动作后 Observation、Journal、Host Result 和 TSK Timeline；
7. 模拟刷新、断网或页面不确定状态，确认不会盲目重试。

完成以上项目后，第二阶段才能从“自动化集成通过”升级为“真实浏览器端到端验收通过”。
