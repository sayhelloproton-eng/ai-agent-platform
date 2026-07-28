# Auth

`@ai-agent-platform/auth` 提供 Action Gateway 当前所需的基础认证原语：

- Bearer Authorization Header 解析；
- API Key 格式校验；
- 恒定时间密钥比较；
- Authorization Header 脱敏。

本包不负责 HTTP 路由、环境变量读取、权限策略、用户系统或日志存储，运行时依赖为零。

## API Key 安全边界

- API Key 长度必须为 32～256 个字符；
- API Key 不得包含空白字符；
- 密钥比较先生成 SHA-256 固定长度摘要，再使用 `timingSafeEqual`；
- 返回值、错误信息和输出中不得包含密钥。

当前提供 Authorization Header 脱敏函数，但项目尚未建立正式日志系统。

## 构建与测试

```bash
npm run build --workspace @ai-agent-platform/auth
npm run test --workspace @ai-agent-platform/auth
```

## 当前限制

当前只支持单一静态 API Key，尚未支持密钥轮换、OAuth、权限模型或 Rate Limit。
