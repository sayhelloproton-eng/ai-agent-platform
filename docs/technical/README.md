# Technical Documentation

## What

`docs/technical/` 保存工程实现和维护所需的技术文档，不参与 Feishu Knowledge Projection。

## Structure

- [`架构实现/`](架构实现/)：Runtime、Provider、Adapter 与实现边界；
- [`技术方案/`](技术方案/)：具体问题的工程方案；
- [`技术调研/`](技术调研/)：技术研究、来源和外部证据；
- [`工程规范/`](工程规范/)：仓库、模块、测试和实现约束；
- [`运维与迁移/`](运维与迁移/)：执行、迁移、发布和历史证据；
- [`治理规则/`](治理规则/)：Agent、文档、安全与知识治理；
- [`元数据/`](元数据/)：Asset、Relation、Feishu 和迁移机器索引；
- [`Archive/`](Archive/)：保留但不再作为当前入口的历史资产。

## Boundary

Technical 文档可以被 Agent 按任务读取，但不是 Agent 启动 Context，也不是面向 Feishu 的发布源。

任何代码、Skill、依赖或外部系统变更都不由本目录迁移自动授权。
