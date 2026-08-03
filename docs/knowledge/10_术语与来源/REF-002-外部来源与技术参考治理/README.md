# REF-002 外部来源与技术参考治理

> 核心结论：来源治理不是积累链接，而是让每个外部 Claim 都能说明来源类型、核验日期、适用范围、时效风险和与仓库真实 Evidence 的关系；第三方项目被记录不等于已采用。

## 1. 文档定位

本文合并原“官方资料来源索引”和“开源项目与框架索引”，负责：

- 外部来源的分级和选择顺序；
- Source Reference 的最小记录字段；
- 产品事实、方法论和第三方项目的核验方式；
- 开源项目进入 PoC、依赖或架构前的采用门禁；
- 来源过期、冲突和影响分析。

本文不是全仓参考文献数据库，也不替代目标文档附近的具体来源引用。运行事实、代码、测试、Commit 和外部回执仍优先由对应资产与 `08_实验与复盘` 保存。

## 2. 来源类型与优先级

| 层级 | 来源 | 适用内容 | 使用边界 |
|---:|---|---|---|
| 1 | 真实运行、外部回执、Git、代码和测试 | 当前实现与实际行为 | 必须绑定环境、时间和 Commit |
| 2 | 官方产品文档、官方 API 文档和官方公告 | 产品能力、配置、限制、生命周期 | 记录核验日期，Preview 与稳定能力分开 |
| 3 | 官方源代码仓库、Release、许可证与安全公告 | 开源实现、版本、依赖和供应链 | 不能只看 README 或 Star 数 |
| 4 | 标准、原创方法论和权威基础资料 | DDD、架构原则、协议和工程方法 | 提供方法，不替代项目内的架构决策 |
| 5 | 高质量第三方分析、案例与对比 | 发现候选方案和风险 | 只作辅助，重要 Claim 需回到上层来源 |
| 6 | Demo、帖子、搜索摘要和未验证项目 | 探索线索 | 不直接进入 Canonical 事实 |

项目内部发生冲突时，使用以下顺序：

```text
真实调用与外部回执
  → 测试、代码和配置
  → 官方产品文档
  → 官方仓库、Release 和许可证
  → 正式架构、Registry 与 Context
  → 第三方资料和探索线索
```

架构目标和治理决策仍以 Project Owner、已接受 ADR、正式架构和 Context 为准；外部框架的设计不能反向成为项目事实。

## 3. Source Reference 最小字段

重要外部 Claim 应保存以下信息：

```text
source_id
source_type
publisher_or_owner
title
url_or_repository
verified_on
applicable_claims
product_or_version_scope
stability: stable | preview | experimental | unknown
accessed_by
notes
```

必要时增加：

- Release / Commit / Tag；
- License；
- Region、Plan、Client 或 Host；
- 摘要 Hash；
- Archive URL；
- 与实验或代码 Evidence 的关联。

不得把网页抓取时间当成内容发布日期，也不得把搜索摘要当作原始来源。

## 4. 外部事实核验工作流

```text
提出 Claim
  → 判断是否为外部、时效性或高风险事实
  → 选择最高可用层级来源
  → 记录 verified_on、适用产品和版本
  → 与真实环境、代码或实验结果比较
  → 标记 current / preview / historical / unknown
  → 写入目标文档附近
  → 发生变化时触发 Impact Analysis
```

以下情况必须重新核验：

- 套餐、配额、模型、客户端入口或区域可用性；
- API、认证、权限、Preview 或弃用状态；
- 开源项目版本、许可证、维护状态和安全公告；
- 外部服务价格、限制、资源生命周期和 SLA；
- 用户质疑、来源冲突或 Release 前复审。

## 5. 官方产品与平台来源入口

