# Image Asset Branch Review — 2026-07-28

> 给 ChatGPT 审查用。ChatGPT 无本地环境，可通过 GitHub 链接查看所有文件。

## 仓库

https://github.com/sayhelloproton-eng/ai-agent-platform

## 背景

`ai-agent-platform` 采用 Git → Feishu 单向知识投影。Markdown 文档中会包含架构图、流程图等图片，但飞书知识库无法读取本地相对路径图片（如 `./images/arch.png`），只能渲染网络 URL。当前发布合同一刀切禁止了所有图片，导致架构图无法展示。

## 方案

- 新建独立 Git 分支 `knowledge-assets`，只存图片
- `main` 分支 Markdown 中用 GitHub Raw URL 引用图片
- 飞书 Publisher 直接透传 URL，不做任何图片处理

```
main 分支                          knowledge-assets 分支
docs/knowledge/xxx.md              images/
  ![](https://raw.../arch.png) ──→   architecture/
                                      workflow/
                                      screenshots/
```

## 修改清单

### 新增

| 文件 | 说明 |
|---|---|
| `knowledge-assets` 分支 | 孤儿分支，只包含 `images/` 目录。含 `images/architecture/`、`images/workflow/`、`images/screenshots/` 三个子目录和 `images/README.md` |
| `images/README.md` | 图片资源分支说明：规则、URL 格式、使用方式 |

分支链接：https://github.com/sayhelloproton-eng/ai-agent-platform/tree/knowledge-assets

### 修改

| 文件 | 改动内容 | GitHub 链接 |
|---|---|---|
| `skills/ai-knowledge/references/11-feishu-publishing.md` | "禁止发布" 从全禁图片 → 禁本地路径、允许 GitHub Raw URL；Projection Filter 管线更新 | https://github.com/sayhelloproton-eng/ai-agent-platform/blob/main/skills/ai-knowledge/references/11-feishu-publishing.md |
| `knowledge.config.yaml` | 新增 `images_ref: knowledge-assets` 和 `images_url_base` | https://github.com/sayhelloproton-eng/ai-agent-platform/blob/main/knowledge.config.yaml |

### 未修改

- `docs/knowledge/` 所有文档：当前零图片引用，无需改动
- AGENTS.md
- context/

## Commit

`b5c5f21` — feat: allow GitHub Raw URL images in Feishu publishing
https://github.com/sayhelloproton-eng/ai-agent-platform/commit/b5c5f21

## 发布合同变更摘要

**改前**：
```
移除图片、Mermaid、draw.io、二进制资源引用
Publisher 不上传、不下载、不转换这些资源
```

**改后**：
```
移除本地相对路径图片、Mermaid、draw.io、二进制资源引用
（保留 GitHub Raw URL 和公开 HTTPS URL 图片）

允许：
- GitHub Raw URL：https://raw.githubusercontent.com/{owner}/{repo}/{branch}/...
- 其他公开 HTTPS URL（经 Review 确认稳定可用）

图片统一存储在 knowledge-assets 分支
Publisher 不需要判断图片是否存在、是否需要上传或是否覆盖
```

## 同步流程

```
1. 开发者将图片放入 knowledge-assets 分支
2. main 分支 Markdown 中写：
   ![](https://raw.githubusercontent.com/sayhelloproton-eng/ai-agent-platform/knowledge-assets/images/architecture/arch.png)
3. git commit + push
4. Feishu Publisher 直接推正文（URL 是确定性的，无脑覆盖）
5. 飞书渲染图片
```
