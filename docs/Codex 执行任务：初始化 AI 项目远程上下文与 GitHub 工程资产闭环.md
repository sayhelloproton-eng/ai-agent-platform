Codex 执行任务：初始化 AI 项目远程上下文与 GitHub 工程资产闭环

> **任务级别：基础设施初始化 / 高优先级**> > **执行对象：Codex**> > **本地项目目录：** `/path/to/ai-agent-platform`> > **执行日期基准：** 2026-07-26> > 本任务不是单纯“写一份总结”，也不是单纯“执行 git init”。 > 目标是第一次建立以下闭环：> > **ChatGPT 讨论上下文 → 结构化知识 → 飞书远程同步**> > **本地工程资产 → Git/GitHub 版本管理 → 飞书记录工程状态**> > 完成后，用户在新设备或新的 Agent 会话中，应能通过 GitHub 恢复工程资产，通过飞书恢复项目背景、决策、进度和下一步。
> ￼
> 一、你的角色与执行原则
> 你是本任务的工程执行者与知识同步执行者。
> 你不负责重新发明项目架构，也不要把本任务降级为：

    ●	写一篇泛泛的项目总结；
    ●	只执行 git init；
    ●	只创建一个空 GitHub 仓库；
    ●	把聊天原文整段复制到飞书；
    ●	把飞书当作代码仓库；
    ●	把 GitHub 当作所有知识文档的唯一存储；
    ●	创建一个简单的飞书 CRUD 封装。

你必须根据本文提供的完整上下文，结合本地项目中的真实文件和当前执行结果，完成可验证的落地操作。
执行原则 1. 先检查，后修改。2. 不猜测本地状态。 所有结论必须来自命令输出或已存在文件。3. 幂等执行。 同名飞书文档已存在时优先更新，不重复创建。4. 不删除任何已有飞书文档、知识库节点、本地文件或 Git 历史。5. 不修改飞书权限、不公开分享、不移动一级目录。6. 不提交任何凭据、Token、Cookie、.env、密钥或本机认证缓存。7. 飞书写入前先读取目标文档；高风险操作必须停止并报告。8. GitHub 仓库默认创建为 private。 未经用户明确许可，不创建 public 仓库。9. 不把第三方公开知识库的完整导出内容重新发布到 GitHub。10. 完成后必须给出可核验结果，不得只说“已完成”。
￼
二、项目已知上下文
2.1 项目名称
ai-agent-platform
2.2 本地目录
/path/to/ai-agent-platform
这是项目的长期本地工作目录，也是本次 Git/GitHub 初始化绑定目录。
2.3 项目总体目标
构建一个长期可演进的 AI Agent 工程平台，核心方向包括：
● Agent 系统设计；
● AI 工作流；
● Tool / Skill 体系；
● Knowledge System；
● 长期上下文管理；
● 模型、设备和 Provider 可替换；
● ChatGPT 负责讨论、分析和架构；
● Codex 负责本地文件、代码、CLI、Git 和验证执行；
● 飞书保存长期知识；
● GitHub 保存工程资产。
长期核心项目方向包括 AI 视频工作流，但当前阶段优先建设平台的知识层和上下文同步基础设施。
￼
三、已经确定的最终方案
以下内容是已经讨论并确认的架构结论。除非本地存在明确的新 ADR 推翻这些结论，否则不要擅自改变。
3.1 ChatGPT Project 的定位
ChatGPT Project 是：
● 人与 ChatGPT 的讨论空间；
● 当前会话和项目文件的云端协作容器；
● 需求澄清、方案讨论、架构推演的入口。
它不是唯一的长期事实源，因为：
● 历史聊天是非结构化内容；
● 外部 Agent 无法稳定按工程接口读取全部项目会话；
● 不适合作为代码和工程资产的版本系统；
● 不应依赖某个单一 Chat 会话才能继续项目。
3.2 飞书的定位
飞书是项目的：

> **远程知识协作层 / 长期认知上下文层**
> 保存：

    ●	项目背景与目标；
    ●	项目当前状态；
    ●	架构文档；
    ●	领域模型；
    ●	Agent 与 Workflow 设计；
    ●	知识系统设计；
    ●	技术调研与实验记录；
    ●	ADR；
    ●	学习路线；
    ●	成果索引；
    ●	Agent 执行日志。

