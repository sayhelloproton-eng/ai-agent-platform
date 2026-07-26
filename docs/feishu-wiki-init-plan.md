# Feishu Wiki 初始化计划（Dry Run）

## 目标与边界

本计划用于验证通过 `lark-cli` 初始化 `ai-agent-platform Knowledge Base` 所需的参数和节点结构。

- 只进行 `--dry-run` 参数校验。
- 不传入 `--yes`。
- 不创建知识空间、节点或文档。
- 所有节点均设计为知识空间根目录下的一级 `docx` 实体节点。

## Schema 结论

### Space 创建参数

`wiki.spaces.create` 接受以下 `--data` 字段：

| 字段 | 计划值 | 说明 |
| --- | --- | --- |
| `name` | `ai-agent-platform Knowledge Base` | 知识空间名称 |
| `description` | `ai-agent-platform 项目知识库` | 知识空间描述 |
| `open_sharing` | `closed` | 禁止公开分享，采用保守默认值 |

`space_type` 和 `visibility` 只出现在返回 Schema 中，不是创建请求的输入参数，不能在本命令中主动指定。

Dry-run 命令：

```bash
lark-cli wiki spaces create \
  --data '{"name":"ai-agent-platform Knowledge Base","description":"ai-agent-platform 项目知识库","open_sharing":"closed"}' \
  --dry-run
```

验证结果：CLI 返回 `ok: true`、`dry_run: true`，预览请求为 `POST /open-apis/wiki/v2/spaces`，未实际创建 Space。

### Node 创建参数

`wiki.nodes.create` 需要：

| 位置 | 字段 | 计划值 | 说明 |
| --- | --- | --- | --- |
| 参数 | `space_id` | `<SPACE_ID>` | 实际执行时使用 Space 创建结果中的 ID |
| Data | `node_type` | `origin` | 创建实体节点，不创建快捷方式 |
| Data | `obj_type` | `docx` | 创建新版飞书文档节点 |
| Data | `title` | 见下方顺序 | 节点标题 |
| Data | `parent_node_token` | 不传 | 不指定父节点，创建 Space 根级一级节点 |

`<SPACE_ID>` 只是 dry-run 占位符。由于 Space 本身不实际创建，当前阶段不会获得真实 Space ID。

## Node 创建顺序

所有节点按以下顺序创建：

| 顺序 | 标题 | 层级 | 父节点 |
| ---: | --- | --- | --- |
| 1 | `00 项目总览` | 一级 | Space 根节点 |
| 2 | `01 架构设计` | 一级 | Space 根节点 |
| 3 | `02 DDD 与系统设计` | 一级 | Space 根节点 |
| 4 | `03 Agent Architecture` | 一级 | Space 根节点 |
| 5 | `04 Coding Agent` | 一级 | Space 根节点 |
| 6 | `05 Codex 学习` | 一级 | Space 根节点 |
| 7 | `06 MCP 与 Tool Calling` | 一级 | Space 根节点 |
| 8 | `07 RAG 与知识系统` | 一级 | Space 根节点 |
| 9 | `08 AI Workflow` | 一级 | Space 根节点 |
| 10 | `09 技术实验` | 一级 | Space 根节点 |
| 11 | `10 ADR 架构决策` | 一级 | Space 根节点 |
| 12 | `11 简历与作品展示` | 一级 | Space 根节点 |

编号前缀用于稳定展示顺序；CLI Schema 没有单独的排序参数。

## Node dry-run 命令

