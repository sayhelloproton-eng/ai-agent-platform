# Local Private Context

## Purpose

保存 Agent 在明确任务中可以读取，但不得进入 Public Git 或 Feishu Projection 的私人上下文。

## Rules

- 只读取与当前任务直接相关的最小内容；不得默认全量扫描。
- 实际内容由 `.gitignore` 排除；`git ls-files .private-context` 只能出现 README。
- 公开成果必须经过脱敏、抽象和人工 Review。
- 禁止保存 Token、API Key、Cookie、密码、私钥、OAuth 凭据和认证缓存。
- `.gitignore` 不是 Secret Vault；重要资料需要仓库外备份或独立私有仓库。

目录用途见各子目录 README。
