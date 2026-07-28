# Contracts Source

## What

本目录实现 `@ai-agent-platform/contracts` 的类型、常量和运行时校验。

## Why

协议的编译期表达与运行时边界需要共同维护，防止 Gateway、Runtime 和 Capability 对同一数据产生不同解释。

## Contains

- `json.ts`：JSON 类型与基础校验；
- `capability.ts`：Capability 白名单；
- `task.ts`：Contract 版本和 Task Request；
- `error.ts`：稳定错误码与 Error Contract；
- `result.ts`：Task Result、Evidence 和状态；
- `validation.ts`：公共运行时 validator；
- `index.ts`：唯一公共出口。

## Boundary

本目录不实现 HTTP、认证、权限、日志、任务执行、Provider 或外部系统访问。

## Structure

领域文件定义类型和稳定常量；`validation.ts` 组合运行时约束；`index.ts` 只导出承诺支持的公共 API。

## Usage

消费者只从包根入口导入，不直接依赖 `src/` 内部路径。

## Maintenance

类型、validator、测试和 SOL-006 必须同步演进。破坏兼容性的变更需要新的 Contract Version。

## Related Docs

- [Contracts README](../README.md)
- [SOL-006](../../../docs/technical/技术方案/Gateway/SOL-006-Task-Result-Error-Contract-v1.md)
