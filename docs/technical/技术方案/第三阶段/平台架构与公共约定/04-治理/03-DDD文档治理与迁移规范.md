---
docId: PHASE3-DDD-DOC-GOVERNANCE
title: Phase 3 DDD 文档治理与迁移规范
docType: documentation-governance
authority: normative
lifecycle: frozen
domain: platform
canonicalFor:
- phase3.documentation.governance
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# Phase 3 DDD 文档治理与迁移规范

> 状态：FROZEN  
> 目标：为 Phase 3 大型 AI Agent Platform 固定一套同时适合**人阅读、AI/Codex 渐进加载、真实工程实施、长期演进和自动一致性检查**的技术文档体系。  
> 本规范定义当前文档结构、Source of Truth、机器元数据和未来结构调整规则；**任何文档治理都不得重新设计五领域架构、降低有效信息密度或让过渡材料进入最终 normative baseline**。

## 0. 最高约束

### C-01 — DDD 是知识主骨架

```text
Platform / Phase
  → Domain
    → Subdomain
      → Bounded Context
        → Module
          → Package / Service / Process / Deployment Unit
```

- Domain / Subdomain / Bounded Context 表达业务语义与模型边界。
- Module 是平台正式治理与实现能力单元。
- Package / Service / Process / Deployment Unit 是工程实现与运行形态。
- 不得把文件夹、npm package、数据库 schema、Service 自动等同为 Bounded Context。
- `Package != Module != Service != Process != Deployment Unit`。

### C-02 — 文档结构与系统结构必须可追踪

任何重要设计最终都应能追踪：

```text
Domain Rule
→ Bounded Context
→ Module
→ Public Contract
→ Package / Service
→ Runtime / Persistence / Config
→ Test
→ Evidence
→ TODO
```

反向也成立：任何正式 Module、Service、Public Contract、持久化事实，都必须能找到 Domain / Bounded Context Owner。

### C-03 — 领域文档说清“系统是什么”，技术方案说清“系统怎么落地”

领域层必须覆盖：Why、Own/Does Not Own、Ubiquitous Language、Domain Model、Boundary、Invariant、Public Contract、Context Map。  
技术层必须覆盖：Module/Package、数据流、Runtime、Persistence、Concurrency、Idempotency、Config、Failure/Recovery、Security、Test/E2E/Evidence、TODO。

### C-04 — 一条正式事实只有一个 Normative Home

Public DTO/schema、状态机、error code、Provides/Requires、Module Registry、config schema、ownership、lifecycle、version compatibility、idempotency rule 禁止在多个文档中维护独立正式副本。其他文档只能引用或做场景解释。

### C-05 — 有效信息密度不可降低

任何结构调整都不是 clean-room rewrite。以下内容不得因格式化、归位或去重被摘要掉：Why/Why-not、边界、不变量、设计动机、失败记录、Spike 结果、性能/稳定性数据、API/DTO/error 细节、并发/幂等、Recovery、Rejected alternatives、环境/部署限制、真实测试、Known limitation。

### C-06 — 不允许无记录删除

任何被结构调整的文档，其每个有意义 Section 都必须在工作区建立可验证映射。Disposition 只能是：

`KEEP / MOVE / MERGE / DEDUPLICATE / CORRECT / DEPRECATE / HISTORICAL`

不存在无理由 DELETE。

### C-07 — 人与机器双读者

Markdown 正文服务人；YAML frontmatter 服务机器导航。AI 按 progressive disclosure：先索引，再 Domain，再 Context，再 Module，再 Contract/TODO；禁止每个任务全量加载整个 Phase 3。

### C-08 — 文档必须可实施、可验证

正式技术方案如果答不上“谁实现、在哪个 package、通过什么 contract、依赖什么、配置是什么、失败怎么办、如何恢复、怎么测试、什么证据算 PASS、TODO 是什么”，则不具备 Implementation Ready 条件。

---

