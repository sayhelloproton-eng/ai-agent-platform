---
docId: DEPLOYMENT-DOC-03-01
title: Deployment Plan / Apply / ACTION_REQUIRED / 恢复
docType: runtime-flow
authority: normative
lifecycle: frozen
domain: deployment-governance
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# Deployment Plan / Apply / ACTION_REQUIRED / 恢复

## 1. 为什么需要 Plan

部署包含真实副作用和人工步骤。AI 不能边想边执行全部动作；需要把“准备做什么”先固定成结构化计划。

## 2. Plan 最小合同

```ts
interface DeploymentPlan {
  planRef: string;
  intent: "install" | "configure" | "upgrade" | "repair";
  moduleTargets: ModuleTarget[];
  resolvedModules: ResolvedModule[];
  steps: DeploymentStep[];
  effects: DeploymentEffect[];
  humanActions: HumanAction[];
  verification: VerificationStep[];
  fingerprint: string;
  createdAt: string;
}
```

Plan 一旦确认后不可原地改；条件变化需要新 Plan 或明确判定 `PLAN_STALE`。

## 3. Step

每步至少：

```text
stepRef
moduleRef
kind
preconditions
expectedEffect
check strategy
execute strategy（若可自动）
postcondition
```

不是任意 shell list；Step 由 Platform CLI 的受控 planner 根据 Module primitives 生成。

## 4. 集中确认

AI 向用户汇总：

- 安装/升级哪些 Module；
- 改哪些实例配置；
- 哪些外部资源；
- 哪些服务会 start/stop；
- 是否 migration；
- Potential Effects；
- Human Actions。

一次确认 Plan，避免每个 npm 命令重复确认。

## 5. ACTION_REQUIRED

标准结构：

```json
{
  "status": "ACTION_REQUIRED",
  "planRef": "plan-...",
  "stepRef": "step-...",
  "actionRequired": {
    "kind": "HUMAN",
    "instruction": "...",
    "verificationHint": "..."
  }
}
```

场景：

- Chrome 中加载/授权 Extension；
- ChatGPT 登录；
- 创建或配置 Custom GPT；
- Dev Tunnel interactive login；
- API credential；
- 购买/账号授权。

## 6. Resume

相同 Plan 再 apply：

```text
重读 reality
→ 已满足的人工步骤 SKIP
→ 继续后续步骤
```

无需 Workflow Engine。

## 7. Fail/Unknown

Deployment 的 package/install/config 操作通常可通过现场重检确定状态。若 effect reality 无法确认，Step 必须停止并由 doctor/repair plan 处理；不能盲目重复副作用动作。

## 8. 并发

v1 同 workspace 同时只允许一个 apply。使用简单 file lock；不设计 distributed lock。

---

## 当前正式约束：resume / recovery

同一 planRef 重新 apply 时先观察现实，已满足 step 跳过；ACTION_REQUIRED 是正式 resumable boundary，但不演化为 job/lease/worker engine。Upgrade failure = STOP + verify/doctor；rollback 通过新的目标版本 Plan，不做自动事务式 rollback。

## 9. Custom GPT Web-only 配置

Custom GPT create/update 当前仍是 Web 操作。Deployment 不新增第二套状态；继续返回标准：

```text
status = ACTION_REQUIRED
actionRequired.kind = WEB
→ open GPT editor
→ apply Instructions/Knowledge/Capabilities
→ install static Actions schema
→ configure role API-key/Bearer auth
→ save
→ Preview/real verify
```

同一 planRef resume 时先 verify reality，已经满足的 Web step SKIP，不要求用户机械重复。

如果目标环境真实验证 `x-openai-isConsequential:false` + Always Allow 可稳定消除 routine confirmation，可以把“一次选择 Always Allow”列为 Agent Carrier setup/verify 步骤；**在 E2E 通过前不能把该 UI 行为当 Deployment 硬保证。**
