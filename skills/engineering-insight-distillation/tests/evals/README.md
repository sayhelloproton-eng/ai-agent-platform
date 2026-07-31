# Evals

本目录用于保存可重复评测资产。

## Contents

- `rubric.json`：固定八维评分标准；
- `trigger-cases.json`：Skill 应触发和不应触发的提示；
- `sample-trigger-predictions.json`：Harness 格式示例；
- `sample-rubric-scores.json`：成对评分格式示例；
- `pilot-01/`：v0.1.1 的有/无 Skill 真实案例对照；
- `pilot-02/`：v0.1.2 Screening 模式评测。

## Trigger Eval

真实 Agent Skills 客户端执行后，把每条预测写成：

```json
[
  {"id": "TRIGGER-001", "predicted_trigger": true}
]
```

然后运行：

```bash
node scripts/eval.mjs score-triggers predictions.json
```

## Functional Eval

同一事件分别生成：

- baseline：不加载 Skill；
- skill：加载完整 Skill。

再按 `rubric.json` 对八个维度评分。

Harness 只检查评分文件格式并计算平均值，不调用模型，也不代替盲评。

## Regression Rule

真实失败应先转成可复现 Case 或 Fixture，再修改 Skill。没有失败案例支撑的规则扩张应保持谨慎。
