# Documentation and Knowledge Asset Rules

> 作用范围：`docs/**`。

## 文档边界

- `knowledge/`：面向人的正式知识与飞书发布源；
- `technical/`：实现方案、调研、治理、运维和迁移；
- `learning/`：学习过程和来源；
- `adr/`：正式决策；
- `templates/`：统一模板。

## 正文与元数据

正文服务人的理解，不使用大段 YAML Front Matter 保存系统关系。

稳定 ID、状态、Canonical Path、关系、实现证据、飞书映射和 Release 进入 `platform-registry/`。

## 事实纪律

- Research、Experiment、ADR、Current State 不得混用；
- 已完成、已验证、已接受必须有证据；
- 当前实现与目标设计必须分开；
- superseded 内容保留历史关系；
- ID 不得复用。

## README

每个长期目录必须有 README，并登记目录职责、文件、子目录、入口、状态和维护规则。

## 飞书

只有 `docs/knowledge/` 可发布。

发布采用零预读、逐篇 overwrite，不做语义 Diff、合并或反向同步。

除非任务明确授权，不执行飞书写入。
