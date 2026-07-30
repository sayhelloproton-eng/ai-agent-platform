# SOL-005: Custom GPT Actions 与 Gateway MVP 渐进式实施方案

> **状态：Superseded（历史方案）**
> 本文记录早期 Cloudflare Tunnel 路线。2026-07-30 起，Project Owner 已将当前 MVP 公网入口切换为 `Custom GPT → Microsoft Dev Tunnel → Action Gateway → Local Runtime`；当前命令与状态以 `apps/dev-tunnel/`、`context/current-status.md` 和 `skills/microsoft-dev-tunnels/` 为准。

## 一、任务目标

在现有 `ai-agent-platform` 仓库中，逐步建立并验证以下最小执行链路：

```text
用户
  ↓
Custom GPT
  ↓
GPT Action
  ↓
Cloudflare Tunnel
  ↓
Action Gateway
  ↓
Mac Local Runtime
  ↓
白名单 Capability
  ↓
结构化执行结果
```

本阶段的核心不是完成完整 Agent 平台，而是验证：

> ChatGPT 是否能够通过 Custom GPT Action，安全、稳定、可审计地调用 Mac 本地能力。

---

# 二、执行原则

## 2.1 一次只完成一个小任务

每个任务必须满足：

- 只解决一个明确问题；
- 修改文件数量尽量控制在 1～5 个；
- 不顺手重构无关代码；
- 不提前实现后续阶段；
- 不删除现有资产；
- 不修改未授权目录；
- 完成后立即停止；
- 等待审核后再进入下一步。

禁止给 DeepSeek 一次性下达：

```text
搭建完整 Gateway、Runtime、权限、部署和 Custom GPT Action。
```

应拆分为：

```text
先只检查仓库现状。
再只创建 workspace 根配置。
再只创建 contracts 包。
再只创建 Gateway 健康检查。
```

---

## 2.2 每一步必须可验证

每个任务必须提前定义：

1. 要做什么；
2. 不做什么；
3. 可以修改哪些文件；
4. 预期产物；
5. 自检命令；
6. 成功标准；
7. 失败时如何停止；
8. 反馈格式。

没有自检标准的任务，不交给 DeepSeek 执行。

---

## 2.3 每一步必须可回滚

优先采用：

- 新增文件；
- 小范围修改；
- 独立提交；
- 不覆盖现有文档；
- 不批量移动目录；
- 不执行危险系统命令。

每个阶段完成后建议形成一个 Git 提交。

提交示例：

```text
chore(repo): initialize npm workspace
feat(contracts): add task contract v1
feat(gateway): add health endpoint
feat(runtime): add local runtime status
```

---

## 2.4 DeepSeek 只负责执行

职责划分：

```text
ChatGPT
├── 需求拆解
├── 架构设计
├── 任务边界
├── 验收标准
└── 结果审核

DeepSeek
├── 读取指定文件
├── 按任务修改代码
├── 运行指定检查
├── 报告实际结果
└── 遇到异常停止
```

DeepSeek 不负责：

- 擅自改变架构；
- 推测后续需求；
- 批量重构；
- 自行引入框架；
- 自行选择云服务；
- 自行改变权限模型。

---

# 三、目标仓库分层

最终计划形成以下代码资产边界：

```text
ai-agent-platform
├── apps
│   ├── action-gateway
│   └── local-runtime
│
├── packages
│   ├── contracts
│   ├── config
│   ├── auth
│   ├── policy
│   ├── executor-core
│   └── observability
│
├── capabilities
│   ├── gateway-ping
│   ├── runtime-status
│   └── system-info-safe
│
├── infra
│   ├── cloudflare
│   └── launchd
│
├── scripts
│   ├── mvp-check
│   ├── mvp-up
│   ├── mvp-verify
│   └── mvp-down
│
├── skills
├── context
├── docs
└── 根级工程配置
```

以上是目标结构，不会一次性全部创建。

只有当前阶段需要的目录才会落地。

---

# 四、阶段总览

## Phase 0：仓库基线确认

目标：

确认当前仓库真实状态，避免基于过期结构修改。

主要任务：

1. 检查 Git 状态；
2. 检查 Node.js 与 npm 版本；
3. 检查根目录是否已有隐藏配置；
4. 检查 `.gitignore`；
5. 检查当前是否存在未提交修改；
6. 输出仓库基线报告。

