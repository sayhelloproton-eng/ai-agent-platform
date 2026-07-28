# knowledge-assets

图片源资产仓库。保存 `docs/knowledge/` 中 Markdown 文档引用的架构图、流程图和截图。

## 规则

- 本分支只保存图片（png/jpg/jpeg/svg），不保存代码或 Markdown
- 图片按文档级目录组织：`images/{docs/knowledge 子路径}/{文档名}/`
- 不是 CDN、公网图床或飞书缓存 — 是原始图片资产仓库

## 使用方式

main 分支引用：`![图名](asset://文档名/图片文件名.png)`

Publisher 负责：解析 `asset://` → 定位文件 → 上传飞书 → 生成 image block。
