# 05 上下文与知识系统整合前观点与候选

> 本 Document Bundle 保存 `05_上下文与知识系统` 收敛前的 15 篇正文与旧 `VIS-010`。这些内容不是废弃垃圾，而是六篇 Canonical 文档的来源、历史判断和后续专题候选；当前结论必须以新的 `ARC-002`、`ARC-005`、`ARC-006`、`KNO-006`、`KNO-009` 与 `KNO-011` 为准。

## 1. 状态解释

| 分类 | 含义 | 使用规则 |
|---|---|---|
| `merged_into_canonical` | 核心语义已并入六篇 Canonical 文档 | 新文档拥有当前解释权，旧文只作来源追踪 |
| `superseded` | 原资产的 Canonical 职责已被替代 | 稳定 ID 不复用，Registry 保留替代关系 |
| `historical_visual` | 旧图仍有历史价值 | 不得作为当前视觉入口或发布输入 |
| `deferred_candidate` | 有价值但当前不需要独立正式文章 | 出现真实调用方、实现或证据后重新综合 |

## 2. 迁移映射

| 原资产 | 当前去向 | 状态 |
|---|---|---|
| 旧 ARC-002 | 新 ARC-002、ARC-005、KNO-006 | `merged_into_canonical` |
| 旧 ARC-005 | 新 ARC-005、KNO-006 | `merged_into_canonical` |
| 旧 ARC-006 | 新 ARC-006、KNO-011 | `merged_into_canonical` |
| KNO-001～KNO-003 | ARC-006、KNO-011 | `superseded` |
| KNO-004 | KNO-006、KNO-009 | `superseded` |
| KNO-005 | ARC-005 | `superseded`；旧 VIS-010 归档 |
| KNO-006 | 新 KNO-006 | 保留稳定 ID 并重写 |
| KNO-007～KNO-008 | ARC-005 | `superseded` |
| KNO-009 | 新 KNO-009 | 保留稳定 ID并扩展 |
| KNO-010、INS-001 | KNO-009 | `superseded` / 历史候选 |
| KNO-011 | 新 KNO-011 | 保留稳定 ID并扩展 |

## 3. 历史边界

- 旧“Feishu 原生内容层”不再是正式知识模型；飞书只接受 Git 单向覆盖投影。
- AGENTS、项目 Context、Task State、Memory、Evidence、Session 与 Context Package 必须分概念。
- 旧文章中的目标设计不能作为当前实现证明。
- 恢复任何候选前，必须重新核对当前 Context、代码、测试、Registry、来源和用户授权。

## 4. 旧 VIS-010

![旧知识生命周期与单向投影](./assets/VIS-010-知识生命周期与单向投影.png)

### AI 可读语义镜像

旧 `VIS-010` 表达 Git 正式知识经生命周期治理后向外部渠道单向投影。当前正式图已在 `ARC-005` 中升级为知识资产、主张、证据、Registry、关系、影响分析、发布资格与完整生命周期的统一视图。

## 5. 文件组织

- `legacy-assets/`：整合前文章原文；
- `assets/`：旧 VIS-010 的 PNG / SVG；
- 本目录不参与 Feishu 正式发布，不作为 Context Builder 当前来源。
