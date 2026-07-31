# Tests and Evaluation Fixtures

## What

本目录保存 `engineering-insight-distillation` v0.1.1 的行为评测夹具。当前版本没有自动化脚本，Fixture 用于人工评测或后续 Eval Runner。

## Why

Skill 是否有效不能只看说明是否完整，而要看它在真实、负向、重复和冲突案例中能否保持证据、边界、动作和治理约束。

## Fixture Contract

每个 Fixture 都包含：

- `case_id`；
- `purpose`；
- `input`；
- 可选的 `existing_insights`；
- `expected_behavior`；
- `forbidden_behavior`。

Fixture 不是正式经验资产，不赋予其中候选结论任何成熟度。

## Cases

- `valid-candidate.yaml`：从真实集成事件提炼底层信任与协议边界；
- `insufficient-evidence.yaml`：只有症状、没有根因与验证时保持候选；
- `over-specific-output.yaml`：拒绝绑定单一产品或实现的绝对结论；
- `over-generalized-output.yaml`：拒绝“做好测试”等不可执行空话；
- `duplicate-insight.yaml`：识别同一真实路径验证机制的新 occurrence；
- `conflicting-evidence.yaml`：使用反例缩小边界并保留修订历史。

## Evaluation Dimensions

每次评测至少检查：

1. 输入资格判断是否正确；
2. 事实、推断和建议是否区分；
3. 是否识别底层机制；
4. 是否剥离偶然业务实现；
5. 是否避免空洞原则；
6. 是否写明适用和排除条件；
7. 是否输出可执行动作；
8. 是否识别重复或冲突；
9. 成熟度与生命周期是否分离且有依据；
10. 来源和修订是否可追溯；
11. 是否要求必要人工审批；
12. 是否避免自动写入或自我修改。

## Regression Rule

真实使用中出现错误提炼时，应先添加最小 Fixture，明确期望和禁止行为，再修改 Skill 方法。任何方法更新不得让既有正向和负向案例退化。

## Executable Evals

`tests/evals/` 保存 Trigger、Rubric、Pilot 和 Screening 回归资产。

运行：

```bash
node scripts/eval.mjs self-test
```

Harness 使用 Node 内置模块，不调用模型、不访问网络。
