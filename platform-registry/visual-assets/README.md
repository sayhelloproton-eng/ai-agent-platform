# Visual Asset Registry

本目录保存正式视觉资产的稳定 ID、目标 Document Bundle、来源、尺寸、Hash、事实边界和投影所需元数据。SVG / PNG 文件与目标文档共置，不在 Registry 目录重复存储。

## 当前存储模型

- `storage_model: document_bundle`；
- `target_document` 指向文档目录中的 `README.md`；
- `source_svg` 与 `preview_png` 必须位于同一文档目录的 `assets/`；
- `markdown_image` 必须是 `./assets/...`；
- `semantic_mirror_heading` 固定为 `AI 可读语义镜像`；
- 图片、正文镜像和 Manifest 必须同步 Review。

## 发布模型

Git 文档包是唯一真源。Feishu Publisher 读取本地相对图片、上传媒体并在相同位置插入 image block；Feishu Token、URL 和 Block ID 不写回 Git。

## 校验

运行：

```bash
npm run check:visuals
```

校验覆盖路径共置、正文嵌入、语义镜像、SVG 安全、PNG 尺寸和 SHA-256。

## 产品体系视觉资产

- `VIS-011` 平台产品形态与价值闭环；
- `VIS-012` 平台能力成熟度阶梯；
- `VIS-013` AI 视频工作流产品体验与验证切片；
- `VIS-014` 产品组合演进与平台边界。


## 基础产品与能力视觉资产

- `VIS-015` ChatGPT 生态体系与配置全景；
- `VIS-016` ChatGPT 生态组件配置与能力差异矩阵；
- `VIS-017` 生态能力到平台核心能力提炼；
- `VIS-018` 从 ChatGPT 到 Codex 的平台执行闭环。

## Agent 工程架构思想与方法论视觉资产

- `VIS-019` 从 AI 工具到 Agent 工程平台的责任边界；
- `VIS-020` AI 开发范式与工程责任演进；
- `VIS-021` Agent、Skill、Tool、Script 与 Workflow 的责任边界；
- `VIS-022` Agent 系统统一语言与概念边界；
- `VIS-023` 限界上下文推导与上下文映射；
- `VIS-024` Task Aggregate 状态、不变量与领域事件；
- `VIS-025` Domain、Port、Adapter 与 Provider 边界模型；
- `VIS-026` 可信 Agent 系统信任链；
- `VIS-027` 从真实事件到可复用工程方法。
