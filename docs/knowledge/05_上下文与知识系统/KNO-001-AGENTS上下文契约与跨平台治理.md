# KNO-001 AGENTS 上下文契约与跨平台治理

## 1. 文档定位

定义 AGENTS.md 的职责，以及它与 Task Contract、README、Context、Skill、Rules 和不同 Host 的关系。

## 2. 职责

AGENTS 保存长期目标、目录职责、修改规则、安全底线和验证命令；不保存单次任务范围、动态进度、Secret 或完整知识正文。

## 3. 分层发现

Codex 从全局层和项目根向当前目录逐层读取 override、AGENTS 或回退文件；下层只在存在特殊边界时增加，不复制根规则。

## 4. 跨平台

不同 Host 对 AGENTS、Project Instructions、Custom Instructions 和 Skill 的发现不同。Git 根 AGENTS 是正式 Contract，其他 Host 配置由 Adapter/Publisher 派生。

## 5. 边界

README 解释目录；Context 保存当前事实；Task Contract 定义本轮范围；Skill 定义可复用方法；Rules/Sandbox 强制执行权限。

## 6. 当前实现边界

当前根、docs、skills 和 platform-registry 已有分层 AGENTS；跨 Host 发布仍依赖人工任务说明。

## 7. 目标设计边界

目标由 Agent Profile Publisher 派生 Git 指导、Skill、Knowledge Pack 和权限引用到不同 Host。

## 8. 设计原则

- 长期规则与单次任务分离
- 下层只补充特殊边界
- 文档指令不替代安全
- 跨平台发布记录来源 Commit
- 修改后新会话验证

## 9. 关联文档

- [CAP-008 平台核心能力模型与目标对齐](../02_基础产品与能力/CAP-008-平台核心能力模型与目标对齐/README.md)
- [KNO-002 多级领域上下文](./KNO-002-多级领域上下文架构.md)
- [根 AGENTS](../../../AGENTS.md)

## 10. 参考

- [OpenAI：AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
