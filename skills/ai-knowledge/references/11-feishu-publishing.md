# Feishu Knowledge Publishing

本规范定义 `ai-agent-platform` 从 Git Knowledge Source 向飞书知识库“智能体工程探索”发布内容时必须遵守的 v1.2 合同。Publisher 只做确定性文本过滤与投影，不参与知识创作。

## 1. 发布模型

```text
Git Repository
└── docs/knowledge/**
          |
          v
Projection Filter
          |
          v
Feishu Knowledge Base
└── 智能体工程探索
```

- Git Repository 是唯一真源。
- `docs/knowledge/**` 是唯一允许的项目知识发布源。
- 飞书是面向人和 AI 阅读的 Knowledge Projection，不是 Git 仓库镜像、第二真源或协作源。
- 禁止 `Feishu → Git`、双向同步、自动合并和用飞书覆盖 Git。
- 禁止 AI 总结、改写、润色、补充、翻译或重排正文。
- Projection Filter 只生成飞书发布 payload，不反写 Git。

## 2. Feishu Markdown 边界

### 允许发布

以下 Markdown 结构保持原始语义并交给飞书 Markdown 转换器：

- 标题；
- 正文段落；
- 粗体与斜体；
- 有序和无序列表；
- 表格；
- 引用；
- 代码块；
- 普通链接。

飞书回读可能发生格式归一化。验收检查标题、正文、列表、表格、引用、代码和链接语义，不要求回读字节与 Git 完全一致。

### 禁止发布

以下资产不得进入 Feishu payload：

- 图片本地相对路径（`./images/arch.png`、`../diagrams/flow.jpg`）；
- Mermaid 源码或代码块；
- draw.io 文件；
- 内嵌二进制附件；
- 未经 Review 的第三方图片 URL。

### 允许发布

以下图片引用**保留原文进入飞书**，Publisher 不处理、不上传、不转换：

- GitHub Raw URL：`https://raw.githubusercontent.com/{owner}/{repo}/{branch}/...`
- 其他公开 HTTPS URL（经 Review 确认稳定可用）

图片统一存储在 `knowledge-assets` 分支：

```text
main 分支（Markdown）
  └── ![](https://raw.githubusercontent.com/sayhelloproton-eng/ai-agent-platform/knowledge-assets/images/...)

knowledge-assets 分支（只存图片）
  └── images/architecture/
  └── images/workflow/
  └── images/screenshots/
```

Publisher 不需要判断图片是否存在、是否需要上传或是否覆盖 — GitHub Raw URL 是确定性的，直接透传。

## 3. Projection Filter

固定过滤顺序：

```text
Git Markdown
      |
      v
移除 Git frontmatter
      |
      v
移除本地相对路径图片、Mermaid、draw.io、二进制资源引用
（保留 GitHub Raw URL 和公开 HTTPS URL 图片）
      |
      v
处理普通文档链接
      |
      v
生成 Feishu Markdown
```

### Frontmatter

Git metadata 只用于 Git：

```yaml
---
asset_id: ARC-001
canonical_path: docs/knowledge/example.md
status: active
---
```

发布 payload 必须移除文件开头完整的 YAML frontmatter。飞书正文从第一个 H1 开始，不得把 metadata 渲染为标题、正文或代码块。

### 图片与资源引用

Publisher 必须从 payload 中移除 Markdown 图片引用和资源型链接，不得把本地路径改写成公网 URL。

如果图片承载不可缺少的信息，该知识资产在发布前必须先经过独立的 Git Review，把信息写成：

1. 文字说明；
2. `text` 代码块中的文本图。

未经 Review 的图片语义不得由 Publisher 或 AI 临时解释、猜测或重绘。移除图片会导致正文语义不完整时，停止该文档发布并报告 Git 内容需要先文本化。

### Mermaid 与图形

Mermaid、draw.io 和其他图形源不进入飞书。正式知识资产需要展示架构或流程时，Git Markdown 应直接包含可阅读的文本图：

```text
用户
  |
  v
ChatGPT
  |
  v
Agent Runtime
  |
  v
Tool Layer
  |
  v
Knowledge Layer
```

Publisher 保留已经 Review 的 `text` 代码块，不执行 Mermaid 渲染、截图、图片上传或图形到文本的自动推断。

## 4. README 发布规则

