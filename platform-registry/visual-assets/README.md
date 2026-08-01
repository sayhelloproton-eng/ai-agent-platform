# Visual Asset Registry

本目录保存正式视觉资产的稳定 ID、来源文档、`knowledge-assets` 分支路径、`asset://` 引用、尺寸和 SHA-256。SVG / PNG 二进制文件不放在知识正文分支，而由 `knowledge-assets` 分支作为图片源资产仓库保存。

规则：

- `VIS-*` 是稳定视觉资产 ID；
- SVG 是可编辑源，PNG 是 Markdown / Feishu 预览；
- Markdown 只使用 `asset://` 引用；
- 每张图必须绑定目标正文和来源资产；
- 图片改变时必须同步更新本目录 Hash、正文引用、Registry 关系与 Release；
- 图片不能把目标设计冒充为当前实现。