本阶段不修改业务代码。

验收结果：

```text
环境可用
仓库状态明确
现有文件无误
后续修改起点确定
```

---

## Phase 1：Monorepo 工程骨架

目标：

把当前知识资产仓库升级为支持多包代码管理的 Monorepo。

计划任务：

1. 设计 npm workspace 范围；
2. 创建根 `package.json`；
3. 创建基础 `.gitignore` 补充项；
4. 创建根 TypeScript 配置；
5. 创建统一 Node 版本约束；
6. 添加根级检查脚本；
7. 验证不会影响现有 `skills/ai-knowledge`。

技术原则：

- 第一版使用 npm workspaces；
- 暂不引入 Turborepo；
- 暂不引入 Nx；
- 暂不引入 pnpm；
- 不迁移现有 Skill；
- 不改动知识库目录。

验收结果：

```text
npm install 成功
workspace 可识别
现有 Skill 自检仍然通过
根级检查脚本可运行
```

---

## Phase 2：公共协议包 Contracts

目标：

先定义 Gateway 与 Runtime 之间的稳定协议，再写服务。

计划任务：

1. 创建 `packages/contracts`；
2. 定义 Task Contract v1；
3. 定义 Result Contract v1；
4. 定义 Error Contract v1；
5. 定义 Capability 名称规范；
6. 添加 Schema 或类型校验；
7. 添加协议单元测试。

第一版 Task 示例：

```json
{
  "taskId": "task_xxx",
  "capability": "gateway.ping",
  "input": {},
  "requestedBy": {
    "type": "custom-gpt"
  },
  "metadata": {
    "requestedAt": "ISO-8601"
  }
}
```

第一版 Result 示例：

```json
{
  "taskId": "task_xxx",
  "status": "succeeded",
  "output": {},
  "error": null,
  "evidence": []
}
```

验收结果：

```text
协议可以独立构建
合法样例校验通过
非法样例校验失败
Gateway 与 Runtime 可共同依赖
```

---

## Phase 3：Action Gateway 最小应用

目标：

建立公网请求的唯一入口，但暂时不连接真实 Runtime。

计划任务：

1. 创建 `apps/action-gateway`；
2. 添加服务启动入口；
3. 添加 `/health`；
4. 添加 `/ready`；
5. 添加统一 JSON 响应格式；
6. 添加请求 ID；
7. 添加基本错误处理；
8. 添加 Gateway 测试。

第一阶段仅验证：

```text
本地 HTTP 请求
    ↓
Action Gateway
    ↓
结构化响应
```

暂不实现：

- Custom GPT；
- Cloudflare；
- Runtime 调用；
- 任意系统操作；
- 任意 Shell 命令。

验收结果：

```text
Gateway 可启动
只监听预期地址
health 返回成功
非法路径返回结构化错误
测试通过
```

---

## Phase 4：认证模块

目标：

不允许匿名公网请求直接调用 Gateway。

计划任务：

1. 创建 `packages/auth`；
2. 设计 Bearer API Key 认证；
3. 从环境变量读取密钥；
4. 禁止密钥写入仓库；
5. 添加缺失 Token 测试；
6. 添加错误 Token 测试；
7. 添加正确 Token 测试；
8. 添加日志脱敏规则。

安全要求：

- 不打印完整 Token；
- 不在错误响应中返回 Token；
- `.env` 不提交；
- 提供 `.env.example`；
- 使用恒定时间比较或可靠库；
- 未认证请求不能进入任务处理层。

验收结果：

```text
无 Token：拒绝
错误 Token：拒绝
正确 Token：放行
日志中没有秘密信息
```

---

## Phase 5：权限与策略模块

目标：

认证成功也不能任意执行能力。

计划任务：

1. 创建 `packages/policy`；
2. 定义 Capability 白名单；
3. 定义调用者与 Capability 的映射；
4. 定义默认拒绝策略；
5. 定义危险能力禁止规则；
6. 添加策略测试。

第一版只允许：

```text
gateway.ping
runtime.status
system.info.safe
```

第一版永久不提供：

```text
shell.exec
sudo.exec
filesystem.delete
system.modify
```

验收结果：

```text
白名单能力通过
未知能力拒绝
危险能力拒绝
策略默认行为是 deny
```

---

## Phase 6：Local Runtime 最小应用

目标：

建立只在 Mac 本地运行的执行服务。

