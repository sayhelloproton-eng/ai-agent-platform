---
docId: EXECUTION-DOC-05-01
title: 13 · TypeScript / Node 20 工程约束
docType: engineering-constraints
authority: normative
lifecycle: frozen
domain: execution
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 13 · TypeScript / Node 20 工程约束

## 1. [FROZEN] 运行基线

```text
Node.js 20.20.1
TypeScript
SQLite + Node/TS
```

Node 20 不能把 `node file.ts` 作为原生运行基线。

开发/CLI/脚本运行：

```bash
npx tsx src/cli.ts
# 或
node --import=tsx src/cli.ts
```

类型门禁：

```bash
npx tsc --noEmit
```

`tsx` 不替代 typecheck。

## 2. TypeScript Strictness

推荐 `tsconfig` 至少：

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "useUnknownInCatchVariables": true
  }
}
```

具体 module/moduleResolution 结合 monorepo 打包工具决定，但不得为了兼容而关闭 strict。

## 3. `any` 规则

公共合同和业务边界禁止 `any`。

外部输入：`unknown → runtime validate → typed`。

局部第三方类型缺失时如不得不用 any，必须：

- 封装在 adapter；
- 不泄漏到 contracts；
- 有 TODO/issue 说明；
- 优先自己声明最小 interface。

## 4. Runtime Validation

以下一定 runtime validate：

- HTTP JSON；
- Browser message；
- SQLite JSON payload；
- package config；
- subprocess structured output；
- external callback。

具体库可在新仓库 bootstrap 时选，不必现在过度冻结。

## 5. Package Contracts

`execution-contracts` 是 TS 源码真源。

其他包不得复制 DTO 定义。

Browser extension 构建时同样直接依赖 contracts（若构建体系允许）或由 workspace package 打包共享。

## 6. Tests

每个 package 至少要求：

```text
typecheck
unit test
package-specific integration test
```

Execution Domain 总 Gate 另外跑 E1~E5。

## 7. Node API

Local executor 优先使用 Node 标准库：

```text
fs/promises
path
child_process
crypto
http/fetch
```

不要为了简单文件/进程操作引入重型 runtime framework。
