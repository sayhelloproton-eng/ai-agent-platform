---
docId: MODEL-DOC-05-01
title: 14 · TypeScript / Node 20 工程约束
docType: engineering-constraints
authority: normative
lifecycle: frozen
domain: model-reasoning
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 14 · TypeScript / Node 20 工程约束

## 1. [FROZEN] TypeScript-first

以下必须 TS 强类型：

- Public Contract；
- Reasoning Spec；
- Spec input/output；
- Capability Proposal；
- Inference Result/Error；
- RuntimeStatus；
- Provider normalized result；
- 内部模块接口。

## 2. [FROZEN] Node 基线

```text
Node.js 20.20.1
TypeScript
tsx
tsc --noEmit
```

Node 20 不把 `node file.ts` 原生直接运行作为 v1 基线。

推荐：

```bash
npx tsx src/main.ts
npx tsc --noEmit
```

`tsx` 负责运行，`tsc --noEmit` 负责类型门禁。

## 3. [FROZEN] runtime validation

TS 不能保护 HTTP/JSON/provider 边界。

统一规则：

```ts
const raw: unknown = await readBoundary();
const value = schema.parse(raw);
```

不得：

```ts
const value = raw as SomeDto;
```

## 4. [FROZEN] `any`

公共合同与边界处理禁止 `any`。

需要未知输入时使用 `unknown`。

## 5. [RECOMMENDED] Spec registry

v1 可以代码静态 export：

```ts
export const reasoningSpecs = {
  "execution.command-risk.v1": commandRiskV1,
  "browser.page-state.v1": browserPageStateV1,
} as const;
```

不需要数据库或运行时注册服务。

## 6. [RECOMMENDED] Provider config 只用 typed config

Deployment 生成或读取的 provider config 也必须 runtime validate；配置槽位、materialization 和 conformance 由 Deployment Domain 的正式 Contract 定义。
