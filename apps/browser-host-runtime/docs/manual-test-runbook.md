# 真实 Chrome 手工验证 Runbook

## 前置

1. 在 Chrome 中登录 ChatGPT；
2. 加载 `apps/browser-host-runtime`；
3. 打开一个专用总控 Custom GPT Conversation；
4. 打开 Side Panel；
5. 默认保持 `fixture` Transport 与 Model。

## 场景 A：绑定与观察

1. 点击“绑定当前 ChatGPT”；
2. 确认 `gpt_ref`、`conversation_ref` 和 Binding 状态；
3. 点击“立即观察”；
4. 确认页面已滚动到底部；
5. 确认 Observation 含 Page State、Generation State、Interactive Elements 和 Evidence Ref；
6. 若当前 Tab 激活，确认存在 Screenshot Ref。

## 场景 B：审核后的 Wake

1. 点击“准备 Fixture Wake”；
2. 检查输出的最小 Wake Envelope、目标和动作指纹；
3. 人工确认后点击“审核通过并入队”；
4. 点击“处理一条 Dispatch”；
5. 确认消息只发送一次；
6. 再次处理，确认不会重复发送；
7. 确认 Fixture Report 中只有 Host Result，不包含 Task 完成声明。

## 场景 C：人工冲突

1. 在 Composer 中人工输入；
2. 立即处理一个发送命令；
3. 期望返回 `USER_CONTROL_ACTIVE / BLOCKED`，不得覆盖人工输入。

## 场景 D：审批前置条件变化

1. 创建 Fixture Wake；
2. 在执行前切换页面或弹出 Dialog；
3. 处理 Dispatch；
4. 期望 `APPROVAL_PRECONDITION_CHANGED`，不得发送。

## 场景 E：恢复

1. 在副作用开始后模拟 Service Worker 重启；
2. Journal 中未确认命令必须恢复为 `UNCERTAIN`；
3. 不得自动重发。

## 场景 F：Emergency Stop

1. 点击“紧急停止”或快捷键；
2. 轮询和新动作应停止；
3. 点击“恢复”后才能继续。
