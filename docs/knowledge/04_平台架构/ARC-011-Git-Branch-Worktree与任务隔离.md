# ARC-011 Git Branch、Worktree 与任务隔离

## 1. 文档定位

定义写任务如何使用固定 SHA、Branch、Worktree、提交和回读实现隔离。Git 是正式资产事实边界，不是完整运行时状态库。

## 2. 绑定

`Task → base_commit → Git Operating Policy → executor/session → change → validation → review`。Branch、Worktree、Push、PR、Merge、Rebase、删除与清理是否发生，全部由当前任务明确授权；只要求在现有授权分支迁移或落库时，不默认创建远程 Branch、Worktree 或 PR。

## 3. 前后门禁

开始前检查远端、本地、工作区、允许路径和依赖；完成后检查 Diff、测试、暂存范围、Commit、Push 和远端回读。

## 4. 并行合并

多 Worktree 适合独立模块或方案探索；同一文件应提前串行化或指定唯一所有者，不能依赖自动合并解决语义冲突。

## 5. 限制

Git 不保存运行中 Lease、Approval 等待、心跳、外部副作用、临时资源和完整事件流，这些属于 Task Control 或 Ledger。

## 6. 当前实现边界

知识重构已在一个长期授权分支串行完成；已有固定 SHA、Scope Lock、逐任务 Git Operating Policy、暂存检查与远端回读，尚未自动创建 Worktree。

## 7. 目标设计边界

目标由 Task Control 生成 Branch/Worktree 绑定，Execution Lane 获取 Lease，Integration Task 负责合并和验收。

## 8. 设计原则

- 未知脏工作区不自动写入
- 固定 SHA 属于输入 Contract
- 未跟踪文件进入范围检查
- 一个 Commit 一个逻辑目的
- 清理与历史重写需单独授权

## 9. 关联文档

- [ARC-007 多任务并行架构](./ARC-007-多窗口多角色多任务并行架构.md)
- [ARC-010 Execution Lane](./ARC-010-Execution-Lane执行通道模型.md)
- [THY-006 项目方法论](../03_架构思想与理论/THY-006-项目方法论与可复用工程启发.md)
