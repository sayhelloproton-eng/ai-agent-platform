---
docId: TASK-DOC-03-04
title: 任务与编排领域｜存储、Git 与 Task Document
docType: persistence
authority: normative
lifecycle: frozen
domain: task-orchestration
subdomain: null
subdomains:
- node-workflow
- task-documents
provides: []
requires: []
contractRefs: []
---

# 任务与编排领域｜存储、Git 与 Task Document

---

# 1. 统一仓库模型

不区分“用户模式 / 开发者模式”两套架构。

统一：

> **目标 Git 仓库是平台部署与工作的根。**

当前实际源码仓库：

```text
/Users/agent/Desktop/ai-agent-platform
```

这是当前开发位置事实，不形成特殊领域语义。

平台可以迭代一个产品、多个产品、多个模块或平台自己；产品数量与 Task Domain 目录模型无关。

---

# 2. 根目录职责

目标仓库根主要承担：

```text
1. package.json / lockfile 声明平台 npm 部署依赖
2. 保存被平台迭代产生 / 修改的真实产品产物
```

平台自己的工作数据统一进入：

```text
.ai-agent-platform/**
```

原则：除必要的 npm manifest / lock 与真实产品产物，平台自身不应在目标根目录散落新的专有工作目录。

---

# 3. .ai-agent-platform

`.ai-agent-platform/` 是平台唯一专有工作目录命名空间。

Task Domain 的平台工作数据包括 Task Markdown、Task SQLite、Task logs、Task temp/cache、Task domain config（若属于平台运行配置）。具体子目录最终由实现 / Deployment Contract 固化，但必须位于该命名空间。

---

# 4. Git tracked 与 gitignored

`.ai-agent-platform` 不能整体忽略，因为里面既有正式 Markdown 工作产物，也有运行时数据库。

Git tracked：Requirement / PRD / Technical Design / Test Plan / Test Result / Release Result 等 Task Markdown。

Git ignored：SQLite db、WAL / SHM、lock、cache、tmp、默认 logs、可重建索引。

---

# 5. 数据职责

一句话：

> **Git / Markdown 管任务正文历史；SQLite 管机器状态与索引。**

SQLite 保存 taskId、TaskGroup、Task status/version、currentNodeId、nodeId、Node status/version/runNo、requiredRoleRef、workerRef、TaskDocument path/hash、Event、Message、Idempotency、Execution History metadata。

Markdown 保存 Requirement / PRD / Technical Design / Test Plan / Test Result / Release Result 等 Task-scoped 正文。

---

# 6. 为什么正文不进 SQLite

第一版正文天然适合 Markdown + Git diff + Git history + 人工审阅 + Agent 读取。

SQLite 只保存当前索引，不重复维护 DB TEXT copy + Markdown copy，避免正文双真源。

---

# 7. TaskDocument 逻辑模型

```text
taskId
documentType
sourceNodeId?
filePath
contentHash
updatedByRef
updatedAt
```

v1 同 taskId + documentType 一个当前文件；历史走 Git commit history。

---

# 8. documentType

第一版至少：

```text
REQUIREMENT
PRD
TECHNICAL_DESIGN
TEST_PLAN
TEST_RESULT
RELEASE_RESULT
```

Plan 使用逻辑类型，不写实际文件路径。

---

# 9. Node Context

Node 声明 inputDocuments / outputDocuments。Worker 调 `getNodeContext(taskId, nodeId)`；Task Service 查 Task / Node → 读取声明 → 查 task_documents → 组合小型 Task/Node facts + document metadata。正文按需通过 `getTaskDocument` 读取；Custom GPT Carrier 由 Gateway 适配为 File Bridge。

Worker 不自己扫描 `.ai-agent-platform`。

---

# 10. 写文档

Worker 调：

```text
putTaskDocument(taskId, nodeId, documentType, content)
```

不允许传绝对路径、`../` 等任意 target path。TaskDocumentService 自己映射安全相对路径。

---

# 11. Node 完成文档门禁

completeNode 前，对 Node.outputDocuments 中每种文档类型检查当前 TaskDocument 索引存在、实际文件存在、hash / index 合法。

否则返回 `NODE_OUTPUT_MISSING` 或 `DOCUMENT_INDEX_MISMATCH`。

---

# 12. Git 历史

第一版不建立 TaskDocumentVersion table / Artifact revision service / Versioned blob store。

未来只有 API 真正需要读取历史文档版本、跨 Task 对比、Knowledge retrieval 时再扩展。

---

# 13. .codegraph

第三方 CodeGraph 的 `.codegraph/codegraph.db` 属于代码知识图谱可重建索引，可以帮助研发 Agent 查询代码结构，但绝不能保存 taskId / Task status / Node status / Task Event / Task Document truth。

CodeGraph 不是 Task Domain 真源。

---

# 14. CodeGraph 未来归属

若后续采用，更适合归入智能体运行与协作领域 / 研发工具能力；若未来采用 MCP，也只能是 future / non-v1 adapter/tool 形态。Task Domain 不直接依赖。

---

# 15. 当前 ai-agent-platform 自举

当前 `/Users/agent/Desktop/ai-agent-platform` 既是现阶段源码所在 Git 仓库，也是未来 Task Domain 完成后可以拿来真实 dogfooding 的目标仓库。

Phase 3 正式技术方案仍写入当前源码目录正常的 `docs/technical/技术方案/第三阶段/**`；Task Runtime 运行中产生的 Task-scoped working documents / state 遵循 `.ai-agent-platform/**`。

---

# 16. Custom GPT File Bridge 与 TaskDocument

File Bridge 只改变 TaskDocument 的 Carrier transport，不改变 Task ownership。

输入：

```text
Custom GPT file
→ openaiFileIdRefs
→ Gateway normalize
→ Execution bounded fetch/verify
→ canonical TaskDocument write
```

输出：

```text
getNodeContext 返回小型 Task/Node + document metadata
→ Gateway 按需读取 TaskDocument
→ openaiFileResponse
→ current Worker Conversation
```

约束：

- OpenAI file id 仅可记 provenance/externalRef；
- 5 分钟级 `download_link` 不进入 TaskDocument durable metadata；
- TaskDocument 的 path/hash/version 仍由 Task Domain 定义；
- Browser 不再承担大型 TaskDocument DOM 注入；
- 不新增 Task RAG/Vector DB/File Domain。

## 当前正式约束：Document / Artifact / Context 边界

- TaskDocument 是 Task 唯一业务文档真源；正文使用 Markdown/Git，结构化索引与状态使用 Task metadata。
- Execution 生成的 patch/stdout/download/screenshot 首先是 Execution output/artifact/evidence；只有通过 Task Public Contract 显式接收后才成为 TaskDocument。
- `getNodeContext` 只组合 Task 已拥有/引用的任务事实与文档，不升级为全平台 Context Aggregator。
- 大型输出优先传 `documentRef/outputRef/evidenceRef`；Custom GPT File Bridge 已作为 Carrier transport 吸收，但不改变 TaskDocument 真源。Conversation-native file search/Code Interpreter 使用效果仍由 Carrier E2E 验证。