# 1. 方法栈与职责

| 方法 | 本项目职责 | 明确禁止 |
|---|---|---|
| DDD Strategic Design | Domain/Subdomain/BC/Ubiquitous Language/Context Map/Ownership | 不把 package/folder 当 BC；不借 DDD 重做已冻结业务 |
| arc42 | 检查约束、Building Blocks、Runtime、Deployment、Cross-cutting、Quality、Risk 是否完整 | 不取代 DDD 目录树 |
| Diátaxis | 判断 Explanation / Reference / How-to / Tutorial 的文档目的 | 不用四象限替代 Domain 树 |
| C4 | 必要的 Context/Container/Component/Dynamic/Deployment 视图 | 图不是真源，不强制每层都画 |
| Spec-Driven Development | Design → Tasks → Implement → Verify 追踪 | 不重新定义 Domain/Contract |
| Agent Skills progressive disclosure | AI 先 metadata，再按需读取正文/resources | 不做超级上下文文件 |
| Docs-as-Code | diff、link/schema/metadata/drift 自动检查 | 先治理语义，后治理格式 |

---

# 2. 文档 Authority 与 Lifecycle

每份文档必须区分两个维度。

## Authority
`normative / explanatory / operational / evidence / historical`

- normative：实施必须遵守的当前真源。
- explanatory：解释 Why、trade-off、例子，不独立定义 Contract。
- operational：安装、运行、诊断、恢复操作手册。
- evidence：测试、Spike、性能、审计事实。
- historical：只允许作为包外归档分类；**最终 Phase 3 normative baseline 内不得存在 historical 文档或历史资料目录**。

## Lifecycle
`draft / active / frozen / deprecated / superseded / archived`

Authority 与 Lifecycle 不得混为“TODO/未决”。

---

# 3. Platform / Phase 层文档合同

Phase 3 根层必须覆盖以下逻辑职责；物理文件数可结合现有内容决定，避免无意义拆分：

1. Phase README / Index：五领域、阅读路径、状态。
2. Architecture / Domain Map：Ownership 与 Context Map 总览。
3. Runtime Topology：platform-host / gateway / execution / model / browser。
4. Cross-domain Contract Rules：ref/version/error/idempotency/validation。
5. Cross-domain Flows：create/approve/worker/wake/execute/evidence/complete 等主链。
6. Engineering Conventions：TS/package/import/schema/test 统一约束。
7. Test Strategy：Domain/Contract/Conformance/E2E/Fault/Stability。
8. Implementation Roadmap：阶段依赖与 Gate。
9. Known Limitations & Spikes：fallback 与 promotion condition。
10. ADR Index：真正跨域、不可逆的架构决策。

平台层禁止复制各 Domain 内部完整 DTO、DDL、状态机。

---

# 4. 每个 Domain 的标准文档合同

每个 Domain 必须完整回答下列职责。物理上可拆为独立文档，也可在小领域合并，但必须能稳定定位。

## D-00 README / Domain Index

- Purpose 摘要
- Owns / Does Not Own 摘要
- Subdomains / Bounded Contexts / Modules
- Public Contract 入口
- Provides / Requires 摘要
- Implementation Status
- 推荐阅读顺序
- Limitations / Spikes 入口

README 只导航，不复制完整设计。

## D-01 Domain Charter & Boundary

必须回答：Purpose、Business capability、Owns、Does Not Own、Inputs、Outputs、Boundary invariants、Cross-domain anti-corruption rules、Non-goals。

## D-02 Ubiquitous Language & Domain Model

核心概念至少声明：Name、Definition、Owner、Identity、Lifecycle、Relationships、Invariants、Forbidden interpretation。区分 Entity、Value Object、Business Fact、Ref、transient locator、非当前术语。

## D-03 Subdomain & Bounded Context Map

明确：Subdomain、BC model boundary、BC owns/does-not-own、upstream/downstream、同域/跨域 Context Map、ACL、Context→Module 映射。禁止“一个 package 一个 BC”的机械规则。

