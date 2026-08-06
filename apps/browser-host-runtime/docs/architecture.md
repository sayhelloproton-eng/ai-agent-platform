# BHR 内部架构

```text
Chrome MV3 Extension
├── Service Worker
│   ├── ExecutionGate（启动/Alarm/Poll/手工统一串行）
│   ├── RuntimeCoordinator
│   ├── CommandJournal（共享单写队列）
│   ├── Dispatch / Approval HTTP Client
│   ├── BindingRegistry / RoleSessionManager
│   ├── ObservationCoordinator
│   └── Model Provider Port
├── ChatGPT Content Adapter
├── Side Panel
└── Options
```

## 恢复优先级

每次 Poll 先处理可恢复记录，再考虑新 Dispatch：

1. 预投递失败补报；
2. Uncertain 报告；
3. Delivery Ack 补报；
4. 回答观察恢复；
5. Host Result 补报；
6. 新命令 Claim。

恢复队列逐条隔离错误记录，不能让第一条坏记录阻塞后续安全记录。
