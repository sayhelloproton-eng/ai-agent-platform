# deterministic-delivery Skill

面向冻结交付包的确定性 Git 落库能力。它不负责设计知识、编写正文或改变项目架构，只负责把已批准的 Contract 安全地复制、验证、提交和推送。

## Purpose

解决重复出现的机械交付问题：

- ZIP 中央目录、路径穿越、符号链接和重复条目；
- Manifest / SHA-256；
- Overlay 与 Delete 精确白名单；
- tracked + untracked 范围；
- Git rename detection；
- Ruby 中文路径与 `ruby -e` 源码编码；
- zsh `path` 特殊变量；
- 空目录不受 Git 跟踪；
- 失败后从已通过门禁继续。

## Modes

- `deterministic_delivery`：从固定 SHA 执行完整冻结 Contract；
- `continuation`：在同一工作区从指定门禁继续，只增加明确授权，不重放已通过步骤。

## Boundary

`ai-knowledge` 负责知识语义；本 Skill 负责冻结内容的确定性交付。`knowledge_content_frozen: true` 时不得改写正文、重新判断生命周期或扩大范围。

## Validation

```bash
node skills/deterministic-delivery/scripts/validate-contract.mjs   skills/deterministic-delivery/assets/examples/deterministic-delivery.json

node skills/deterministic-delivery/tests/self-test.mjs
```

## Safety

默认只读门禁先行。任何 Hash、范围、测试、远端基线或缓存区检查失败都停止。禁止自行修复 Contract，禁止 `rm -rf`、force push、修改 main 或创建第二个 Commit。