## D-04 Public Contract / Provides

领域唯一 Public Contract 索引，包含 Contract name/version、Commands、Queries、DTO/schema canonical source、Errors、Refs、Idempotency、expectedVersion、Compatibility、Provides。Markdown 解释语义，代码/schema 是 DTO 代码真源。

## D-05 Dependencies / Requires / Context Map

每个依赖必须写：Required capability、Provider domain、Allowed contract、Version/capability constraint、Why、Failure behavior、Forbidden dependency。禁止 direct DB read、deep import、internal repository access、transient locator 作为 durable ref。

## D-06 Key Business Flows & State Models

每个 Flow 至少：Trigger、Preconditions、Steps、Owner per step、State transition、External effects、Failure、Retry、Recovery、Evidence、Terminal condition；至少 Happy/Failure/Recovery 三视角。

## D-07 Data Ownership & Persistence

先写 Business Fact，再写存储。每个持久事实至少：Fact、Owner、SoT、Identity、Mutable、Version/Concurrency、Idempotency、Retention、Cross-domain ref rule、Persistence implementation。DDL 不能代替 Ownership。

## D-08 Module Registry

每个 Module 至少：moduleRef、Domain、Bounded Context、kind、purpose、Provides、Requires、packageRefs、serviceRefs、processRefs、deploymentUnitRefs、externalResourceRefs、engineering status。

## D-09 Quality, Security, Recovery & Acceptance

定义 correctness invariants、failure classification、retry safety、recovery、security boundary、observability、quality scenarios、Domain integration tests、required E2E、acceptance evidence、freeze gate。

## D-10 Deployment Requirements

Domain 只声明 requirements：required modules/resources、config slots、secretRef、lifecycle primitives、health/ready、verify、doctor、ACTION_REQUIRED、upgrade constraints。真正计划与物化归 Deployment Domain。

## D-11 Known Limitations / Spikes / Evolution

每项：ID、Type(KNOWN_LIMITATION/PENDING_SPIKE/FUTURE)、Status、Why、Fallback、Blocks P0、Validation、Promotion condition、Owner。Future/Spike 不得混入当前主链。

## D-12 TODO

Domain TODO 只放跨 BC、Domain Contract、Domain freeze、Domain-level test gate。具体编码任务下沉 Module TODO。

---

# 5. Bounded Context 文档合同

每个 BC 至少需要这些逻辑职责：

`README / MODEL / CONTRACT / FLOWS / TESTING / TODO`

条件职责：`PERSISTENCE / SECURITY-RECOVERY`

### BC README
contextRef、Parent Domain、Subdomain、Purpose、Owns、Does Not Own、Language Scope、Upstream、Downstream、Modules、Public surface。

### BC MODEL
本 Context 的实体、值对象、规则、不变量、状态，不复制整个 Domain Glossary。

### BC CONTRACT
Context 边界 Contract；若已在 Domain Public Contract 成为 canonical，只引用，不复制。

### BC FLOWS
内部用例和跨 Context 行为，包括 failure/recovery。

### BC TESTING
从 invariants / flows 派生 scenario、failure、recovery、concurrency、integration evidence。

### BC TODO
只记录 Context 级 work。

---

# 6. Module 文档合同

每个正式 Module 必须可被人或 Codex 独立理解和实施。最低信息面：

`README / TECHNICAL-DESIGN / CONTRACT / DEPENDENCIES / CONFIGURATION / RUNTIME(若适用) / SECURITY-AND-FAILURE(效应或外部边界必需) / TESTING / TODO`

小 Module 可合并物理文件，但 section 必须可定位。

### Module README
moduleRef、Domain、BC、moduleKind、Purpose、Implements、Provides、Requires、package/service/process/deployment mapping、entry points、engineering status。

