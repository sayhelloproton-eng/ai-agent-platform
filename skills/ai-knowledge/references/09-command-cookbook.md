# 命令速查

以下命令用于 Agent 执行前参考；实际以本机 help/schema 为准。

## 验证

```bash
lark-cli --version
lark-cli auth status --json --verify
lark-cli wiki --help
lark-cli docs --help
```

## 解析 Wiki

```bash
lark-cli wiki +node-get --node-token '<wiki-url-or-token>' --as user --format json
```

## 子节点

```bash
lark-cli wiki +node-list --space-id '<space-id>' --parent-node-token '<node-token>' --as user --page-all --format json
```

## 结构和正文

```bash
lark-cli docs +fetch --doc '<url-or-token>' --scope outline --max-depth 3 --as user --format json
lark-cli docs +fetch --doc '<url-or-token>' --doc-format markdown --detail simple --as user --format json
```

## 创建与更新（先 dry-run）

```bash
lark-cli docs +create --content '@relative-file' --parent-token '<parent-token>' --as user --format json --dry-run
lark-cli docs +update --doc '<doc-url-or-token>' --command overwrite --content '@relative-file' --as user --format json --dry-run
```

## 脚本示例

```bash
node scripts/lark_read.mjs resolve --ref '<wiki-url>' --identity user
node scripts/lark_read.mjs tree --ref '<wiki-url>' --max-depth 3 --max-nodes 100 --out tmp/tree.json
node scripts/lark_read.mjs fetch --ref '<doc-url>' --mode markdown --out tmp/page.md
node scripts/build_index.mjs --tree tmp/tree.json --pages tmp/pages --out tmp/index.json
node scripts/query_index.mjs --index tmp/index.json --query 'Gateway Adapter ADR' --top 6
node scripts/render_draft.mjs --event tmp/event.json --type experiment --out tmp/experiment.md
node scripts/lark_write.mjs create --parent-token '<token>' --content tmp/experiment.md
```
