Feishu Knowledge Skill Design Context v1.0

> 本文档用于向 Codex 注入 ai-agent-platform 项目上下文。> > 目标：在理解项目定位、架构目标、知识系统设计理念后，设计 AI Knowledge> Skill。
> ￼

1.  项目背景
    项目名称：
    ai-agent-platform
    目标：
    构建 AI Agent 工程平台。
    核心方向：
    ● Agent 系统设计
    ● AI 工作流
    ● Tool / Skill 体系
    ● Knowledge System
    ● 长期上下文管理
    当前阶段：
    建设 AI Agent 的长期知识基础设施。
    ￼
2.  核心理念
    本项目不是：
    ● 飞书机器人
    ● 文档管理工具
    ● CLI 包装器
    ● 简单 RAG 搜索系统
    目标：
    > 构建 Agent 可以理解、查询、维护、演化的长期知识系统。
    > ￼
3.  总体架构背景
    目标架构：
    User
    ↓
    ChatGPT / Custom GPT / Gateway
    ↓
    Agent
    ↓
    Skill Layer
    ↓
    Tool / Provider Layer
    ↓
    External Systems
    ● Feishu
    ● Git
    ● Local Files
    ● Web
    ￼
4.  Feishu 定位
    飞书不是最终能力。
    飞书是：
    > Knowledge Provider
    > 负责保存：
        ●	项目上下文
        ●	架构文档
        ●	ADR
        ●	实验记录
        ●	学习路径
        ●	项目状态
    未来 Provider：
    ● Feishu Provider
    ● Git Provider
    ● Local Provider
    ● Web Provider
    ￼
5.  Skill 的使用者
    该 Skill 的真正使用者：
    > AI Agent
    > 不是：
        ●	普通飞书用户
        ●	Codex
        ●	人工操作
    关系：
    Human
    ↓
    Agent
    ↓
    AI Knowledge Skill
    ↓
    Knowledge Provider
    ↓
    Feishu
    ￼
6.  WaytoAGI 调研背景
    已验证：
    公开飞书 Wiki：
    https://waytoagi.feishu.cn/wiki/Zsp2wxsKEiRTEjkajJFc7FBGnh3
    通过 lark-cli：
    ● 可以读取公开 Wiki
    ● 可以获取节点树
    ● 可以获取 Markdown
    ● 可以递归导出内容
    WaytoAGI 的价值：
    验证：
    Agent + Tool + Knowledge + Workflow 模式。
    ￼
7.  Skill 设计原则
    7.1 CLI 是 Tool Layer
    正确分层：
    Agent
    ↓
    Skill
    ↓
    CLI Tool
    ↓
    Feishu
    ￼
    7.2 Skill 不应该暴露底层 API
    不要设计：
    ● create_doc()
    ● get_node()
    ● search_doc()
    这些属于 Adapter。
    应该提供：
    ● query_context()
    ● capture_knowledge()
    ● update_status()
    ● record_decision()
    ● build_learning_path()
    ￼
8.  Skill 核心能力
    Knowledge Discovery
    负责：
    ● 获取知识结构
    ● 建立索引
    ● 发现新增内容
    Knowledge Retrieval
    解决：
    不要每次扫描整个知识库。
    流程：
    用户问题
    ↓
    Knowledge Router
    ↓
    Knowledge Index
    ↓
    精准节点
    ↓
    Context Package
    Knowledge Capture
    把 Agent 工作结果沉淀为知识。
    例如：
    实验完成：
    ↓
    Research Experiment
    Knowledge Maintenance
    维护：
    ● Project Status
    ● Index
    ● 文档关系
    Learning Path
    根据目标生成学习路径。
    ￼
9.  当前知识库结构
    智能体工程探索录：
    ● 00_Context
    ● 01_Product
    ● 02_Architecture
    ● 03_Domain_Model
    ● 04_Agent_System
    ● 05_Workflow
    ● 06_Knowledge_System
    ● 07_Model_Runtime
    ● 08_Tool_Integration
    ● 09_Engineering
    ● 10_Research_Experiment
    ● 11_ADR
    ● 12_Learning_Path
    ● 13_Portfolio
    ￼
10. 禁止方向
    不要设计成：
    飞书 CRUD 包装器
    例如：
    create_doc()
    update_doc()
    delete_doc()
    ￼
    不要强绑定：
    FeishuSkill
    应该：
    AI Knowledge Skill
    ↓
    Feishu Provider
    ￼
    不要：
    用户问题
    ↓
    下载整个 Wiki
    ↓
    发送给 LLM
    原因：
    ● Token浪费
    ● 上下文污染
    ● 不可扩展
    ￼
11. 推荐目录
    skills/
    ai-knowledge/
    ● SKILL.md
    ● providers/
    ● feishu/
    ● git/
    ● local/
    ● capabilities/
    ● query-context/
    ● import-knowledge/
    ● capture-knowledge/
    ● sync-status/
    ● learning-path/
    ● schemas/
    ● knowledge-item
    ● project-status
    ● adr
    ￼
12. 第一阶段输出要求
    不要直接写代码。
    先生成设计文档：
    docs/Feishu_Knowledge_Skill_Architecture_v1.0.md
    必须包含：1. 背景和目标 2. Skill 定位 3. 整体架构 4. 能力模型 5. Provider 设计 6. Feishu CLI/API Adapter 7. Knowledge Index 8. Context Retrieval 9. Knowledge Lifecycle 10. MVP 路线
    ￼
13. 最终目标
    Agent 能够：
    理解项目
    ↓
    查询知识
    ↓
    获取上下文
    ↓
    执行任务
    ↓
    总结结果
    ↓
    更新知识
    ↓
    持续进化
    这就是 AI Agent Knowledge System。