### TECHNICAL-DESIGN
internal components、ports/adapters、control/data flow、algorithms、transaction boundaries、concurrency、idempotency、cache、external integration、failure boundary、implementation constraints。

### CONTRACT
指向代码 canonical source：TS interface、runtime schema、DTO、errors、contractVersion、compatibility、idempotency。

### DEPENDENCIES
每个 Requires 写 Allowed/Forbidden，禁止模糊“depends on platform”。

### CONFIGURATION
config key、type、owner、required/default、secretRef、validation、Deployment materialization、runtime reload semantics。

### RUNTIME
仅真实有 runtime behavior 的 Module：lifecycle、queue、concurrency、background activity、timeouts、transient state、dependency failure、restart。Library 不伪造 start/stop。

### SECURITY-AND-FAILURE
外部/Effectful Module：trust boundary、auth/authz、validation、secret、effect boundary、retry safety、uncertainty、rate limits、recovery。

### TESTING
映射 Unit / Domain Integration / Contract / Conformance / Real E2E / Fault / Stability。

### TODO
是 Codex 实施任务主真源，格式见第 10 节。

---

# 7. Service / Process / Deployment Unit 文档合同

只对真实存在的工程单元建立，不为形式完整伪造。

## Service
至少覆盖：SERVICE README、API、RUNTIME、STARTUP/SHUTDOWN、CONFIGURATION、HEALTH/READINESS、OBSERVABILITY、SECURITY、FAILURE/RECOVERY、TESTING、TODO。

## Process
若 Service 有独立 OS Process：processRef、entry point、command、ports、signals、transient state、crash/restart、logs、resource limits、dependencies。

## Deployment Unit
真实 lifecycle：artifact、process/resource、install/precheck、configure、start/stop(若真实支持)、status、verify、doctor、upgrade、ACTION_REQUIRED、logs、recovery。External Resource 不支持 start/stop 时禁止伪造。

---

# 8. External Resource Module 文档合同

例如 ChatGPT Carrier、Chrome Runtime、Dev Tunnel、Model Provider。至少回答：Capability Contract、平台能控制什么、只能观察什么、Config、Auth、Availability、Hard limits、Verify、Doctor、ACTION_REQUIRED、Failure/Fallback、Known limitations、Upgrade/change risk。

External Resource 本身不需要 npm package，但对应 Module/Adapter 进入 Module Governance。

---

# 9. npm Package 文档合同

Package README 保持薄：package name、moduleRef(s)、purpose、exports、entry points、scripts、build、typecheck、tests、Node/runtime compatibility、package deps、normative docs 链接。不得重新定义 Domain Model。

---

# 10. TODO / Spike / Engineering Status

## TODO 与 Spike 分离

- TODO：正确目标和做法已知，尚未实现。
- PENDING_SPIKE：关键假设尚未真实验证。

### Module TODO 机器可读格式

TODO 先区分“进入 backlog”与“已经可以自动施工”。未在真实仓库上下文中冻结 priority / dependsOn / exact scope 前，必须使用 `implementationReadiness: PLANNED`，不允许工具自行补全。

```yaml
id: EXE-BR-006
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: execution
  boundedContext: execution
  moduleRef: execution-browser-extension
sourceRefs:
  - EXECUTION-EXECUTION-BROWSER-EXTENSION-TECH-DESIGN
  - EXECUTION-DOC-03-03
qualityRefs:
  - EXECUTION-DOC-05-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: >
  实现 reload/reconnect Recovery Scan 与 effect_started reality reconciliation。
scope:
  allow:
    - packages/execution-browser-extension/**
  forbid:
    - 其他 Domain 的业务 Store/Repository
    - 其他领域内部实现的 deep import
acceptance:
  - ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

只有在真实实施编排已经确认 priority、dependsOn、scope、acceptance、verification 后，才允许改为 `implementationReadiness: READY_TO_IMPLEMENT`。

### Engineering Status

`DESIGNED / CONTRACT_FROZEN / READY_TO_IMPLEMENT / IMPLEMENTING / IMPLEMENTED / DOMAIN_TESTED / E2E_TESTED / FROZEN`

它不是业务状态机。

---

# 11. Frontmatter：机器导航最小合同

```yaml
---
docId: TASK-NODE-WORKFLOW
title: Task Node Workflow
docType: flow
authority: normative
lifecycle: frozen
domain: task-orchestration
subdomain: node-workflow
subdomains:
  - node-workflow
