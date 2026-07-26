# Homepage Update Plan

目标文档：

- 标题：智能体工程探索录
- Docx Token：`<FEISHU_HOME_DOCX_TOKEN>`
- Wiki Node Token：`<FEISHU_HOME_WIKI_TOKEN>`
- 读取时 revision：`6`

仅修改“7. 当前阶段”章节中的指定块，不覆盖首页其他内容。

## 替换 Phase Callout

目标 Block：`<FEISHU_BLOCK_ID>`

```xml
<callout background-color="light-blue" border-color="blue" emoji="📌">
  <p><b>Knowledge System Foundation / Context Synchronization Initialization</b></p>
  <p>当前重点是建立 ChatGPT、飞书与 Git/GitHub 之间可恢复、可追溯的上下文与工程资产闭环。</p>
</callout>
```

## 更新三个既有完成项

- `<FEISHU_BLOCK_ID>` → 飞书知识库结构、15 个一级目录与首页已完成
- `<FEISHU_BLOCK_ID>` → lark-cli 与公开 Wiki 跨租户读取已验证
- `<FEISHU_BLOCK_ID>` → AI Knowledge Skill v1.0.0 已设计、安装并通过自检

对应内容：

```xml
<checkbox done="true">飞书知识库结构、15 个一级目录与首页已完成</checkbox>
<checkbox done="true">lark-cli 与公开 Wiki 跨租户读取已验证</checkbox>
<checkbox done="true">AI Knowledge Skill v1.0.0 已设计、安装并通过自检</checkbox>
```

## 插入补充完成项与当前执行

在第三个完成项之后插入：

```xml
<checkbox done="true">GitHub + Feishu 双源事实架构已确认为 Accepted</checkbox>
<checkbox done="true">本地资产、敏感风险与第三方内容策略已完成盘点</checkbox>
<h2>当前执行</h2>
<ul>
  <li>配置本地 Git 提交身份并完成首次安全 Commit。</li>
  <li>安装 GitHub CLI，创建并绑定 private 仓库。</li>
  <li>将 ChatGPT 与 Codex 上下文同步到飞书。</li>
</ul>
```

## 更新五个下一阶段条目

- 建立 Knowledge Index。
- 实现 `query_context` 只读 MVP。
- 实现 `capture_knowledge` 与 `sync_project_status`。
- 建立 Git Commit 与飞书知识记录的稳定引用。
- 验证新设备和新 Agent 的端到端恢复流程。

## 保护约束

- 更新前重新读取 revision；如果不是 `6`，停止并重新生成差异。
- 使用 `block_replace` 和 `block_insert_after`，不使用 `overwrite`。
- 不删除、移动或改写其他章节。
- 每次更新后重新获取“7. 当前阶段”章节验收。
