# INSTALL｜AI + 人工部署入口

# 1. 部署原则

本平台采用 AI 原生部署（AI-native Deployment）。

职责：

```text
AI
= 理解目标、规划、调用、解释、交互

Platform CLI
= 平台级确定性执行和组合

模块 CLI
= 模块级确定性执行和部署子闭环
```

核心原则：

> **智能在 AI，确定性在 CLI。**

存在 Platform CLI 或模块 CLI 能力时，AI 应优先调用 CLI，不自行编写替代部署 Shell。

---

# 2. 标准部署流程

```text
客户把 INSTALL.md 交给 AI
        ↓
AI 理解部署目标
        ↓
platform available
        ↓
platform preflight [module]
        ↓
AI 根据结果形成部署计划
        ↓
必要时请求用户确认
        ↓
platform install [module]
        ↓
platform configure [module]
        ↓
platform start [module]
        ↓
platform verify [module]
        ↓
platform manifest [module]
        ↓
AI 总结部署结果
```

---

# 3. 发现模块

优先使用：

```bash
platform available
```

Platform CLI 通过平台 npm Scope / 私有域发现可部署模块。

AI 应展示：

```text
模块
Available Version
Installed Version
Version Verification Records 摘要
Deployment Status
Capabilities
```

用户关注的是可部署模块，不是内部所有研发 package。

---

# 4. 前置检查

调用：

```bash
platform preflight [module]
```

Platform CLI 再调用目标模块自己的 `preflight`。

模块自己负责检查真实环境。

可能包括：

```text
Node.js
npm
OS
端口
目录
文件权限
外部程序
网络
Provider
模块依赖
```

具体检查逻辑属于模块自身。

如果返回：

```text
BLOCKED
FAILED
```

AI 不应继续盲目执行。

应该读取：

```text
status
errorCode
checks
```

必要时调用：

```bash
platform doctor [module]
```

---

# 5. 安装

调用：

```bash
platform install [module]
```

Platform CLI 根据统一部署协议调用模块自身的 `install`。

模块也必须可以独立执行：

```bash
npx <module-package> install --json
```

因此 Platform CLI 不是模块唯一部署入口。

---

# 6. 配置

调用：

```bash
platform configure [module]
```

配置原则：

```text
安全默认值
→ 自动

已有明确约定
→ 自动

环境特定值
→ 显式输入

Secret / 高风险系统配置
→ 人工确认
```

---

# 7. 启动

需要运行服务的模块通过 Platform CLI 启动：

```bash
platform start [module]
```

Platform CLI 根据统一协议调用模块自身的 `start`：

```bash
npx <module-package> start --json
```

具体启动实现属于模块自身，Platform CLI 只负责统一调用和结果整合。

---

# 8. 验证

调用：

```bash
platform verify [module]
```

验证目标是：

> **证明模块真实可用。**

模块自己执行真实验证，Platform CLI 记录结果。

验证记录不能只覆盖最后一个版本，而应保留每个被验证版本的 Verification Record。

例如：

```text
0.3.1 PASS
0.3.2 FAIL
0.3.3 PASS
```

当前模块 READY 状态根据：

```text
当前 Installed Version
+
该版本有效 Verification Record
+
当前实际运行状态
```

综合判断。

---

# 9. 当前部署内容

调用：

```bash
platform manifest [module]
```

或者：

```bash
platform manifest
```

用于获取当前真实部署内容。

至少应能描述：

```text
当前安装模块
当前 Installed Version
各版本 Verification Records
当前 Deployment Status
当前 Capabilities
当前 Dependencies
```

Manifest 由 Platform CLI 根据真实状态生成，不由用户人工维护。

未来如需企业审计或迁移，可进一步导出：

```text
deployment-manifest.json
```

---

# 10. 单模块独立部署

任何符合规范的模块都应支持：

```bash
npx <module-package> describe --json
npx <module-package> preflight --json
npx <module-package> install --json
npx <module-package> configure --json
npx <module-package> start --json
npx <module-package> stop --json
npx <module-package> status --json
npx <module-package> verify --json
npx <module-package> doctor --json
```

因此：

> **没有 Platform CLI，模块仍能完成独立部署；有 Platform CLI 后，由 Platform CLI 统一组合这些能力。**

---

# 11. 故障诊断

统一入口：

```bash
platform doctor [module]
```

Platform CLI：

```text
找到目标模块
→ 调用模块自身 doctor
→ 获取结构化诊断
→ 汇总结果
```

AI：

```text
读取 status / errorCode / checks
→ 解释问题
→ 请求必要人工动作
→ 修复后重新 preflight / verify
```

AI 不依赖自然语言日志猜测真实状态。

---

# 12. AI 自动执行边界

默认倾向允许 AI 自动执行：

```text
available
describe
status
preflight
verify
doctor
manifest
```

涉及真实系统改变的动作，由后续实现根据真实影响定义人工确认规则。

重点包括：

```text
权限提升
Secret / Token
系统级配置
暴露网络端口
开机启动
删除数据
破坏性升级
卸载和清理用户数据
```

---

# 13. 部署成功标准

AI 最终不能只回答：

> npm install 成功。

至少应确认：

```text
目标模块已安装
必要配置完成
需要运行的服务已运行
目标版本有有效 Verification Record
当前 Deployment Status 正常
Manifest 与真实部署结果一致
```

最终向用户报告：

```text
部署了什么
当前版本是什么
哪些版本验证过
当前哪些模块 READY
当前有哪些能力
哪些问题仍需要处理
```

---

# 14. 实现后补齐

以下真实信息在实现阶段补充，不在当前设计阶段伪造：

```text
Platform CLI 最终 npm package 名
CLI bin 名
平台 npm Scope
平台公共 package 命名规范
Node.js / npm 最低版本
支持 OS
真实安装命令
真实 CLI 参数
真实 Module Contract Schema
完整 Error Code
本机部署状态存储位置
人工确认最终规则
首个真实单模块部署案例
首个真实组合部署案例
```