boundedContext: task-orchestration
moduleRef: task-orchestration
canonicalFor: []
provides: []
requires: []
contractRefs:
  - TASK-DOC-02-01
supersedes: []
supersededBy: []
---
```

规则：frontmatter 不复制正文；canonicalFor 用于机器发现 SoT；provides/requires 只放逻辑 capability ref；不放 secret / transient locator。

机器身份字段必须使用 canonical slug，禁止同一 Domain 同时出现中文名和 slug 两套 identity。`subdomain` 只在文档明确归属一个 Subdomain 时填写；跨多个 Subdomain 的文档用 `subdomain: null` + `subdomains: [...]`；没有正式 Subdomain 划分的 Domain 使用 `subdomain: null` + `subdomains: []`，不得为了填字段虚构 Subdomain。

`boundedContext` 只在文档内容位于该模型边界内时填写；Domain Charter 等 Domain 级文档允许为 `null`。`moduleRef` 只在 Module 级文档填写。

`DOCUMENT-METADATA-SCHEMA.json` 是 frontmatter 机器结构的 schema；`DOCUMENT-CONFORMANCE.json` 是当前基线的派生校验结果，不是第二业务真源。

根目录允许生成**派生** `DOCUMENT-INDEX.json`，但必须由 frontmatter 自动生成，不能成为第二真源。

---

# 12. 人与 AI 的阅读路径

## 人
`Phase README → Domain README → Charter → Model/Context Map → Key Flow → BC → Module → Contract/Testing/TODO`

## AI/Codex
`DOCUMENT-INDEX metadata → Domain Charter → relevant BC → Public Contract → target Module Design → TODO → Testing/Recovery → evidence only when needed`

---

# 13. C4 / Runtime 图规范

只画能降低歧义的图：Phase 用 System Context + Runtime Topology；Domain 用 Context Map/关键 flow；Service 按需 Component；跨域关键链用 Dynamic；Deployment 用 Deployment diagram。

每张图必须有 scope、abstraction level、关系名称、正式术语，并链接 canonical text。图不得成为唯一 Contract 真源。

---

# 14. 高密度文档迁移算法

## A. Freeze Before
发生大规模结构调整时，先对待调整集合生成临时 SOURCE-MANIFEST(path/SHA256/bytes/lines)，不原地覆盖。该 Manifest 仅属于工作区验证资产，**不得进入最终规范包**。

## B. Section Inventory
以 Markdown heading path 为默认结构调整校验单元：`<source path>#<heading path>`。每个 section 在临时工作区记录 authorityGuess、topic、domain、BC、module、fact candidates、disposition、target、reason。

## C. Build Target Knowledge Map
先建 Domain→Subdomain→BC→Module→engineering units，此阶段不搬正文。

## D. Canonical Fact Resolution
重复事实先找全部副本，再依据最新冻结真源选 canonical home；其他位置改为引用或解释。已失效内容不得继续混在最终规范包中；如确有保留价值，只能进入包外归档。

## E. Content Migration
严格顺序：

`KEEP/MOVE → MERGE exact duplicate → DEDUPLICATE redundant normative copy → CORRECT stale conflict → DEPRECATE old normative → HISTORICAL evidence → ADD only true gaps`

禁止先生成低密度摘要，再替换高密度有效正文。

