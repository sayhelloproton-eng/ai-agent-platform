---
docId: AGENT-DOC-03-01
title: 智能体运行与协作领域｜Role Registry 与认证
docType: identity-persistence
authority: normative
lifecycle: frozen
domain: agent-runtime-collaboration
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 智能体运行与协作领域｜Role Registry 与认证

---

# 1. Role Registry 的目的

Agent Package 发布时不知道用户最终在 ChatGPT Web 创建出的真实 Custom GPT `g-id`。

因此需要部署后本地映射：

```text
Agent Package
→ 用户按包引导创建 Custom GPT
→ 获得 real g-id / GPT URL
→ local role register
→ Role Registry
```

Role Registry 是：

> **当前工作区已注册真实 Agent Role 的 Agent Domain 真源。**

即使物理数据在 `.ai-agent-platform`，其业务 Owner 仍是 Agent Domain。

禁止其他模块通过通用 `readFile` 读取/解释该 Registry 绕过 Agent Public API。

---

# 2. v1 一包一 Role

```text
1 workspace
1 Agent Package
→ max 1 currently registered Role
```

固定三个：

```text
agent-product        → 一个产品 Role
agent-controller-dev → 一个总控+研发 Role
agent-test-ops       → 一个测试+运维 Role
```

不做：

```text
Role Pool
Role alias
multiple active Roles for same Agent Package
automatic failover
update/replace binding
```

需要换 GPT：

```text
delete-role
→ new/existing GPT prepared by user
→ register-role new g-id
```

---

# 3. RegisteredRole 数据

逻辑字段：

```text
agentPackageRef
registeredPackageVersion
roleRef              # v1 = real Custom GPT g-id
carrierType          # custom-gpt
carrierUrl           # fixed GPT role URL
registeredAt
```

v1 没有 `DELETED` / tombstone 状态。

名称、描述、对话开场白、Instructions 继续来自 Agent Package `package.json`，Role Registry 不复制第二份业务真源。

运行 API 可通过 `agentPackageRef` 投影当前已安装包的：

```text
displayName
description
packageVersion
```

`roleRef` 对 Task/Execution 等其他领域永远是 opaque string；只有 Custom GPT Carrier 适配器理解 g-id 结构。

---

# 4. Runtime Public API 只保留两个

```text
listRegisteredRoles()
getRegisteredRole(roleRef)
```

不暴露：

```text
registerRole
unregisterRole
updateRole
replaceRole
deleteRole
```

Role 创建/删除/凭据管理属于本机 package CLI 管理面，不是 GPT Action Runtime API。

---

# 5. listRegisteredRoles

产品 Worker 创建 Task 前调用。

概念返回：

```json
{
  "roles": [
    {
      "agentPackageRef": "@.../agent-product",
      "registeredPackageVersion": "1.2.3",
      "roleRef": "g-...",
      "carrierType": "custom-gpt",
      "carrierUrl": "https://chatgpt.com/g/g-...",
      "packageInfo": {
        "displayName": "运营 + 产品经理",
        "description": "..."
      }
    }
  ]
}
```

产品逻辑使用稳定 `agentPackageRef` 区分 product/dev/test，不使用用户可编辑 displayName 做业务键。

---

# 6. getRegisteredRole

Execution Runtime Browser Driver / Agent Runtime 需要把 Task 的 opaque `roleRef` 解析为当前 Carrier target 时通过 Agent Public Contract 使用。

概念返回：

```json
{
  "agentPackageRef": "@.../agent-controller-dev",
  "registeredPackageVersion": "1.0.0",
  "roleRef": "g-...",
  "carrierType": "custom-gpt",
  "carrierUrl": "https://chatgpt.com/g/g-...",
  "packageInfo": {
    "displayName": "总控 = 项目管理 + 研发",
    "description": "..."
  }
}
```

Browser Extension 不直接解析 `.ai-agent-platform` Registry 文件。

---

# 7. Role 注册与 Key 生成

本地 Agent Package CLI：

```text
role register <gpt-url>
```

必须机械完成：

```text
1. 解析/规范化真实 g-id
2. 校验当前 Agent Package 尚无注册 Role
3. 校验该 roleRef 未被其他 Agent Package 使用
4. 持久化 RegisteredRole
5. 立即生成 role-scoped Bearer/API Key
6. 安全保存 secret
7. 指引用户回 Custom GPT Web → Action Authentication 填写 Key
8. 提供 validate/verify
```

