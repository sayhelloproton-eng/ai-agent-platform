# 部署领域（Deployment Domain）

> 状态：DRAFT / REVIEW
> 领域类型：支撑领域（Supporting Domain）
> 本文描述 Phase 3 部署领域的领域定位、子领域、限界上下文、模块组成和统一部署协议。当前用于持续讨论和实现约束，尚未冻结。

---

# 1. 领域定位

部署领域属于 Phase 3 的**支撑领域（Supporting Domain）**，不是核心业务领域（Core Domain）。

部署领域不负责平台核心业务能力本身。

它解决的是：

> **平台的软件领域和模块，如何进入真实运行环境，并以统一、可验证、可组合的方式完成部署和接入。**

未来平台可能运行在不同设备和环境中：

```text
云端 / 中心节点
├── Task
├── Controller
└── Management

客户 Mac
├── Local Host
└── Browser Host

客户服务器
└── Enterprise Capability

手机
└── Inference Provider
```

这些运行环境天然存在：

```text
设备边界
网络边界
权限边界
运行环境边界
数据边界
```

因此，部署领域的存在不是为了把系统强行设计成微服务，而是为了让平台领域 / 模块能够独立安装、独立启动、独立升级、自动接入、统一发现、统一验证、统一组合，并原则上做到开箱即用。

---

# 2. Domain - 领域解决什么问题

部署领域的核心目标是：

> **让 ai-agent-platform 由一组可以独立安装、独立启动、独立升级、自动接入的平台领域 / 模块组成；用户可以逐步部署这些模块，每增加一个模块，平台就获得一组新的能力，并原则上做到开箱即用。**

核心架构：

```text
              INSTALL.md
                  │
                  ▼
                  AI
                  │
                  ▼
            Platform CLI
                  │
       固定部署协议
    （Deployment Protocol）
                  │
    ┌─────────────┼─────────────┐
    ▼             ▼             ▼
 Task npm       Local npm      Browser npm
    │             │             │
 same CLI       same CLI       same CLI
 verbs          verbs          verbs
    │             │             │
 自己 install    自己 install    自己 install
 自己 doctor     自己 doctor     自己 doctor
 自己 verify     自己 verify     自己 verify
```

其中：

```text
INSTALL.md
= AI + 人共同阅读的部署入口

AI
= 理解目标、规划步骤、调用能力、解释结果、与用户交互

Platform CLI
= 平台级统一部署入口和组合编排

模块 CLI
= 每个模块自己的部署子闭环

npm package
= 真正的软件交付物
```

核心原则：

> **智能在 AI，确定性在 CLI。**

AI 负责理解和调用。
CLI 承担确定性作用。
模块负责自身部署子闭环。

---

# 3. 核心交付产物

部署领域第一阶段形成三项核心交付物。

## 3.1 npm Packages

每个可部署模块本身就是一个独立 npm 产品。

例如：

```bash
npx @platform/local-host install
npx @platform/local-host start
npx @platform/local-host verify
npx @platform/local-host doctor
```

模块 CLI 使用第 10 章定义的统一部署协议（Deployment Protocol）。具体内部怎么完成环境检查、依赖检查、安装、配置、运行、自检和故障诊断，由模块自己闭环。

因此：

> **没有 Platform CLI，任何符合部署规范的模块仍然能够通过 `npx` 独立完成自己的部署。**

## 3.2 平台命令行（Platform CLI）

Platform CLI 是整个平台的统一部署入口。

它不替代模块自己的 CLI，也不重新实现各模块的内部部署逻辑。

它负责：

```text
发现模块
读取模块描述
读取版本
调用模块统一 CLI
组织部署顺序
整合结果
维护部署状态
维护版本信息
输出当前部署内容
```

例如：

```bash
platform preflight local-host
platform install local-host
platform configure local-host
platform start local-host
platform status local-host
platform verify local-host
platform doctor local-host
platform manifest local-host
```

Platform CLI 只理解统一协议，不理解模块内部细节。

## 3.3 `INSTALL.md`

`INSTALL.md` 是 AI + 人共同读取的部署入口。

它不是传统几十页安装手册，而是明确：

```text
部署目标
部署入口
AI 应调用哪些 CLI
哪些动作可自动执行
哪些动作需要人工确认
失败后怎么处理
什么才算部署成功
```

推荐交互关系：

```text
客户把 INSTALL.md 交给 AI
        ↓
AI 理解目标
        ↓
调用 Platform CLI
        ↓
Platform CLI 调用模块 CLI
        ↓
模块完成自身部署子闭环
        ↓
Platform CLI 汇总部署结果
        ↓
AI 向用户解释结果
```

---

