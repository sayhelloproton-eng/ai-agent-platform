# Platform Registry Rules

> 作用范围：`platform-registry/**`。

- 稳定 ID 不得复用；
- 移动文件原则上不改变 ID；
- 新增、移动、替代、归档和发布必须同步 Registry；
- 关系类型必须来自 `relation-types.yaml`；
- `generated/` 只能由脚本生成；
- Feishu Projection 只允许 Git → Feishu overwrite；
- 不读取或保存飞书旧正文；
- Engineering Insight 成熟度和生命周期以领域 Registry 为准；
- 修改后必须运行 Schema、路径、关系和 Projection 校验。
