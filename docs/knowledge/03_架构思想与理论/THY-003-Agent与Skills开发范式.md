# THY-003 Agent + Skills 开发范式

## 1. 核心分工

Agent 负责动态判断，Skill 负责可复用方法。

```text
Agent
  → 理解当前任务
  → 选择方法和工具
  → 根据结果调整

Skill
  → 固定输入要求
  → 提供稳定步骤
  → 附带模板、Schema、示例和脚本
  → 定义验收与停止条件
```

两者结合，可以在不引入重型 Workflow Engine 的情况下提高一致性。

## 2. Skill 与相邻概念

| 概念 | 负责什么 |
|---|---|
| Prompt | 当前一次指令 |
| AGENTS | 仓库长期规则 |
| Skill | 一类任务的可复用流程 |
| Script | 确定性执行 |
| Tool / MCP | 外部能力 |
| Workflow | 多步骤状态与依赖 |
| Registry | Skill 的身份、版本、关系和证据 |
| Memory | 个性化背景，不是程序流程 |

## 3. 一个可治理 Skill 的组成

```text
Name / Description
Trigger
Input Contract
Workflow
Resources
Scripts
Output Contract
Validation
Stop Conditions
Examples
Evals
Version / Release
```

描述决定 Agent 何时发现 Skill；正文决定具体工作；脚本承担可以确定判断的步骤。

## 4. 渐进式加载

Skill 不应把所有参考资料一次塞入上下文。

推荐：

```text
先加载名称和描述
→ 任务匹配后读取 SKILL.md
→ 只有需要时读取 references/
→ 确定性步骤调用 scripts/
```

这样减少 Token，也降低无关上下文干扰。

## 5. Agent 做什么，程序做什么

### Agent 适合

-理解语义；
-比较方案；
-识别例外；
-选择 Skill；
-解释失败；
-进行专业 Review。

### Script / CI 适合

-解析 YAML；
-检查路径；
-验证 Schema；
-检查重复 ID；
-运行测试；
-比较文件；
-检查行尾空白。

原则：

> 能被程序明确判断的事情，不重复消耗模型推理。

## 6. Skill 的信任边界

Skill 是指导和程序性知识，不是强制安全。

必须额外依赖：

- Sandbox；
-Rules；
-后端 Policy；
-Secret 管理；
-Approval；
-测试；
-Git Review。

外部 Skill 或 Plugin 在启用前应审查其脚本、连接器和数据范围。

## 7. 为什么当前不采用重型编排框架

当前项目的主要任务仍是：

-知识治理；
-确定性仓库修改；
-窄 Action 链；
-Task Control 边界验证。

Agent + Skills + Script 已能覆盖大部分需求。提前引入通用图编排会增加：

-状态复制；
-调试层级；
-框架绑定；
-虚假抽象；
-维护成本。

当真实 Workflow 出现复杂分支、补偿和长期状态时，再评估框架。

## 8. 本仓库六个正式 Skill

### AI Knowledge

负责 Git 知识治理和飞书 Projection。

### Custom GPT Actions

负责 OpenAPI、认证、Builder 兼容和真实调用验证。

### Microsoft Dev Tunnels

负责开发期 Tunnel 生命周期、安全边界和验证。

### Engineering Insight Distillation

负责从已解决事件中筛选、提炼、查重和评估工程洞见。

### Deterministic Delivery

负责冻结 Artifact、Manifest、Hash、范围门禁、确定性 Overlay、验证、Commit、Push 与失败续跑。

### Planner Executor Handoff

负责 Chat 规划者与受控执行器之间的合同、指导档位、执行权限、Feedback、切换检查点和 Git Operating Policy。当前 v0.4.0 已接受。

这些 Skill 继续以 Git 为正式真源；Host 安装只是派生使用方式。

## 9. Skill 生命周期

```text
需求
→ 草案
→ 真实案例
→ Eval
→ Review
→ Release
→ 使用
→ 新证据
→ 修订或废弃
```

Skill 版本不能只靠文字声明，应有：

-测试案例；
-失败案例；
-触发评测；
-输出 Schema；
-回归结果。

## 10. 多 Agent 与 Skill

多个 Agent 不应各自维护重复流程。

更合理的结构是：

```text
共享 Skill
+ 不同 Agent Profile
+ 不同权限
+ 不同 Knowledge Pack
```

只有职责、权限或上下文隔离有真实价值时才创建多个 Agent。

## 11. 关联文档

- [CAP-008 平台核心能力模型与目标对齐](../02_基础产品与能力/CAP-008-平台核心能力模型与目标对齐/README.md)
- [THY-001 从 AI 工具到 Agent 工程平台](./THY-001-从AI工具到Agent工程平台.md)
- [THY-006 项目方法论与工程启发](./THY-006-项目方法论与可复用工程启发.md)
- [`skills/README.md`](../../../skills/README.md)

## 12. 参考

- [OpenAI：Build skills](https://learn.chatgpt.com/docs/build-skills)
- [OpenAI：Skills & Plugins](https://learn.chatgpt.com/docs/skills-and-plugins)
