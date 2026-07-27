# Workflows

## query-context

读取 Git Current State 和索引，选择最小相关资产；Provider 只用于补充证据。输出 Context Package，不修改知识源。

## capture-knowledge

Knowledge Event → 类型与敏感检查 → Git Draft → Review → Merge → Index。需要飞书阅读版时另生成 Projection Plan。

## sync-project-status

读取 Git `CTX-002` → 收集已验收证据 → 生成 Git Draft / Diff → Review / Merge → 可选投影到飞书 → 回读验证。飞书页面不能覆盖 Git。

## record-adr

确认真实决策和备选；编号从 `docs/10-adr/` 与 Asset Index 获取。未经 Project Owner 确认只能是 Proposed。

## import-public-wiki

使用授权身份读取目录，按 obj_type 路由；默认保存元数据、脚本、摘要和本地忽略全文。只有用户选择的内容才能转为总结型 Knowledge Item。

## rebuild-index

扫描 Git 正式资产与已授权 Provider 元数据，校验 ID、路径、关系、状态和缺失正文。
