# Contract and Modes

## Contract Priority

包内 Manifest、Spec、Task Book 和 Overlay 是唯一执行 Contract。聊天只负责定位包和启动，不复制第二套字段。

## Frozen Content

`knowledge_content_frozen: true` 表示执行器不得改写正文、生命周期、Schema 或验证器。发现问题必须停止并由 Contract 生产者生成修正版。

## Modes

`deterministic_delivery` 从固定 SHA 开始完整执行。`continuation` 从已记录的门禁继续，必须保留停止时的工作区和证据。
