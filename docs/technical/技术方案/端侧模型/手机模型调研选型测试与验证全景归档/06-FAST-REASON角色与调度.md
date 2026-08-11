# 06｜FAST / REASON 角色与调度

> 核心问题：双模型不是“快/慢两个按钮”，它们在平台中分别承担什么？

## 1. 当前角色

### FAST

```text
sayhelloproton/Qwen3.5-4B-MLX-4bit-no-think
```

职责：

- 高频 Task / Node / Evidence 理解；
- 结构化合同输出；
- 状态/证据整理；
- Approval boundary 初判；
- 普通下一步候选判断；
- Vision；
- allow-listed script/capability 选择；
- 普通执行结果验收。

### REASON

```text
mlx-community/Qwen3.5-4B-MLX-4bit
```

职责：

- evidence conflict；
- state contradiction；
- unknown side effect；
- approval scope ambiguity；
- causal recovery；
- multi-option ambiguity；
- FAST 无法安全确定时的低频升级。

## 2. 早期 REASON 为什么没有直接进入主路径

Switch Benchmark v1：

```text
FAST ~2.6–3.8s
REASON ~33.6–53.6s
```

Compact Validation v2：

```text
REASON ~46 / 80 / 104s
```

并出现 `<think>` 未闭合、最终 JSON 缺失等问题。

所以第二阶段先冻结：

```text
FAST default synchronous
REASON explicit slow path
```

## 3. 后期 REASON gate 的变化

到 Execution Flow Runtime `lab.13.3`，REASON 已不再被要求输出一个大而开放的“思考答案”，而是处理 6 类清晰、结构化、低频场景。

12 个真机请求中：

- 核心 control/safety decision 12/12 正确；
- exact diagnostic label 11/12；
- 唯一差异是 `fresh_verified_evidence` vs `primary_authoritative`；
- 两个标签都选择了正确的新鲜权威证据。

Latency：

```text
median ~21.334s
p95    ~31.673s
max    ~31.673s
```

这更符合“低频升级”的工程定位。

## 4. 调度必须在 Runtime，不在模型

冻结调度：

```text
one global FIFO Promise-chain lane per MLXHub backend/device
FAST + REASON share it
max concurrency = 1
```

原因：

- 异模型并发可产生 409 `model_busy`；
- 手机同一时刻只有一个 active model；
- 没有证据证明同模型并发带来值得承担复杂度的收益；
- 调度失败不能污染后续队列。

## 5. Flow 明确决定是否升级 REASON

Execution Flow Runtime 之后的长期原则：

```text
FAST inference
      ↓
deterministic switch
  ┌───┴────┐
determinate uncertain/conflict
  │           │
continue      REASON inference
```

不让 FAST 自己拥有“切模型控制权”，也不让 REASON 偷读 Runtime 私有状态。

REASON rich context 必须由 Flow 显式投影：

- original relevant input；
- concrete evidence；
- FAST assessment/output；
- escalation trigger；
- constraints。

## 6. 逻辑角色与物理模型解耦

上层应该表达：

```text
role = fast
role = reason
requires Vision
requires structured output
```

Provider config 再把逻辑角色映射到具体 MLXHub model ID。

因此未来换成 Mac local / cloud / 新手机模型时，Flow 不应重写。
