# 工作流

## query-context

1. 解析任务目标、领域、需要回答的问题和预算。
2. 读取 project profile 和 Project Status。
3. 用本地索引选出候选；索引不存在则先构建目录级索引。
4. Agent 复核候选，优先 outline/section。
5. 需要时读取最多 3 篇完整正文。
6. 生成 Context Package，标明事实、决策、约束、缺口和来源。
7. 不修改知识库。

## capture-knowledge

1. 接收结构化 Knowledge Event 和来源材料。
2. 判断是否值得长期沉淀；临时日志留在 Task Result/Agent Log。
3. 选择类型和目标目录。
4. 使用 `render_draft.mjs` 生成初稿，再由 Agent补全语义内容。
5. 事实校验、敏感信息检查、重复检查。
6. 输出 Write Plan 和完整预览。
7. 用户确认后 dry-run、真实写入、回读验收、更新索引。

## sync-project-status

1. 读取规范状态文档；不存在时计划在 `00_Context` 创建。
2. 收集最近已验收 Task Result 和用户明确决定。
3. 只更新改变的 phase/objective/completed/in_progress/next/blockers。
4. 每个 completed 项附 evidence。
5. 生成全文草稿与 diff。
6. 确认后更新状态真源，回读验收。
7. 可选生成首页快照，不允许首页覆盖状态真源。

## record-adr

1. 确认存在真实决策和至少两个备选/取舍。
2. 如果尚未接受，状态必须是 Proposed。
3. 记录背景、驱动因素、选项、决定、影响、风险和证据。
4. 目标位置 `11_ADR`，编号在创建前读取现有 ADR 决定。
5. 不因助手建议而自动标记 Accepted。

## import-public-wiki

1. 解析用户提供的公开 Wiki 根 URL。
2. 用有效 user/bot identity 读取根节点和目录树。
3. 设置 max depth、max nodes、请求间隔和断点记录。
4. 按 obj_type 路由；docx 抓取 Markdown，sheet/bitable 缺 scope 时记录限制。
5. 默认生成本地镜像、元数据、目录树和索引；不自动复制到自己的飞书。
6. Agent 分析来源可信度、版权、相关性和重复项。
7. 用户明确选择具体知识后，才生成自己的总结/引用型 Knowledge Item。

## rebuild-index

1. 获取目录树和页面元数据。
2. 运行 `build_index.mjs`。
3. 校验 token 唯一性、缺失正文、更新时间和类型。
4. 将索引保存在本地工程资产；需要飞书副本时单独确认。

## build-learning-path

1. 询问学习者现状、目标、时间、期限和成果形式。
2. 索引检索相关材料，区分必修/选修/过期。
3. 设计按天/周的递进路径：学习 → 实践 → 检验。
4. 优先提供预生成通用路径；只有个性化需求才进行深度检索和生成，以节省 token。
5. 每步包含材料来源、任务、验收和预计时间。
