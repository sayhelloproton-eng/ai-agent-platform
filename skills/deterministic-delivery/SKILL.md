---
name: deterministic-delivery
description: "Validate and apply a frozen repository delivery contract with exact archive, hash, scope, test, staging, commit, push, and continuation gates."
metadata:
  requires:
    bins: ["git", "node", "python3", "unzip"]
---
# Deterministic Delivery

## Trigger

触发于：

- `knowledge_content_frozen: true` 的 ZIP / Overlay 交付；
- 固定 SHA 上的精确复制、删除、验证、暂存、Commit 和 Push；
- 同一任务失败后的 continuation / resume；
- 需要可审计的 tracked + untracked 或 rename-aware 范围门禁。

不触发于内容设计、知识综合、架构决策、Registry 语义设计或正文改写；这些由 `ai-knowledge` 或对应领域 Skill 处理。

## Required Inputs

- 固定仓库、分支、本地与远端 SHA；
- 唯一 Contract：Manifest、Spec、Task Book、Overlay；
- Overlay 与 Delete 范围；
- 验证命令；
- 唯一 Commit message 与 Push 目标；
- continuation 时的 `resume_from`、已通过门禁和唯一新增授权。

## Execution Modes

### deterministic_delivery

```text
read minimal rules
→ fixed SHA / clean worktree
→ ZIP central directory and integrity
→ external extraction directory
→ Manifest and hashes
→ exact overlay/delete lists
→ copy and cmp
→ controlled delete/rmdir
→ tracked + untracked --no-renames scope
→ domain and repository validation
→ remote drift check
→ exact staging --no-renames
→ cached diff check
→ one commit
→ push and read back
```

### continuation

- 不重新下载、解压、复制或删除，除非补充 Contract 明确要求；
- 先证明当前 SHA、工作区、缓存区和交付目录与停止报告一致；
- 只执行 `resume_from` 之后的门禁；
- 只接受补充 Contract 明确增加的最小权限；
- 不重复完整加载 `ai-knowledge` References。

## Mandatory Gates

- ZIP：统一顶层、无重复、无绝对路径、无 `..`、无符号链接；
- Hash：Manifest 文件集合与实际集合完全一致；
- Scope：同时统计 tracked 和 untracked；
- Rename：工作区和缓存区使用 `--no-renames`；
- Byte identity：优先 `/usr/bin/cmp`；
- Shell：zsh 循环变量禁止命名为 `path`；
- Ruby：中文路径经环境变量传入，`ruby -e` 源码保持 ASCII；
- Empty directories：Git 不跟踪空目录，删除必须单独列出并使用 `rmdir`；
- Commit：完整验证后只创建一个 Commit；
- Push：禁止 force push，必须回读远端 SHA与干净工作区。

## Stop Rules

任何门禁失败立即停止。报告原始错误、已通过门禁、当前 SHA、工作区和缓存区状态。不得修改正文、测试、Schema、校验器或 Contract 来绕过失败。
