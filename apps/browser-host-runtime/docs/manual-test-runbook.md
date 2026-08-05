# 真实 Chrome 手工验证 Runbook

## 前置

1. 在 Chrome 中登录 ChatGPT；
2. 从仓库加载 `apps/browser-host-runtime`；
3. 在 Options 中配置真实 Gateway；
4. 保持 `approval_policy_mode = strict`，除非专门验证总控尚未冻结的提案模式；
5. 打开 Side Panel。

## 场景 A：绑定与页面身份

1. 打开一个固定 Custom GPT Conversation；
2. 绑定当前页面；
3. 确认 Binding 保存 `gpt_ref / conversation_ref / page_fingerprint`；
4. 切换到另一个 ChatGPT Conversation；
5. 确认旧 Binding 变成 `STALE`；
6. 确认任何发送命令返回 `BINDING_PAGE_IDENTITY_MISMATCH`，不得误发。

## 场景 B：无 Binding 打开角色会话

1. 保证目标 Role 没有 READY Binding；
2. 下发 `OPEN_OR_RESUME_SESSION`；
3. 确认扩展创建新 Tab；
4. 确认先产生 `PROVISIONING` Binding；
5. 页面加载后校验 GPT；
6. 确认 Binding 进入 READY；
7. 若 Payload 含 `wake_text`，确认只发送一次并在 URL 产生 Conversation 后更新 `conversation_ref`。

## 场景 C：完整响应生命周期

1. 下发 `SUBMIT_MESSAGE`；
2. 确认结果依次记录：
   - `message_submitted`；
   - `response_started`；
   - `response_completed`；
3. 验证生成开始超时返回 `RESPONSE_START_TIMEOUT`；
4. 验证生成完成超时返回 `RESPONSE_COMPLETION_TIMEOUT`；
5. 验证用户输入、滚动或切换会话会停止执行。

## 场景 D：后台标签页截图

1. 保持目标 Binding Tab 非活动；
2. 触发 Observation；
3. 确认目标 Tab 被短暂激活并完成截图；
4. 确认原活动 Tab 被恢复；
5. 确认 Evidence 记录 `temporarily_activated = true`。

## 场景 E：重启补报

1. 在 Host Result 已写入 Journal、但 ack/fail 尚未成功时重启 Service Worker；
2. 确认 Journal 状态仍为 `EXECUTED`；
3. Dispatch 再次领取后只补报同一个 `result_id`；
4. 确认页面动作执行次数仍为一次。

## 场景 F：一次性 Approval

1. 为敏感 UI Action 获取一次性 Grant；
2. 首次执行成功后消费 Grant；
3. 使用同一 Grant 再执行必须失败；
4. 页面前置哈希变化后必须重新审批。

## 场景 G：Emergency Stop

1. 点击“紧急停止”或使用快捷键；
2. 轮询、观察与新动作停止；
3. 人工恢复后才继续。
