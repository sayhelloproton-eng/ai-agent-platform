# Local Control Tests

测试使用临时 Git 仓库、注入式 Registry、真实子进程和可复用 Contract Fixture，验证 Local Control 自身领域不变量，不依赖 Task Control 内部表或浏览器状态。

覆盖：

- Local Request / Result 和执行模式；
- Git Snapshot、文件状态、Tree 分页、Hash；
- 绝对路径、路径穿越、软链逃逸和敏感资源拒绝；
- Runtime / Executor 状态；
- Batch 部分失败与受控 `ensure_running`；
- CLI stdin/stdout 单 JSON 与 npm pack；
- Gateway Process Adapter 的 `shell:false`、超时、取消、异常退出和输出预算；
- `request_id` 传输身份与业务请求指纹；
- 同进程及重启后的稳定幂等回放；
- 有界 `inFlight` 容量、TTL、并发合并和完成清理；
- `ACCEPTED / PARTIAL / SUCCEEDED / FAILED` 语义；
- Result / Evidence Sink 稳定引用；
- Sink 写入成功但 Report 失败后的安全重试；
- 跨域 WorkReport 只包含摘要和引用，不包含完整 `local_result`。