# 4. Subdomain - 子领域

部署领域第一阶段拆为以下子领域。

## 4.1 模块规范（Module Specification）

解决：

```text
什么是平台可部署模块
模块如何声明身份
模块如何声明版本
模块如何声明依赖
模块如何声明运行要求
模块如何声明能力
模块必须提供哪些部署命令
如何保证所有模块长期保持一致
```

核心产物：

```text
module-contract
module-template
deployment-conformance
module-skill
```

核心约束关系：

```text
Module Contract / Schema
= 规则真源

Module Template
= 标准实现起点

Deployment Conformance / CI
= 强制所有模块长期符合规范

Module Skill
= AI 创建、升级模块的开发辅助
```

> **模板负责“长得一致”，Contract + Conformance + CI 负责“必须一致”。**

## 4.2 单模块部署（Standalone Module Deployment）

每个可部署模块拥有自己的完整部署子闭环：

```text
discover
    ↓
describe
    ↓
preflight
    ↓
install
    ↓
configure
    ↓
start
    ↓
verify
    ↓
READY
```

单模块生命周期及运维动作统一遵循第 10 章部署协议。

模块必须能够通过：

```bash
npx <module-package> <verb> --json
```

独立执行这些标准动作。

## 4.3 平台组合部署（Platform Composite Deployment）

Platform CLI 在多个模块之上提供统一入口。

例如：

```text
platform install browser-host
        ↓
调用 browser-host install

platform start browser-host
        ↓
调用 browser-host start

platform verify browser-host
        ↓
调用 browser-host verify
```

统一的是：

```text
命令名称
输入结构
输出结构
Error Code
状态语义
版本语义
```

不同的是：

```text
模块内部具体执行逻辑
```

因此 Platform CLI 与模块 CLI 的关系是：

```text
Platform CLI
        ↓
固定 Deployment Protocol
        ↓
模块统一 CLI
        ↓
模块自身实现
```

## 4.4 模块发现与版本管理（Module Discovery & Version Management）

第一阶段不建立复杂模块注册服务（Registry Service）。

平台模块通过 npm Scope / 私有域发现。

例如概念约定：

```text
npm scope:
@ai-agent-platform/*

package keyword:
ai-agent-platform-module
```

Platform CLI：

```text
npm 私有域 / Scope
        ↓
查找标记为 Platform Module 的 package
        ↓
读取 package / version
        ↓
读取 Module Contract
        ↓
获取模块 describe 信息
        ↓
形成可部署模块目录
```

例如：

```bash
platform available
```

可以形成：

```text
task-service       0.1.2
local-host         0.2.1
browser-host       0.3.0
mlxhub-provider    0.1.4
```

部署 CLI 至少维护：

```text
Available Version
= 当前可获取版本

Installed Version
= 当前实际安装版本

Version Verification Records
= 每个实际验证过版本的验证记录
```

例如：

```text
browser-host

available:
0.3.3

installed:
0.3.3

verificationRecords:

0.3.1
PASS

0.3.2
FAIL

0.3.3
PASS

status:
READY
```

部署系统保存的是**版本验证历史**，而不是只保留一个会被覆盖的 Verified Version。

当前模块是否 READY，可依据：

```text
当前 Installed Version
+
该版本有效 Verification Record
+
当前实际运行状态
```

综合判断。

## 4.5 AI 部署（AI Deployment）

AI 通过 `INSTALL.md` 理解部署目标。

然后优先调用 Platform CLI，而不是自行编写替代部署 Shell。

AI 的职责：

```text
理解目标
规划步骤
调用 CLI
读取结构化结果
解释结果
必要时请求人工确认
继续下一步
总结部署结果
```

CLI 承担确定性作用。

---

# 5. Bounded Context - 限界上下文

## 5.1 部署领域拥有

部署领域拥有：

```text
部署协议（Deployment Protocol）
模块契约（Module Contract）
固定 CLI Verbs
模块发现规则
Platform CLI
部署组合编排
版本记录
部署状态
Module Template
Deployment Conformance
部署错误分类
```

以及：

```text
Available Version
Installed Version
Version Verification Records
Deployment Status
```

## 5.2 各可部署领域 / 模块拥有自身部署实现

部署领域不预先假定未来具体有哪些业务领域，也不替其他领域设计其部署实现。

统一原则：

> **任何进入平台部署体系的可部署模块，都必须自己闭环完成与自身有关的部署行为。**

可能包括：

```text
运行环境检查
依赖检查
安装
配置
启动
停止
状态判断
真实验证
故障诊断
当前部署内容描述
```

模块可能需要检查：

```text
操作系统
Node.js
npm
端口
目录
文件权限
外部程序
网络
Provider
其他模块
```

