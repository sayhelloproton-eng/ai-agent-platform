# Agent Profiles

`agent-profiles/` 保存面向 Agent 宿主的版本化静态配置资产，不保存 Task、Plan、Claim、Browser Session 或执行状态。

配置继承顺序：

```text
shared → role → concrete profile → release
```

当前首个 Profile：`ai-agent-platform-controller`。根级目录不得命名为 `agents/`，避免与 Codex、OpenCode 等宿主的特殊目录约定冲突。
