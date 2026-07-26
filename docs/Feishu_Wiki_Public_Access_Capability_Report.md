# Feishu Wiki 互联网公开能力探测报告

## 结论

基于本机官方 `lark-cli 1.0.77` 的帮助、内置 Wiki Schema 和目标 Space 实时只读查询：

1. **存在互联网公开相关字段**：`open_sharing`。
2. **CLI 不支持把已有 Space 切换为互联网公开**：没有 publish、update、patch、public 或 external 相关命令。
3. **API Schema 只支持在创建 Space 时设置 `open_sharing`**，没有为已有 Space 更新该字段的方法。
4. **当前目标 Space 没有发布到互联网**：`open_sharing: closed`。
5. **当前 Space 的 `visibility: public` 不等于互联网公开**。它表示知识空间的可见性是“公开空间”；互联网发布状态由 `open_sharing` 单独表示。
6. 对于已存在的 Space `<FEISHU_SPACE_ID>`，当前能够确认的公开操作路径只有飞书 Web UI / 客户端知识库设置。

> 本报告只描述 `lark-cli 1.0.77` 当前公开的命令与内置 OpenAPI Schema，不推断或试用飞书未公开的内部接口。

## 探测对象

| 属性 | 当前值 |
| --- | --- |
| Space 名称 | `智能体工程探索` |
| Space ID | `<FEISHU_SPACE_ID>` |
| Space 类型 | `team` |
| 可见性 | `public` |
| 互联网分享 | `closed` |

当前状态解释：

- `visibility: public`：公开知识空间，属于 Space 可见性属性。
- `open_sharing: closed`：关闭互联网分享，Schema 明确说明为“知识空间未发布到互联网”。

因此，该 Space 当前不能被判定为互联网公开。

## 1. Wiki CLI 能力

执行：

```bash
lark-cli wiki --help
```

Space 相关 CLI 能力：

- `+space-create`
- `+space-list`
- `spaces create`
- `spaces get`
- `spaces get_node`
- `spaces list`

未发现以下命令：

- `publish`
- `public`
- `external`
- `share`
- `visibility`
- `space-update`
- `space-setting`

进一步执行：

```bash
lark-cli wiki spaces --help
```

结果只包含：

```text
create, get, get_node, list
```

## 2. Wiki Schema

执行：

```bash
lark-cli schema wiki
```

返回的 Wiki 方法清单：

```text
wiki members create
wiki members delete
wiki members list
wiki nodes copy
wiki nodes create
wiki nodes list
wiki spaces create
wiki spaces get
wiki spaces get_node
wiki spaces list
```

不存在 Space 更新、发布或公开状态修改方法。

## 3. Space Schema

执行：

```bash
lark-cli schema wiki.spaces
```

可用方法：

```text
create
get
get_node
list
```

### `wiki.spaces.create`

创建请求的 `data` 支持：

- `name`
- `description`
- `open_sharing`

`open_sharing` 枚举：

| 值 | Schema 含义 |
| --- | --- |
| `open` | 打开互联网分享 |
| `closed` | 关闭，知识空间未发布到互联网 |

这证明 API 能在**新建 Space** 时指定互联网分享状态。

### `wiki.spaces.get` 与 `wiki.spaces.list`

只读返回字段包含：

- `open_sharing`
- `visibility`

`visibility` 枚举：

- `public`
- `private`

这两个接口只能查询状态，不能修改状态。

## 4. 公开能力关键词搜索

执行：

```bash
lark-cli schema wiki | grep -i "public\|publish\|external\|share\|visibility"
```

命中内容仅来自：

- `visibility` 输出字段中的 `public`
- Space 创建、查询和列表中的 `open_sharing`

没有命中独立的：

- publish 接口
- external sharing 接口
- visibility update 接口
- existing space sharing update 接口

## 5. Update / Setting 补充探测

执行：

```bash
lark-cli schema wiki.space_setting
```

结果：

```text
Unknown resource: wiki.space_setting
Available: members, nodes, spaces
```

执行：

```bash
lark-cli schema wiki.spaces.update
```

结果：

```text
Unknown method: wiki.spaces.update
Available: create, get, get_node, list
```

说明当前 CLI 内置 API Schema 没有可用于更新已有 Space 分享状态的资源或方法。

## 6. 当前 Space 查询

执行：

```bash
lark-cli wiki spaces get --space-id <FEISHU_SPACE_ID>
```

结果：

```json
{
  "ok": true,
  "identity": "user",
  "data": {
    "space": {
      "name": "智能体工程探索",
      "open_sharing": "closed",
      "space_id": "<FEISHU_SPACE_ID>",
      "space_type": "team",
      "visibility": "public"
    }
  }
}
```

查询成功，且没有执行任何修改。

## 能力判断

| 问题 | 判断 | 说明 |
| --- | --- | --- |
| 是否存在 publish/public/external/visibility 相关字段或接口 | 部分存在 | 存在 `open_sharing` 和 `visibility` 字段，但不存在 publish/update 接口 |
| CLI 是否支持已有 Space 互联网公开 | 不支持 | CLI 没有对应 shortcut 或 service command |
| API 是否支持互联网公开 | 创建时支持 | `wiki.spaces.create` 可传 `open_sharing: open` |
| API 是否支持修改已有 Space 的互联网公开状态 | 当前 Schema 不支持 | 没有 `spaces.update`、`space_setting`、publish 或 patch 方法 |
| 是否只能 Web UI 操作 | 对当前已有 Space，是 | 当前公开 CLI/API 能力下，应在知识库设置页面操作 |

## 风险说明

- 不应把 `visibility: public` 当成已发布到互联网。
- 不应为了修改现有 Space 而重新创建一个 `open_sharing: open` 的 Space，这会造成结构和内容重复。
- 不应猜测飞书 Web UI 使用的内部接口并通过 `lark-cli api` 调用。
- 互联网公开可能暴露知识库内容，未来若通过 Web UI 操作，应先检查文档中的个人信息、凭证、内部架构和敏感材料。

## 本次操作边界

- 未修改 Space。
- 未创建新 Space。
- 未更新分享状态。
- 未修改 Node 或文档。
- 未调用任何生产写接口。
