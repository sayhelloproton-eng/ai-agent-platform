# Contracts Tests

## What

本目录保存 Contract v1 的确定性运行时测试。

## Why

类型检查不能验证外部 `unknown` 输入，Node.js 测试用于确认 validator 和跨字段不变量的真实行为。

## Contains

- `contracts.test.mjs`：Task、Result、Error、Capability 与 JSON 边界测试。

## Boundary

测试不得访问网络、用户目录、Git 写操作、飞书或真实 Secret，不得依赖 Gateway 或 Runtime。

## Structure

测试使用 Node.js 20 内置的 `node:test` 和 `node:assert/strict`，从 `../dist/index.js` 导入编译结果。

## Usage

从仓库根目录运行：

```bash
npm run check:contracts
```

## Maintenance

新增字段、不变量、错误码或 Capability 时，同步添加合法与非法用例。

## Related Docs

- [Contracts README](../README.md)
- [SOL-006](../../../docs/technical/技术方案/Gateway/SOL-006-Task-Result-Error-Contract-v1.md)