一个 Role 一个 Key。

Role Key 不属于 npm 静态材料。

---

# 8. Role Credential / Gateway 身份

Custom GPT Action：

```text
Authorization: Bearer <role-key>
```

Gateway：

```text
Bearer Key
→ Credential Store
→ authenticatedRoleRef
```

**不信任请求 body 自报 roleRef。**

对于 Task-scoped Action：

```text
authenticatedRoleRef
+ taskId
+ workerRef（业务需要时）
→ Task Public API / Task binding validation
```

至少防御：

- authenticated role 必须是 Task 参与者；
- workerRef 必须与 Task 中该 role 的绑定一致；
- Action 必须属于该 Agent Package 静态允许集合；
- Task/Node 自己的 version/state/actor rules 由 Task Domain 最终校验。

---

# 9. Secret Store v1

v1 采用 `.ai-agent-platform` 下的本地受限 secret 文件方案。

概念：

```text
.ai-agent-platform/
└── agent/
    └── secrets/
        ├── role-credentials.json
        └── local-platform-token
```

要求：

```text
OS 文件权限尽可能仅当前用户可读写
Git ignore
禁止进入日志
禁止进入 Knowledge
禁止普通 Registry API 返回明文
禁止错误对象泄露完整 Key
```

明文 Key 需要能够由用户本机管理命令在明确动作下重新查看/复制，以适应 Custom GPT Web 的人工认证配置。

---

# 10. rotate-role-key

v1 支持独立凭据轮换，不等同于 Role update。

```text
rotate-role-key <roleRef>
→ 校验 Role 存在
→ 生成 new Key
→ 原 Key revoke/replace
→ 本地 secret store 更新
→ roleRef 不变
→ Task 历史不变
→ CLI 引导用户回 GPT Web 更新 Action Authentication
→ validate
```

Key 泄露时不需要删除整个 Role。

---

# 11. Role 物理删除

第一版**只有物理删除**：

```text
no tombstone
no logical delete
no DELETED status
no delete/restore public API
```

本地：

```text
role delete
```

执行前必须：

```text
Agent package CLI/shell
→ Task Domain Public API
→ 查询是否存在非终态 Task 引用该 roleRef
```

若在用：

```text
ROLE_IN_USE
→ refuse delete
```

禁止通过直接查询 Task SQLite 完成这个判断。

允许删除时：

```text
physical delete Role Registry entry
+ physical delete/revoke corresponding Role secret
```

不调用 OpenAI 删除 GPT；用户是否删除 Custom GPT 是 ChatGPT Web 外部操作。

历史 Task 已保存的 opaque `roleRef` 继续存在，但 Agent Domain **不承诺**删除后仍能从 Registry 解析该历史 role metadata。

这正是物理删除语义；v1 不为了历史展示引入 tombstone。

---

# 12. Role 删除与历史 Task

终态 Task：

```text
Task 中旧 roleRef 保持原值
getRegisteredRole(oldRoleRef) → ROLE_NOT_FOUND（如果已经物理删除）
```

若历史审计必须展示当时的某些稳定业务信息，应由拥有该历史事实的领域在 Task 创建/执行时保存必要快照；不能依赖一个已被用户明确删除的当前 Role Registry。

---

# 13. Browser Extension 的身份不是 Role Key

Role Key 专用于：

```text
Custom GPT
→ public Gateway
```

Browser Extension 是本地平台组件：

```text
Browser Extension
→ Execution Runtime Browser protocol surface（通过 runtime/app layer 再走 Public Contract）
→ local-platform-token
```

两类身份必须分开，避免把平台组件伪装成某个 Agent Role。

---

## 当前正式约束：Auth / Secret / Browser credential

- 一个 Role 一个 Gateway Bearer/API key 的 v1 方向保持；Authentication 与 authorization/policy 分离。
- Browser Extension 使用独立 local-platform credential，不复用 Role Bearer。
- raw secret 只由 Deployment 安全材料化；Role Registry 不保存明文 secret，Public DTO/log/evidence/model context 不泄露 secret。