计划任务：

1. 创建 `apps/local-runtime`；
2. 只监听 `127.0.0.1`；
3. 添加 Runtime `/health`；
4. 添加 Capability 注册表；
5. 添加任务执行入口；
6. 添加统一 Result 返回；
7. 添加执行超时；
8. 添加 Runtime 测试。

Runtime 第一版不允许：

- 公网监听；
- 任意 Shell；
- 任意路径；
- 修改系统配置；
- 读取环境变量内容；
- 读取用户隐私文件。

验收结果：

```text
Runtime 仅本地可访问
未注册能力被拒绝
合法能力可执行
超时可以中止
结果符合 Contract
```

---

## Phase 7：第一个安全 Capability

目标：

形成 Gateway 到 Runtime 的第一个真实闭环。

实施顺序：

### 7.1 `gateway.ping`

返回固定内容，用来验证协议和路由。

### 7.2 `runtime.status`

返回 Runtime 是否在线、版本号和启动时间。

### 7.3 `system.info.safe`

只返回经过允许的系统信息：

```json
{
  "platform": "darwin",
  "architecture": "x64",
  "nodeVersion": "受控版本信息",
  "runtimeStatus": "online"
}
```

禁止返回：

- 用户名；
- Home 路径；
- IP；
- 环境变量；
- Cookie；
- Token；
- 完整进程列表；
- 私有文件路径。

验收结果：

```text
Gateway 可以调用 Runtime
Runtime 可以执行 Capability
结果完整返回 Gateway
敏感字段未泄露
```

---

## Phase 8：Gateway 与 Runtime 内部通信

目标：

让两个应用真正形成受控执行链路。

计划任务：

1. 定义内部 Runtime Client；
2. 配置 Runtime 地址；
3. 添加连接超时；
4. 添加执行超时；
5. 添加失败重试策略；
6. MVP 阶段默认不自动重试危险操作；
7. 添加 Runtime 离线错误；
8. 添加端到端测试。

链路：

```text
POST /actions/execute
    ↓
认证
    ↓
Schema 校验
    ↓
Policy 校验
    ↓
Runtime Client
    ↓
Capability
    ↓
Result
```

验收结果：

```text
Gateway 不直接执行本地能力
Runtime 离线时返回明确错误
请求和结果具有关联 ID
端到端测试通过
```

---

## Phase 9：可观测性与审计

目标：

每一次调用都能回答：

```text
谁调用了什么？
什么时候调用？
是否被允许？
执行是否成功？
返回了什么类型的结果？
```

计划任务：

1. 创建 `packages/observability`；
2. 添加结构化日志；
3. 添加 requestId；
4. 添加 taskId；
5. 添加执行耗时；
6. 添加认证失败事件；
7. 添加策略拒绝事件；
8. 添加敏感字段脱敏；
9. 添加最小审计记录。

禁止记录：

- API Token；
- 完整用户隐私数据；
- Cookie；
- 私密环境变量；
- 未脱敏请求正文。

验收结果：

```text
一次请求可完整追踪
Token 不进入日志
拒绝事件可识别
成功与失败状态明确
```

---

## Phase 10：本地一键启动与停止

目标：

降低人工启动成本，避免多终端手工操作。

计划命令：

```bash
npm run mvp:check
npm run mvp:up
npm run mvp:verify
npm run mvp:down
```

职责：

### `mvp:check`

检查：

- Node 版本；
- npm 版本；
- 依赖状态；
- 环境变量；
- 端口占用；
- Gateway 配置；
- Runtime 配置。

### `mvp:up`

启动：

- Local Runtime；
- Action Gateway。

### `mvp:verify`

验证：

- Runtime health；
- Gateway health；
- 正确认证；
- 错误认证；
- Capability 调用；
- 敏感字段检查。

### `mvp:down`

安全停止本次启动的服务。

验收结果：

```text
用户无需手动输入多条命令
启动失败时能明确退出
不会误杀无关进程
停止后端口释放
```

---

## Phase 11：Cloudflare Tunnel

目标：

在不直接开放 Mac 公网端口的前提下，让 Custom GPT 访问 Gateway。

实施顺序：

1. 检查 Cloudflare 账号和域名条件；
2. 安装并验证 `cloudflared`；
3. 先使用临时 Tunnel 验证网络；
4. 再建立命名 Tunnel；
5. 配置固定 hostname；
6. Tunnel 只指向 Gateway；
7. 禁止 Tunnel 指向 Runtime；
8. 验证公网 HTTPS；
9. 验证认证失败；
10. 验证正确认证。

