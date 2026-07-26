# Feishu Write Plan

## 范围

Space：智能体工程探索

Space ID：`<FEISHU_SPACE_ID>`

写入级别：G2（创建普通知识文档、局部更新指定首页），需要一次明确确认。

## 文档计划

| 文档 | 父目录 | 父 Node Token | 操作 | 本地预览 |
|---|---|---|---|---|
| 项目当前状态与上下文恢复入口 | 00_Context | `<FEISHU_NODE_00_CONTEXT>` | create | `A-project-status.md` |
| 2026-07-26 ChatGPT × Feishu × Git 上下文同步设计记录 | 10_Research_Experiment | `<FEISHU_NODE_10_RESEARCH_EXPERIMENT>` | create | `B-context-sync-design-record.md` |
| ADR-001 GitHub 与飞书双源事实架构 | 11_ADR | `<FEISHU_NODE_11_ADR>` | create | `C-adr-001-dual-source.md` |
| GitHub 仓库初始化与工程资产管理规范 | 09_Engineering | `<FEISHU_NODE_09_ENGINEERING>` | create | `D-github-initialization-standard.md` |
| 2026-07-26 Codex：Context Sync 与 GitHub 初始化执行日志 | 14_Agent_Log | `<FEISHU_NODE_14_AGENT_LOG>` | create | `E-codex-execution-log.md` |
| 智能体工程探索录 | existing | `<FEISHU_HOME_WIKI_TOKEN>` | targeted block update | `homepage-update-plan.md` |

## 幂等策略

1. 写入前重新列出父目录子节点并按标题精确查重。
2. 如果同名文档出现，停止创建，读取其 revision 后改为更新计划。
3. 首页写入前重新读取 revision；与预览基准不一致则停止。
4. 写入后回读标题、父节点、正文关键段落和 revision。
5. 不因客户端提示字段重复创建。

## 风险

- 新建 5 个普通知识文档，不删除、不移动、不改权限。
- 首页执行最小块级更新，不覆盖整篇。
- GitHub 尚未创建，文档 D 明确标记 remote 待完成，不虚构 URL 或 Commit。
- 写入成功后仍需在 Git 阻塞解除后回填真实 GitHub 关联。

## 验收

- A–E 每篇返回真实 Docx Token、Wiki Node Token、URL 和 revision。
- A–E 均可 `docs +fetch` 回读。
- 首页只修改“7. 当前阶段”，其他章节保持不变。
- 结果回填 `remote-context-map.md` 和执行日志。
