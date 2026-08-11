# 03｜API、Vision、Context、性能与稳定性验证

> 核心问题：手机算力“能跑”之外，实际容量、延迟、Vision、上下文和热稳定表现如何？

## 1. API 与基础能力

已验证 MLXHub 路径包括：

| 能力 | 结论 |
|---|---|
| `/health` | VALIDATED |
| `/v1/status` | VALIDATED |
| `/v1/models` | VALIDATED |
| `/v1/chat/completions` | VALIDATED |
| Text | VALIDATED |
| Streaming | VALIDATED |
| Multi-turn | VALIDATED |
| Base64 Vision | VALIDATED |
| HTTP URL Vision | VALIDATED |
| 多图 / 空间 / 颜色理解 | VALIDATED |
| 显式 model 切换 | VALIDATED |

## 2. 长上下文：容量不等于推荐预算

### 2.1 TSK-shaped 初始基准

早期真实任务形状的 Context + Vision 测试：

| 输入级别 | Route | Median |
|---|---:|---:|
| ~8KB Text | 3/4 | ~6.761s |
| ~24KB Text | 3/4 | ~14.046s |
| ~48KB Text | 3/4 | ~35.880s |
| ~16KB Vision V1 | 4/6 | ~17.118s |

失败主要集中在 Approval missing / scope mismatch 等语义边界，而不仅是“上下文装不下”。

### 2.2 Production Candidate v3

后续把输入、Prompt 和 Vision 策略收敛后：

```text
Text ~16KB   4/4
Vision ROI   2/3
Vision FULL  3/3
```

形成工程候选：

```text
preferred_context_bytes ≈ 12000
hard_context_bytes      ≈ 16000
Vision NORMAL on demand
Vision FULL fallback
```

ROI 不作为唯一主路径。

### 2.3 128KB Recall

2026-08-09 comprehensive benchmark 进一步验证：

```text
8KB / 12KB / 16KB / 24KB / 25KB /
32KB / 48KB / 64KB / 96KB / 128KB
```

关键事实放在 start / middle / end 均能召回，最高全召回达到 `131072 bytes`。

这只能证明“容量能力”，**不能推翻 12~16KB 的工程预算**。更大的上下文带来明显延迟，并且平台可以通过 Context Projection 只投影本轮需要的事实。

## 3. Vision

FAST Vision 已验证：

- inline Base64；
- HTTP image URL；
- UI / 状态图像；
- 空间与颜色理解；
- Approval 边界识别；
- 只读 vs external-write 区分。

comprehensive benchmark 中简单 Vision 2/2，median ~2.07s；带完整 Task/Contract/截图的生产形态通常明显更慢，不能把简单视觉探针延迟当生产 SLA。

## 4. 输出预算

### 4.1 初始发现

- FAST_EXTRACT 256/512 可能截断，1024 通过；
- FAST_SUMMARY 256 截断，512/1024 通过；
- Vision v1 有 checker 误报。

### 4.2 Refine v2

测得最低候选：

```text
ROUTE          96
EXTRACT       768
SUMMARY       384
VISION_EXTRACT 192
```

### 4.3 最终工程选择

为了减少 profile 配置分叉并避免 JSON 截断：

```text
FAST max_tokens = 1024
```

`finish_reason=stop` 不能证明 JSON 完整，仍必须经过 parse / schema / completeness。

## 5. Sustained / Thermal

### 5.1 压力型 Sustained Freeze v1

```text
18 requests / 3 rounds
16KB + 50% FULL Vision
semantic 18/18
round median 10.295s -> 14.643s
median drift +42.2%
人工 thermal = HOT
```

语义全绿，但高 duty-cycle 出现明显延迟漂移。

### 5.2 Sustainable Freeze v2

```text
12KB context
4 text + 2 NORMAL Vision / round
round median 7.537 / 8.844 / 9.762s
median drift +29.5%
round 3 semantic 4/6
人工 thermal = HOT
```

第三轮两条 Vision 违反 `uncertain -> handoff/controller` 不变量，因此不能冻结。

### 5.3 后续 comprehensive sustained

2026-08-09 的综合测试收敛到：

```text
18 requests
HTTP 17/18
route 17/18
round medians 12.077 / 12.168 / 12.431s
round1 -> round3 drift +2.9%
```

项目现场记录指出唯一 HTTP 失败来自 iPhone 锁屏 / 后台导致的 `server_paused`。因此当前工程判断是：

- 手机前台/服务存活状态是重要运行约束；
- 不应把早期压测 HOT 直接解释为“生产不可用”；
- 也不能忽略锁屏/后台暂停这一真实可用性问题。

## 6. 并发与模型切换

实测：

- 同模型并发没有明显吞吐收益；
- 异模型并发会出现 `HTTP 409 / model_busy`；
- `FAST -> REASON -> FAST` 切换可完成；
- `/v1/status isGenerating` 不足以作为严格调度锁。

最终冻结：

```text
one backend/device global serial lane
max_inference_concurrency = 1
model switch = serialized
failed request must not poison the queue
```

## 7. 内存

RAM Pressure Test 记录：

```text
Device RAM        ≈ 11.45 GB
soft/hard upper   ≈ 4.86 GB
safe upper target ≈ 4.13 GB
```

`~4.13GB` 是当时 Runtime Guard 候选，不是设备的永久 SLA；模型 Artifact、KV 策略、iOS/MLXHub 版本变化后需重测。
