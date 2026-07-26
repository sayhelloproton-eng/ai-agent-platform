# Feishu Public Wiki Read Test

## 1. 环境

### lark-cli

```text
lark-cli version 1.0.77
```

### 登录状态

执行：

```bash
lark-cli auth status --json --verify
```

结果：

- 当前默认身份：`user`
- 用户身份：`ready`
- 用户 token：`valid`
- 用户身份验证：`verified: true`
- Bot 身份：`ready`
- Bot 身份验证：`verified: true`
- 已具备本次只读测试需要的 Wiki 与 Docx scopes

本次测试使用有效的 user / bot access token，不是匿名 HTTP 抓取。

## 2. 测试目标

公开 Wiki URL：

```text
https://waytoagi.feishu.cn/wiki/Zsp2wxsKEiRTEjkajJFc7FBGnh3
```

该 URL 属于其他飞书租户 `waytoagi.feishu.cn`，不属于当前账号自己的 Wiki Space。

## 3. CLI 能力

| 能力 | 是否支持 | 验证结果 |
| --- | --- | --- |
| 读取公开 Wiki URL | 是 | `wiki +node-get`、`docs +fetch` 均成功 |
| 获取 node_token | 是 | `Zsp2wxsKEiRTEjkajJFc7FBGnh3` |
| 获取节点信息 | 是 | 标题、Space、Docx token、父节点和时间信息均返回 |
| 获取正文 | 是 | XML outline 与完整 Markdown 正文均成功 |
| 获取子节点 | 是 | 根节点下读取到 29 个子节点 |
| 导出 Markdown | 是 | `docs +fetch --doc-format markdown` 已成功；`drive +export` dry-run 也成功解析调用链 |

### CLI 命名差异

需求中的概念与当前 CLI 实际命令映射如下：

| 需求概念 | 当前 lark-cli 命令 |
| --- | --- |
| `wiki.get` / `wiki.node.get` | `lark-cli wiki +node-get` |
| Wiki 底层节点解析 | `lark-cli wiki spaces get_node` |
| `wiki.node.list` | `lark-cli wiki +node-list` |
| `wiki.search` | Wiki domain 内不存在；跨文档搜索使用 `docs +search` 或 `drive +search` |
| `docs.get` | `lark-cli docs +fetch` |
| `docs.export` | `docs +fetch --doc-format markdown` 或 `drive +export` |

## 4. 实验结果

### 4.1 Wiki URL 解析

执行：

```bash
lark-cli wiki +node-get \
  --node-token 'https://waytoagi.feishu.cn/wiki/Zsp2wxsKEiRTEjkajJFc7FBGnh3' \
  --as user \
  --format json
```

结果：成功。

| 字段 | 值 |
| --- | --- |
| 标题 | `飞书CLI使用方法` |
| `space_id` | `7226178700923011075` |
| `node_token` / Wiki token | `Zsp2wxsKEiRTEjkajJFc7FBGnh3` |
| `obj_token` / Docx token | `J88HdqWmaolp4mxA4SCcvPrGnHZ` |
| `obj_type` | `docx` |
| `node_type` | `origin` |
| `parent_node_token` | 空，表示 Space 根级节点 |
| `has_child` | `true` |
| 最近更新时间 | `2026-05-11T12:16:41Z` |

底层 API 命令同样成功：

```bash
lark-cli wiki spaces get_node \
  --token 'Zsp2wxsKEiRTEjkajJFc7FBGnh3' \
  --as user \
  --format json
```

### 4.2 Bot 身份交叉验证

执行：

```bash
lark-cli wiki +node-get \
  --node-token 'https://waytoagi.feishu.cn/wiki/Zsp2wxsKEiRTEjkajJFc7FBGnh3' \
  --as bot \
  --format json
```

结果：成功。

使用 bot 身份执行 `docs +fetch` 读取目录也成功。这说明该公开资源并非只对当前登录用户可见；配置好的应用身份也能通过官方 OpenAPI 读取。

注意：bot 仍携带有效应用凭证，因此该结果不能解释为 CLI 支持匿名访问。

### 4.3 页面结构

执行：

```bash
lark-cli docs +fetch \
  --doc 'https://waytoagi.feishu.cn/wiki/Zsp2wxsKEiRTEjkajJFc7FBGnh3' \
  --scope outline \
  --max-depth 3 \
  --as user \
  --format json
```

