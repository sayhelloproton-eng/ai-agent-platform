# Local Control Tests

测试以临时 Git 仓库和注入式 Registry / Process Runner 验证领域不变量，不依赖真实用户仓库、真实 Secret 或在线服务。

覆盖：

- Contract 和执行模式；
- Git Snapshot 与文件 Git 状态；
- Tree 分页、文件范围和 Hash；
- 绝对路径、`..`、软链逃逸和敏感资源拒绝；
- Runtime / Executor 正常与不可用；
- Batch 部分失败；
- `ensure_running` 幂等和固定模板；
- CLI stdout 单 JSON；
- `npm pack` 发布清单。

## 综合审计整改测试

`integration-adapters.test.mjs` 验证 Gateway 固定进程调用、CLI/直接结果一致、重复请求、Timeout、输出预算、非法 stdout、路径与敏感资源拒绝、Work Consumer Result Ref 注入，以及 Error / Retryable / Summary / Evidence Ref 回报。
