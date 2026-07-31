# Archive, Git and Shell Gates

## Archive

检查重复条目、统一顶层、绝对路径、`..`、符号链接和完整性。解压目录必须在仓库外且首次执行前不存在。

## Scope

工作区范围必须合并：

```bash
git diff --no-renames --name-only
git ls-files --others --exclude-standard
```

缓存区使用：

```bash
git diff --cached --no-renames --name-only
```

## Shell and Encoding

- 使用 `relpath`，不要在 zsh 中使用特殊变量 `path`；
- 使用 `/usr/bin/cmp` 避免 PATH 被意外覆盖；
- 中文路径通过环境变量传给 Ruby，避免在 `ruby -e` 源码中直接出现；
- 空目录必须单独授权并使用 `rmdir`，不能把它们计入 Git 路径。