飞书解决的是：
● 多设备远程访问；
● 人与 Agent 共享阅读；
● 长期上下文恢复；
● 知识查询；
● 项目进度和决策的持续更新。
3.3 Git/GitHub 的定位
Git/GitHub 是项目的：

> **工程资产事实源**
> 保存和管理：

    ●	代码；
    ●	Skill；
    ●	Schema；
    ●	配置模板；
    ●	脚本；
    ●	测试；
    ●	工程化 Markdown 文档；
    ●	可复现的实验脚本；
    ●	版本、分支、Commit、Diff、Review 和回滚历史。

不要在飞书中复制维护完整源码。飞书只记录工程资产的目的、状态、路径、版本、使用方法和关键决策，并链接到 GitHub。
3.4 双源事实模型
最终采用：
`textChatGPT Project    │    │ 讨论、分析、需求、设计    ▼Context Capture / AI Knowledge Skill    │    ├───────────────┐    ▼               ▼Feishu             GitHub知识事实源          工程事实源背景/决策/状态      代码/Skill/Schema/脚本    │               │    └───────┬───────┘            ▼        Agent 恢复上下文`
两个事实源不是相互完整复制，而是通过稳定引用关联：
● 飞书文档记录 GitHub 仓库、分支、Commit、文件路径；
● Git 工程文档记录对应飞书文档标题和 Node Token；
● 同一事实只明确一个主维护位置；
● 防止双向全文同步导致冲突和版本漂移。
3.5 AI Knowledge Skill 的定位
AI Knowledge Skill 的真正使用者是：

> `ai-agent-platform` 中的 AI Agent。
> 它不是给普通飞书用户直接使用的界面，也不是 Codex 专属工具。
> 分层：
> `textHuman  ↓Chat / Gateway  ↓Agent  ↓AI Knowledge Skill  ↓Knowledge Provider  ├─ Feishu Provider  ├─ Git Provider  ├─ Local Provider  └─ Web Provider`
> 飞书只是一个 Provider。
> 底层飞书操作通过：

    ●	官方 lark-cli；
    ●	飞书 OpenAPI。

