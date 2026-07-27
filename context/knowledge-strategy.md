# Knowledge Strategy

## Core Decision

**Git Repository is the only source of truth.**

Git 保存项目正式事实，包括项目上下文、当前状态、Roadmap、架构、规则、知识、代码、测试与已验证结论。

只有经过 Review 并进入 Git 的内容，才是正式项目事实。

## Git

角色：**Engineering Source of Truth**

Git 提供：

- 可审阅的变更；
- 可追踪的历史；
- 可比较的 Diff；
- 可回滚的版本；
- 与代码、测试和文档一致的工程证据；
- 新 Agent 可直接读取的正式上下文。

## Feishu

角色：**Human Readable Knowledge Projection**

Feishu 可以承载从 Git 生成的阅读视图、摘要、目录或展示页面，但它不是项目真源，不能独立改变正式项目事实。

Task 001 只定义关系，不执行任何 Feishu 读取、写入、同步或配置。

## Allowed Flow

允许：

```text
Git → Feishu
```

投影必须以 Git 内容为输入。Git 与 Feishu 不一致时，以 Git 为准。

## Forbidden Flows

禁止：

```text
Feishu → Git
```

禁止从 Feishu 自动反写、覆盖或合并 Git。

同时禁止：

```text
Git ↔ Feishu
```

不建立双向同步，不维护两个可独立修改的权威版本。

## Agent Rules

- Agent 先读取 Git，不把 Feishu 当作启动依赖；
- Feishu 内容不能未经 Review 成为项目事实；
- 不因外部页面更新而自动修改 Git；
- 发现投影与 Git 不一致时报告 Drift；
- 任何未来投影写入都必须单独授权、预览并回读验收；
- 当前 Task 不执行任何 Feishu 操作。
