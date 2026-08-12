---
docId: AGENT-DOC-04-00
title: 智能体运行与协作领域｜Agent Package 与 Custom GPT Carrier 规范
docType: module-design
authority: normative
lifecycle: frozen
domain: agent-runtime-collaboration
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 智能体运行与协作领域｜Agent Package 与 Custom GPT Carrier 规范

> v1 目标：让用户通过 npm 包 + CLI 指引，快速、机械地在 ChatGPT Web 创建三个 Custom GPT，并把真实角色注册到平台。当前没有依赖任何 Custom GPT 管理 API 自动创建/更新 GPT。

---

# 1. Agent Package 定位

Agent Package 不是“Prompt 文件夹”，也不是运行时 Worker。

它是：

> **Agent 的可版本化定义 + Custom GPT 配置材料 + Carrier setup CLI + Role 本地注册工具。**

第一版实际 Carrier：

```text
custom-gpt
```

未来允许增加：

```text
opencode
codex
claude-code
self-hosted
```

但这些不是 v1 实现范围。

---

# 2. package.json 是 Agent manifest 真源

v1 **不创建 `agent.manifest.json`**。

Agent manifest 信息放入 npm `package.json` 的平台命名字段中，避免重复真源。

示意（字段名最终需服从部署领域 Module Contract，不把本例当作公共 Schema 冻结）：

```json
{
  "name": "<agent-package-id>",
  "version": "1.0.0",
  "description": "总控、项目管理与研发角色",
  "aiAgentPlatform": {
    "kind": "agent-package",
    "agent": {
      "displayName": "总控 = 项目管理 + 研发",
      "conversationStarters": [
        "查看我当前可以处理的任务"
      ],
      "instructions": "# 角色职责\n...Markdown...",
      "carrierProfiles": {
        "custom-gpt": {
          "recommendedModel": "<configured-model-or-null>",
          "capabilities": {
            "webSearch": true,
            "imageGeneration": false,
            "codeInterpreter": true
          },
          "requirements": {
            "actions": "required",
            "fileBridge": "required",
            "apps": "disabled"
          },
          "knowledgeFiles": [
            "context/fixed-context.md",
            "memory/memory.md"
          ],
          "actionSchema": "actions/custom-gpt.openapi.yaml"
        }
      }
    }
  }
}
```

确认语义：

- GPT 名称/展示名称：来自 package.json Agent 字段；
- GPT 描述：来自 package.json；
- 对话开场白：来自 package.json；
- Instructions：Markdown 字符串，来自 package.json；
- 不再额外建立 `instructions.md`；
- 不再额外建立 Agent manifest 文件。

---

# 3. 长期资料文件

v1 明确分开：

```text
context/fixed-context.md
memory/memory.md
knowledge/*
```

## fixed-context.md

保存：

- 平台架构长期背景；
- 角色长期职责解释；
- 稳定边界；
- 长期 Knowledge 语义。

## memory.md

保存：

- 角色长期经验；
- 约定；
- 操作习惯；
- 不属于 Task 的长期知识。

## knowledge/

保存适合长期复用的静态 Knowledge 材料。

Custom GPT 没有独立“fixed context / memory”槽位；Custom GPT Carrier setup 把上述适合作为长期 Knowledge 的文件手工上传。

行为规则、必须遵循的流程与边界必须放 Instructions，不依赖 Knowledge 作为行为控制。

Task Requirement / PRD / Technical Design / Test Result 等动态正文**禁止**进入 Agent Package 永久 Knowledge。

---

# 4. Custom GPT Action Schema

## 4.1 v1 决策：静态写死

第一版不实现：

```text
Capability Catalog
Capability Discovery
Schema Composer
动态 Action 裁剪
按工作区实时组合 OpenAPI
```

每个 Agent Package 直接自带一份固定 Schema：

```text
actions/custom-gpt.openapi.yaml
```

不同角色包可以拥有不同 Action 集合。

## 4.2 允许的部署态替换

静态 Schema 可以保留实例占位符 / setup 生成步骤来替换：