但：

> **检查什么、怎么检查、怎么安装、怎么启动、如何证明自己可用，都由该模块自己决定。**

部署领域只规定统一公共部署协议。

## 5.3 部署领域明确不拥有

部署领域只负责：

> **模块如何被发现、部署、组合、验证和描述。**

### 发现（Discovery）

通过统一模块规范识别：

```text
哪些 npm package 属于平台可部署模块
模块身份是什么
版本是什么
依赖是什么
提供什么能力
```

第一阶段主要依据：

```text
平台 npm Scope / 私有域
+
Platform Module 标记
+
Module Contract
```

### 部署（Deployment）

部署领域定义统一：

```text
preflight
install
configure
start
stop
```

模块实现具体动作。

### 组合（Composition）

Platform CLI 根据统一 Contract：

```text
发现模块
→ 判断依赖
→ 调用统一模块 CLI
→ 组织部署顺序
→ 汇总结果
```

Platform CLI 不进入模块内部实现。

### 验证（Verification）

部署领域定义：

```text
verify
Version Verification Record
Deployment Status
READY
```

模块负责提供真实 verify 结果。

Platform CLI 负责统一记录和汇总。

### 描述（Description）

模块通过统一的 `describe`、`status` 等标准动作提供机器可读事实；Platform CLI 再整合模块事实、部署记录和版本验证记录，通过 `platform manifest` 输出当前部署内容。

因此，部署领域真正管理的是：

```text
Discovery
Deployment
Composition
Verification
Description
```

而不是各模块内部业务逻辑。

---

# 6. Module - 模块与实现优先级

部署领域内部模块按以下优先级实施。

## P0-1 `module-contract`

最高优先级。

后续所有可部署模块都依赖它。

负责：

```text
Module Contract 类型
固定 CLI Verbs
JSON Schema
输入 / 输出结构
Error Code
Version / Compatibility
Conformance Contract
```

没有 Contract，就没有统一模块规范。

## P0-2 `module-template`

在 Contract 基本稳定后建立。

负责：

```text
标准 npm package 结构
Module Contract
CLI entry
Deployment handlers
结构化 JSON 输出
tests
conformance 接入
```

目标：

> 新模块从创建第一天就遵循部署规范。

如果 Template 发生变化：

```text
module-template v0.1
        ↓
module-template v0.2
        ↓
Monorepo 中已有模块
        ↓
根据模板变化统一升级
        ↓
重新 Conformance
```

模板不能成为一次复制后永久失联的脚手架。

## P0-3 `deployment-conformance`

紧跟 Template 建立。

负责：

```text
Contract Schema 校验
CLI Verbs 校验
JSON 输出校验
Error Code 校验
Version Compatibility
Deployment Lifecycle 行为测试
```

进入：

```text
本地测试
CI
npm publish gate
```

形成：

> **Contract 定义规则，Template 默认遵守规则，Conformance 强制规则。**

## P0-4 `platform-cli`

前三项形成最小规范以后，实现 Platform CLI。

第一阶段主要能力：

```text
platform available
platform preflight [module]
platform install [module]
platform configure [module]
platform start [module]
platform status [module]
platform verify [module]
platform doctor [module]
platform manifest [module]
```

它负责：

```text
发现
调用
组合
状态记录
版本记录
结果汇总
```

## P1 `module-skill`

在 Contract、Template、Conformance 已经真实可用后实现。

负责：

```text
AI 创建模块
AI 更新 Module Contract
AI 创建标准 CLI
AI 接入 Conformance
Template 升级后辅助批量迁移模块
```

Skill 不应该早于底层规范出现。

实现顺序：

```text
P0-1 module-contract
        ↓
P0-2 module-template
        ↓
P0-3 deployment-conformance
        ↓
P0-4 platform-cli
        ↓
真实模块验证
        ↓
P1 module-skill
```

---

# 7. npm Package 命名规则

本文中的：

```text
@scope/module-contract
@platform/local-host
```

都只是概念示例，不是最终 package 名称。

最终 npm package 命名规则应由平台公共规范统一定义。

当前逻辑要求至少能表达：

```text
平台私有域
→ 领域
→ 模块
```

概念层级：

```text
平台私有域
└── deployment
    ├── module-contract
    ├── module-template
    ├── deployment-conformance
    └── platform-cli
```

因此最终 package 名称至少应该能够明确识别：

```text
属于哪个平台
属于哪个领域
属于哪个模块
```

实际 npm Scope、层级映射方式和命名格式不在部署领域自行冻结。

部署领域只提出约束：

