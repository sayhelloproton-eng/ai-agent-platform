# Verify / Doctor / Manifest / Platform READY

## 1. Verify Ownership

领域 Owner 定义“什么叫真的可用”；Deployment 调用并记录。

例：

- Model Runtime：thinking/no-thinking、Vision、structured output 等真实 capability verification；
- Execution Browser：Extension/Host/runtime handshake 与业务链验证；
- Agent Gateway：认证与下游路由可用；
- Task Store：schema/migration/读写 contract。

Deployment 不复制这些测试逻辑。

## 2. Verification Record

至少：

```ts
interface VerificationRecord {
  verificationRef: string;
  moduleRef: string;
  moduleVersion: string;
  resourceIdentity?: string;
  resourceVersion?: string;
  result: "PASS" | "FAIL";
  summary: string;
  evidenceRefs: string[];
  verifiedAt: string;
}
```

记录按版本/资源身份保留，不覆盖历史。

## 3. 当前 READY

Module 当前 READY 不只看历史 PASS：

```text
当前版本/资源身份
+ 当前 live status
+ 该版本有效 verification
+ 必要 config/dependency
```

## 4. Doctor

Doctor 输出：

- checks；
- current reality；
- error codes；
- evidence refs；
- recommended next action。

默认无副作用。

## 5. Manifest

Manifest 包含：

- current modules；
- module/adapter versions；
- external resource identity/version；
- deployment unit runtime status；
- provides/requires；
- config readiness（不泄漏 secret）；
- verification history 摘要；
- pending action required；
- platform overall status。

## 6. Platform State

```text
READY
DEGRADED
ACTION_REQUIRED
NOT_READY
```

### READY

所有 required Module、dependency、config、runtime、verify、cross-module checks 都满足。

### DEGRADED

平台可提供核心能力，但存在非阻断 Module/Optional dependency 问题。

### ACTION_REQUIRED

有阻断的明确人工步骤。

### NOT_READY

required dependency/verify/runtime 失败。

## 7. 禁止假 READY

历史 state、上次 heartbeat、上次 verify 不能替代当前 reality。Manifest/status 必须明确 freshness/observedAt。
