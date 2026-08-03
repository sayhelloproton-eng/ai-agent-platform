# EXP-002 飞书异构知识节点递归导出与完整性实验

> 结论：Wiki 树可以完整枚举，但“节点被发现”不等于“正文已经导出”；必须按 `obj_type` 路由不同 Provider，并把不可导出的对象保存为结构化失败占位。

## 1. 实验问题

能否递归枚举公开 Wiki 的全部节点，按对象类型抓取正文，并生成本地目录、树结构和完整性报告？

## 2. 实验范围

- 从 `EXP-001` 已验证的 Wiki 根节点开始；
- 递归枚举节点；
- 为每个节点保存路径、Token、对象类型和抓取状态；
- 对可导出的文档生成 Markdown；
- 对不支持的对象生成失败占位；
- 不把第三方全文默认提交或再发布。

## 3. 方法

```text
Wiki Root
  → 递归枚举 Node
  → 解析 shortcut 和真实对象
  → 按 obj_type 路由
      docx    → Docs Provider
      sheet   → Sheets Provider
      bitable → Base Provider
  → 保存正文或结构化失败
  → 生成 wiki-tree.json
  → 比较节点数、页面数和重复 Token
```

## 4. 结果

- 节点总数：53；
- 正文成功：50；
- 失败占位：3，其中 2 个 bitable、1 个 sheet；
- `wiki-tree.json` 与本地页面文件数均为 53；
- 重复 Node Token：0；
- 完整镜像状态：否。

“完整镜像状态为否”的原因不是节点丢失，而是三个非 docx 对象没有被转换为 Markdown 正文。

## 5. 证据

脚本、目录树、元数据和完整性检查位于：

- [`docs/technical/技术调研/external/waytoagi-feishu-cli-export/`](../../../technical/技术调研/external/waytoagi-feishu-cli-export/)

第三方全文 `pages/` 只在本地保存并被 Git 忽略，避免把外部内容误当成项目 Canonical Knowledge。

## 6. 失败处理原则

- 不把所有 Wiki Node 当成 Docx；
- 不因树结构完整就声称正文完整；
- 不丢弃错误；
- 不用空文件伪装成功；
- 每个失败占位保留对象类型、Token、错误和后续 Provider 需求。

## 7. 对平台的影响

- Feishu Provider 必须按对象类型分层；
- Export Result 需要同时表达 tree completeness 和 content completeness；
- 外部全文与项目知识资产保持隔离；
- Knowledge Distribution 只能发布经过治理的 Git Canonical Asset，不能直接再发布外部镜像。

## 8. 限制与后续

本实验没有实现 Sheet 和 Bitable 的等价 Markdown 导出。未来增加对应 Provider 时，应复用同一树结构和失败记录，并重新计算完整性，而不是覆盖原始实验结果。

## 9. 关联资产

- [EXP-001 公开飞书知识库读取与权限边界实验](../EXP-001-公开飞书知识库读取实验/README.md)
- [KNO-006 知识分发、Knowledge Pack 与多渠道投影](../../05_上下文与知识系统/KNO-006-知识分发Knowledge-Pack与多渠道投影/README.md)
