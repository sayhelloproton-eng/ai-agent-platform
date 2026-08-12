---
docId: DEPLOYMENT-DOC-03-04
title: 部署状态、目录、Secret 与安全
docType: persistence-security
authority: normative
lifecycle: frozen
domain: deployment-governance
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 部署状态、目录、Secret 与安全

## 1. Workspace 模型

统一工作区，不区分普通用户模式/开发者模式两套目录。

```text
product-repo/
├── package.json
├── package-lock.json
├── src/
├── docs/
├── tests/
└── .ai-agent-platform/
```

根目录承担：平台 npm 依赖声明 + 用户产品源码/业务文档/产品产物。

平台自身工作数据进入 `.ai-agent-platform`。

## 2. Deployment Layout

```text
.ai-agent-platform/
├── config/
├── data/
├── logs/
│   └── deployment/
├── runtime/
├── cache/
├── tmp/
└── deployment/
    ├── state.json
    ├── plans/
    ├── verification/
    └── generated/
        └── INSTALL.md
```

不要求把 logs 再嵌套一份到 deployment；统一日志根可以保持跨领域一致。

## 3. 不使用 SQLite

理由：

- 部署低频；
- apply v1 单 workspace 串行；
- 查询量小；
- 主要数据天然是 Plan/Record 文档；
- 使用原子文件写 + exclusive apply lock 足够。

未来只有出现真实并发、复杂查询、事务一致性需求再评估 SQLite。

## 4. `state.json`

保存：

- selected/current Module Set；
- last applied plan refs；
- install/config facts；
- verification index；
- observed metadata cache。

不保存：

- 伪造 current runtime READY；
- secret raw values；
- 大型 logs/evidence。

## 5. Secret

Deployment 不建 Vault Service。

只规定：

- Config 使用 `secretRef`；
- secret 原值写入 `.ai-agent-platform` 的受控位置或系统已有安全机制；
- 文件权限限制；
- CLI JSON/日志/Manifest 脱敏；
- Module 只能读取其明确配置槽位；
- 不把 token/password/cookie/private key 输出给 AI 日志。

## 6. Logs

记录 plan/apply/step/lifecycle/verify/doctor 关联：

```text
planRef
stepRef
moduleRef
moduleVersion
operation
status
errorCode
timestamps
summary/evidenceRef
```

不建设独立 Logging Domain。

---

## 当前正式约束：配置与 Secret

配置材料化统一进入 `.ai-agent-platform/config/`（第三方工具强制格式由对应 External Resource Module Adapter materialize）。raw secret 不进入 manifest/Public DTO/log/evidence/model context；Deployment 负责安全材料化，但 secret 的业务语义归使用领域。Deployment 不拥有其他领域 `.ai-agent-platform` 业务数据。
