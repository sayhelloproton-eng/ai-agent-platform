# Git 与 Feishu 知识治理

## 决策

```text
Git = 唯一真源
Feishu = 面向人的可重建投影
```

## Git 文档包

资源型知识文章使用 `文档目录/README.md + assets/`。正文和资源同分支、同 Commit。Git 只保存本地相对路径和 AI 可读语义镜像，不保存 Feishu media token、Block ID 或 URL。

## 发布

```text
Git README.md
  + ./assets/image.png
  + AI 可读语义镜像
        ↓ Publisher
Feishu 文本块 + 图片块 + 同一语义镜像
```

发布规则：

- one-way；
- overwrite；
- one Git document bundle → one Feishu document node；
- 发布前不读取 Feishu 正文做语义 Diff；
- 不合并、不反向同步；
- 本地图片在发布阶段上传并插入原位置；
- 发布后回读 API、revision、正文、图片和映射。

## 授权门

只有在正式内容完成 Review、Git 已 Commit、Registry 和文档包校验通过、敏感信息检查完成并获得独立用户授权后，才允许真实 Feishu 写入。

失败时停止并报告具体文档、图片、锚点和 API 错误，不得静默丢图或从 Feishu 反向修补 Git。
