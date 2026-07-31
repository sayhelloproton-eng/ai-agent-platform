# Scripts

## `eval.mjs`

依赖 Node.js 内置模块，不调用模型、不访问网络，也不修改正式知识资产。

支持：

```bash
node scripts/eval.mjs self-test
node scripts/eval.mjs score-triggers <predictions.json>
node scripts/eval.mjs score-rubric <scores.json>
node scripts/eval.mjs validate-screening <screening-result.json>
node scripts/eval.mjs validate-result <distillation-result.json>
node scripts/eval.mjs validate-insight <engineering-insight.json>
node scripts/eval.mjs validate-registry <engineering-insight-registry-root>
```

### Self-test

检查：

- Manifest 与实际文件一致；
- JSON Schema 可解析；
- 核心文件中没有项目绑定技术名词；
- Trigger 集包含正负例；
- Pilot 结果状态与成熟度满足确定性约束；
- Screening Pilot 的期望决策全部匹配；
- 示例触发预测和 Rubric 分数格式合法。

### Boundaries

Harness 不负责：

- 调用 LLM；
- 自动执行 Skill 选择；
- 代替独立盲评；
- 证明统计显著性；
- 自动修改 Skill；
- 自动批准洞见。

### Registry validation

`validate-registry` 检查：

- `registry.json`、`governance.json` 和 `relationships.json`；
- Registry 索引与 `insights/*.json` 是否一致；
- ID、路径、标题、成熟度、生命周期和审批状态是否一致；
- 关系是否只引用存在的洞见；
- `repeated` / `established` 是否具有足够 Occurrence；
- `established` 是否经过批准；
- Registry 是否存在重复 ID 或重复路径。
