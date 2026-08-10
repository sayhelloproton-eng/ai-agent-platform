# API、依赖与模块清单

> 状态：DRAFT / REVIEW  
> 本文是部署领域的实时架构仪表盘。  
> 只记录对外接口（Provides）、外部依赖（Requires）、模块清单（Module Registry）、模块优先级和实施状态（TODO）。  
> 领域设计和部署协议见 `README.md`；AI / 人工部署入口见 `INSTALL.md`。

---

# 1. 使用规则

Phase 3 后续每个领域都应维护：

```text
Provides
Requires
Module Registry
TODO / Status
```

目的：

> **打开一个领域，就能立即知道它提供什么、依赖什么、内部有哪些模块、哪些已完成、哪些未完成、当前优先级是什么。**

API 不等于 HTTP API。

以下都可以作为领域公开 API：

```text
CLI
Contract
Port
Event
Capability
Query
Result
```

领域之间只能依赖对方公开的 API / Contract / Port，不依赖对方内部实现。

---

# 2. 对外接口（Provides）

## 2.1 Platform CLI API

第一阶段涉及：

| API ID | 名称 | 类型 | Owner | 消费者 | 版本 | 状态 | 用途 |
|---|---|---|---|---|---|---|---|
| `deployment.platform.available` | 可部署模块查询 | CLI / Result | `platform-cli` | AI / Human / Automation | v0.1-draft | DESIGNING | 查询可部署模块、可获取版本和当前部署情况 |
| `deployment.platform.preflight` | 前置检查 | CLI / Result | `platform-cli` | AI / Human | v0.1-draft | DESIGNING | 调用模块统一 preflight 并汇总 |
| `deployment.platform.install` | 模块安装 | CLI / Result | `platform-cli` | AI / Human | v0.1-draft | DESIGNING | 调用模块统一 install |
| `deployment.platform.configure` | 模块配置 | CLI / Result | `platform-cli` | AI / Human | v0.1-draft | DESIGNING | 调用模块统一 configure |
| `deployment.platform.start` | 模块启动 | CLI / Result | `platform-cli` | AI / Human | v0.1-draft | DESIGNING | 调用模块统一 start，启动需要运行的模块 |
| `deployment.platform.status` | 部署状态 | CLI / Result | `platform-cli` | AI / Human / Management | v0.1-draft | DESIGNING | 返回模块当前部署状态 |
| `deployment.platform.verify` | 真实验证 | CLI / Result | `platform-cli` | AI / Human / Automation | v0.1-draft | DESIGNING | 调用模块 verify 并记录版本验证结果 |
| `deployment.platform.doctor` | 统一诊断 | CLI / Result | `platform-cli` | AI / Human | v0.1-draft | DESIGNING | 调用模块 doctor 并汇总诊断 |
| `deployment.platform.manifest` | 当前部署内容 | CLI / Result | `platform-cli` | AI / Human / Automation | v0.1-draft | DESIGNING | 输出当前真实部署内容 |

后续根据需要增加平台级：

```text
stop
upgrade
remove
export
```

---

## 2.2 Module Deployment API

所有可部署模块遵守统一协议：

| API ID | 类型 | Owner | 消费者 | 状态 | 语义 |
|---|---|---|---|---|---|
| `deployment.module.describe` | CLI / Result | 各可部署模块 | Platform CLI / AI | DESIGNING | 模块机器可读自描述 |
| `deployment.module.preflight` | CLI / Result | 各可部署模块 | Platform CLI / AI | DESIGNING | 真实环境和依赖检查 |
| `deployment.module.install` | CLI / Result | 各可部署模块 | Platform CLI / Human | DESIGNING | 模块自身安装 |
| `deployment.module.configure` | CLI / Result | 各可部署模块 | Platform CLI / Human | DESIGNING | 模块自身配置 |
| `deployment.module.start` | CLI / Result | 各可部署模块 | Platform CLI / Human | DESIGNING | 启动 |
| `deployment.module.stop` | CLI / Result | 各可部署模块 | Platform CLI / Human | DESIGNING | 停止 |
| `deployment.module.status` | CLI / Result | 各可部署模块 | Platform CLI / AI | DESIGNING | 当前真实状态 |
| `deployment.module.verify` | CLI / Result | 各可部署模块 | Platform CLI / AI | DESIGNING | 真实可用验证 |
| `deployment.module.doctor` | CLI / Result | 各可部署模块 | Platform CLI / AI | DESIGNING | 模块自身故障诊断 |

