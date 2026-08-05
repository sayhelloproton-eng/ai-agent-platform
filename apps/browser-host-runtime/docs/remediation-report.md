# SOL-BHR-001 综合审计整改报告

## 已完成的 BHR 领域整改

| 审计项 | 处理结果 |
|---|---|
| BHR-H01 Binding 会话漂移 | Observation 增加页面身份；动作前后强校验；ChatGPT 内切换会话自动 STALE |
| BHR-H02 响应生命周期不完整 | `SUBMIT_MESSAGE` 默认等待提交、开始、完成；支持开始/完成超时和人工中断 |
| BHR-H03 后台 Tab 截图 | 临时激活指定 Tab、截图、恢复原活动 Tab；串行 Capture Queue |
| BHR-H04 Journal 恢复窗口 | `PREPARED / EXECUTING / EXECUTED / REPORTED`；EXECUTED 只补报 |
| B-04 Fixture-only | Gateway 成为默认；Fixture 需显式测试开关 |
| B-06 无 Binding 打开角色 | 新增 RoleSessionManager 和 PROVISIONING → READY 生命周期 |
| B-07 Wake Approval | 提供 opt-in 提案模式；strict 仍为默认，等待总控冻结 |

## 自动测试

覆盖：

- 无 Binding 创建角色会话；
- 错误会话防误发；
- ChatGPT 会话切换后 Binding 失效；
- 完整响应开始与完成；
- 开始超时、用户中断；
- 扩展重启后只补报；
- duplicate Host Command 和请求指纹冲突；
- 指定非活动标签页截图与恢复；
- Approval Grant 一次性消费；
- 页面身份变化停止执行；
- Host Result ack / fail 路由。

## 剩余跨领域阻断

以下不属于 BHR 单领域可完成事项：

1. Gateway 尚未实现 `browser.host.* / browser.dispatch.* / browser.payload.resolve / approval.grant.*` 路由；
2. TSK DispatchSignal 尚未物化为本文 Candidate Host Command；
3. TSK 尚未接收完整 Host Result、Observation 和 Evidence 引用；
4. 普通 Platform Wake 的授权语义尚未由总控冻结；
5. CTL / TSK 公共 Task 与 Command 合同仍未统一；
6. 四领域 E2E 和根 `verify` 门禁仍由总控集成实现。

BHR 不修改 Task / Plan，不代替 Gateway、TSK 或 Approval 领域实现这些部分。
