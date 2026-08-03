# 术语与来源

> 核心结论：本目录只维护项目的统一语言和外部来源治理，不再手工复制视觉资产、知识文章或仓库文件清单。资产身份、路径、生命周期和关系以 Platform Registry 为准；人类阅读入口以各级 README 为准。

## 1. 目录职责

`10_术语与来源` 负责两个稳定问题：

1. 项目中的关键概念应当怎样命名、区分和使用；
2. 外部事实、官方文档、方法论和第三方项目应当怎样引用、核验和进入正式知识。

本目录不负责：

- 维护全量知识文章清单；
- 维护全量视觉资产清单；
- 复制 Platform Registry 中已经存在的路径、状态和关系；
- 把外部网页直接写成项目当前实现事实；
- 代替目标文档中的来源、Evidence 和事实边界。

## 2. Canonical 文档

| ID | 文档 | 唯一职责 |
|---|---|---|
| `REF-001` | [核心术语与概念边界](./REF-001-核心术语与概念边界/README.md) | 统一语言、关键非等价关系、状态与角色边界 |
| `REF-002` | [外部来源与技术参考治理](./REF-002-外部来源与技术参考治理/README.md) | 来源分级、核验记录、官方资料和第三方项目采用门禁 |

## 3. 机器索引与人类导航

需要查找资产时，按以下顺序使用现有真源：

```text
目标目录 README
  → platform-registry/assets.yaml
  → platform-registry/relations.yaml
  → 具体 Canonical Asset
```

视觉资产使用：

- `platform-registry/visual-assets/README.md`
- `platform-registry/visual-assets/index.json`
- 各 Document Bundle 的 `assets/`

知识栏目和人类导航使用：

- `docs/knowledge/README.md`
- 各知识目录 `README.md`

这些入口已经拥有资产路径、状态或栏目导航，本目录不再复制一份容易漂移的手工清单。

## 4. 被收敛的旧资产

| ID | 处理 | 替代入口 |
|---|---|---|
| `REF-003` | 并入 `REF-002` | 外部来源与技术参考治理 |
| `REF-004` | 取消手工视觉资产清单 | Visual Asset Registry |
| `REF-005` | 取消手工知识与仓库资产清单 | 知识根 README + Platform Registry |

旧文件路径、标题和迁移事实保留在 Git 历史与 Migration Matrix 中，不继续作为当前 Canonical 阅读入口。

## 5. 使用规则

- 首次出现的重要概念使用“中文（English）”，后续保持一个主名称；
- 同名概念必须标明所属 Bounded Context 或产品语义；
- 产品名、模型名和 Provider 名不能替代稳定角色或领域对象；
- 外部事实优先引用官方来源，并记录核验日期；
- 开源项目进入索引不等于采用，进入依赖前必须有 PoC、许可证和安全检查；
- 来源索引只提供治理入口，具体 Claim 仍应在目标文档附近引用来源与事实边界；
- 路径、生命周期和关系变化优先更新 Registry，而不是新增手工索引表。

## 6. 当前事实边界

当前 Git 是唯一正式真源，`REF-001` 和 `REF-002` 为本目录仅有的物化 Canonical 资产。外部资料具有时效性；套餐、模型、客户端入口、区域可用性、Preview 状态和第三方项目维护状态必须在使用时重新核验。