| Git 资产 | 发布行为 |
|---|---|
| `docs/knowledge/README.md` | 发布为飞书知识库首页 |
| 任意目录下的其他 `README.md` | 不发布正文 |

目录 README 用于 Git 导航和 AI Context，不产生独立飞书知识正文。Publisher 可以依据 Git 目录创建对应的飞书层级节点，但不得把目录 README 正文写入该节点，也不得为目录生成额外介绍。

## 5. 飞书标题规则

普通 Markdown 文档的飞书标题只来源于 Markdown 第一个一级标题：

```markdown
# ARC-001 平台目标架构
```

禁止：

- 直接使用文件名作为标题；
- AI 翻译、缩写、优化或补全标题；
- 在缺少 H1 时自动猜测标题。

普通 Markdown 缺少 H1、存在空 H1 或无法解析首个 H1 时，标记验证失败并停止发布该文档。目录节点名称来源于 Git 目录名称，不受目录 README 的 H1 影响。

## 6. 普通链接处理

Publisher 只处理 Markdown 文档链接，不处理图片或二进制资源链接：

```text
Git Relative Document Link
        |
        v
Feishu Document Link
        或
Immutable GitHub URL
```

规则：

- 本次发布的普通 Markdown：转换为对应 Feishu Document Link；
- `docs/knowledge/README.md`：转换为飞书首页链接；
- 目录 README、非发布 Markdown 或其他 Git 文本资产：转换为带完整 commit SHA 的 GitHub URL；
- 外部 `http://` 或 `https://` 普通链接保持不变；
- 图片、Mermaid、draw.io 或二进制资源链接按 Projection Filter 移除；
- 无法解析、越界或目标不存在的普通文档链接必须在发布前失败。

链接转换只作用于发布 payload，不反写 Git Markdown。

## 7. 发布资产分类

| Git 资产 | 飞书行为 |
|---|---|
| `docs/knowledge/README.md` | 首页 |
| 普通 `.md` | 过滤后发布为文档 |
| 目录 `README.md` | 不发布正文 |
| 已 Review 的 `text` 代码块 | 保留为文本图或代码 |
| 图片、Mermaid、draw.io、二进制文件 | 不发布 |
| 代码目录、Skill、Schema 和其他 Git Layer | 不发布 |

资源文件可以继续存在于 Git；Publisher 不扫描其内容，也不把它们创建为飞书节点。

## 8. 固定发布流程

```text
扫描 docs/knowledge/
        |
        v
生成发布清单
        |
        v
解析 Markdown
        |
        v
运行 Projection Filter
        |
        v
处理普通文档链接
        |
        v
生成 Feishu Markdown Preview
        |
        v
人工确认
        |
        v
创建或更新飞书文档
        |
        v
回读验证
```

发布清单至少包含：

- Git commit SHA；
- source path；
- 资产分类；
- H1 标题；
- 目标目录；
- create / update / skip 动作；
- 被过滤的 frontmatter 和资源引用；
- 普通文档链接转换结果；
- 验收方式和异常。

执行规则：

1. 发布前确认工作树来源与 Git commit；未 Review 或未进入 Git 的正文不得发布。
2. 发布前生成完整 Projection Preview，并获得独立的飞书发布确认。
3. 默认不删除飞书节点，不修改知识库权限、成员、公开状态或基础设置。
4. 创建与更新必须具有幂等目标；同一 source path 不得重复创建多个文档。
5. 写入后回读标题、关键正文、列表、表格、引用、代码块和普通链接。
6. 验收必须确认 frontmatter、图片、Mermaid 和资源引用没有进入页面。
7. 失败时保留 Git，标记 Projection Pending；禁止从飞书反向修复 Git。

## 停止条件

遇到以下情况立即停止对应文档或整批发布并报告：

- 来源不在 `docs/knowledge/**`；
- Git 来源未 Review、无法确定 commit SHA 或工作树与发布来源不一致；
- 普通 Markdown 缺少有效 H1；
- 过滤资源后正文语义不完整；
- 普通文档链接无法安全解析；
- 需要 AI 改写、解释图形或补充正文才能发布；
- Projection Preview 仍包含 frontmatter、图片、Mermaid 或二进制资源引用；
- 目标知识库不是“智能体工程探索”；
- 操作涉及未获授权的删除、权限、成员、公开状态或反向同步。
