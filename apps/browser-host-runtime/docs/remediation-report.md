# SOL-BHR-001｜最终领域整改报告

## 输入

- 深度审计参考：`main@6988b4b3711836c96706a5e79b195cd346d80fb3`；
- 连续实现基线：BHR `0.2.1` 应用后的实现；
- 修改范围：`apps/browser-host-runtime/**`；
- 未修改 Task、Plan、Gateway 服务端、TSK、CTL、LCL 或公共 Contracts。

## 已关闭

1. `UNCERTAIN` 不再调用普通 Dispatch Fail；
2. Journal 并发写入使用共享单写队列；
3. Service Worker 所有执行入口共用串行门禁；
4. 同 `idempotency_key + logical fingerprint` 跨 Command ID 唯一；
5. 非终态和隔离记录不会容量裁剪；
6. 容量满时在 Claim 前停止；
7. 单条坏恢复记录隔离后继续处理后续记录；
8. 恢复记录持久化重试次数、最后错误和下一时间；
9. 预投递 Fail 网络失败后按原 Fail Operation 补报；
10. Delivery Ack、Host Result 和 Uncertain 均按原凭证补报；
11. 指定 Conversation 在 Wake 后再次严格校验；
12. 最终 HTTP Server Adapter Fixture 覆盖全部 Operation。

## 自动验证

```text
55 tests passed
0 failed
```

真实 Chrome、真实 ChatGPT DOM、真实 Service Worker 回收和正式 Gateway/TSK 串联仍必须由总控集成阶段在用户环境验收，不能由 Mock 冒充。