统一调用：

```bash
npx <module-package> <verb> --json
```

---

## 2.3 Module Contract API

由 `module-contract` 提供。

至少需要表达：

| 语义 | 用途 | 状态 |
|---|---|---|
| Module Identity | 模块身份 | DESIGNING |
| Package Identity | npm package 身份 | DESIGNING |
| Module Version | 模块版本 | DESIGNING |
| Contract Version | 部署协议版本 | DESIGNING |
| Platform Compatibility | 平台兼容范围 | DESIGNING |
| Runtime Requirements | 静态运行环境要求 | DESIGNING |
| Module Dependencies | 模块依赖 | DESIGNING |
| Provides | 模块对外能力 | DESIGNING |
| Supported Verbs | 支持的部署动作 | DESIGNING |
| Configuration Contract | 配置要求 | DESIGNING |

最终字段形式暂不冻结。

---

## 2.4 Deployment Status / Manifest API

部署领域统一暴露：

```text
availableVersion
installedVersion
verificationRecords
deploymentStatus
health
diagnostics
modules
capabilities
dependencies
```

核心规则：

> **版本验证记录按版本保留，不只保存最后一次 verify PASS 的版本。**

---

# 3. 外部依赖（Requires）

## 3.1 运行环境依赖

| Required | Provider | 使用者 | 必需性 | 状态 |
|---|---|---|---|---|
| Node.js | Runtime Environment | Platform CLI / Module CLI | REQUIRED | AVAILABLE |
| npm / npx | npm ecosystem | Platform CLI / Module CLI | REQUIRED | AVAILABLE |
| OS | Runtime Environment | Module CLI | REQUIRED | AVAILABLE |
| filesystem | OS | Platform CLI / Module CLI | REQUIRED | AVAILABLE |
| process execution | OS | Platform CLI | REQUIRED | AVAILABLE |
| network | Network | Platform CLI / Module CLI | CONDITIONAL | AVAILABLE |
| npm Registry / Scope | npm ecosystem | Platform CLI | REQUIRED FOR DISCOVERY | UNRESOLVED |

## 3.2 平台公共规范依赖

部署领域当前只登记，不提前冻结：

| Required | Provider | 使用者 | 状态 |
|---|---|---|---|
| npm Package 命名规则 | 平台公共规范 | 所有部署模块 | UNRESOLVED |
| 公共 Result / Error 语义 | 平台公共规范 / Commons | `module-contract` | UNRESOLVED |
| 公共 Version 基础语义 | 平台公共规范 / Commons | `module-contract` | UNRESOLVED |

其中 npm Package 命名逻辑需要至少表达：

```text
平台私有域
→ 领域
→ 模块
```

部署领域不自行冻结最终 npm Scope 和 package 名称。

---

# 4. 模块清单（Module Registry）

## 4.1 状态枚举

```text
TODO
DESIGNING
IMPLEMENTING
VERIFYING
DONE
BLOCKED
DEFERRED
```

## 4.2 实时模块仪表盘

| 优先级 | 模块 | 状态 | 当前版本 | Provides API | Requires API / Contract |
|---|---|---|---|---|---|
| P0-1 | `module-contract` | DESIGNING | `0.1.0-draft` | Module Contract、Verbs、Schema、Error、Version/Compatibility | 平台公共命名规范；未来公共基础类型 |
| P0-2 | `module-template` | TODO | — | 标准 npm 模块模板、CLI entry、部署 handlers | `module-contract` |
| P0-3 | `deployment-conformance` | TODO | — | Contract / CLI / JSON / Lifecycle Conformance | `module-contract` |
| P0-4 | `platform-cli` | TODO | — | `deployment.platform.*` | `module-contract`、npm/npx、`deployment.module.*` |
| P1 | `module-skill` | TODO | — | AI 创建 / 升级模块、模板迁移 | `module-template`、`module-contract`、`deployment-conformance` |