验收结果：

```text
公网只能访问 Gateway
Runtime 不可公网访问
无 Token 请求失败
正确 Token 请求成功
关闭 Tunnel 后公网不可访问
```

---

## Phase 12：Custom GPT Action 配置

目标：

让 Custom GPT 调用已经验证过的 Gateway。

计划任务：

1. 创建专用测试 GPT；
2. 编写最小 Instructions；
3. 编写 OpenAPI Schema；
4. 配置 API Key；
5. 首先只暴露 `gateway.ping`；
6. 验证 GPT 是否选择正确 Action；
7. 验证请求参数；
8. 验证 Gateway 日志；
9. 验证响应显示；
10. 再逐步开放其他安全 Capability。

第一版对话：

```text
用户：测试我的本地 Gateway。

Custom GPT：
调用 gateway.ping

Gateway：
认证、校验并转发

Runtime：
执行 gateway.ping

Custom GPT：
本地 Gateway 已连接。
```

验收结果：

```text
GPT 能识别调用时机
Action 请求到达 Gateway
Gateway 完成认证
Runtime 返回结果
ChatGPT 正确展示结果
```

---

## Phase 13：安全复核

目标：

在增加真实项目能力前，进行一次独立安全检查。

检查内容：

1. 是否存在任意命令入口；
2. 是否存在路径穿越；
3. 是否错误监听 `0.0.0.0`；
4. 是否泄露 Token；
5. 是否提交 `.env`；
6. 是否记录敏感请求；
7. 是否默认允许未知 Capability；
8. 是否可绕过 Gateway 访问 Runtime；
9. 是否存在危险自动重试；
10. 是否缺少执行超时；
11. 是否缺少请求大小限制；
12. 是否缺少限流基础设计。

只有通过安全复核，才允许进入 Git、文件系统或 Coding Agent 能力阶段。

---

## Phase 14：文档与知识沉淀

目标：

代码资产必须同时解释 What、Why、How 和验证结果。

需要逐步形成：

```text
docs/technical/技术调研/
└── RSH-002-Custom-GPT-Actions能力与限制.md

docs/technical/架构实现/
└── ARC-007-Action-Gateway与Local-Runtime边界.md

docs/technical/技术方案/Gateway/
├── README.md
├── SOL-005-Custom-GPT-Action-Gateway-MVP.md
└── SOL-006-Gateway权限与安全模型.md

docs/technical/运维与迁移/Gateway/
├── README.md
└── OPS-004-Gateway部署、验证与回滚.md

docs/technical/实验与验证/
└── Custom-GPT-Action-Gateway-MVP验证记录.md
```

每个新增代码目录必须有 README，至少说明：

- 目录职责；
- 文件说明；
- 依赖关系；
- 启动方式；
- 测试方式；
- 安全边界；
- 当前限制；
- 后续演进。

---

# 五、DeepSeek 单步任务模板

每次给 DeepSeek 的任务统一使用以下结构。

## 1. 当前任务

只写一个目标：

```text
本次只创建根级 npm workspace 配置。
```

## 2. 背景

说明为什么做这一步，以及它在整体架构中的位置。

## 3. 开始前必须读取

精确列出文件：

```text
AGENTS.md
README.md
skills/AGENTS.md
.gitignore
package.json（如存在）
```

## 4. 允许修改范围

例如：

```text
允许新增或修改：
- package.json
- .gitignore

禁止修改其他文件。
```

## 5. 具体操作

逐项说明：

```text
1. 检查文件是否存在。
2. 根据现状创建最小配置。
3. 不添加额外依赖。
4. 不创建 apps 或 packages。
5. 不执行格式化全仓库。
```

## 6. 明确禁止

例如：

```text
- 不修改 docs；
- 不修改 skills；
- 不运行 git commit；
- 不推送 GitHub；
- 不安装全局软件；
- 不删除文件；
- 不继续下一阶段。
```

## 7. 自检命令

精确给出：

```bash
npm install
npm query .workspace
git diff --check
git status --short
```

## 8. 成功标准

必须可以明确判断成功或失败。

## 9. 失败处理

```text
任一命令失败立即停止。
不要自行修复未授权问题。
完整保留错误输出并反馈。
```