Skill 层提供的是领域能力，例如：
● query_context
● capture_knowledge
● record_decision
● sync_project_status
● import_public_wiki
● build_learning_path
而不是只提供：
● create_doc
● get_node
● update_doc
3.6 低 Token 检索原则
禁止每次把整个飞书知识库读入模型。
采用：
`text任务/问题  ↓意图和知识域判断  ↓知识目录/索引/元数据查询  ↓定位少量候选文档  ↓读取最小必要章节  ↓生成 Context Package`
3.7 人在回路与安全边界
允许自动化：
● 读取知识目录；
● 搜索；
● 读取文档；
● 创建普通草稿或记录；
● 在明确目标文档中受控追加或更新；
● 更新项目状态；
● 记录 Git 结果。
必须人工确认或禁止自动执行：
● 删除；
● 权限修改；
● 公开分享；
● 大批量移动；
● 覆盖未知内容；
● 将私有仓库改为公开；
● 强制推送或重写 Git 历史。
￼
四、今天已经完成和解决的事项
你需要把下面的内容作为“ChatGPT 提供的高层上下文”，再和本地真实文件、当前 Codex 会话执行结果合并。
4.1 飞书知识库结构确定
知识库展示名称：
智能体工程探索
首页文档标题：
智能体工程探索录
知识库 Space ID：
<FEISHU_SPACE_ID>
冻结的 v1.0 一级目录：
`text00_Context（项目上下文）01_Product（产品与业务目标）02_Architecture（系统架构）03_Domain_Model（领域模型）04_Agent_System（Agent系统）05_Workflow（工作流设计）06_Knowledge_System（知识系统）07_Model_Runtime（模型与运行环境）08_Tool_Integration（工具与外部能力）09_Engineering（工程实现）10_Research_Experiment（研究与实验）11_ADR（架构决策）12_Learning_Path（学习路线）13_Portfolio（成果展示）14_Agent_Log（Agent运行记录）`
不要修改或新增一级目录。
4.2 飞书一级目录节点信息
|目录 |Wiki Node Token ||-----------------------------|-----------------------------||00_Context（项目上下文） |`<FEISHU_NODE_00_CONTEXT>`||01_Product（产品与业务目标） |`<FEISHU_NODE_01_PRODUCT>`||02_Architecture（系统架构） |`<FEISHU_NODE_02_ARCHITECTURE>`||03_Domain_Model（领域模型） |`<FEISHU_NODE_03_DOMAIN_MODEL>`||04_Agent_System（Agent系统） |`<FEISHU_NODE_04_AGENT_SYSTEM>`||05_Workflow（工作流设计） |`<FEISHU_NODE_05_WORKFLOW>`||06_Knowledge_System（知识系统） |`<FEISHU_NODE_06_KNOWLEDGE_SYSTEM>`||07_Model_Runtime（模型与运行环境） |`<FEISHU_NODE_07_MODEL_RUNTIME>`||08_Tool_Integration（工具与外部能力） |`<FEISHU_NODE_08_TOOL_INTEGRATION>`||09_Engineering（工程实现） |`<FEISHU_NODE_09_ENGINEERING>`||10_Research_Experiment（研究与实验）|`<FEISHU_NODE_10_RESEARCH_EXPERIMENT>`||11_ADR（架构决策） |`<FEISHU_NODE_11_ADR>`||12_Learning_Path（学习路线） |`<FEISHU_NODE_12_LEARNING_PATH>`||13_Portfolio（成果展示） |`<FEISHU_NODE_13_PORTFOLIO>`||14_Agent_Log（Agent运行记录） |`<FEISHU_NODE_14_AGENT_LOG>`|
首页：
● Docx Token：<FEISHU_HOME_DOCX_TOKEN>
● Wiki Node Token：<FEISHU_HOME_WIKI_TOKEN>
● URL：https://<FEISHU_TENANT>.feishu.cn/docx/<FEISHU_HOME_DOCX_TOKEN>
4.3 飞书 CLI 已验证
本机已验证安装：
● npm 包：@larksuite/cli
● 命令：lark-cli
● 已验证版本：1.0.77
已验证主要能力：
`textlark-cli wiki +space-listlark-cli wiki +space-createlark-cli wiki +node-listlark-cli wiki +node-createlark-cli wiki +node-getlark-cli docs +createlark-cli docs +fetchlark-cli docs +searchlark-cli drive +searchlark-cli drive +inspectlark-cli drive +export`
已知边界：
● wiki 域存在，不是 knowledge；
● Wiki 没有直接的 wiki.search，搜索使用 docs +search 或 drive +search；
● Wiki Space 创建和写入通常需要用户身份及对应权限；
● 互联网公开发布不由 CLI/OpenAPI 自动完成，属于人工管理边界；
● Sheet 与 Bitable 需要各自类型和权限，不应强行当 Markdown 文档处理；
● 写操作前先检查 Schema 和 dry-run 支持；
● 不读取或输出本机 OAuth Token、.enc 文件和 Keychain 内容。
4.4 WaytoAGI 公开知识库调研
目标公开 Wiki：
https://waytoagi.feishu.cn/wiki/Zsp2wxsKEiRTEjkajJFc7FBGnh3
已验证：
● Space ID：7226178700923011075
● Root Wiki Token：Zsp2wxsKEiRTEjkajJFc7FBGnh3
● Root Docx Token：J88HdqWmaolp4mxA4SCcvPrGnHZ
● 官方 lark-cli 可跨租户读取公开 Wiki；
● 可以读取节点元数据、树结构和 Markdown；
● 递归导出共发现 53 个节点；
● 其中 50 个成功导出 Markdown；
● 2 个 Bitable、1 个 Sheet 因对象类型及权限没有导出为 Markdown；
● 这证明飞书可以作为 Agent 的知识 Provider，但对象类型必须路由，不能把所有节点当作 Docx。
本地可能存在以下调研资产，必须检查，不得假定：
/path/to/ai-agent-platform/docs/research/waytoagi-feishu-cli-export/
可能包含：
● export-report.md
● space-info.json
● wiki-tree.json
● wiki-tree.md
● integrity-check.json
● pages/
● export-waytoagi-wiki.mjs
注意：
pages/ 中可能是第三方公开知识库的完整内容。除非用户明确确认授权，不要把完整正文重新提交或发布到 GitHub。可以提交：
● 自己生成的调研报告；
● 节点统计；
● 结构摘要；
● 导出脚本；
● 不包含大段第三方正文的元数据。
4.5 今天最终解决的问题
问题一：项目上下文只存在聊天里，如何跨设备和跨 Agent 持续工作？
最终方案：
● ChatGPT Project 保存协作过程；
● 飞书保存长期结构化认知上下文；
● GitHub 保存工程资产；
● Agent 通过 Knowledge Skill 查询两端；
● 每次重要任务结束后执行知识捕获和状态同步。
问题二：Feishu Skill 应该给谁使用？
结论：
● Skill 的直接使用者是 AI Agent；
● Codex 是开发和执行工具，不是 Skill 的最终业务用户；
● 飞书只是 Provider；
● 顶层应该是 AI Knowledge Skill，而不是简单 Feishu CRUD Skill。
问题三：代码、Skill 和架构文档应该存在哪里？
结论：
● 代码、Skill、Schema、脚本、测试：Git/GitHub；
● 项目背景、决策、进度、实验总结、学习路线：飞书；
● 工程 Markdown 可以进入 Git，但飞书中需要有可读摘要和稳定链接；
● 不做未经治理的双向全文同步。
问题四：如何降低 Agent 查询知识的 Token 消耗？
结论：
● 使用目录、索引、标签、元数据和文档关系先定位；
● 仅读取最相关的少量文档和章节；
● 返回包含来源和置信度的 Context Package；
● 禁止无差别全库导出给 LLM。
￼
五、任务一：整理今天的上下文并写入飞书
5.1 开始前检查
在任何飞书写操作前执行：1. 检查 lark-cli --version。2. 检查当前认证状态和可用身份，但不得输出 Token。3. 用只读命令验证 Space 和目标父节点可访问。4. 使用 lark-cli ... --help、Schema 或 dry-run 确认命令参数。5. 读取目标父节点下现有子节点，避免创建同名重复文档。6. 如果认证失效，只报告需要用户重新登录，不尝试绕过认证。
5.2 必须创建或更新的飞书文档
文档 A：项目当前状态与上下文恢复入口
父目录：
00_Context（项目上下文）
父 Node Token：
<FEISHU_NODE_00_CONTEXT>
建议标题：
项目当前状态与上下文恢复入口
如果同名文档存在，先读取并基于最新内容更新；不存在则创建。
必须包含：
`markdown# 项目当前状态与上下文恢复入口## 项目ai-agent-platform## 当前阶段Knowledge System Foundation / Context Synchronization Initialization## 当前目标建立 ChatGPT、飞书与 GitHub 之间的长期上下文和工程资产闭环，使新设备、新会话和新的 Agent 能快速恢复项目状态并继续工作。## 已完成- 已建立飞书知识库“智能体工程探索”- 已冻结 v1.0 十五个一级目录- 已创建知识库首页- 已安装并验证官方 lark-cli- 已验证公开飞书 Wiki 的跨租户读取- 已完成 WaytoAGI Wiki 结构导出实验- 已明确 AI Knowledge Skill 面向 Agent- 已明确 Feishu 是 Knowledge Provider- 已确定 GitHub + Feishu 双源事实模型- 已确定低 Token 的索引优先检索原则## 当前正在执行- 初始化本地 Git 仓库- 创建并绑定 GitHub 私有仓库- 对本地 Skill、文档、脚本和 Schema 进行版本管理- 建立每次重要会话/任务完成后的 Context Capture 流程## 下一步- 完成 AI Knowledge Skill 的工程审查和安装- 补充 Feishu 官方 Skill/CLI 依赖- 建立 Knowledge Index- 实现 query_context 只读 MVP- 实现任务完成后的 capture_knowledge 与 sync_project_status- 建立 Git Commit 与飞书知识记录之间的双向引用## 远程恢复流程1. 登录 ChatGPT 账号并进入项目，了解近期讨论。2. 克隆 GitHub 仓库，恢复代码、Skill、Schema 和脚本。3. 登录飞书并读取本页面、相关 ADR 和项目状态。4. Agent 查询最小必要上下文。5. 继续执行当前 Next Actions。`
文档 B：2026-07-26 ChatGPT × Feishu × Git 上下文同步设计记录
父目录：
10_Research_Experiment（研究与实验）
父 Node Token：
<FEISHU_NODE_10_RESEARCH_EXPERIMENT>
标题：
2026-07-26 ChatGPT × Feishu × Git 上下文同步设计记录
必须包含：1. 今日背景；2. 今日完成事项；3. WaytoAGI 和 lark-cli 验证结果；4. 讨论中过早生成“说明文档”而非标准 Skill 的问题，以及由此确认的 Skill 交付标准；5. ChatGPT Project、Feishu、GitHub 三者边界；6. 最终采用的双源模型；7. 解决的问题；8. 当前仍缺失的能力；9. 下一步实施顺序；10. 关联的本地和 GitHub 工程资产。
其中“今天做了哪些事”至少记录：
● 建立并验证飞书知识库目录；
● 创建首页；
● 验证 lark-cli；
● 读取并导出 WaytoAGI 公开 Wiki；
● 分析官方 CLI、Provider 和 Domain Skill 的边界；
● 明确 Skill 给 Agent 使用；
● 明确不能做成 CRUD wrapper；
● 生成并反复校准 AI Knowledge Skill 资产；
● 分析 ChatGPT Project 的跨设备上下文与限制；
● 确定飞书作为远程知识层、GitHub 作为工程资产层；
● 提出 Context Synchronization Loop；
● 启动 GitHub 仓库初始化。
不得把聊天原文逐段粘贴。应转换成清晰的工程记录。
文档 C：ADR-001 GitHub 与飞书双源事实架构
父目录：
11_ADR（架构决策）
父 Node Token：
<FEISHU_NODE_11_ADR>
标题：
ADR-001 GitHub 与飞书双源事实架构
使用以下结构：
`markdown# ADR-001 GitHub 与飞书双源事实架构- 状态：Accepted- 日期：2026-07-26- 决策范围：ai-agent-platform 长期上下文与工程资产管理## Context项目的讨论上下文目前主要存在于 ChatGPT 会话，本地工程资产尚未形成稳定的远程版本事实源。新设备、新会话和新的 Agent 难以快速恢复完整状态。## Decision采用 GitHub + Feishu 双源事实架构：- GitHub 是工程资产事实源；- Feishu 是知识与认知上下文事实源；- ChatGPT Project 是协作和设计入口；- AI Knowledge Skill 负责检索、捕获、更新和关联；- 两端通过 URI、Commit、文件路径、文档 Token 和更新时间关联，不进行无治理的全文双向复制。## Reasons- Git 适合代码、Skill、Schema、脚本、Diff 和回滚；- 飞书适合结构化知识、阅读、协作、远程同步和知识问答；- Chat 历史不适合作为唯一长期事实源；- Provider 抽象可以避免系统强绑定飞书；- 索引优先可降低 Token 消耗。## Consequences正面：- 支持多设备和跨 Agent 恢复；- 工程资产可审计；- 知识可以持续更新；- 降低重复说明和上下文丢失。代价：- 需要明确每类资产的主维护位置；- 需要处理 Git 与飞书引用一致性；- 需要设计 Context Capture 和状态同步规则；- 自动写入必须有安全门禁。## Rejected Alternatives- 只依赖 ChatGPT Project；- 所有文件只放飞书；- 所有知识只放 Git；- 每次全量读取知识库；- 顶层 Skill 强绑定 Feishu CRUD。## Follow-up- 初始化 GitHub 仓库；- 建立仓库与飞书的稳定链接；- 实现只读 query_context；- 实现 capture_knowledge 和 sync_project_status；- 为重要 Git Commit 写入对应飞书工程记录。`
文档 D：GitHub 仓库初始化与工程资产管理规范
先完成任务二，再写此文档。
父目录：
09_Engineering（工程实现）
父 Node Token：
<FEISHU_NODE_09_ENGINEERING>
标题：
GitHub 仓库初始化与工程资产管理规范
内容必须使用真实执行结果填充：
● GitHub 仓库名称；
● GitHub 仓库 URL；
● 可见性；
● 默认分支；
● 当前 Commit；
● 本地目录；
● 资产目录摘要；
● .gitignore 策略；
● 密钥和本地缓存排除规则；
● 第三方调研导出内容策略；
● 日常 Commit 规范；
● Git 与飞书关联方式；
● 恢复项目的命令与步骤。
文档 E：Codex 执行日志
父目录：
14_Agent_Log（Agent运行记录）
父 Node Token：
<FEISHU_NODE_14_AGENT_LOG>
标题：
2026-07-26 Codex：Context Sync 与 GitHub 初始化执行日志
记录：
● 开始时间；
● 检查项；
● 实际执行步骤；
● 创建/更新的文件；
● Git 命令结果摘要；
● 飞书创建/更新的文档及 Token；
● 遇到的问题；
● 未执行的高风险操作；
● 最终状态；
● 建议下一任务。
5.3 更新首页
读取首页现有内容后，仅更新“当前阶段/当前进度/下一步”相关区域。
首页 Docx Token：
<FEISHU_HOME_DOCX_TOKEN>
建议状态：
`text当前阶段：Knowledge System Foundation已完成：- 飞书知识库结构与首页- lark-cli 能力验证- 公开 Wiki 导入验证- AI Knowledge Skill 定位- GitHub + Feishu 双源事实架构决策当前执行：- GitHub 仓库初始化- 工程资产纳入版本管理- Chat/Codex 上下文同步到飞书下一步：- 安装并验证 AI Knowledge Skill- 建立 Knowledge Index- 实现 query_context 只读 MVP`
不要覆盖首页其他内容。
￼
六、任务二：初始化 Git 并创建 GitHub 仓库
6.1 检查本地工程
进入：
`bashcd /path/to/ai-agent-platform`
依次检查：
`bashpwdfind . -maxdepth 3 -type f | sortgit rev-parse --is-inside-work-treegit status --short --branchgit remote -vgh --versiongh auth status`
注意：
● 某些 Git 命令在未初始化仓库时会失败，这是预期情况；
● 记录输出，但不要把认证信息写入日志；
● 不要输出完整环境变量；
● 不要执行 cat ~/.config/gh/hosts.yml；
● 不要读取 lark-cli 的凭据缓存。
6.2 资产盘点
在修改前生成本地盘点文件：
docs/context/asset-inventory-2026-07-26.md
至少列出：
● 现有目录；
● Markdown 文档；
● Skill 目录和压缩包；
● 调研资产；
● 脚本；
● 配置；
● 可能的临时文件；
● 可能包含凭据的文件；
● 第三方导出内容；
● 是否存在大文件。
只记录相对路径，不记录敏感内容。
6.3 机密和第三方内容检查
在 Commit 前检查文件名和内容模式，包括但不限于：
`text.env.env.**.pem*.key*.p12credentialssecrettokencookieAuthorization:Bearerclient_secretapp_secret`
仅报告文件路径和风险类型，不在日志中复制秘密值。
对 WaytoAGI 等第三方知识库导出：
● 默认不提交完整 pages/ 正文；
● 可以提交自己的报告、统计、树结构摘要和导出脚本；
● 如果无法判断版权边界，将完整正文加入 .gitignore 并在报告中说明；
● 不删除本地导出文件。
6.4 .gitignore
如果不存在则创建；如果存在则审查并增量更新，不覆盖用户已有规则。
至少考虑：
`gitignore# macOS.DS_Store.AppleDouble.LSOverride# Dependenciesnode_modules/# Build outputdist/build/coverage/.next/.turbo/# Logs and temp*.loglogs/tmp/temp/.cache/# Environment and secrets.env.env.*!.env.example*.pem*.key*.p12*.enccredentials.jsonsecrets/.private/# Editor.vscode/*!.vscode/extensions.json!.vscode/settings.example.json.idea/# Local agent/runtime state.codex/.claude/.opencode/.local-state/runtime-state/# Feishu/Lark local authentication and exportslark-cli-auth/auth-cache/token-cache/# Third-party full content export: keep local, do not republish by defaultdocs/research/waytoagi-feishu-cli-export/pages/`
不要使用过度宽泛的规则误伤应提交的项目文件。
6.5 README 和基础工程文档
检查现有 README.md。
如果不存在，创建一个最小但真实的 README，包括：
● 项目定位；
● 当前阶段；
● Git/Feishu 双源模型；
● 目录结构；
● 本地启动或当前尚未实现的说明；
● 飞书知识库首页链接；
● 安全说明；
● 当前 Next Actions。
如果已经存在，只进行必要增量更新，不要删除原内容。
创建或更新：
docs/context/project-context.md
内容应能让新的 Codex/Agent 在不读取本次聊天的情况下理解：
● 项目目标；
● 当前架构；
● 当前阶段；
● 已完成；
● 当前任务；
● 下一步；
● Git 与飞书职责；
● 飞书关键文档入口；
● 安全边界。
创建或更新：
docs/context/current-task.md
当前任务完成后应写为：
● 本轮已完成；
● 未完成项；
● 下一条建议任务；
● 关联 Commit；
● 关联飞书文档。
6.6 Git 初始化
如果当前不是 Git 仓库：
`bashgit init -b main`
如果当前已经是 Git 仓库：
● 保留已有历史；
● 不重新初始化；
● 不修改默认分支，除非是空仓库且没有历史；
● 不删除或替换已有 remote。
检查并设置仓库级别的 Git 用户信息：
`bashgit config --get user.namegit config --get user.email`
如果缺失，不要猜测。停止 Commit 并向用户报告需要配置的信息。如果已有，继续。
6.7 首次 Commit
在暂存前检查：
`bashgit status --shortgit diff -- . ':!docs/research/waytoagi-feishu-cli-export/pages'`
只暂存安全且属于项目的文件。
建议首次 Commit 信息：
`textchore: initialize ai-agent-platform context and knowledge assets`
Commit 前再次执行：
`bashgit diff --cached --statgit diff --cached --name-only`
确认没有：
● .env
● Token
● Cookie
● Key
● 本地认证缓存
● 第三方完整正文
● 不必要的大型二进制包
然后 Commit。
不要使用：
● git push --force
● git reset --hard
● git clean -fd
● git filter-branch
● git rebase 重写历史
6.8 创建 GitHub 私有仓库
目标仓库名称：
ai-agent-platform
默认可见性：
private
先检查：
`bashgh auth statusgh repo view ai-agent-platform`
如果本地已经存在 origin：
● 读取并验证；
● 不覆盖；
● 判断它是否指向正确仓库；
● 如不一致，停止并报告。
如果 GitHub 中已经存在用户有权限的同名仓库：
● 检查是否为空；
● 不覆盖已有内容；
● 如果可以安全关联，设置 origin 并正常 pull/rebase 前先报告；
● 如果存在冲突或非空历史，停止并请求用户确认。
如果 gh 已登录、没有同名冲突、当前无 origin，执行：
`bashgh repo create ai-agent-platform \  --private \  --source /path/to/ai-agent-platform \  --remote origin \  --push`
实际命令以本机 gh repo create --help 为准。
如果 gh 未登录：
● 完成本地 Git 初始化和 Commit；
● 不尝试绕过；
● 返回 gh auth login 的人工步骤；
● 不虚报 GitHub 仓库已创建。
创建后验证：
`bashgit remote -vgit branch --show-currentgit rev-parse HEADgit status --short --branchgh repo view --json name,url,visibility,defaultBranchRef`
6.9 建立 Git 与飞书的关联记录
在本地创建或更新：
docs/context/remote-context-map.md
建议内容：
``markdown# Remote Context Map## GitHub- Repository:- URL:- Visibility:- Default Branch:- Current Commit:## Feishu- Space: 智能体工程探索- Space ID: <FEISHU_SPACE_ID>- Homepage:- Project Status Document:- ADR-001:- GitHub Initialization Record:- Latest Agent Log:## Source-of-Truth Rules| Asset Type | Primary Source ||---|---|| Code / Skill / Script / Schema | GitHub || Project background / decisions / progress | Feishu || Active discussion | ChatGPT Project || Executable current task | Git `docs/context/current-task.md` + Feishu status |``
飞书写入完成后，把真实 Node Token 和 URL 回填到此文件，并创建第二个 Commit：
`textdocs: link GitHub assets with Feishu knowledge records`
然后正常 push。
￼
七、将 Codex 当前执行上下文与 ChatGPT 上下文合并
这一步不能忽略。
你必须合并三类来源：
来源 A：本文提供的 ChatGPT 高层上下文
即本文第二至第四部分。
来源 B：本地项目真实资产
包括但不限于：
● docs/
● context/
● skills/
● scripts/
● WaytoAGI 调研结果；
● 已生成的 Skill 或压缩包；
● README；
● 当前目录结构。
来源 C：本次 Codex 实际执行结果
包括：
● Git 是否原本存在；
● 创建或修改了哪些文件；
● GitHub 是否成功创建；
● 仓库 URL；
● Commit；
● 遇到的权限问题；
● 飞书实际创建或更新了哪些文档；
● 哪些步骤因为安全边界没有执行。
合并规则：1. ChatGPT 上下文给出“为什么”和已确定方案。2. 本地文件给出“已有资产和当前实现”。3. Codex 执行结果给出“实际状态”。4. 冲突时以真实执行结果为当前状态，但不得擅自推翻已接受的 ADR。5. 不确定内容明确标记为“待确认”，不得填成事实。6. 飞书最终记录必须体现本次 GitHub 初始化的真实结果，而不是预期结果。
￼
八、执行顺序
严格按以下顺序执行：
`text1. 检查本地目录和现有 Git 状态2. 检查 lark-cli 和飞书只读访问3. 盘点本地资产和敏感风险4. 创建/更新本地上下文文档5. 初始化 Git 并完成安全的本地 Commit6. 创建或关联 GitHub 私有仓库7. 验证 remote、branch、commit、push8. 基于真实结果创建/更新飞书文档 A～E9. 更新飞书首页状态10. 将飞书 Node Token/URL 回填到 remote-context-map.md11. 创建第二个 Git Commit 并 push12. 执行最终验证13. 输出完整报告`
若第 6 步因 GitHub 登录失败无法继续：
● 仍可执行飞书文档 A、B、C 和 Agent Log；
● 文档 D 中明确标记“GitHub Remote 待登录后创建”；
● 不虚构 URL、Commit 或创建结果；
● 停止需要 remote 的后续动作并返回人工步骤。
若飞书写入失败：
● Git/GitHub 初始化仍然可以继续；
● 将准备写入的飞书内容保存到：docs/context/feishu-sync-pending/
● 不虚报同步成功；
● 返回权限或认证错误和可执行的恢复步骤。
￼
九、最终验收
9.1 Git/GitHub 验收
必须报告真实值：
`textLocal path:Is Git repository:Branch:Remote origin:GitHub URL:Visibility:Latest commit:Working tree clean:Push succeeded:`
9.2 飞书验收
对每个创建或更新的文档报告：
`textTitle:Parent directory:Operation: created / updatedWiki node token:Docx token:URL:Verification: fetched successfully / failed`
至少包括：
● 项目当前状态与上下文恢复入口；
● 2026-07-26 ChatGPT × Feishu × Git 上下文同步设计记录；
● ADR-001 GitHub 与飞书双源事实架构；
● GitHub 仓库初始化与工程资产管理规范；
● 2026-07-26 Codex 执行日志；
● 首页状态更新。
9.3 本地资产验收
报告：
● 新增文件；
● 修改文件；
● 未提交文件；
● 被 .gitignore 排除的重要路径；
● 第三方导出处理；
● Skill 资产所在位置；
● 是否发现敏感信息；
● 是否需要用户处理。
9.4 最终项目状态
以以下结构收尾：
`markdown## Current Phase## Completed This Run## Decisions Applied## Assets Created## Feishu Documents Updated## GitHub Repository## Unresolved Issues## Next Recommended Task`
￼
十、完成标准
只有同时满足以下条件，才可以声明本任务完成：1. 已检查并记录本地真实状态；2. 本地工程已安全纳入 Git 管理，或明确报告阻塞原因；3. GitHub 私有仓库已创建并绑定，或明确报告登录/冲突阻塞；4. ChatGPT 上下文、本地资产和 Codex 执行结果已合并；5. 飞书关键知识文档已创建或更新，或内容已进入待同步目录并明确失败原因；6. 飞书首页当前状态已更新，或明确报告未更新原因；7. 没有提交凭据和本地认证数据；8. 没有重新发布第三方完整知识库正文；9. 所有 Git Commit、飞书 Token 和 URL 都是真实可验证值；10. 已给出下一步任务建议。
开始执行，不要再次询问“需要对文档做什么”。只有遇到以下情况才暂停并请求用户确认：
● 发现已有且不一致的 Git remote；
● GitHub 同名仓库已有非空历史；
● 需要修改公开/私有权限；
● 发现疑似凭据已经被 Git 跟踪；
● 需要删除、覆盖或移动已有飞书内容；
● 需要强制推送或重写历史。