1. 能识别 package 所属平台；
2. 能识别所属领域；
3. 能识别具体模块；
4. npm Registry 可以据此发现 Platform Module；
5. 各领域不能自行发明不一致的 package 命名规则。

后续由平台公共规范统一确定最终命名。

---

# 8. Module Contract - 模块机器可读自描述

真正关键的规范是：

> **每个可部署领域 / 模块必须提供机器可读的 Module Contract。**

它至少描述：

```text
module identity
module version
contract version
platform compatibility
runtime requirements
module dependencies
provided capabilities
deployment interface
configuration contract
```

例如模块可以通过：

```bash
npx <module-package> describe --json
```

返回：

```json
{
  "module": "browser-host",
  "version": "0.3.0",
  "contractVersion": "0.1",
  "dependencies": [],
  "requirements": {},
  "capabilities": []
}
```

字段当前不冻结。

这里确定的是：

> **模块必须能够机器可读地描述自己。**

---

# 9. 静态描述与动态自检

不是所有信息都放进 Module Contract。

## 静态信息

适合 Module Contract：

```text
Node 版本要求
支持 OS
平台版本兼容
模块依赖
Capabilities
配置要求
```

## 动态信息

由模块自己的 CLI 执行：

```text
端口是否被占用
目录是否可写
外部程序是否存在
Provider 是否在线
依赖服务是否 READY
模块自身是否真实健康
```

因此：

> **部署 CLI 不实现模块检查；部署 CLI 调用模块自己的检查能力。**

---

# 10. 统一部署协议（Deployment Protocol）

CLI Verbs 是平台固定的。

模块不应该无限增加只有自己理解的部署命令，再要求 Platform CLI 学习。

统一协议：

```text
describe
preflight
install
configure
start
stop
status
verify
doctor
```

`manifest` 不属于单模块必须实现的统一 Verb。它是 Platform CLI 对各模块事实、部署记录和版本验证记录的聚合输出能力。

形成：

```text
固定动作
×
不同模块
```

例如：

```text
platform verify local-host
platform verify browser-host
platform verify another-module
```

对应：

```text
local-host verify
browser-host verify
another-module verify
```

Platform CLI 只理解 `verify` 的统一语义。

具体怎么 verify，由模块自己决定。

---

# 11. 结构化输出

所有模块 CLI 应支持：

```bash
--json
```

概念结果：

```json
{
  "status": "BLOCKED",
  "checks": [
    {
      "id": "node.version",
      "status": "PASS"
    },
    {
      "id": "runtime.requirement",
      "status": "FAIL"
    }
  ]
}
```

要求：

```text
机器可读 JSON
稳定 Error Code
明确 Status
明确 Version
```

AI 不需要解析自然语言猜测部署结果。

这样即使模型能力一般，也能沿固定协议可靠执行。

---

# 12. 当前部署内容（Manifest）

`platform manifest` 用于提供当前部署内容的机器可读视图。

例如：

```bash
platform manifest
```

可以描述：

```text
当前安装了哪些模块
各模块当前版本
各版本 Verification Records
各模块当前状态
当前提供哪些能力
模块之间哪些依赖已经满足
```

Manifest 不是用户手工维护的静态配置文件。

它由 Platform CLI 根据真实部署状态生成。

关系：

```text
Platform CLI 内部部署状态
        │
        ├── Installed Version
        ├── Version Verification Records
        ├── Deployment Status
        ├── Modules
        └── Capabilities
                │
                ▼
         platform manifest
                │
                ▼
          当前部署内容
```

未来如企业审计、迁移或自动化需要，可以进一步导出：

```text
deployment-manifest.json
```

但它应是 Platform CLI 真实状态的机器可读输出，而不是人工维护的第二套真源。

---

# 13. 核心设计原则

> **部署是支撑领域，不承担其他领域业务。**

> **npm package 是真正的软件交付物。**

> **每个模块必须能够通过 `npx` 独立部署。**

> **模块 CLI 形成自己的部署子闭环。**

> **Platform CLI 是统一整合入口，不重新实现模块部署逻辑。**

> **CLI Verbs 是平台固定的，模块实现 Verbs 背后的逻辑。**

> **Module Contract 是模块机器可读的自描述协议。**

> **Template 负责长得一致；Contract + Conformance + CI 负责必须一致。**

> **AI 负责理解和调用，CLI 承担确定性作用。**

> **结构化 JSON + 稳定 Error Code，降低对模型智能程度的依赖。**

> **Platform CLI 必须记录模块真实版本和每个版本的验证记录。**

> **`platform manifest` 提供当前真实部署内容。**

> **用户可以逐步部署模块，每增加一个模块，平台获得一组新的能力，并原则上做到开箱即用。**