## 10. 反馈格式

DeepSeek 必须按固定格式反馈。

---

# 六、DeepSeek 固定反馈模板

```text
## 1. 任务状态

- 成功 / 部分成功 / 失败

## 2. 开始前状态

- 当前分支：
- Git 是否干净：
- Node 版本：
- npm 版本：
- 发现的相关现有配置：

## 3. 修改文件

### 新增
- 文件路径：用途

### 修改
- 文件路径：修改内容

### 删除
- 无

## 4. 实际执行命令

依次列出执行过的命令，不得省略。

## 5. 自检结果

- 检查项：
- 命令：
- 退出码：
- 关键输出：
- 是否通过：

## 6. Git Diff 摘要

- 变更文件数：
- 主要变更：
- 是否存在意外变更：

## 7. 风险与问题

- 已知风险：
- 未解决问题：
- 是否需要人工确认：

## 8. 明确声明

- 未修改授权范围外文件；
- 未执行 git commit；
- 未执行 git push；
- 未继续后续阶段。
```

---

# 七、我收到反馈后的审核流程

DeepSeek 每完成一步，把完整反馈和关键 Diff 发回来。

我负责检查：

1. 是否越界修改；
2. 是否符合当前阶段目标；
3. 是否引入不必要依赖；
4. 是否破坏现有知识 Skill；
5. 是否存在安全问题；
6. 自检是否充分；
7. 错误是否被隐瞒；
8. 是否可以进入下一步。

审核结果只有三种：

```text
通过
需要小范围修正
回滚本步
```

没有通过审核，不进入下一任务。

---

# 八、Git 提交策略

建议每个可独立验收的小阶段形成一个提交，但由用户决定何时提交。

推荐粒度：

```text
提交 1：仓库基线与 workspace
提交 2：contracts 包
提交 3：Gateway 最小应用
提交 4：认证模块
提交 5：权限策略
提交 6：Runtime 最小应用
提交 7：首批 Capability
提交 8：端到端闭环
提交 9：一键启动
提交 10：Cloudflare 与 Action 验证
```

DeepSeek 默认：

- 不提交；
- 不推送；
- 不改写 Git 历史。

只有任务中明确授权时才允许执行 Git 写操作。

---

# 九、MVP 完成标准

只有同时满足以下条件，才算 MVP 完成：

```text
[ ] Monorepo 多包管理正常
[ ] Gateway 与 Runtime 分离
[ ] Runtime 仅本地监听
[ ] API Key 认证有效
[ ] Capability 默认拒绝
[ ] 不存在任意 Shell 接口
[ ] 请求和结果符合 Contract
[ ] 具备结构化日志和审计信息
[ ] 支持一键检查、启动、验证、停止
[ ] Cloudflare Tunnel 使用固定安全入口
[ ] Custom GPT Action 能成功调用
[ ] 错误 Token 和未知能力均被拒绝
[ ] 敏感信息未进入响应或日志
[ ] 文档、测试和验证记录齐全
[ ] 原有知识系统与 ai-knowledge Skill 未被破坏
```

---

# 十、MVP 完成后再讨论的内容

以下内容不进入当前 MVP：

- 任意 Shell 执行；
- 自动修改整个 Mac；
- Codex Provider；
- Claude Code Provider；
- DeepSeek Provider；
- Git 写操作；
- 文件删除；
- 飞书写入；
- 多 Agent；
- Workflow 编排；
- Vector DB；
- 本地模型路由；
- OAuth 多用户体系；
- 公共 GPT Store 发布。

这些能力必须建立在当前安全闭环验证成功之后。

---

# 十一、正式执行顺序

```text
第 0 步：仓库与环境基线检查
第 1 步：根级 npm workspace
第 2 步：统一 TypeScript 与测试配置
第 3 步：contracts 包
第 4 步：Gateway 最小服务
第 5 步：认证
第 6 步：权限策略
第 7 步：Runtime 最小服务
第 8 步：安全 Capability
第 9 步：Gateway → Runtime 闭环
第 10 步：日志与审计
第 11 步：一键运行
第 12 步：Cloudflare Tunnel
第 13 步：Custom GPT Action
第 14 步：安全复核
第 15 步：文档沉淀和 MVP 验收
```

整个过程中严格执行：

> 一步一任务，一步一自检，一步一反馈，一步一审核。