```text
Gateway / Dev Tunnel public URL
必要的版本前缀
```

认证 Key 不写入 OpenAPI 文本。

Action 路径、`operationId`、参数、响应、角色可见能力集合在 v1 随包版本固定。

## 4.3 Action 设计规则

避免：

```text
updateTask
updateNode
changeStatus
advanceTask
executeAnything
```

优先：

```text
getNodeContext
completeNode
waitNode
reopenNode
askPeer
replyPeer
readFile
getGitStatus
getTestResults
runCommand
```

模型负责选择意图，但服务端负责最终合法性。

---

## 4.4 OpenAI Carrier requirements 与静态 Schema 约束

`requirements` 是 Agent Package 对 Carrier 的部署要求，不新增 Capability Service。角色可以按职责声明：

```ts
interface CustomGptCarrierRequirements {
  actions: "required";
  fileBridge: "required" | "optional";
  codeInterpreter: "required" | "optional";
  webSearch: "required" | "optional";
  apps: "disabled";
}
```

推荐第一版：

```text
产品：Actions required；File Bridge required；Web Search required；Code Interpreter optional
总控/研发：Actions required；File Bridge required；Code Interpreter required；Web Search required
测试/运维：Actions required；File Bridge required；Code Interpreter required；Web Search optional
```

`recommendedModel` 只作为 setup hint。Role READY 依据 required capabilities + Actions/auth + 真实 E2E，不 pin 精确 ChatGPT model id。

每个 `actions/custom-gpt.openapi.yaml` operation 必须：

```text
operationId 稳定
参数窄且 typed
显式 x-openai-isConsequential
不依赖 Custom Headers
遵守 OpenAI description 长度限制
```

需要 Conversation 文件输入的 operation 才声明 `openaiFileIdRefs`；文件输出使用 response 的 `openaiFileResponse`，不把它设计成新的业务 Action。

Task 动态文档仍禁止上传到永久 Knowledge；应由当前 Worker Conversation 通过 Action/File Bridge 按需取得。

# 5. Custom GPT Web 创建字段映射

CLI 必须逐项对应真实 Web 配置：

| Web 配置 | Agent Package 真源 | 用户动作 |
|---|---|---|
| 名称 | package.json | 复制/粘贴 |
| 描述 | package.json | 复制/粘贴 |
| 对话开场白 | package.json | 复制/粘贴 |
| Instructions | package.json Markdown field | 复制/粘贴 |
| Knowledge | fixed-context / memory / knowledge files | 手工上传 |
| 推荐模型 | package.json carrier profile | 手工选择 |
| 功能开关 | package.json carrier profile | 手工勾选 |
| Actions Schema | static OpenAPI + current Gateway URL | 粘贴/导入 |
| Action Auth | role-scoped Bearer key | 注册 Role 后回 Web 填写 |
| File Bridge | OpenAPI `openaiFileIdRefs/openaiFileResponse` contract | Preview/E2E verify |
| Code Interpreter / Web Search | carrier profile requirements | 按角色要求启用 |
| Apps | `disabled`（v1 使用 Actions） | 不与 Actions 同时作为 P0 工具链 |

2026-08-11 当前外部平台事实基线：Custom GPT 创建/编辑通过 ChatGPT GPT editor 完成；Knowledge 是上传文件；Actions 使用 OpenAPI JSON/YAML，并支持 API key / Bearer 等认证。当前设计不依赖未公开的 GPT 管理 API。

---

# 6. CLI：用户快速创建向导

CLI 精确命名最终必须服从 Phase 3 Deployment Module Contract / package template；以下定义的是**业务命令语义**，实现不得丢失。

## 6.1 总向导

```bash
npx <agent-package> custom-gpt setup
```

按顺序输出：

```text
1. 名称
2. 描述
3. Instructions
4. 对话开场白
5. 要上传的 Knowledge 文件
6. 推荐模型
7. 功能开关
8. Action Schema
9. 提醒：先创建/保存 GPT，拿到真实 GPT URL
10. register-role
11. 生成 role-scoped Bearer Key
12. 回 Web 填 Key
13. validate-role
```