结果：成功，`document_id` 为 `J88HdqWmaolp4mxA4SCcvPrGnHZ`，`revision_id` 为 `420`。

主要页面结构：

- 先装 code agent
- 安装飞书 CLI
- 给 Claude Code / Codex 等 Coding Agent 的安装指令
- 案例合集
- KOL 测评推荐
- 安装教程
  - 扫码或直接打开链接
  - 跳转链接后选择形象和名字
- 创建第一个任务
  - 二次授权权限
  - 最终制作完成
- 创建第二个任务
- 创建第三个任务
- 创建第四个任务

### 4.4 正文内容

执行：

```bash
lark-cli docs +fetch \
  --doc 'https://waytoagi.feishu.cn/wiki/Zsp2wxsKEiRTEjkajJFc7FBGnh3' \
  --doc-format markdown \
  --detail simple \
  --as user \
  --format json
```

结果：成功。

正文返回内容包括：

- 页面标题与富文本结构
- lark-cli 安装命令
- Coding Agent 使用提示
- 社区案例和关联文档引用
- KOL 测评条目
- 安装与授权教程
- 多个任务示例
- 图片资源链接及图片描述
- Wiki / Docx / Bitable 引用

报告不复制整篇公开正文，仅记录读取能力和内容结构。

### 4.5 子节点

执行：

```bash
lark-cli wiki +node-list \
  --space-id '7226178700923011075' \
  --parent-node-token 'Zsp2wxsKEiRTEjkajJFc7FBGnh3' \
  --as user \
  --page-all \
  --format json
```

结果：成功，`has_more: false`，共 29 个直接子节点。

子节点标题：

1. CLI是什么？——给完全不懂编程的你的科普
2. 把 Feishu CLI 交给本地 Agent：34 个能直接开干的玩法
3. 飞书 CLI Prompt Book（最佳实践合集）
4. 飞书 CLI 创作者大赛
5. 飞书CLI设计问卷：🐾 /buddy 电子宠物征集展
6. 飞书CLI整理知识库
7. 飞书CLI直出文章：Zara 张咋啦推荐关注的16位 AI Builder
8. 飞书 CLI 画板功能：功能全景图
9. 2050 大会 · WaytoAGI 三周年盛典全案
10. 通往AGI之路-群聊内容收录
11. 飞书CLI实测案例：Claude Code 源码泄漏深度分析
12. 黄叔：我让AI直接操作我的飞书，结果它比我还熟练
13. 小互：飞书 CLI 直接开源 为所有AI打开了大门
14. 甲木：刚刚，飞书 CLI 开源了，我用 Claude Code 玩转几大企业级场景，绝了！
15. 冷逸：一文说清楚飞书、企微CLI究竟是什么，怎么用？| 附8大玩法
16. 直播分享 | 飞书CLI：让Agent真正落地的最短路径
17. 飞书 CLI ：让 AI 直接帮你操作飞书
18. 智能纪要：04-10 | Mini Camp第一期：玩转飞书 CLI 专场 2026年4月10日
19. 用飞书CLI做问卷和审核
20. 张咋啦：是时候用 HTML 取代 PPT 了
21. 飞书 CLI：让 Agent 真正干活——使用介绍与案例集
22. 未命名 Sheet 节点
23. AI切磋大会第23期✨ 飞书CLI专场 · 4月26日 一句话搞定你的飞书
24. 42章经：CLI 回来了，但这次是给 Agent 用的：从 Slock 看人 + AI 的新协作
25. 智能纪要：切磋大会全国连线 2026年4月26日
26. 元子：WayToAGI知识库活了！AI帮你5分钟在WayToAGI定制学习路径 — Study Reviver
27. 定制学习路径
28. CT：飞书 cli 创意玩法合集
29. 如何让飞书真正替你干活？「AI绝活大会」干货替你整理好了

子节点类型包括 `docx`、`bitable`、`sheet` 和 `shortcut`；部分子节点仍有下级节点。

### 4.6 Wiki 解包与 Markdown 导出

执行：

```bash
lark-cli drive +inspect \
  --url 'https://waytoagi.feishu.cn/wiki/Zsp2wxsKEiRTEjkajJFc7FBGnh3' \
  --as user \
  --format json
```

