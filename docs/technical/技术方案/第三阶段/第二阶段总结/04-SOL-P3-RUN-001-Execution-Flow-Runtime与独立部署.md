# SOL-P3-RUN-001｜Execution Flow Runtime 与独立部署

## 1. 定位

当前 `experiments/execution-flow-runtime` 已经验证了多个重要方向：

- spec-defined Flow；
- explicit `$ref` data binding；
- capability registry；
- inference backend provider；
- FAST / REASON role；
- managed runtime service；
- AI-friendly CLI / schema discovery。

Phase 3 将其视为重要实验资产，但不是不可颠覆的最终实现。

## 2. 需求目标

Runtime 必须解决：

> **同一业务 Flow 在模块部署位置、模型 Provider、Capability Adapter 改变时无需修改 Flow 协议。**

## 3. Runtime 拥有

- Runtime Home / config；
- Composition Root；
- Provider / Adapter factory；
- Capability Registry；
- Backend Registry；
- Command Registry；
- bounded Flow validation / execution；
- module health / provider discovery；
- transport adapter selection。

## 4. Runtime 不拥有

- Durable Task 状态；
- Controller 自由决策；
- Approval 业务决定；
- Browser DOM 状态；
- Local Capability 内部实现；
- 跨 Task 的长期 workflow orchestration。

## 5. Flow 协议必须保持逻辑化

Flow 可以引用：

```text
capability_ref
backend_ref
command_ref
role
input / output contract
```

Flow 不允许引用：

```text
192.168.x.x
localhost:具体端口（作为业务语义）
~/Desktop/...
node_modules/... 内部路径
某模块源码文件
具体模型 id（除非该 Flow 的业务要求就是固定模型资产）
```

这些由 Runtime config 解析。

## 6. Deployment Adapters

同一个 Port 至少考虑：

```text
InProcessProvider
HttpProvider
```

以后可扩展：

```text
LAN / Remote / IPC / Queue
```

Phase 3 不要求立刻微服务化；只要求架构不再依赖同进程。

## 7. 与 Task Control 的关系

推荐模式：

```text
Controller / Task
→ 请求执行一个 Capability / Flow
→ Runtime 执行有界工作
→ 返回结构化 Result / Progress
→ Task 记录 durable 状态
```

Runtime 不自行推进 Task Plan。

## 8. 第一阶段验收 Demo

同一 `runtime-health.flow`：

1. Task Control 通过 in-process adapter；
2. 切换成 localhost HTTP Task / Capability adapter；
3. Flow 文件不变；
4. Result contract 不变。

第二个 Demo：

```text
backend_ref=fast
```

只改 Runtime config，在 mock / MLXHub / 其他 Provider 间切换，Flow 不变。
