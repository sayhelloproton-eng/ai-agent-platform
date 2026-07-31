# Capability Policy

`@ai-agent-platform/policy` 提供 Capability 级 Allow / Deny 决策。

## 策略规则

- Deny by default；
- 只有明确进入 Allowlist 的 Capability 才允许；
- 未知 Capability 必须拒绝；
- 重复配置自动去重；
- 输出顺序遵循 `@ai-agent-platform/contracts` 定义的固定顺序。

Policy 不负责认证、不执行 Capability、不读取环境变量，只依赖 Contracts。

Action Gateway 与 Local Runtime 当前默认 Policy 允许：

```text
gateway.ping
runtime.status
```

当前尚无动态策略管理、角色权限或持久化配置。

## 构建与测试

```bash
npm run build --workspace @ai-agent-platform/policy
npm run test --workspace @ai-agent-platform/policy
```