---

# 5. 模块详情

## P0-1 `module-contract`

### Provides

```text
Module Contract
Deployment Verb Definitions
JSON Schema
Input / Output Contract
Stable Error Code
Version / Compatibility Contract
Conformance Contract
```

### Requires

```text
平台公共 npm Package 命名规范
未来可能的公共 Result / Error / Version 基础类型
```

### 完成门

- [ ] Deployment Verbs v0.1
- [ ] Module Contract v0.1
- [ ] JSON Schema
- [ ] Input / Output Contract
- [ ] Error Code
- [ ] Version / Compatibility
- [ ] Provides / Requires 表达方式
- [ ] Conformance 基础测试

## P0-2 `module-template`

### Provides

```text
标准 npm package 结构
Module Contract
CLI entry
Deployment handlers
Structured JSON
Tests
Conformance integration
```

### Requires

```text
module-contract
```

### 完成门

- [ ] 模板目录
- [ ] package 结构
- [ ] CLI entry
- [ ] Contract
- [ ] Deployment handlers
- [ ] Tests
- [ ] Template Version
- [ ] 模板升级规则

## P0-3 `deployment-conformance`

### Provides

```text
Contract Schema Validation
Required Verb Validation
Structured JSON Validation
Error Code Validation
Version Compatibility Validation
Deployment Lifecycle Conformance
```

### Requires

```text
module-contract
```

### 完成门

- [ ] Contract validator
- [ ] CLI contract tests
- [ ] JSON Schema tests
- [ ] Error Code tests
- [ ] Version tests
- [ ] Lifecycle tests
- [ ] CI integration

## P0-4 `platform-cli`

### Provides

```text
platform available
platform preflight
platform install
platform configure
platform start
platform status
platform verify
platform doctor
platform manifest
```

### Requires

```text
module-contract
npm / npx
npm Registry / Scope
deployment.module.describe
deployment.module.preflight
deployment.module.install
deployment.module.configure
deployment.module.start
deployment.module.status
deployment.module.verify
deployment.module.doctor
```

### 必须维护

```text
Available Version
Installed Version
Version Verification Records
Deployment Status
当前 Modules
当前 Capabilities
当前 Dependencies
Platform CLI 自身版本
```

### 完成门

- [ ] npm Scope discovery
- [ ] Platform Module marker
- [ ] `available`
- [ ] `preflight`
- [ ] `install`
- [ ] `configure`
- [ ] `start`
- [ ] `status`
- [ ] `verify`
- [ ] `doctor`
- [ ] `manifest`
- [ ] 本机部署状态
- [ ] Version Verification Records
- [ ] Structured JSON
- [ ] Stable Error Code

## P1 `module-skill`

### Provides

```text
从最新 Module Template 创建模块
生成 / 更新 Module Contract
生成统一 CLI
接入 Conformance
模板升级后辅助迁移已有模块
```

### Requires

```text
module-template
module-contract
deployment-conformance
```

### 完成门

- [ ] Create Module
- [ ] Update Contract
- [ ] Generate CLI
- [ ] Add Conformance
- [ ] Template Migration

---

# 6. 实施 TODO

## P0

- [ ] Review 部署领域文档
- [ ] 确认 Deployment Protocol v0.1
- [ ] 完成 `module-contract`
- [ ] 完成 `module-template`
- [ ] 完成 `deployment-conformance`
- [ ] 完成 `platform-cli`
- [ ] 确认 npm Package 公共命名规范
- [ ] 定义结构化 Result / Error
- [ ] 定义版本验证记录模型
- [ ] 跑通 AI → Platform CLI → Module → verify → manifest

## P1

- [ ] 选择第一个简单模块验证独立 `npx`
- [ ] 选择第二个不同类型模块验证统一协议
- [ ] 验证 Platform CLI 组合部署
- [ ] 验证故障注入 + doctor
- [ ] 验证版本升级后保留历史 Verification Records
- [ ] 完成 `module-skill`

## P2

- [ ] Platform 顶层 `stop`
- [ ] `upgrade`
- [ ] `remove`
- [ ] `export`
- [ ] richer dependency resolution
- [ ] Management Console 接入