结果：成功。

CLI 将 Wiki URL 解包为：

- 类型：`docx`
- 标题：`飞书CLI使用方法`
- Canonical token：`J88HdqWmaolp4mxA4SCcvPrGnHZ`
- Wiki Space：`7226178700923011075`

Markdown 文件导出 dry-run：

```bash
lark-cli drive +export \
  --url 'https://waytoagi.feishu.cn/wiki/Zsp2wxsKEiRTEjkajJFc7FBGnh3' \
  --file-extension markdown \
  --output-dir './docs' \
  --as user \
  --dry-run \
  --format json
```

结果：成功。CLI 预览的只读调用链为：

1. Wiki node 解析
2. Docx Markdown fetch
3. 写入本地文件

本次未执行实际文件导出，因为完整 Markdown 正文已经通过 `docs +fetch` 验证成功，且任务只要求能力验证和报告。

## 失败项与限制

### 没有失败的读取步骤

以下步骤全部成功：

- URL 解析
- Wiki 节点信息
- Space ID 获取
- Docx token 获取
- 正文目录
- 完整 Markdown 正文
- 子节点列表
- User / Bot 双身份读取
- Markdown export dry-run

### CLI 限制

1. Wiki domain 没有独立的 `wiki.search` 命令；搜索位于 `docs +search` / `drive +search`。
2. Wiki domain 没有 `wiki.export`；导出位于 `drive +export`，纯 Markdown 读取也可使用 `docs +fetch --doc-format markdown`。
3. 互联网公开不代表匿名 CLI：lark-cli 仍需要已配置的应用和有效 user 或 bot identity。
4. 能否读取取决于目标资源的公开状态及 OpenAPI 对资源的实际授权判断；不能假设所有公开网页链接都一定可被 OpenAPI 读取。
5. 子节点列表只返回指定父节点的直接子级；要抓取整棵树，需要对 `has_child: true` 的节点递归执行只读 `+node-list`。

## 5. Skill 设计建议

### 判断：A

**官方 CLI 可以直接读取互联网公开的飞书知识库。**

但应将 A 精确描述为：

> 在 lark-cli 已完成应用配置，并拥有有效 user 或 bot identity 的前提下，官方 Wiki / Docs OpenAPI 可以跨租户读取允许公开访问的 Wiki 节点、正文和子节点。

### Feishu Knowledge Skill 建议架构

1. **URL 解析层**
   - 输入 `/wiki/<token>` URL。
   - 使用 `wiki +node-get` 或 `drive +inspect`。
   - 输出 `space_id`、`node_token`、`obj_token`、`obj_type` 和标题。

2. **正文读取层**
   - 结构发现优先 `docs +fetch --scope outline`。
   - 按章节读取优先 `--scope section`。
   - 需要本地知识处理时使用 `--doc-format markdown`。
   - 避免默认抓取整篇大型文档。

3. **目录遍历层**
   - 使用 `wiki +node-list --page-all`。
   - 仅对 `has_child: true` 的节点递归。
   - 设置最大深度、最大节点数、请求间隔与断点续传。

4. **类型路由层**
   - `docx` → `lark-doc`
   - `sheet` → `lark-sheets`
   - `bitable` → `lark-base`
   - `shortcut` → 先解析实体 token

5. **权限与安全层**
   - 只使用官方 user / bot token。
   - 权限拒绝时停止，不切换到 Cookie、内部接口或页面抓取绕过。
   - 清楚标记“公开网页”“OpenAPI 可读”和“匿名可读”是三个不同概念。
   - 默认只读，不调用复制、移动、成员或权限接口。

6. **Web Reader 回退**
   - 当前目标不需要 Web Reader。
   - 只有当目标网页公开但 OpenAPI 明确拒绝、且用户仍需要读取网页展示内容时，才考虑合规 Web Reader。
   - Web Reader 只能读取公开页面，不得绕过登录或访问控制。

## 最终结论

本次目标属于 A：官方 lark-cli 可以直接读取该公开知识库，不需要额外 Web Reader。

验证覆盖节点解析、正文、结构、子节点与 Markdown 输出，全程未创建、修改或删除任何飞书数据。
