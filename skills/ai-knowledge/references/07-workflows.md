# Workflows

## query-context

先读取 `context/`，再从任务相关 Git Layer 和索引选择最小资产。External Provider 只用于补充证据。输出 Context Package，不修改 Git 或 Feishu。

## capture-knowledge

Knowledge Event → 来源与敏感检查 → 选择 Git Layer → Change Plan → Git Draft → Review → Git Update → Validate / Index。

只有写入 `docs/knowledge/` 且需要面向人发布时，才进入独立的 `publish-knowledge-projection`。

## update-project-status

读取 Git `context/current-status.md` → 收集已验收证据 → 生成 Context Draft / Diff → Review → 更新 Git → 验证。

该工作流不读取 Feishu 状态页作为真源，也不自动发布 Context。

## publish-knowledge-projection

验证来源位于 `docs/knowledge/` → 读取已审查 Git 内容 → 生成 Projection Plan / Preview → 独立确认 → Publish → Read-back Verify。

禁止从其他 Git Layer 发布项目知识。Feishu 人工修改产生 Drift 时只报告，不反写或自动合并。

## record-adr

确认真实决策和备选；编号从 `docs/adr/` 与 Asset Index 获取。未经 Project Owner 确认只能是 Proposed。

ADR 保存在 Git Decision Layer，不作为 Feishu Knowledge 正文。

## import-public-wiki

使用授权身份读取目录，按 obj_type 路由；默认保存元数据、脚本、摘要和本地忽略全文。

导入内容是外部证据。只有用户选择且经过重新组织、来源检查、Git Draft 和 Review 的内容，才能进入适当 Git Layer。

## rebuild-index

扫描 Git Canonical Assets 与已授权 Provider 元数据，校验 ID、路径、关系、状态和缺失正文。Index 不替代 Git 正文。