## F. Traceability Audit
结构调整工作区必须能够生成：SOURCE-MANIFEST、SECTION-MAPPING、TARGET-DOC-MANIFEST、CANONICAL-FACT-INDEX、DEDUP-REPORT、DEPRECATED-REPORT、UNRESOLVED-REPORT、INFORMATION-PRESERVATION-REPORT。

这些只用于完成前的临时验证；验证通过后，最终规范包只保留当前 Source of Truth、导航索引、Module/External Resource Registry 和必要的当前发布清单，**不携带迁移审计、来源追踪、历史副本或残留引用**。

---

# 15. 信息保全硬门

### Mechanical
- source files 100% 入 manifest
- meaningful source sections 100% 有 disposition
- deleted/moved content 100% 可追踪
- 无 untracked deletion

### Semantic
以下高价值类型必须有目标归属：domain rule、boundary、invariant、public contract semantics、state model、recovery、failure lesson、test/performance result、deployment constraint、known limitation、rejected alternative。

### Canonicality
同一 normative fact 只有一个 canonical home；复制 DTO/state/error 不得留下独立版本；historical 不得用 current normative 语气。

### Human readability
从 Domain README 在合理跳数内可定位 owner、contract、flow、module、runtime、test、todo。

### AI readability
Module 任务通过 metadata 可精确加载 Domain Charter、BC、Contract、Module Design、TODO、Testing，无需全量加载语料。

---

# 16. 文档质量门禁

1. **DDD Integrity**：Domain/BC boundary、UL、Context Map 清楚，无 package==BC shortcut。
2. **Architecture Completeness**：用 arc42 lens 检查 goals、constraints、context/scope、building blocks、runtime、deployment、cross-cutting、decisions、quality、risks、glossary；不机械生成 12 文件。
3. **Engineering Traceability**：`rule → contract → module → task → test → evidence` 可追踪。
4. **No Semantic Loss**：section mapping + preservation report PASS。
5. **No Duplicate Normative Truth**：canonical fact scan PASS。
6. **Implementation Readiness**：READY_TO_IMPLEMENT Module 必须具备 scope、contract、dependencies、config、persistence、runtime、failure/recovery、security、tests、TODO。

---

# 17. Phase 3 五领域落地要求（不重新设计）

## Task & Orchestration
保持并映射：`@ai-agent-platform/task-orchestration`、`task-store-sqlite`、`task-migration-runner`；覆盖 Task/Plan/Node、TaskRoleBinding、TaskDocument、TaskMessage/Event、state、concurrency、idempotency、reopen、worker resolution、store、migration。

## Agent Runtime & Collaboration
清晰区分 Agent Runtime、Role Registry、Worker Identity、Collaboration Message Center、agent-gateway、Role Agent Packages、Custom GPT Carrier；完整覆盖 Actions/File Bridge/Carrier limits。

## Execution
映射 `execution-contracts`、`execution-runtime`、`execution-local`、`execution-browser-extension`；覆盖 Effect、Policy、Approval、Evidence、UNKNOWN、Local capabilities、Browser lifecycle/recovery。

## Model & Reasoning
保持 `2 packages / 1 runtime service / 6 internal modules`，区分 Inference Contract、ReasoningSpec、FAST/REASON/AUTO、Provider、Scheduler/serial lane、Validation/repair、Health/resource、Observability；不为文档整齐制造新 package/service。

## Deployment
保持五包：module-contract、module-template、deployment-conformance、platform-cli、module-skill；独立描述 External Resource Module。

---

# 18. 文档结构治理明确不做

- 不重新设计五领域
- 不改变已冻结 Ownership
- 不重写业务语义
- 不丢失败/测试/Spike/性能信息
- 不为了格式统一压缩正文
- 不新增第六 Domain
- 不为 DDD 形式制造伪 BC
- 不把每个 package 变 Service
- 不把每个 Module 变 Deployment Unit
- 不做全局 Markdown 美化
- 不把失效、过渡、来源追踪或历史材料放入最终规范包
- 不让 TODO 与 PENDING_SPIKE 混合