| 领域 | 首选入口 | 主要用途 |
|---|---|---|
| OpenAI / ChatGPT / Codex | [OpenAI Help Center](https://help.openai.com/)、[OpenAI API 文档](https://platform.openai.com/docs/) | GPTs、Projects、Memory、Actions、Codex、模型、Tools、MCP 与 API |
| Microsoft Dev Tunnels | [Microsoft Learn：Dev Tunnels](https://learn.microsoft.com/azure/developer/dev-tunnels/) | CLI、认证、隧道生命周期、限制和平台支持 |
| Cloudflare | [Cloudflare Developers](https://developers.cloudflare.com/) | Workers、Tunnel、Wrangler、安全和部署限制 |
| 飞书开放平台 | [Feishu Open Platform](https://open.feishu.cn/document/) | Wiki、Docx、Drive、OAuth、Block 和媒体上传 |
| GitHub | [GitHub Docs](https://docs.github.com/) | Git、Actions、Security、仓库和权限行为 |

使用规则：

- 产品页面只校准外部产品事实，不证明本仓库已经实现；
- 页面标题或导航变化时，以官方站点当前结构为准；
- 需要引用具体限制时，在目标文档记录具体页面和核验日期；
- 运行结果与官方声明不一致时，同时保留二者并记录环境差异。

## 6. DDD 与 Agent 工程方法来源

| 来源 | 主要用途 |
|---|---|
| [Eric Evans：DDD Reference](https://www.domainlanguage.com/ddd/reference/) | 统一语言、限界上下文、聚合与领域建模 |
| [Martin Fowler：Bounded Context](https://martinfowler.com/bliki/BoundedContext.html) | 模型边界和上下文关系 |
| [Martin Fowler：DDD Aggregate](https://martinfowler.com/bliki/DDD_Aggregate.html) | 聚合、一致性边界和不变量 |
| [Alistair Cockburn：Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/) | Port、Adapter 与外部依赖隔离 |
| [OpenAI：A practical guide to building agents](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/) | Agent 复杂度、Guardrail、工具和人工介入参考 |

这些资料提供方法和术语来源；本项目的 Bounded Context、状态所有权、Task Contract 和 Adapter 边界仍由 `03_方法论`、`04_平台架构` 和代码 Contract 决定。

## 7. 第三方与开源项目参考

| 项目 | 参考问题 | 当前项目关系 |
|---|---|---|
| [MCP-SuperAssistant](https://github.com/srbhptl39/MCP-SuperAssistant) | 浏览器与 MCP 桥接 | 调研参考，未集成 |
| [Usher](https://github.com/vietnamesekid/usher) | 多编码工具 MCP / Skill 配置同步 | 历史候选 Adapter，未验证、未采用 |
| [Backstage TechDocs](https://backstage.io/docs/features/techdocs/) | Docs-as-Code 与生成式发布 | 方法参考，未引入依赖 |
| [AgentLite](https://github.com/SalesforceAIResearch/AgentLite) | 轻量 Agent 研究 | 研究参考，未采用 |

项目当前以 Node.js 自建最小 Gateway / Runtime 和明确 Adapter 边界，不依赖上述项目，也不采用 LangGraph 等重型图编排作为 MVP 架构中心。

索引状态只表示“曾用于判断”，不表示：

- 已安装；
- 已通过安全审查；
- 已进入正式架构；
- 已承诺后续采用；
- 其宣传能力已被本项目验证。

## 8. 第三方采用门禁

第三方框架、库、Skill 或工具进入依赖前必须回答：

1. 它解决哪个当前真实问题？
2. 现有代码或更小实现为什么不足？
3. 是否引入新的真源、运行时或控制面？
4. Contract 与数据能否保持 Provider-neutral？
5. 许可证、Secret、权限和供应链风险如何？
6. 项目维护状态、Release 频率和安全公告如何？
7. Intel macOS、Node 20 和现有工具链是否兼容？
8. 如何退出、替换和迁移？
9. PoC 的 Acceptance、Evidence、成本和失败边界是什么？
10. 是否需要 ADR、Product Decision 或 Approval？

只有 PoC 和 Review 通过后，才能从“reference”进入“candidate”或真实依赖。

## 9. 来源冲突与过期处理

发现来源冲突时：

- 不静默选择更方便的版本；
- 记录来源、核验时间、产品版本和环境；
- 优先回读真实系统并复现实验；
- 将无法判断的内容标记为 `unknown`；
- 评估受影响的 CAP、ARC、AGT、WFL、EXP、PRT 和 Context；
- 必要时创建 Change Task，而不是只改本索引。

来源失效时，优先更新目标文档中的 Claim 和 Source Reference。本文件只在来源类别、治理规则或长期入口发生变化时更新。

## 10. 当前事实边界

- 外部资料不会直接成为 Git 当前实现事实；
- OpenAI、Microsoft、Cloudflare、Feishu、GitHub 和第三方项目的能力与限制可能变化；
- 当前尚无自动来源可用性、页面变更或过期检查；
- 当前尚无全仓结构化 Source Registry；重要来源仍由目标文档和本治理入口共同维护；
- 本文记录的第三方项目均不代表已经采用。

## 11. 关联资产

- [CAP-001 ChatGPT 生态体系与配置全景](../../02_基础产品与能力/CAP-001-ChatGPT生态体系与配置全景/README.md)
- [CAP-006 从 ChatGPT 到 Codex 的平台执行闭环](../../02_基础产品与能力/CAP-006-从ChatGPT到Codex的平台执行闭环/README.md)
- [DEC-001 架构决策演进摘要](../../00_项目入口/DEC-001-架构决策演进摘要.md)
- [EXP-005 Custom GPT Actions 链路实验](../../08_实验与复盘/EXP-005-Custom-GPT-Actions链路实验/README.md)
