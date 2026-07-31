# KNO-006 Knowledge Pack 设计

## 1. 文档定位

定义面向 Agent Host 发布的版本化 Knowledge Pack。Pack 从 Git 正式知识派生，不是新的知识真源。

## 2. 两层

每个专业 Agent 组合通用基础 Pack 与角色专属 Pack。基础 Pack 保存愿景、术语、架构、安全和全局边界；角色 Pack 保存方法、标准、案例和领域资料。

## 3. Manifest

记录 pack_id、version、role_id、source_commit、asset_ids、include/exclude rules、sensitivity、size_budget、generated_hash、target_hosts 与 release_status。

## 4. 构建

`Registry Query → Asset Selection → Sensitivity Check → Format Adaptation → Size/Link Validation → Hash → Host Upload → Preview/Eval → Release`。

## 5. 更新

根据关系和 Source Commit 计算变化，稳定后只重建受影响 Pack；实时数据由外部 Knowledge Service 查询。

## 6. 当前实现边界

当前只有两层原则和 Git 知识，没有 `knowledge-packs/`、Manifest Schema 或 Publisher。

## 7. 目标设计边界

首批真实专业 Agent 确认后，再创建最小 Schema、一个基础 Pack 和一个角色 Pack并验证。

## 8. 设计原则

- Git 正文唯一真源
- Pack 绑定 Commit 与 Hash
- 基础与角色知识分层
- Secret/Private Context 不进 Pack
- 实时数据走外部服务

## 9. 关联文档

- [ARC-012 Agent Profile 与 Skills](../04_平台架构/ARC-012-Agent-Profile与Skills资产化.md)
- [KNO-004 内置知识与记忆](./KNO-004-Custom-GPT内置知识外部知识与记忆.md)
- [KNO-005 项目知识生命周期](./KNO-005-项目知识生命周期.md)