```bash
lark-cli wiki nodes create --space-id '<SPACE_ID>' --data '{"node_type":"origin","obj_type":"docx","title":"00 项目总览"}' --dry-run

lark-cli wiki nodes create --space-id '<SPACE_ID>' --data '{"node_type":"origin","obj_type":"docx","title":"01 架构设计"}' --dry-run

lark-cli wiki nodes create --space-id '<SPACE_ID>' --data '{"node_type":"origin","obj_type":"docx","title":"02 DDD 与系统设计"}' --dry-run

lark-cli wiki nodes create --space-id '<SPACE_ID>' --data '{"node_type":"origin","obj_type":"docx","title":"03 Agent Architecture"}' --dry-run

lark-cli wiki nodes create --space-id '<SPACE_ID>' --data '{"node_type":"origin","obj_type":"docx","title":"04 Coding Agent"}' --dry-run

lark-cli wiki nodes create --space-id '<SPACE_ID>' --data '{"node_type":"origin","obj_type":"docx","title":"05 Codex 学习"}' --dry-run

lark-cli wiki nodes create --space-id '<SPACE_ID>' --data '{"node_type":"origin","obj_type":"docx","title":"06 MCP 与 Tool Calling"}' --dry-run

lark-cli wiki nodes create --space-id '<SPACE_ID>' --data '{"node_type":"origin","obj_type":"docx","title":"07 RAG 与知识系统"}' --dry-run

lark-cli wiki nodes create --space-id '<SPACE_ID>' --data '{"node_type":"origin","obj_type":"docx","title":"08 AI Workflow"}' --dry-run

lark-cli wiki nodes create --space-id '<SPACE_ID>' --data '{"node_type":"origin","obj_type":"docx","title":"09 技术实验"}' --dry-run

lark-cli wiki nodes create --space-id '<SPACE_ID>' --data '{"node_type":"origin","obj_type":"docx","title":"10 ADR 架构决策"}' --dry-run

lark-cli wiki nodes create --space-id '<SPACE_ID>' --data '{"node_type":"origin","obj_type":"docx","title":"11 简历与作品展示"}' --dry-run
```

以上 12 条命令均已通过本机 `lark-cli 1.0.77` dry-run 验证，全部返回 `ok: true` 和 `dry_run: true`。

## 父子关系

```text
ai-agent-platform Knowledge Base
├── 00 项目总览
├── 01 架构设计
├── 02 DDD 与系统设计
├── 03 Agent Architecture
├── 04 Coding Agent
├── 05 Codex 学习
├── 06 MCP 与 Tool Calling
├── 07 RAG 与知识系统
├── 08 AI Workflow
├── 09 技术实验
├── 10 ADR 架构决策
└── 11 简历与作品展示
```

所有 Node 都不传 `parent_node_token`，因此不存在 Node 之间的父子关系；它们共同以目标 Space 为父级。

## 所需权限

### 创建 Space

- 身份：仅支持用户身份 token。
- Schema 声明的 scopes：
  - `wiki:wiki`
  - `wiki:space:write_only`
- 当前登录账号已授予 `wiki:space:write_only`。

### 创建 Node

- 身份：支持用户或机器人身份 token。
- Schema 声明的 scopes：
  - `wiki:wiki`
  - `wiki:node:create`
- 当前登录账号已授予 `wiki:node:create`。

本计划使用当前用户身份进行 dry-run，不调用生产写接口。

## 风险点

1. **Space 创建是高风险写操作**  
   Schema 将其标记为 `high-risk-write`。真实执行需要显式确认参数；本计划没有提供该确认参数。

2. **Node 创建是写操作**  
   Schema 将其标记为 `write`。移除 `--dry-run` 后会真实创建 Wiki 节点。

3. **dry-run 的 Space 不会返回真实 ID**  
   Node 命令中的 `<SPACE_ID>` 仅用于验证请求结构。真实初始化必须从 Space 创建响应中读取准确的 `space_id`，不能沿用占位符。

4. **Space 隐私属性不能完全由当前输入 Schema 指定**  
   创建参数只能把 `open_sharing` 设置为 `closed`；`visibility` 和 `space_type` 是返回字段。真实创建后仍需只读核验最终值。

5. **重复执行可能产生重复节点**  
   创建 Schema 没有幂等键。未来真实执行前应先列出 Space 和根节点，按标题检查重复项。

6. **一级顺序依赖标题编号**  
   Node 创建 Schema 不提供排序字段，因此使用 `00` 至 `11` 前缀维持预期顺序。

7. **权限范围较宽**  
   当前登录流程为 `docs / drive / wiki` 的常用权限组合。执行环境应继续使用最小必要身份，并避免把 token 或本地加密凭证写入仓库。

## 验证结论

`lark-cli` 提供了创建目标 Space 和 12 个一级 `docx` Node 所需的全部参数。当前命令设计已通过 dry-run 验证，未创建或修改任何飞书数据。
