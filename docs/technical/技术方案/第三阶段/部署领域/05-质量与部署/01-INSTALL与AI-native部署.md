---
docId: DEPLOYMENT-DOC-05-01
title: INSTALL 与 AI-native Deployment
docType: operational-design
authority: normative
lifecycle: frozen
domain: deployment-governance
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# INSTALL 与 AI-native Deployment

## 1. 两层 INSTALL

### 静态 Bootstrap INSTALL

仓库/Deployment Package 可以有简短静态入口，告诉 AI/人：

- 如何获得/运行 Platform CLI；
- 工作区要求；
- 如何开始 `preflight/plan`；
- 安全边界。

### 实例级 Generated INSTALL

真正部署计划生成：

```text
.ai-agent-platform/deployment/generated/INSTALL.md
```

内容来自当前：

- Module Set；
- versions；
- machine/runtime；
- external resources；
- config slots；
- human actions；
- effects；
- verification plan。

## 2. AI 主流程

```text
理解用户目标
→ 调 platform preflight
→ 调 platform plan
→ 解释结构化 plan
→ 请求集中确认
→ 调 platform apply
→ 遇 ACTION_REQUIRED 给用户最小人工操作
→ 再 apply
→ verify
→ manifest
→ 总结
```

## 3. Small-model friendly

部署合同必须 structured JSON + stable enum/error code，AI 不需要从自然语言猜：

- 是否成功；
- 哪一步失败；
- 是否需要人；
- 是否可继续；
- 当前 Module/Version/Verify reality。

## 4. 不允许 AI 旁路

在 Platform CLI 已提供能力时，AI 不应该自己发明：

- npm install 顺序；
- config files；
- service start scripts；
- external setup shell；
- module migration procedure。

如需要新增能力，应先通过 Module Contract/Template/Conformance 补齐，再由 CLI 执行。
