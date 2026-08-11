# 端侧模型

本目录保存端侧模型相关的历史构想、手机模型研究、真机验证与当前冻结技术基线。

## 当前入口

- **当前总入口 / Current Truth**：[手机模型调研、选型、测试与验证全景归档](手机模型调研选型测试与验证全景归档/README.md)
- **历史构想 / Proposal**：[端侧模型节点与单模型多角色服务构想与验证方案](端侧模型节点与单模型多角色服务构想与验证方案.md)

## 状态说明

`端侧模型节点与单模型多角色服务构想与验证方案.md` 保留 2026-08-04 的早期思考，不再代表当前模型选型；其中“模型提议、Runtime 裁决”“角色与模型解耦”“权限不由 Prompt 获得”等原则仍被后续验证保留。

当前已经形成的实际基线包括：

```text
Runtime = MLXHub LAN Server / iPhone 17 Pro
FAST    = sayhelloproton/Qwen3.5-4B-MLX-4bit-no-think
REASON  = mlx-community/Qwen3.5-4B-MLX-4bit
Execution Flow Runtime = 0.0.0-lab.13.3.1
```

详细证据、失败/误报、Chat 来源和后续重测条件统一进入“全景归档”，避免继续在早期 Proposal 上追加互相冲突的“当前状态”。
