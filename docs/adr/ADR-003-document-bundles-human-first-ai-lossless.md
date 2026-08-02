# ADR-003 文档包与 Human-first、AI-lossless

- 状态：Accepted
- 日期：2026-08-02
- 决策者：Project Owner

## Context

正式文档的图片此前保存在独立 `knowledge-assets` 分支，正文通过 `asset://` 引用。该方案使正文、图源、预览和 Review 分散；AI 在未读取图片时还会丢失关键架构语义。

## Decision

1. 取消正式文档资源独立分支策略；
2. 资源型文档采用 `文档目录/README.md + assets/`；
3. Git 使用本地相对资源路径；
4. 每张正式图片必须紧邻 AI 可读语义镜像；
5. 图片与镜像作为原子视觉块同步维护；
6. Publisher 在 Feishu 投影时上传本地图片并生成原生媒体块；
7. Feishu 的 URL、Token 和 Block ID 不回写 Git；
8. Git 与 Feishu 保持语义等价，而非物理格式完全相同。

## Consequences

### Positive

- 文档和资源可在同一 Commit 完整 Review、移动、归档和回滚；
- 人类获得更丰富的视觉表达；
- 纯文本 Agent 不依赖取图也能恢复关键语义；
- Git 文档包与 Feishu 节点形成天然一对一映射；
- Publisher 不再依赖跨分支提取。

### Cost

- 旧文档路径需要迁移为目录入口；
- 图片和语义镜像必须双向维护；
- Publisher、Registry、链接和校验器需要更新；
- 文档作者需要为视觉资产编写结构化语义镜像。

## Supersedes

本 ADR supersede “`knowledge-assets` 分支 + `asset://` 正式引用”的现行策略，但保留历史 Commit 与迁移记录。

## Validation

首批 10 个正式 SVG / PNG 迁入对应 Document Bundle，并由视觉资产校验器检查路径、Hash、尺寸、安全令牌和紧邻语义镜像。
