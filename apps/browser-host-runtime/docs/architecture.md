# BHR 内部架构

```text
Chrome MV3 Extension
├── Background Service Worker
│   ├── HostRegistry
│   ├── Gateway / Fixture Transport
│   ├── DispatchClient / ApprovalClient
│   ├── BindingRegistry
│   ├── ObservationCoordinator
│   ├── CommandJournal
│   ├── RuntimeCoordinator
│   └── Model Inference Provider
├── Content Script
│   ├── ChatGPT Page Adapter
│   ├── FOLLOW_LATEST
│   ├── Observation
│   └── Registered Action Executor
├── Side Panel
└── Options / Session Credentials
```

BHR 内部可以独立迭代，但 `Wake Envelope`、`Host Command`、`Approval Grant`、`Host Result` 的公共含义不能由本领域单方面改变。
