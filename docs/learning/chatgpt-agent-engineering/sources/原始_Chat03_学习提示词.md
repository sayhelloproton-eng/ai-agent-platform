# Chat03：ChatGPT App 与 Codex 深度学习与工程化应用

## 任务定位

本 Chat 用于系统学习 ChatGPT App、Codex、AI Coding Agent 生态。

目标：

-   理解 ChatGPT App 的完整能力边界；
-   掌握 Codex 的使用方式、配置方式和最佳实践；
-   调研市场主流 AI Coding Agent 方案；
-   设计个人 AI 开发工作流；
-   探索 ChatGPT + Codex + Agent + MCP + 本地环境的组合方式。

注意：

不要限制在当前 ai-agent-platform 方案内，需要从整个 AI
工程生态角度研究。

------------------------------------------------------------------------

# 一、ChatGPT App 全面认知

研究：

-   ChatGPT Desktop App 能力；
-   ChatGPT Mobile App 能力；
-   Chat 模式；
-   Work 模式；
-   Projects；
-   GPTs；
-   Memory；
-   Files；
-   Voice；
-   Computer Use；
-   Connectors；
-   MCP；
-   Actions。

重点分析：

-   每个能力解决什么问题；
-   适合个人开发者还是企业；
-   如何组合使用。

------------------------------------------------------------------------

# 二、Codex 深度学习

研究 Codex：

## 基础能力

包括：

-   Codex 是什么；
-   与 ChatGPT 区别；
-   与普通聊天区别；
-   与 Claude Code、Cursor、Copilot 区别。

## 使用方式

研究：

-   ChatGPT 内 Codex；
-   VS Code Codex 插件；
-   CLI 使用方式；
-   Remote 工作方式；
-   手机控制开发环境；
-   多设备协作。

------------------------------------------------------------------------

# 三、Codex 工作流设计

研究完整开发链：

需求：

    ChatGPT
     ↓
    任务分析
     ↓
    Codex
     ↓
    代码修改
     ↓
    测试
     ↓
    Git提交
     ↓
    文档更新

分析：

-   什么任务适合 Chat；
-   什么任务适合 Codex；
-   什么任务需要人工确认；
-   如何减少 Token 消耗。

------------------------------------------------------------------------

# 四、AI Coding Agent 市场方案调研

对比：

## OpenAI

-   ChatGPT
-   Codex
-   GPTs
-   Actions

## Anthropic

-   Claude Code
-   Claude Desktop
-   MCP

## Cursor

研究：

-   Agent Mode
-   Rules
-   Context管理
-   项目理解能力

## GitHub

研究：

-   Copilot
-   Copilot Workspace
-   Agent能力

## 开源方案

研究：

-   Continue
-   Aider
-   OpenHands
-   Cline
-   Roo Code

分析：

-   架构区别；
-   优缺点；
-   适合场景。

------------------------------------------------------------------------

# 五、AI Agent 工程组合模式

探索：

## 模式一

ChatGPT作为入口

    用户
     ↓
    ChatGPT
     ↓
    Action
     ↓
    API
     ↓
    服务

## 模式二

Coding Agent模式

    需求
     ↓
    Codex
     ↓
    代码仓库
     ↓
    Git

## 模式三

本地Agent模式

    Chat
     ↓
    Gateway
     ↓
    Local Runtime
     ↓
    Tools

## 模式四

企业Agent平台

    LLM
     ↓
    Agent Runtime
     ↓
    Workflow
     ↓
    Tools
     ↓
    Data

------------------------------------------------------------------------

# 六、配置体系研究

研究：

## ChatGPT配置

-   Project Instructions
-   Custom GPT Instructions
-   Memory
-   Knowledge Files

## Codex配置

研究：

-   Rules
-   Context
-   Repository约束
-   Coding规范
-   Prompt模板

## 项目级AI配置

设计：

    project
     |
     docs
     |
     context
     |
     rules
     |
     agents
     |
     skills

------------------------------------------------------------------------

# 七、AI开发骚操作探索

研究实际生产技巧：

## 1. Chat作为总入口

让Chat负责：

-   分析需求；
-   创建任务；
-   调度Agent。

## 2. Codex作为执行者

负责：

-   修改代码；
-   创建文件；
-   测试；
-   重构。

## 3. MCP作为工具连接层

连接：

-   GitHub；
-   飞书；
-   数据库；
-   本地工具。

## 4. Knowledge作为长期记忆

结合：

-   Git；
-   飞书；
-   Markdown；
-   Vector DB。

------------------------------------------------------------------------

# 八、安全模型

研究：

-   本地执行安全；
-   Token权限；
-   API安全；
-   Cloudflare Tunnel；
-   Access控制；
-   沙箱环境。

重点：

AI不能直接拥有无限系统权限。

------------------------------------------------------------------------

# 九、个人AI开发操作系统设计

最终目标：

形成：

    AI入口层

    ChatGPT

    ↓

    理解层

    Memory / Knowledge

    ↓

    执行层

    Codex / Agent

    ↓

    工具层

    MCP / API / Local Runtime

    ↓

    基础设施

    Git / Cloud / Mac

------------------------------------------------------------------------

# 十、最终输出

本 Chat 最终需要形成：

1.  ChatGPT能力地图；
2.  Codex使用手册；
3.  AI Coding Agent对比报告；
4.  最佳个人开发工作流；
5.  AI工程实践方案；
6.  与ai-agent-platform结合建议。

要求：

以工程实践为导向，不停留在产品介绍。