---

# 19. 最终规范包要求

最终 Phase 3 文档包必须只呈现**当前有效系统**：

- DDD 领域、Bounded Context、Module 与工程单元；
- 当前 Public Contract、流程、状态、持久化、配置、错误与恢复；
- 当前 Implementation Status、TODO、Known Limitation、PENDING_SPIKE 与 fallback；
- 面向机器的 `DOCUMENT-INDEX.json`、`MODULE-REGISTRY.json`、`EXTERNAL-RESOURCE-REGISTRY.json`；
- 必要的当前 Release Manifest。

最终包禁止包含：

```text
历史资料目录
参考资料目录
旧版本正文副本
来源文件映射
迁移审计报告
patch / alignment / before-after 说明
sourcePath / sourceSha / migrationDisposition 等 provenance 字段
```

---

# 20. Governance Freeze Criteria

本规范处于 FROZEN 状态。任何后续结构治理都必须继续满足：

1. DDD 层级；2. Domain/BC/Module/Service 文档合同；3. Authority/Lifecycle；4. frontmatter；5. TODO/Spike；6. Source-of-Truth；7. no-rewrite/no-semantic-loss；8. section-level traceability；9. 人/AI progressive reading；10. 临时验证资产不得进入最终规范包。

---

# 21. 方法论依据

- Eric Evans, DDD Reference: https://www.domainlanguage.com/ddd/reference/
- arc42: https://arc42.org/overview/ ; https://arc42.org/method/
- Diátaxis: https://diataxis.fr/
- C4 Model: https://c4model.com/
- GitHub Spec Kit: https://github.com/github/spec-kit
- Agent Skills Specification: https://agentskills.io/specification
- OpenAI Skills guidance: https://openai.com/academy/skills/

这些方法只提供方法论与检查维度；**Phase 3 当前 normative 文档、正式 Contract 与已冻结领域事实才是项目真源**。


## 11.1 机器元数据与 TODO 的证据约束

### Provides / Requires

`provides` / `requires` 只允许填写**已经在 canonical Public Contract 或 ModuleDescriptor 中冻结的、可版本化的 capability ref**。文档整理、索引生成器和 AI 不得根据模块名称、调用关系或自然语言自行发明 capability ID。

在 capability ID 尚未冻结时：

- `provides: []` / `requires: []` 是合法且优于猜测的状态；
- 使用 `contractRefs` 指向已存在的 canonical 文档；
- `MODULE-REGISTRY.json` 使用 `capabilityBindingStatus: NOT_FROZEN | PARTIAL_EXTERNAL_ONLY | FROZEN` 明确机器状态；
- Deployment dependency graph 只能消费 `FROZEN` capability binding，不能把 domain runtime call graph 当 package/startup dependency graph。

### TODO readiness

TODO 的业务目标可以先进入 backlog，但不能因为字段“填满”就假装可自动施工。

- `status`：任务是否属于当前 backlog；
- `implementationReadiness: PLANNED`：目标已存在，但 priority/dependency/order 尚未冻结；
- `implementationReadiness: READY_TO_IMPLEMENT`：只有在真实仓库上下文中已经确认 priority、dependsOn、scope、acceptance、verification 后才能进入；
- `priority: PENDING_DECISION`、`dependencyState: NOT_FROZEN` 是合法的诚实状态；
- 文档工具不得按任务编号自动串行生成 `dependsOn`，不得把全部任务机械标为 P0；
- `sourceRefs` / `qualityRefs` 必须指向已经存在的 `docId`，禁止伪造 source section。
- 若当前正式资料只能证明 TODO goal 与质量真源位置、但不足以冻结逐任务 acceptance/verification，则使用 `acceptance: [ACCEPTANCE_NOT_FROZEN]` 与 `verification: []`；这类任务必须继续保持 `implementationReadiness: PLANNED`。
