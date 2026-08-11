# 外部资源 Module 统一治理

## 1. 强制原则

> 任何进入平台运行链、部署链或验证链的外部资源，都必须以 Module 方式进入 Module Graph。

禁止：

```text
model-runtime README 里偷偷写一个 API endpoint
execution README 里偷偷依赖 Chrome
agent README 里偷偷要求 ChatGPT GPT 配好
```

这些都必须变成可被 Platform CLI 看见、配置、status、verify、doctor 的 External Resource Module。

## 2. Adapter Pattern

```text
External Resource
  ↑ API / CLI / OS integration
External Resource Module Adapter (npm package)
  ↑ module-contract
platform-cli
```

Adapter 负责翻译，不拥有外部产品。

## 3. P0 外部资源示例

### Model API Provider Module

提供逻辑 contract，例如 `model.provider.fast` / `model.provider.reason`；配置 base URL / credentialRef / model id；verify 必须调用 Model Domain 定义的真实 capability verification，而不是只 ping HTTP 200。

### Dev Tunnel Module

管理安装、登录前置、start/stop/status、public endpoint verify；登录需要用户时返回 `ACTION_REQUIRED`。

### Chrome Runtime Module

验证 Chrome availability/version、必要设置与 Extension 前置。不能自动安装/授权时返回 `ACTION_REQUIRED`。

### ChatGPT Carrier Module

验证 ChatGPT Web/Custom GPT 使用前置、必要用户登录/账号/载体可达性；不能伪造在线状态。GPT 创建/配置由 Agent Package 部署计划与人工步骤共同完成。

## 4. 生命周期真实主义

External Resource Module 只实现真正能控制的 primitive。

远端 API：`describe/preflight/status/verify/doctor`。

Dev Tunnel：可增加 `start/stop/restart`。

Chrome：视适配能力决定 install/start/stop；没有就不声明。

## 5. External Version

Adapter version 与 Resource version 分离；避免“Adapter 1.2.0”被误认为“Chrome 150”或“远端 API 版本”。

## 6. External Upgrade

Upgrade Plan 可以包含：

- Adapter package upgrade；
- external resource upgrade/check；
- credential/config migration；
- human action；
- post-upgrade verify。

Platform CLI 不假定所有外部资源都可自动升级。

## 7. Bootstrap 例外

最小 Node/npm/OS 是 Platform CLI 启动根。初始 bootstrap 完成后，它们可以继续被对应 External Resource Module 纳入状态/验证治理。这个例外只解决“CLI 尚未存在时谁部署 CLI”的无限递归，不允许成为永久旁路。
