# 检索与 Token 策略

## 总原则

检索目标不是“找到尽可能多”，而是为当前任务提供足够且可验证的最小上下文。

## 四级读取

1. **L0 配置**：项目 profile、目录 token、状态文档 token。
2. **L1 索引**：标题、路径、标签、摘要、更新时间和关系；不读正文。
3. **L2 结构**：文档 outline、目标 section、局部 fragment。
4. **L3 正文**：仅对少量高相关文档读取完整 Markdown。

默认停在 L2。只有跨章节综合、文档较短或用户明确要求时进入 L3。

## 选择规则

- 项目整体定位：`00_Context` + `01_Product`。
- 系统修改：`02_Architecture` + `03_Domain_Model` + 相关 `11_ADR`。
- Agent/Skill：`04_Agent_System` + `06_Knowledge_System` + `08_Tool_Integration`。
- 具体实现：`09_Engineering` + 对应实验和 ADR。
- 当前进度：只读 Project Status；必要时补充最近验收报告。
- 学习问题：`12_Learning_Path` + 对应领域文档，不默认读取 Agent Log。

## 排序

候选分数可由以下信号组成：

- 标题命中：5
- keywords/tags：3
- path/domain：2
- 摘要命中：1
- 关系到 ADR/Architecture：加权
- 过期、草稿、失败占位：降权

`query_index.mjs` 提供确定性词法初筛，Agent 负责语义复核。

## 预算

默认：

- 候选文档最多 8 个。
- 完整正文最多 3 个。
- Context Package 正文预算 12,000 字符；超出时按重要性截断并列出未读来源。
- 不因“可能有用”而读取全部 15 个一级目录。

## 来源和置信度

- `confirmed`：飞书正文、Git 文档、验收报告明确支持。
- `inferred`：由多个事实推导，必须标记为推断。
- `unknown`：缺证据，不写成事实。
