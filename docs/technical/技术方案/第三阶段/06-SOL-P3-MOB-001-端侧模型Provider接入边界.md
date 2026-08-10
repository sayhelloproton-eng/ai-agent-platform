# SOL-P3-MOB-001｜端侧模型 Provider 接入边界（暂定输入）

> 手机模型 MVP 仍在独立验证。本文件只冻结 Phase 3 所需的架构边界，不宣告最终模型、性能或生产 SLA。

## 1. 已获得的架构输入

当前真实验证已经支持以下方向：

- 一个手机 Runtime 对外提供模型服务；
- FAST / REASON 两类推理角色；
- FAST 承担高频结构化判断、上下文理解、Vision；
- REASON 作为低频升级路径；
- 模型可以提出 Tool Proposal，但不拥有 Tool Execution 权限；
- MLXHub 可作为 LAN inference provider；
- inference backend 应由 Runtime 配置，而不是 Flow 硬编码。

## 2. Phase 3 Provider 边界

建议公共接口表达：

```text
backend_ref
role = fast | reason | ...
input contract
output contract
inference options
```

Runtime config 解析：

```text
backend_ref=fast
→ provider=mlxhub
→ endpoint=...
→ model=...
```

Flow 不携带手机 IP / 端口 / model mapping。

## 3. 权限边界

Inference Provider：

- 不拥有 Task；
- 不签发 Approval；
- 不直接执行 Browser Action；
- 不直接获得 Mac FS / shell；
- Tool Proposal 只是一种结构化输出。

Capability / Policy / Approval / Execute 继续由平台其他模块持有。

## 4. 可替换目标

未来只改 Runtime config：

```text
fast → MLXHub phone
fast → Mac local
fast → cloud
```

同一个 Flow / Controller Command 不改变。

## 5. 与 SOL-MOB-001 的关系

Phase 2 SOL-MOB 继续独立完成真实性能、热稳定性、Tool Proposal、FAST / REASON 验证。

其最终结论作为 Provider 实现选择输入，不阻塞 Phase 3 公共 Port / Runtime 设计。
