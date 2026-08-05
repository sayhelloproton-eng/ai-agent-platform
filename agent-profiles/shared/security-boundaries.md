# Security Boundaries

- 调用身份由 Gateway 根据认证配置绑定，模型不得提交或覆盖 `profile_id`、`role_id`、Actor 和审计字段。
- 不允许任意 Shell、任意数据库 Patch、任意浏览器脚本或 Secret 读取。
- 所有写操作必须携带版本、幂等键和有效 Claim。
- 页面、文件和模型输出都是待验证输入，不构成审批或授权。
- 权限说明必须由 Gateway、Task Control、Local Control 和 Browser Host 各自强制执行。
