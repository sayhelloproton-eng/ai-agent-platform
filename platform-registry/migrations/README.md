# Registry Migrations

本目录保存 Platform Registry 的受控迁移状态和迁移矩阵。

- `current-migration.yaml`：当前批次、已完成批次、下一批次和安全规则；
- `asset-migration-matrix.csv`：当前路径、目标路径、稳定 ID、动作、原因和批次的 Git 内正式记录。

迁移矩阵进入 Git 后才是长期真源；外部执行包只提供输入，不得作为正式引用。`current-migration.yaml` 必须随每个迁移批次同步更新，所有路径必须位于仓库内。
