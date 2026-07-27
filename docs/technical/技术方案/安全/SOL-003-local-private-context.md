---
asset_id: SOL-003
asset_type: solution
status: implemented
evidence_level: verified
canonical_path: docs/technical/技术方案/安全/SOL-003-local-private-context.md
related_assets: [ENG-001, ADR-002, MIG-001]
---

# SOL-003 Local Private Context

## Problem

Agent 需要理解私人背景和原始任务输入，但 Public Repository 不能包含简历、工作材料或未脱敏内容。

## Solution

使用 `.private-context/`：实际内容被 Git 忽略，各级 README 可跟踪。Agent 仅在任务必要时读取最小相关文件；公开输出必须脱敏、抽象并 Review。

```gitignore
/.private-context/**
!/.private-context/
!/.private-context/**/
!/.private-context/**/README.md
```

## Non-Goals

该目录不是 Secret Vault。Token、Cookie、密码、私钥和认证缓存必须使用环境变量、Keychain 或 Secret Manager。

## Validation

- `git ls-files .private-context` 只能返回 README。
- 私人示例文件应被 `git check-ignore -v` 命中。
- Public ZIP、测试夹具、日志摘要和 Feishu Projection 不包含私人正文。
