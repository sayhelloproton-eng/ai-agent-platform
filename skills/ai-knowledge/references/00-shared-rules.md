# 共享规则：认证、安全与停止条件

## 认证

1. 先执行 `lark-cli auth status --json --verify`。
2. 默认文档操作使用 `--as user`；跨租户公开 Wiki 可用 user 或 bot，但仍需有效 token。
3. 缺 scope 时，只报告最小所需 scope 和授权方式；未经用户同意不扩大授权范围。
4. 不输出 app secret、access token、Keychain 内容或 `.enc` 文件。

## 命令规则

- 优先级：官方 Shortcut > 已注册 API > `lark-cli api` 原生 OpenAPI。
- 不确定参数时先执行 `--help` 或 `lark-cli schema <service.resource.method>`，不要猜。
- 子进程必须使用 argv 数组，不用 `sh -c` 拼接用户输入。
- lark-cli 文件参数使用当前工作目录下的相对路径，不传绝对路径。
- 机器读取 JSON 时可设置：`LARKSUITE_CLI_NO_UPDATE_NOTIFIER=1` 和 `LARKSUITE_CLI_NO_SKILLS_NOTIFIER=1`。

## 写入确认

Git 写入前必须展示：

- 目标 Layer 和 Git 路径；
- 来源证据、完整 Draft 或 Diff；
- 影响范围、风险和验收方式；
- 是否改变 Context、Knowledge、Technical 或 ADR。

Feishu Projection Publish 只能使用 `docs/knowledge/` 中已经 Review 的 Git 内容。发布前还必须展示：

- 目标 Space / Node / Doc token 和标题。
- 发布类型：create、append、overwrite 或局部替换。
- 完整内容预览或可审阅文件。
- 影响范围、幂等策略和验收步骤。

Git 写入确认不等于 Feishu 发布确认。用户分别明确同意后才能执行对应动作。`lark_write.mjs` 默认 dry-run；`--apply` 需要确认短语。

禁止从 `context/`、`docs/technical/`、`docs/learning/`、`docs/adr/` 或 `skills/` 直接生成项目 Feishu Knowledge Projection。

## CLI 高风险确认

当 lark-cli 以 exit code 10 返回 `confirmation_required`：

1. 提取 action 和 risk。
2. 向用户再次确认。
3. 只有明确同意后才在原 argv 末尾追加 `--yes` 重试。
4. 禁止自动重试、禁止把它当网络错误。

## 立即停止

- token 无效、资源不匹配、URL 跳到其他节点或权限不足。
- 目标文档 revision 与读取时不一致，存在并发修改风险。
- 需要删除、权限、公开分享或批量移动。
- 无法验证事实来源，却要求写成已确认结论。
- 请求要求把整个大型知识库无筛选塞给模型。
- 要求 Feishu 覆盖或自动反写 Git、执行双向同步或自动合并 Drift。
- 项目投影来源不在 `docs/knowledge/`。
