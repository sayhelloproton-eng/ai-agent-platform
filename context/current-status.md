# Current Status

## Working Baseline

```text
Working Branch:
  main

Current HEAD:
  read from Git at runtime

Current Phase:
  Phase 2 — Core MVP Domain Implementation and Cross-domain Audit

Phase-2 Feishu Policy:
  frozen / Git-only
```

准确 SHA、远端一致性和 Worktree 状态必须从 Git 实时读取，不在 Context 中长期硬编码。第二阶段方案只进入 Git，不触发飞书 Mapping、Publisher、覆盖或 Readback。

## Verified Implementation

### Runtime narrow chain

```text
Custom GPT
→ Microsoft Dev Tunnels
→ Action Gateway
→ Local Runtime
→ gateway.ping / runtime.status
```

已验证：

- Contracts、Auth、Policy；
- 双层 API Key 和 Capability Policy；
- Loopback、Rate、Concurrency、Timeout 和响应大小边界；
- Custom GPT Builder Action；
- 自然语言到本地 Runtime 的窄 Capability 调用。

仍未验证：正式持久 Task Store、WorkItem / Dispatch 调和、Execution / Result 持久化、Browser Host 自动续跑、正式 Approval / Evidence、自动恢复、多任务和多执行器调度。

### Knowledge and governance

已经形成：

- Git 唯一正式真源；
- `context/**` 共享启动上下文及 Planner 所有权；
- `docs/knowledge/**` 正式知识和 Feishu 发布源；
- `docs/technical/**` 技术方案与实验；
- Platform Registry、Relations 和 Visual Registry；
- Document Bundle 与 Human-first、AI-lossless 规则；
- Planner–Executor Handoff 与冻结 Artifact；
- 项目级 Skill 组合与校验脚本。

第二阶段文档不进入 `docs/knowledge/**`，也不改变当前 Feishu 投影状态。

## Current Phase-2 Design Baseline

核心四个 MVP：

```text
SOL-CTL-001 Controller Agent and Dynamic Context
→ SOL-LCL-001 Local Control / CLI
→ SOL-TSK-001 Task Control and Single-task Scheduling
→ SOL-BHR-001 Browser Host Runtime
→ End-to-end single-task validation
```

可选后置扩展：

```text
SOL-MOB-001 Mobile Single-model Multi-role Inference Provider
```

手机模型不构成核心四项的完成门槛。页面感知和结构化推理先由 DeepSeek Provider 或测试 Fixture 承担；手机 Provider 以后使用同一合同接入。

### Cross-domain decisions frozen at design level

- Custom GPT 配置按 Shared → Role → Profile → Release 分级维护；不使用根级 `agents/`，候选目录为 `agent-profiles/`；
- 总控收到 `task_id` 后先查询 Controller Decision Context，再领取 Controller Claim；
- Task 长期归属于 `required_role`，具体 Profile 只持有短期 Claim；
- Task Aggregate 在 MVP 中内嵌版本化结构化 Plan；
- 任务推进通过业务命令原子更新 Task、Plan / Node、Event 和必要下游引用；
- 同步 `local.*` 查询不强制创建 Work Item；异步、长时、可交接或副作用工作才进入 Work Item；
- Controller Claim、Work Item Claim 和 Browser Dispatch Claim 分离；
- BHR 不修改 Task，不从聊天正文提取正式 Controller Command；
- DeepSeek / 手机模型属于可替换 Model Inference Provider，不拥有 Task、Approval 或 Browser Action 权限。

设计合同已经完成跨领域审计。`SOL-CTL-001` 当前形成以下代码候选：

- `agent-profiles/**` 四级总控 Profile 配置；
- `packages/contracts` 中的 Decision Context、Plan、Claim、Controller Command 与校验；
- `action-gateway` 中四个窄化 Controller Action；
- 明确标注为 Fixture 的内存 Task Control Port；
- 先查后领、服务端身份、乐观版本、幂等、原子 Task / Plan / Event 更新和同角色接管测试；
- Builder-compatible OpenAPI 候选。

本地代码测试已通过，但真实 Git 应用、Node 20 全量门禁、Custom GPT Builder 配置和 Preview 实调仍待 Executor 完成，因此状态为 **partial implementation**，不得表述为线上总控已验证。

## Current Work

1. 将总控实现 Overlay 应用到真实 `main`；
2. 使用 Node 20 执行 Controller、Contracts、Gateway、Dev Tunnel 和全仓验证；
3. 人工把 `agent-profiles` 配置投影到 Controller Custom GPT；
4. 在 Builder Preview 真实执行 Context → Claim → Command；
5. 将通过后的公共合同交给 LCL、TSK、BHR 各自实现并接受总控审计。

## Next Actions

1. Executor 机械应用总控实现 Overlay；
2. 单 Commit、普通 Push、远端回读；
3. 完成 Builder Parse 和 authenticated Preview；
4. 把总控 Mock Task Control 替换点冻结为 TSK Application Port；
5. 按领域分别实施 LCL、TSK、BHR；
6. 四项完成后执行最终单任务串联；
7. 第二阶段实现成熟后再独立评估 Feishu 发布。

## Non-claims

- 总控代码 Fixture 完成不等于正式 Task Center 或线上 Custom GPT 已实现；
- DeepSeek 被选为临时 Provider 不等于端侧模型已经验证；
- 手机模型构想不等于手机 App、模型服务或训练闭环已完成；
- Agent Profile 已物化为 Git 候选，但 Builder Preview 完成前不等于 released Agent；
- Task / Plan Schema 设计不等于持久 Task Store 已实现；
- 未经真实代码、测试、调用或回读支持的能力不得标记为 verified。