## 6.2 字段级命令

第一版建议提供等价能力：

```text
custom-gpt show-name
custom-gpt show-description
custom-gpt instructions
custom-gpt instructions --copy
custom-gpt starters
custom-gpt export-knowledge
custom-gpt recommended-model
custom-gpt capabilities
custom-gpt action-schema
custom-gpt action-schema --copy
custom-gpt action-auth-guide
```

## 6.3 Role 管理命令

```text
role register <gpt-url>
role show
role validate
role delete
role key show
role key rotate
```

确认：

- `registerRole` 不是 Gateway Public API；
- 注册只通过本地 CLI；
- `role delete` 是本地管理命令，不是 GPT Action；
- v1 没有 role update / replace；需要更换时 delete 后重新 register。

---

# 7. Role 注册后的两阶段认证流程

因为 Key 与真实 `roleRef` 绑定：

```text
先创建 GPT
→ 得到 g-id
→ role register
→ 生成 Role 专属 Bearer Key
→ 保存 .ai-agent-platform secure config
→ CLI 展示/复制 Key
→ 用户回 Custom GPT Web
→ Action Authentication = API Key / Bearer
→ 填 Key
→ validate
```

这意味着 `custom-gpt setup` 是一个**两阶段/三阶段手工向导**，必须清楚告诉用户何时回到 Web。

---

# 8. validate-role 能验证什么

由于 v1 不依赖 Custom GPT 管理 API，`validate-role` MUST NOT 假装能自动读取 GPT Web 内所有配置。

可以验证：

- 本地 package → role 一对一；
- roleRef / URL 解析合法；
- Role Registry 完整；
- role-scoped Key 存在；
- Gateway 可以识别该 Key；
- Action endpoint / health 可达；
- static OpenAPI 本地校验通过；
- package version 与 registry 记录一致/过期。

不能可靠自动验证（v1）：

- Web 中实际粘贴的 Instructions 是否完整；
- Knowledge 是否全部正确上传；
- 推荐模型是否被用户正确选择；
- Web 中 Action Schema 是否与本地完全一致。

因此 CLI 需要给人工 checklist。

---

# 9. Agent Package SemVer

三级版本规则确认：

## patch

- 文案修正；
- Instructions 非语义破坏性修正；
- 不改变角色职责 / API Contract。

## minor

- Knowledge 增补；
- 兼容性的 Action 增加；
- 能力增强但旧配置仍可使用。

## major

- 角色职责发生不兼容变化；
- Action Contract 不兼容变化；
- Carrier 配置出现不兼容变化。

升级 Agent Package 不创建新的“逻辑 Agent”，也不自动生成新 roleRef。

包升级后：

```text
CLI 检查 registry registeredPackageVersion
→ 提示 Web 配置需要同步的字段
→ 用户手工 Update GPT
→ 本地确认 registeredPackageVersion
```

---

# 10. 与 Deployment Domain 的关系

所有 Agent Domain 独立包都必须遵守平台统一 Package Lifecycle Protocol，同时**包自己负责自身部署闭环**。

Agent Package 自己应引导/实现与自己有关的：

```text
setup
configure
Custom GPT Web 创建材料
Knowledge upload checklist
Action Schema/Auth 配置
role register/show/validate/delete
role key show/rotate
status/verify/doctor
```

总 Deployment：

```text
发现 package capabilities
→ 按依赖顺序编排
→ 透传调用 package 自己的标准 lifecycle commands
→ 汇总整体状态/验证
```

**不由 Platform Deployment Planner/Executor 重新实现每个包的账号、登录、Carrier 创建、Role 绑定细节。**

Module 声明 requirements/config/lifecycle primitives；Deployment Planner 负责实例级 dependency graph、plan/apply 与 ACTION_REQUIRED resume。

最终 `package.json` lifecycle descriptor、bin/exports、structured output 仍必须由 Deployment Domain 统一 Contract 冻结。
