# Feishu Provider

## 定位

Feishu Provider 实现 Knowledge Provider Port；底层复用官方 `lark-cli` / OpenAPI。它提供资源解析和 I/O，不做语义决策。

## 经过真实验证的能力

- 解析 `/wiki/<token>` URL，得到 Space ID、Wiki node token、obj token 和 obj type。
- 跨租户读取互联网公开 Wiki；user 和 bot 身份均可，但不是匿名读取。
- `docs +fetch` 可获得 outline、局部结构和完整 Markdown。
- `wiki +node-list` 可递归目录。
- `docx` 可导出 Markdown；`sheet`、`bitable` 需路由专用 Skill 和 scope。
- 官方 CLI 不支持把 Space 名称/描述或互联网公开状态自动切换为目标展示配置；这些治理动作人工处理。

## 读取命令

```bash
lark-cli auth status --json --verify
lark-cli wiki +node-get --node-token '<wiki-url-or-token>' --as user --format json
lark-cli wiki +node-list --space-id '<space-id>' --parent-node-token '<node-token>' --as user --page-all --format json
lark-cli docs +fetch --doc '<url-or-token>' --scope outline --max-depth 3 --as user --format json
lark-cli docs +fetch --doc '<url-or-token>' --doc-format markdown --detail simple --as user --format json
```

只读脚本见 `scripts/lark_read.mjs`。

## 写入命令

创建：

```bash
lark-cli docs +create --content '@relative-file' --parent-token '<wiki-parent-token>' --as user --format json --dry-run
```

更新：

```bash
lark-cli docs +update --doc '<url-or-token>' --command overwrite --content '@relative-file' --as user --format json --dry-run
```

实际参数以本机 `lark-cli docs +create/+update --help` 和官方 `lark-doc` Skill 为准；脚本执行前会保留 dry-run 和人工确认。

## 类型路由

| obj_type | 路由 |
|---|---|
| docx / doc | lark-doc |
| sheet | lark-sheets |
| bitable | lark-base |
| slides | lark-slides / drive |
| file | lark-drive |
| shortcut | 先解析实体 token |

无法读取非 docx 时，不创建“错误占位知识”作为有效正文；记录失败元数据和缺失 scope。

## 搜索

Wiki domain 没有独立 `wiki.search`。资源发现优先：

1. 本地 Knowledge Index。
2. `docs +search` / `drive +search`。
3. 精确目录遍历。

## 身份

- 项目个人文档默认 user identity。
- 服务端/多用户场景未来可用 bot，但权限和审计要独立设计。
- 不把 token 写入仓库或 Wiki。
