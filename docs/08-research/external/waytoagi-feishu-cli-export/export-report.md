# WaytoAGI Feishu Wiki Export Report

## 基础信息

Wiki: 飞书CLI使用方法

URL: https://waytoagi.feishu.cn/wiki/Zsp2wxsKEiRTEjkajJFc7FBGnh3

Space ID: 7226178700923011075

## 采集统计

总节点数量：53

成功获取：50

失败数量：3

## 文件输出

目录：/path/to/ai-agent-platform/docs/08-research/external/waytoagi-feishu-cli-export

pages 数量：53

## 完整性检查

- wiki-tree.json 节点数量：53
- pages Markdown 文件数量：53
- 数量一致：是
- metadata / markdown 结构有效：是
- 包含原始 Markdown 正文：50
- 失败占位 Markdown：3
- 重复文件名：0
- 重复 node_token：0
- 完整镜像成功：否

## 执行命令

```bash
lark-cli wiki +node-get --node-token <wiki-url-or-node-token> --as user --format json
lark-cli wiki +node-list --space-id 7226178700923011075 --parent-node-token <node-token> --as user --page-all --page-limit 0 --format json
lark-cli docs +fetch --doc <wiki-url> --doc-format markdown --detail simple --as user --format json
lark-cli drive +export --url <wiki-url> --file-extension markdown --output-dir <temporary-directory> --as user --format json
lark-cli base +url-resolve --url <bitable-wiki-url> --as user --format json
lark-cli base +table-list --base-token <base-token> --as user --format json
lark-cli sheets +workbook-info --url <sheet-wiki-url> --as user --format json
lark-cli drive +export --url <bitable-or-sheet-wiki-url> --file-extension xlsx --output-dir <output-directory> --as user --format json
node docs/08-research/external/waytoagi-feishu-cli-export/export-waytoagi-wiki.mjs
```

所有飞书命令均为只读查询或导出；未执行创建、更新、删除、授权或权限修改。

## CLI 限制

- `docs +fetch` 只支持 `docx`，不支持 `bitable` 或 `sheet`。
- `drive +export --file-extension markdown` 不支持 `bitable` 或 `sheet`。
- 两个 `bitable` 的类型专用读取需要当前登录未授权的 `base:table:read`；一个 `sheet` 的类型专用读取需要当前登录未授权的 `sheets:spreadsheet:read`。
- 三个节点的原生 `xlsx` 导出均返回 `1069902 no permission`。
- 本任务禁止修改权限，因此未执行追加 scope 的登录/授权操作。

## 失败记录

- title: 飞书CLI设计问卷：🐾 /buddy 电子宠物征集展
  - node_token: UNbpwSliDi2zPjkcRzIcXAiAnvc
  - error: docs +fetch: { "ok": false, "identity": "user", "error": { "type": "api", "subtype": "unknown", "code": 3380002, "message": "Unsupported document type 'bitable'. Only docx is supported.", "log_id": "20260726171140036997C9A1AB82D9803D", "troubleshooter": "排查建议查看(Troubleshooting suggestions): https://open.feishu.cn/search?from=openapi&log_id=20260726171140036997C9A1AB82D9803D&code=3380002&method_id=7624117956138650561" } }; drive +export: Resolving wiki node for export: UNbp...Anvc { "ok": false, "identity": "user", "error": { "type": "validation", "subtype": "invalid_argument", "message": "unsupported export format: --doc-type bitable cannot be exported as markdown", "hint": "retry with --file-extension xlsx, csv, base. If the token came from a URL, prefer --url so the CLI infers the correct source type before validating the export format", "param": "--file-extension" } }
- title: 通往AGI之路-群聊内容收录
  - node_token: TNjmwtIgCicJaSkSq9YcXLmlnEf
  - error: docs +fetch: { "ok": false, "identity": "user", "error": { "type": "api", "subtype": "unknown", "code": 3380002, "message": "Unsupported document type 'bitable'. Only docx is supported.", "log_id": "20260726171152C21B9660C3A6E0765916", "troubleshooter": "排查建议查看(Troubleshooting suggestions): https://open.feishu.cn/search?from=openapi&log_id=20260726171152C21B9660C3A6E0765916&code=3380002&method_id=7624117956138650561" } }; drive +export: Resolving wiki node for export: TNjm...lnEf { "ok": false, "identity": "user", "error": { "type": "validation", "subtype": "invalid_argument", "message": "unsupported export format: --doc-type bitable cannot be exported as markdown", "hint": "retry with --file-extension xlsx, csv, base. If the token came from a URL, prefer --url so the CLI infers the correct source type before validating the export format", "param": "--file-extension" } }
- title: sheet-AolhwFoc
  - node_token: AolhwFocniHwFykWDiOcy66VnHe
  - error: docs +fetch: { "ok": false, "identity": "user", "error": { "type": "api", "subtype": "unknown", "code": 3380002, "message": "Unsupported document type 'sheet'. Only docx is supported.", "log_id": "202607261712128371FA4C2A19BCBC4586", "troubleshooter": "排查建议查看(Troubleshooting suggestions): https://open.feishu.cn/search?from=openapi&log_id=202607261712128371FA4C2A19BCBC4586&code=3380002&method_id=7624117956138650561" } }; drive +export: Resolving wiki node for export: Aolh...VnHe { "ok": false, "identity": "user", "error": { "type": "validation", "subtype": "invalid_argument", "message": "unsupported export format: --doc-type sheet cannot be exported as markdown", "hint": "retry with --file-extension xlsx, csv. If the token came from a URL, prefer --url so the CLI infers the correct source type before validating the export format", "param": "--file-extension" } }
