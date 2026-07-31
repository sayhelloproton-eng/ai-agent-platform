# KNO-004 Custom GPT 内置知识、外部知识与记忆

## 1. 文档定位

区分 GPT Knowledge、外部知识服务、ChatGPT Memory、Project Context 和平台 Task State，避免把所有机制称为“记忆”。

## 2. 机制

Instructions 管行为；GPT Knowledge 放稳定参考；External Knowledge Service 负责实时共享与权限检索；Memory 负责个性化；Project 组织长期工作；Task Store 保存精确状态。

## 3. GPT Knowledge

Knowledge 是 Builder 上传的参考文件，不是 saved memory。GPT 不依赖过去会话保存项目状态，正式资料从 Git 派生。

## 4. 外部服务

负责高频更新、跨 Agent 共享、权限过滤、结构化查询、大规模检索和时效元数据，但不替代 Git 正式知识。

## 5. Memory 与状态

Memory 适合长期低风险偏好；Task State 由平台保存。Project 隔离还受 default/project-only memory、计划和 Workspace 影响。

## 6. 当前实现边界

当前已确定 Git 真源、两层 Knowledge Pack 和未来外部知识服务边界；Pack 与服务尚未物化。

## 7. 目标设计边界

目标由 Publisher 生成角色 Pack，Knowledge Service 提供实时检索，Task Control 保存状态，三者以稳定 ID 关联。

## 8. 设计原则

- Knowledge/Memory/Context/State 分名词
- Custom GPT 不承担 Task Store
- 稳定资料进 Git 派生 Pack
- 实时共享进外部服务
- 结果保留来源与日期

## 9. 关联文档

- [CAP-002 ChatGPT 产品形态](../02_基础产品与能力/CAP-002-ChatGPT产品形态与能力边界.md)
- [CAP-004 Custom GPT 边界](../02_基础产品与能力/CAP-004-CustomGPT产品能力与边界.md)
- [CAP-005 Custom GPT 配置](../02_基础产品与能力/CAP-005-CustomGPT-Instructions-Knowledge-Actions与发布配置.md)

## 10. 参考

- [OpenAI：GPTs in ChatGPT](https://help.openai.com/en/articles/8554407-gpts-in-chatgpt)
- [OpenAI：Projects in ChatGPT](https://help.openai.com/en/articles/10169521-chatgpt-projects)
- [OpenAI：Memory FAQ](https://help.openai.com/en/articles/8590148-memory-in-chatgpt)
