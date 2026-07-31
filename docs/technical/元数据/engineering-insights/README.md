# Engineering Insight Registry

## What

本目录是 `ai-agent-platform` 的工程洞见注册表，保存经过证据校准、抽象、查重和治理后的可复用工程判断。

## Why

项目需要的不只是故障记录，而是能在以后任务中直接影响决策、测试、退出条件和复审方式的长期工程判断力。

## Boundary

- `skills/engineering-insight-distillation/` 保存提炼方法；
- 本目录保存提炼结果的 Git 主记录；
- 项目复盘、代码、测试和日志保存具体来源；
- `docs/knowledge/` 可以派生面向人的知识，但不能成为成熟度、生命周期和关系的第二真源；
- 本目录不参与 Feishu Knowledge Projection；
- 不保存原始聊天全文、Secret、私有 URL、账号信息或运行缓存。

## Structure

```text
engineering-insights/
├── README.md
├── registry.json
├── governance.json
├── relationships.json
└── insights/
    └── EI-*.json
```

## Current Registry

初始注册表包含五条洞见：

- `EI-INTENT_ADAPTER_001`
- `EI-REAL_PATH_001`
- `EI-PHASE_FIT_EXIT_001`
- `EI-LAYERED_AUTH_001`
- `EI-RISK_REVIEW_001`

前四条为 `provisional`，最后一条为 `candidate`。它们来自首个 MVP，但正文已经剥离具体产品和接口，适用于相似工程场景。

## Retrieval

新任务开始前，按当前目标最小检索相关洞见，并转换为：

- Preflight Checklist；
- Decision Gate；
- Test Requirement；
- Stop / Exit Condition；
- Review Constraint。

不要一次加载全部 Registry。

## Update Workflow

```text
已解决事件
  → Screening
  → Full Distillation
  → Registry Search
  → New / Occurrence / Evidence / Revision / Contradiction
  → Update
  → Validate
```

新事件若与已有机制一致，应增加 Occurrence 或证据，不新建近义条目。

## Validation

```bash
node skills/engineering-insight-distillation/scripts/eval.mjs       validate-registry docs/technical/元数据/engineering-insights
```

## Governance

详细委托、晋级和覆盖规则见 `governance.json`。项目负责人保留最终覆盖权，但日常详细技术复核不再要求项目负责人逐字段审阅。
