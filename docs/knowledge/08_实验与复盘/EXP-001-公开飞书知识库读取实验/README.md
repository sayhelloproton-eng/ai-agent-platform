# EXP-001 公开飞书知识库读取与权限边界实验

> 结论：公开网页可访问、OpenAPI 可读取和匿名访问是三件不同的事；具备有效身份且目标资源允许访问时，官方 `lark-cli` 可以跨租户读取 Wiki / Docx，但该结果不支持绕过权限或匿名抓取。

## 1. 实验问题

官方 `lark-cli` 能否读取其他租户允许公开访问的 Wiki，并获取节点、目录和正文，而不是依赖浏览器页面抓取？

## 2. 假设

如果目标 Wiki 允许当前应用身份访问，并且 URL 能解析为正确的 Space、Wiki Node 和 Docx Token，则 user 或 bot identity 可以通过官方 API 读取内容。

## 3. 环境

- `lark-cli 1.0.77`；
- 已验证的 user / bot access token；
- 目标：WaytoAGI 公开 Wiki 根节点；
- 只读实验，不创建、修改或删除飞书对象。

## 4. 方法

1. 从 Wiki URL 解析 Space、Wiki Node 和 Docx Token；
2. 分别使用 user 与 bot identity 读取节点信息；
3. 读取文档 Outline 和完整 Markdown；
4. 枚举根节点直接子节点；
5. 核对操作日志和目标资源，确认没有写副作用。

## 5. 观察与结果

- Wiki URL 解析成功；
- user 与 bot identity 均能读取节点和正文；
- Outline、完整 Markdown 和 29 个直接子节点读取成功；
- 整个过程没有创建、修改或删除飞书数据。

## 6. 结论边界

该实验验证的是“带有效身份的跨租户读取”。它不证明：

- 匿名 OpenAPI 可以读取；
- 所有网页公开对象都能通过 API 访问；
- 所有 Wiki 节点都能使用同一个 `docs fetch`；
- 应用可以绕过租户、对象或用户权限。

## 7. 对平台的影响

- 支持 Feishu Provider 使用官方 CLI / API，而不是网页抓取；
- 要求 Provider 保留 identity、resource、permission 和 object type；
- 为 `EXP-002` 的递归导出提供入口事实；
- 为知识分发与外部资源访问建立“公开不等于匿名”的安全边界。

## 8. 复现与审计

复现时必须使用独立测试身份和只读命令，记录：

- `lark-cli` 版本；
- identity 类型；
- 目标 URL、Space 和 Node；
- 返回对象类型；
- 成功与失败状态；
- 是否出现写副作用。

Token 和 Secret 不进入 Git。

## 9. 关联资产

- [EXP-002 飞书异构知识节点递归导出与完整性实验](../EXP-002-公开飞书知识库递归导出实验/README.md)
- [RSH-001 Feishu CLI 能力调研](../../../technical/技术调研/RSH-001-feishu-cli-capabilities.md)
- [KNO-006 知识分发、Knowledge Pack 与多渠道投影](../../05_上下文与知识系统/KNO-006-知识分发Knowledge-Pack与多渠道投影/README.md)
