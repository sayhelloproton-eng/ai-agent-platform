---
docId: DEPLOYMENT-MODULE-CONTRACT-TECH-DESIGN
title: '`module-contract` 详细技术方案'
docType: module-design
authority: normative
lifecycle: frozen
domain: deployment-governance
moduleRef: module-contract
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs:
- DEPLOYMENT-MODULE-CONTRACT-TECH-DESIGN
---

# `module-contract` 详细技术方案

## 1. 目标

用最少类型描述“平台如何治理一个 Module”。不承载部署执行逻辑，不做动态 Registry Service。

## 2. 核心类型

```ts
export type ModuleKind =
  | "library"
  | "service"
  | "cli"
  | "browser-extension"
  | "agent-package"
  | "external-resource";

export interface ModuleDescriptor {
  contract: "module";
  contractVersion: "1.0.0";
  moduleRef: string;
  packageName: string;
  moduleVersion: string;
  kind: ModuleKind;
  templateVersion: string;
  platformCompatibility: string;
  provides: ModuleProvide[];
  requires: ModuleRequire[];
  requirements: ModuleRequirement[];
  configSlots: ConfigSlot[];
  lifecycle: LifecycleSupport;
  verification: VerificationContract;
  effects: DeploymentEffect[];
}
```

`packageName` 对 External Resource Module 指 Module Adapter npm package。

## 3. Provides / Requires

```ts
export interface ModuleProvide {
  contractRef: string;
  version: string;
}

export interface ModuleRequire {
  contractRef: string;
  versionRange: string;
  optional?: boolean;
}
```

Platform CLI 负责版本范围兼容检查，不引入服务发现协议。

## 4. Requirement

v1 采用 discriminated union，类别只保留当前需要：

```ts
type ModuleRequirement =
  | RuntimeRequirement
  | ExecutableRequirement
  | FileSystemRequirement
  | PortRequirement
  | NetworkRequirement
  | ModuleContractRequirement
  | HumanRequirement;
```

Requirement 查询必须零副作用。

## 5. Config Slot

```ts
type ConfigValueType =
  | "string"
  | "number"
  | "boolean"
  | "url"
  | "path"
  | "enum"
  | "secretRef";

interface ConfigSlot {
  key: string;
  type: ConfigValueType;
  required: boolean;
  description: string;
  default?: unknown;
  enumValues?: string[];
  sensitive?: boolean;
}
```

`default` 只能用于安全、确定性默认值。Secret 只声明 `secretRef`。

## 6. Lifecycle

```ts
type LifecyclePrimitive =
  | "describe"
  | "preflight"
  | "status"
  | "verify"
  | "doctor"
  | "start"
  | "stop"
  | "restart"
  | "migrate";

interface LifecycleSupport {
  supported: LifecyclePrimitive[];
}
```

禁止因为统一接口而伪造 N/A 生命周期。

## 7. Structured Result

```ts
type ModuleOperationStatus =
  | "SUCCEEDED"
  | "BLOCKED"
  | "ACTION_REQUIRED"
  | "FAILED";

interface ModuleOperationResult<T> {
  contract: "deployment.result.v1";
  ok: boolean;
  status: ModuleOperationStatus;
  moduleRef: string;
  moduleVersion: string;
  data?: T;
  checks?: DeploymentCheck[];
  actionRequired?: HumanAction;
  error?: DeploymentError;
}
```

检查项：

```text
PASS | FAIL | WARN | SKIP
```

## 8. 最小错误语义

```text
INVALID_REQUEST
MODULE_NOT_FOUND
CONTRACT_INVALID
CONFORMANCE_FAILED
COMPATIBILITY_MISMATCH
DEPENDENCY_UNRESOLVED
REQUIREMENT_UNMET
CONFIG_REQUIRED
LIFECYCLE_UNSUPPORTED
EXTERNAL_RESOURCE_UNAVAILABLE
PLAN_INVALID
PLAN_STALE
APPLY_FAILED
VERIFY_FAILED
DOCTOR_FAILED
UPGRADE_FAILED
COMMAND_FAILED
```

`ACTION_REQUIRED` 是操作状态，不当作技术错误。

## 9. Version

内部 Module：`moduleVersion == package.json version`。

External Module：

- `moduleVersion` = Adapter Package version；
- `resourceVersion?` = 动态 status/verify 中观察到的外部资源版本；
- 无版本资源不伪造，使用 resource identity + config fingerprint + verification record。

## 10. Runtime Validation

所有来自 CLI、descriptor file、第三方 process、外部 API 的数据先视为 `unknown`，通过 runtime schema 后进入强类型对象。

---

## 当前正式约束：ConfigSlot / Module identity

`ConfigSlot` 增加 `moduleRef` 类型，用于引用受 Deployment 管理的 Module，而不是让领域长期保存裸 URL。例如 `fastProviderModuleRef / reasonProviderModuleRef / chromeRuntimeModuleRef / carrierModuleRef / publicIngressModuleRef`。Provides/Requires 仍只表达逻辑 capability，不携带物理 URL/port/process。
